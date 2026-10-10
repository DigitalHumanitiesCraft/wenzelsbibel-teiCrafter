# /// script
# requires-python = ">=3.11"
# dependencies = ["lxml>=5"]
# ///
"""Build the fol. 1r data model of the wireframe from the public ONB TEI files.

Single-file script (regime: inline PEP 723 metadata, no project). It reads the
public TEI of Codex 2759 (`codex-2759.xml`, PID o:wen.codex-2759) and the image
annotations (`Bildannotationen.xml`), both served by edition.onb.ac.at, and
writes `data/wireframe/fol-1r.json`, which the wireframe in `wireframe/` loads.
Edition data stay local: the output folder is ignored by Git
(knowledge/data.md, Storage and rights).

Usage:
    python wireframe/extract_data.py CODEX.xml BILDANNOTATIONEN.xml [-o OUT.json]

Design decisions:
- The text of the page is tokenised from the raw source slice between the
  `pb` of fol. 1r and the next `pb`, not from the parsed tree. The slice is
  shipped verbatim as `xmlExcerpt`, the wireframe edits it by offset, and the
  slice is not well-formed on its own (it opens inside `div` and `p`). The
  tokeniser is the one of the first wireframe round, ported unchanged except
  that end tags no longer create phantom columns, anchors and milestones.
- A word whose text contains an `lb` belongs to the line on which it begins
  (knowledge/data.md). The inner `lb` still opens its line, and it stays in
  the word text as a newline, the soft break the flow renders inside the word.
- Everything else (header, standOff apparatus, facsimile, register counts,
  image annotations) comes from an lxml parse of the whole file; a full DOM
  of the codex fits in memory (measured at about 1 s and under 400 MB).
- The codex has no register lists, so a register entry is a distinct trimmed
  `ref/@target` of type person, place or folk; its preferred name is its ID.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from lxml import etree

TEI = "{http://www.tei-c.org/ns/1.0}"
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"

FOLIO = "1r"
IIIF_BASE = "https://iiif.onb.ac.at/images/REPO/8977428/{stem}.jp2"
REGISTER_TYPES = ("person", "place", "folk")
DEFAULT_OUT = (
    Path(__file__).resolve().parent.parent / "data" / "wireframe" / "fol-1r.json"
)

TOKEN = re.compile(r"<(/?)(\w+)([^>]*?)(/?)>|([^<]+)")
ATTR = re.compile(r'([\w:]+)="([^"]*)"')
INLINE = frozenset(
    {
        "hi",
        "ref",
        "supplied",
        "del",
        "unclear",
        "damage",
        "fw",
        "choice",
        "abbr",
        "expan",
        "seg",
    }
)
RANGE = re.compile(r"^#range\(\s*([^,]*?)\s*,\s*([^)]*?)\s*\)$")
ICONCLASS_URI = re.compile(r"iconclass\.org/(.+)$")


def _norm(text: str | None) -> str | None:
    return None if text is None else " ".join(text.split())


def _text(el: etree._Element | None) -> str | None:
    return None if el is None else _norm("".join(el.itertext()))


def _attrs(raw: str) -> dict[str, str]:
    return {k: html.unescape(v) for k, v in ATTR.findall(raw)}


def _page_slice(source: str, folio: str) -> str:
    """Return the raw source from the folio's `pb` up to the next `pb`."""
    m = re.search(rf'<pb\b[^>]*\bn="{re.escape(folio)}"[^>]*>', source)
    if not m:
        raise SystemExit(
            f'FEHLER: no <pb n="{folio}"> in the codex; check the codex argument'
        )
    end = source.find("<pb", m.end())
    return source[m.start() : end if end >= 0 else len(source)]


def _context(stack: list[tuple[str, dict[str, str]]]) -> dict:
    def first(name: str, key: str | None = None):
        for tag, at in stack:
            if tag == name:
                return at.get(key) if key else at
        return None

    return {
        "rend": [at["rend"] for tag, at in stack if tag == "hi" and "rend" in at],
        "ref": first("ref"),
        "supplied": first("supplied", "reason"),
        "del": any(tag == "del" for tag, _ in stack),
        "unclear": any(tag == "unclear" for tag, _ in stack),
        "damage": any(tag == "damage" for tag, _ in stack),
        "fw": first("fw", "ana"),
        "abbr": any(tag == "abbr" for tag, _ in stack),
        "expan": any(tag == "expan" for tag, _ in stack),
    }


def _tokenise(seg: str) -> list[dict]:
    """Split the page slice into columns, lines and tokens.

    A word token is appended at `</w>` to the line on which the word began, so
    anchors inside a word precede it in that line; `inWord` names the
    enclosing word for them.
    """
    columns: list[dict] = []
    lines: list[dict] | None = None
    cur: dict | None = None
    stack: list[tuple[str, dict[str, str]]] = []
    word: dict | None = None
    word_line: dict | None = None  # the line at the word's start tag
    for m in TOKEN.finditer(seg):
        close, name, raw, selfclosing, text = m.groups()
        if text is not None:
            if word is not None and text.strip():
                word["text"] += html.unescape(text.strip())
            continue
        at = _attrs(raw)
        if name == "cb":
            if not close:
                columns.append({"lines": []})
                lines = columns[-1]["lines"]
                cur = None
        elif name == "lb":
            if not close:
                if lines is None:
                    columns.append({"lines": []})
                    lines = columns[-1]["lines"]
                cur = {"id": at.get("xml:id"), "facs": at.get("facs"), "tokens": []}
                lines.append(cur)
                # An lb before the word's first character moves the word to its line.
                if word is not None and word["text"]:
                    word["text"] += "\n"
                elif word is not None:
                    word_line = cur
        elif name == "anchor":
            if not close and cur is not None:
                (word_line if word is not None else cur)["tokens"].append(
                    {
                        "type": "anchor",
                        "id": at.get("xml:id"),
                        "inWord": word["id"] if word else None,
                    }
                )
        elif name == "milestone":
            if not close and cur is not None:
                cur["tokens"].append({"type": "milestone", "unit": at.get("unit")})
        elif name == "w":
            if not close:
                word = {
                    "type": "w",
                    "id": at.get("xml:id"),
                    "orig": at.get("orig"),
                    "norm": at.get("norm"),
                    "text": "",
                }
                word.update(_context(stack))
                word_line = cur
            else:
                if word_line is not None and word is not None:
                    word_line["tokens"].append(word)
                word = None
                word_line = None
        elif name == "pc":
            if not close and cur is not None:
                following = re.match(r"([^<]*)", seg[m.end() :]).group(1)
                cur["tokens"].append(
                    {
                        "type": "pc",
                        "text": html.unescape(following.strip()),
                        "supplied": _context(stack)["supplied"],
                    }
                )
        elif name in INLINE:
            if name == "hi" and word is not None:
                if not close and "rend" in at:
                    word["rend"].append(at["rend"])
                continue
            if close:
                for i in range(len(stack) - 1, -1, -1):
                    if stack[i][0] == name:
                        del stack[i]
                        break
            elif not selfclosing:
                stack.append((name, at))
    return columns


def _positions(columns: list[dict]):
    for ci, col in enumerate(columns):
        for li, line in enumerate(col["lines"]):
            for ti, tok in enumerate(line["tokens"]):
                yield {"column": ci, "line": li, "index": ti}, tok


def _register_use(columns: list[dict]) -> list[dict]:
    use: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for pos, tok in _positions(columns):
        ref = tok.get("ref") if tok["type"] == "w" else None
        if ref and ref.get("target") and ref.get("type"):
            use[(ref["type"].lower(), ref["target"].strip())].append(
                {"word": tok["id"], **pos}
            )
    return [
        {"type": t, "id": i, "words": words} for (t, i), words in sorted(use.items())
    ]


def _register_counts(text_el: etree._Element) -> tuple[dict[str, list[dict]], int]:
    counts: Counter[tuple[str, str]] = Counter()
    untargeted = 0
    for ref in text_el.iter(f"{TEI}ref"):
        kind = (ref.get("type") or "").lower()
        if kind not in REGISTER_TYPES:
            continue
        target = (ref.get("target") or "").strip()
        if not target:
            untargeted += 1
            continue
        counts[(kind, target)] += 1
    out: dict[str, list[dict]] = {k: [] for k in REGISTER_TYPES}
    for (kind, target), n in sorted(counts.items()):
        out[kind].append({"type": kind, "id": target, "count": n})
    return out, untargeted


def _apparatus(
    root: etree._Element, columns: list[dict]
) -> tuple[list[dict], list[dict]]:
    anchors = {
        tok["id"]: {**pos, "inWord": tok["inWord"]}
        for pos, tok in _positions(columns)
        if tok["type"] == "anchor" and tok["id"]
    }
    types: Counter[str | None] = Counter()
    entries = []
    for app in root.iter(f"{TEI}app"):
        types[app.get("type")] += 1
        fr = (app.get("from") or "").lstrip("#")
        to = (app.get("to") or "").lstrip("#")
        if fr not in anchors and to not in anchors:
            continue
        notes = {n.get(XML_LANG): _text(n) for n in app.findall(f"{TEI}note")}
        entries.append(
            {
                "from": fr,
                "to": to,
                "type": app.get("type"),
                "notes": notes,
                "id": app.get(XML_ID),
                "anchors": {"from": anchors.get(fr), "to": anchors.get(to)},
            }
        )
    by_count = sorted(types.items(), key=lambda kv: (-kv[1], kv[0] or ""))
    return entries, [{"type": t, "count": n} for t, n in by_count]


def _surface(root: etree._Element, page_id: str) -> etree._Element:
    for surface in root.iter(f"{TEI}surface"):
        if surface.get(XML_ID) == page_id:
            return surface
    raise SystemExit(f"FEHLER: no surface {page_id} in the codex facsimile")


def _header(root: etree._Element) -> dict:
    header = root.find(f"{TEI}teiHeader")
    licence = (
        header.find(f".//{TEI}availability/{TEI}licence")
        if header is not None
        else None
    )
    pid = (
        next(
            (i.text for i in header.iter(f"{TEI}idno") if i.get("type") == "PID"), None
        )
        if header is not None
        else None
    )
    return {
        "pid": pid,
        "licence": None
        if licence is None
        else {"target": licence.get("target"), "text": _text(licence)},
    }


def _note(
    item: etree._Element, ntype: str, subtype: str | None
) -> etree._Element | None:
    for n in item.findall(f"{TEI}note"):
        if n.get("type") == ntype and n.get("subtype") == subtype:
            return n
    return None


def _note_field(n: etree._Element | None) -> dict | None:
    if n is None:
        return None
    return {"text": _text(n), "resp": n.get("resp"), "anchored": n.get("anchored")}


def _iconclass_ref(ref: etree._Element) -> dict:
    corresp = ref.get("corresp") or ""
    m = ICONCLASS_URI.search(corresp)
    notation = m.group(1) if m else None
    labels = {d.get(XML_LANG): _text(d) for d in ref.findall(f"{TEI}desc")}
    return {
        "notation": notation,
        "uri": f"https://iconclass.org/{notation}" if notation else None,
        "corresp": corresp,
        "resp": ref.get("resp"),
        "de": labels.get("de"),
        "en": labels.get("en"),
    }


def _iconclass_refs(el: etree._Element) -> list[dict]:
    return [
        _iconclass_ref(r)
        for r in el.iter(f"{TEI}ref")
        if r.get("type") == "iconclass-label"
    ]


def _list_by_type(item: etree._Element, tag: str, ltype: str) -> etree._Element | None:
    return next(
        (x for x in item.findall(f"{TEI}{tag}") if x.get("type") == ltype), None
    )


def _related(lst: etree._Element | None, tag: str) -> list[dict]:
    if lst is None:
        return []
    out = []
    for p in lst.findall(f"{TEI}{tag}"):
        corresp = p.get("corresp")
        out.append(
            {
                "id": corresp.lstrip("#").strip() if corresp else None,
                "corresp": corresp,
                "desc": _text(p.find(f"{TEI}desc")),
            }
        )
    return out


def _image_item(item: etree._Element, artist_names: dict[str, str]) -> dict:
    """Describe one image-annotation item: the flat keys of the first round plus `item` and `fields`."""
    title = item.find(f"{TEI}title")
    short = _note(item, "description", "short")
    long_ = _note(item, "description", None)
    content = _note(item, "text-relation", "content")
    statistic = _note(item, "text-relation", "statistic")
    height = item.find(f"{TEI}dimensions/{TEI}height")
    folio = next(
        (r for r in item.findall(f"{TEI}ref") if r.get("type") == "folio"), None
    )
    artists_list = _list_by_type(item, "listPerson", "artists")
    artists = []
    for p in artists_list.findall(f"{TEI}person") if artists_list is not None else []:
        sigle = (p.get("corresp") or "").lstrip("#")
        artists.append(
            {
                "sigle": sigle,
                "corresp": p.get("corresp"),
                "name": artist_names.get(sigle),
            }
        )
    persons = _related(_list_by_type(item, "listPerson", "related"), "person")
    places = _related(_list_by_type(item, "listPlace", "related"), "place")
    iconclass = _iconclass_refs(item)
    object_types = [
        {"text": _text(o), "rend": o.get("rend")}
        for o in item.findall(f"{TEI}objectType")
    ]
    stat = _note_field(statistic)
    if stat is not None:
        stat["corresp"] = statistic.get("corresp")
        m = RANGE.match(stat["corresp"] or "")
        stat["range"] = (
            {"first": m.group(1) or None, "last": m.group(2) or None} if m else None
        )
    corresp = item.get("corresp")
    return {
        "id": item.get(XML_ID),
        "zone": corresp.lstrip("#") if corresp else None,
        "title": _text(title),
        "short": _text(short),
        "long": _text(long_),
        "height": _text(height),
        "folio": [folio.get("n"), folio.get("target")] if folio is not None else None,
        "artists": [a["sigle"] for a in artists],
        "persons": [p["id"] for p in persons if p["id"]],
        "iconclass": [[ic["corresp"], ic["de"], ic["en"]] for ic in iconclass],
        "objectType": object_types[0]["text"] if object_types else None,
        "textRelation": _text(content),
        "statistic": _text(statistic),
        "item": {
            "list": item.getparent().get("subtype"),
            "corresp": corresp,
            "sameAs": item.get("sameAs"),
            "resp": item.get("resp"),
            "anchored": item.get("anchored"),
        },
        "fields": {
            "title": None
            if title is None
            else {"text": _text(title), "resp": title.get("resp")},
            "short": _note_field(short),
            "long": _note_field(long_),
            "objectTypes": object_types,
            "height": None
            if height is None
            else {"value": _text(height), "unit": height.get("unit")},
            "folio": None
            if folio is None
            else {"n": folio.get("n"), "target": folio.get("target")},
            "artists": None
            if artists_list is None
            else {"resp": artists_list.get("resp"), "entries": artists},
            "relatedPersons": persons,
            "relatedPlaces": places,
            "iconclass": iconclass,
            "textRelation": _note_field(content),
            "statistic": stat,
        },
    }


def _page_items(
    bild: etree._Element,
    image_zones: set[str],
    folio: str,
    artist_names: dict[str, str],
) -> list[dict]:
    """Image-annotation items of the page, by zone pointer or by folio reference, in document order."""
    out = []
    for lst in bild.iter(f"{TEI}list"):
        if lst.get("type") != "image-annotations":
            continue
        for item in lst.findall(f"{TEI}item"):
            zone = (item.get("corresp") or "").lstrip("#")
            folio_ref = (
                next(
                    (
                        r.get("target")
                        for r in item.findall(f"{TEI}ref")
                        if r.get("type") == "folio"
                    ),
                    None,
                )
                or ""
            )
            if zone in image_zones or re.fullmatch(
                rf"{re.escape(folio)}[ab]?", folio_ref
            ):
                out.append(_image_item(item, artist_names))
    return out


def _iconclass_catalogue(bild: etree._Element) -> list[dict]:
    """Every distinct ICONCLASS notation of the image file with the number of items using it.

    The data carry differing labels for some notations; the most frequent pair
    is the entry's label and the others are kept as `variants`, so the lookup
    never silently drops a wording that is in the file.
    """
    items: dict[str, set[str]] = defaultdict(set)
    labels: dict[str, Counter[tuple[str | None, str | None]]] = defaultdict(Counter)
    irregular: dict[str, set[str]] = defaultdict(set)
    for item in bild.iter(f"{TEI}item"):
        for ic in _iconclass_refs(item):
            if not ic["notation"]:
                print(
                    f"WARNUNG: ICONCLASS ref without notation in {item.get(XML_ID)}: {ic['corresp']!r}",
                    file=sys.stderr,
                )
                continue
            items[ic["notation"]].add(item.get(XML_ID))
            labels[ic["notation"]][(ic["de"], ic["en"])] += 1
            if ic["corresp"] != ic["uri"]:
                irregular[ic["notation"]].add(ic["corresp"])
    out = []
    for notation in sorted(items):
        ranked = labels[notation].most_common()
        (de, en), _ = ranked[0]
        entry = {
            "notation": notation,
            "uri": f"https://iconclass.org/{notation}",
            "de": de,
            "en": en,
            "count": len(items[notation]),
        }
        if len(ranked) > 1:
            entry["variants"] = [
                {"de": d, "en": e, "count": n} for (d, e), n in ranked[1:]
            ]
        if irregular[notation]:
            entry["irregularCorresp"] = sorted(irregular[notation])
        out.append(entry)
    return out


def _write_json(data: dict, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    tmp.replace(out)


def build(codex_path: Path, bild_path: Path) -> tuple[dict, dict]:
    t0 = time.perf_counter()
    raw = codex_path.read_bytes()
    codex = etree.fromstring(raw, etree.XMLParser(huge_tree=True))
    parse_s = time.perf_counter() - t0
    seg = _page_slice(raw.decode("utf-8"), FOLIO)
    bild = etree.parse(str(bild_path)).getroot()

    pb = _attrs(re.match(r"<pb\b([^>]*)>", seg).group(1))
    page_id = pb["facs"].lstrip("#")
    surface = _surface(codex, page_id)
    graphic = surface.find(f"{TEI}graphic")
    stem = Path(graphic.get("url")).stem
    zones = [
        {
            "id": z.get(XML_ID),
            "type": z.get("type"),
            "subtype": z.get("subtype"),
            "points": z.get("points"),
        }
        for z in surface.iter(f"{TEI}zone")
    ]
    image_zones = {z["id"] for z in zones if z["type"] == "ImageRegion"}

    columns = _tokenise(seg)
    apparatus, apparatus_types = _apparatus(codex, columns)
    text_el = codex.find(f"{TEI}text")
    if text_el is None:
        raise SystemExit("FEHLER: the codex has no <text>; check the codex argument")
    codex_registers, untargeted = _register_counts(text_el)

    artist_names = {}
    for p in bild.iter(f"{TEI}persName"):
        sigle = p.get(XML_ID)
        name = p.find(f"{TEI}name")
        if sigle and len(sigle) == 2 and name is not None:
            artist_names[sigle] = _text(name)
    items = _page_items(bild, image_zones, FOLIO, artist_names)
    if not items:
        raise SystemExit(
            f"FEHLER: no image-annotation item for fol. {FOLIO} in the image file"
        )
    corresp_ids = sorted(
        {
            p.get("corresp").lstrip("#")
            for p in bild.iter(f"{TEI}person")
            if (p.get("corresp") or "").startswith("#")
        }
    )
    place_ids = sorted(
        {
            p.get("corresp").lstrip("#")
            for p in bild.iter(f"{TEI}place")
            if (p.get("corresp") or "").startswith("#")
        }
    )
    header = _header(codex)

    data = {
        "folio": FOLIO,
        "pageId": page_id,
        "image": {
            "stem": stem,
            "width": int(surface.get("lrx")),
            "height": int(surface.get("lry")),
            "iiif": IIIF_BASE.format(stem=stem),
        },
        "columns": columns,
        "apparatus": apparatus,
        "apparatusTypes": apparatus_types,
        "registers": {
            "persons": corresp_ids,
            "places": place_ids,
            "artists": list(artist_names.items()),
            "codex": codex_registers,
        },
        "registerUse": _register_use(columns),
        "iconclass": _iconclass_catalogue(bild),
        "miniature": items[0],
        "miniatures": items,
        "zones": zones,
        "xmlExcerpt": seg,
        "generated": {
            "script": "wireframe/extract_data.py",
            "sources": {"codex": codex_path.name, "images": bild_path.name},
            "pid": header["pid"],
            "licence": header["licence"],
            "date": date.today().isoformat(),
        },
    }
    stats = {
        "codex_parse_s": round(parse_s, 2),
        "total_s": round(time.perf_counter() - t0, 2),
        "untargeted_register_refs": untargeted,
    }
    return data, stats


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "codex", type=Path, help="public TEI of Codex 2759 (codex-2759.xml)"
    )
    ap.add_argument(
        "images",
        type=Path,
        help="public TEI of the image annotations (Bildannotationen.xml)",
    )
    ap.add_argument(
        "-o",
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="output JSON (default: data/wireframe/fol-1r.json)",
    )
    args = ap.parse_args()
    for p in (args.codex, args.images):
        if not p.is_file():
            print(f"FEHLER: input file not found: {p}", file=sys.stderr)
            return 1
    data, stats = build(args.codex, args.images)
    _write_json(data, args.out)
    regs = data["registers"]["codex"]
    print(f"OK {args.out}")
    print(f"   codex parse {stats['codex_parse_s']} s, total {stats['total_s']} s")
    print(
        f"   columns {[len(c['lines']) for c in data['columns']]}, apparatus {len(data['apparatus'])}, zones {len(data['zones'])}"
    )
    print(
        f"   register entries { ({k: len(v) for k, v in regs.items()}) }, refs without target {stats['untargeted_register_refs']}, used on page {len(data['registerUse'])}"
    )
    print(
        f"   apparatus types {len(data['apparatusTypes'])}, iconclass notations {len(data['iconclass'])}, image items on page {[m['id'] for m in data['miniatures']]}"
    )
    print(f"   pid {data['generated']['pid']}, licence {data['generated']['licence']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
