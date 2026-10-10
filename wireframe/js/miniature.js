// Image annotations (Epic 4): the document Bildannotationen with its item list, the
// miniature form (US4.1), the ICONCLASS lookup in the local catalogue (US4.2) and the
// text relation in the codex (US4.3). The form edits a draft of item.fields; Anwenden
// writes only the fields whose draft differs, as one history step.
import { $, el, state } from "./state.js";
import { commit, documentChanged, onChange } from "./history.js";
import { flowEvents, placeCaret, renderFlow, setColumn } from "./flow.js";
import { setView } from "./xml.js";
import { zoneActions } from "./facsimile.js";
import { closeInspector, holdForPendingInput, inspectorNote, openPanel, refreshInspector, sections } from "./inspector.js";
import { notify } from "./notice.js";

const FIELD_LABEL = {
  title: "Titel", short: "Kurzbeschreibung", long: "Beschreibung", objectTypes: "Objekttyp", height: "Höhe",
  folio: "Folio und Zeilen", artists: "Künstler", relatedPersons: "Personen", relatedPlaces: "Orte",
  iconclass: "ICONCLASS", textRelation: "Textbezug",
};
const ADDRESS_PREFIX = "#bild";
const CODEX_PREFIX = "#codex";
const narrow = matchMedia("(width < 48rem)");

let current = null;     // id of the item shown in the form
let draft = null;       // working copy of the current item's fields
let markedFor = null;   // id of the item whose text range is marked in the flow
let shownHash = location.hash; // the address the page last applied or set

const items = () => state.data.miniatures || [];
const itemById = (id) => items().find((m) => m.id === id);
// The document shown, which the select already leaves while its change is being checked.
let shownDoc = "codex";
const docIsImages = () => shownDoc === "images";

// Called by app.js once the data is loaded: zone handlers for every image subtype in the
// data, the address of F12, and the range marks that renderFlow would otherwise drop.
export function initMiniatures() {
  const subtypes = new Set(state.data.zones.filter((z) => z.type === "ImageRegion" && z.subtype).map((z) => z.subtype));
  for (const s of subtypes) zoneActions.set(s, openByZone);
  addEventListener("popstate", applyAddress);
  addEventListener("hashchange", applyAddress);
  flowEvents.addEventListener("column", () => { markRange(); if (!docIsImages()) setAddress(codexHash()); });
  // app.js re-renders the flow after this listener runs, so mark on the next frame.
  onChange(() => requestAnimationFrame(markRange));
  $("#toggle-facs").addEventListener("click", outlineZone);
  new MutationObserver(() => {
    if ($("#inspector").hidden && docIsImages() && !$("#inspector").contains(document.activeElement) && document.activeElement === document.body) {
      $(`#minis [data-item="${CSS.escape(current || "")}"]`)?.focus();
    }
  }).observe($("#inspector"), { attributes: true, attributeFilter: ["hidden"] });
  applyAddress(true);
  if (!location.hash) history.replaceState(null, "", codexHash());
  shownHash = location.hash;
}

// F25: the record whose item/@corresp points to the zone.
function openByZone(zoneId) {
  const m = items().find((x) => x.item.corresp === `#${zoneId}`) || items().find((x) => x.zone === zoneId);
  if (!m) { notify(`Zur Zone ${zoneId} gibt es keine Bildannotation.`); return; }
  if (!docIsImages() && !switchDocument("images", false)) return;
  selectMiniature(m.id);
}

// Page address (F12): "#codex/<folio>/<a|b>" for the codex column, "#bild" for the
// image annotations, "#bild/<item id>" with a chosen item. No hash is the codex, column a.
const codexHash = () => `${CODEX_PREFIX}/${state.data.folio}/${"ab"[state.column]}`;

function setAddress(hash) {
  shownHash = hash;
  if (location.hash === hash) return;
  history.pushState(null, "", hash || location.pathname + location.search);
}

// Back and Forward fire popstate and then hashchange; the second finds the address
// already applied. `initial` is true for the call on load.
function applyAddress(initial) {
  if (initial !== true && location.hash === shownHash) return;
  const h = decodeURIComponent(location.hash);
  const toImages = h === ADDRESS_PREFIX || h.startsWith(`${ADDRESS_PREFIX}/`);
  // Unapplied input keeps the document (F36), and the address returns to what is shown.
  if (toImages !== docIsImages() && holdForPendingInput()) {
    history.pushState(null, "", shownHash || location.pathname + location.search);
    return;
  }
  shownHash = location.hash;
  if (toImages) {
    const id = h.slice(ADDRESS_PREFIX.length + 1);
    if (!docIsImages()) switchDocument("images", false);
    if (!id && current) {
      current = null;
      closeInspector();
      syncList();
      outlineZone();
    } else if (id && id !== current) {
      if (itemById(id)) selectMiniature(id, false);
      else notify(`Die Bildannotation ${id} gibt es auf fol. ${state.data.folio} nicht.`);
    }
    return;
  }
  const [, folio, col] = /^#codex\/([^/]+)\/([ab])$/.exec(h) || [];
  if (h && !folio) notify(`Die Adresse ${h} bezeichnet keine Stelle dieses Entwurfs.`);
  else if (folio && folio !== state.data.folio) notify(`Fol. ${folio} liegt nicht im Entwurf, er enthält nur fol. ${state.data.folio}.`);
  if (docIsImages()) switchDocument("codex", false);
  const i = folio === state.data.folio ? "ab".indexOf(col) : 0;
  if (state.column !== i) setColumn(i);
}

// The second document of the document bar holds the image annotations of the folio.
// Every switch, from the select, an address, a zone or a jump, routes through here.
// Returns false and keeps the current document while the inspector holds input that is
// neither applied nor cancelled (F36).
export function switchDocument(which, address = true) {
  const isImages = which === "images";
  if (docIsImages() !== isImages && holdForPendingInput()) {
    $("#doc-select").value = shownDoc;
    return false;
  }
  $("#doc-select").value = which;
  shownDoc = which;
  $("#status-file").textContent = isImages ? "Bildannotationen.xml" : "codex-2759.xml";
  $("#pager").hidden = isImages;
  closeInspector();
  current = null;
  outlineZone();
  if (isImages) {
    renderList();
    setView("text");
    if (address) setAddress(ADDRESS_PREFIX);
  } else {
    renderFlow();
    setView(state.view);
    markRange();
    if (address) setAddress(codexHash());
  }
  documentChanged();
  return true;
}

const itemTitle = (m) => m.fields.title?.text || "";

function renderList() {
  const list = el("ul", { class: "mini-list", "aria-label": `Bildannotationen auf fol. ${state.data.folio}` });
  for (const m of items()) {
    const empty = !itemTitle(m) && m.item.sameAs;
    const label = empty ? `ohne Beschreibung, verweist auf ${m.item.sameAs.replace("#", "")}` : itemTitle(m) || "ohne Titel";
    list.append(el("li", {}, [el("button", {
      type: "button", class: "mini-item", "data-item": m.id, "aria-current": String(m.id === current),
      onclick: () => selectMiniature(m.id),
    }, [el("code", { text: m.id }), el("span", { class: empty ? "is-empty" : "", text: label })])]));
  }
  // Arrow keys move between the entries, Enter or Space opens one (native button).
  list.addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const btns = [...list.querySelectorAll("button")];
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length;
    btns[next].focus();
  });
  $("#minis").replaceChildren(el("h2", { class: "minis-title", text: `Bildannotationen auf fol. ${state.data.folio}` }), list);
}

function syncList() {
  for (const b of document.querySelectorAll("#minis .mini-item")) b.setAttribute("aria-current", String(b.dataset.item === current));
}

// Outlines the chosen item's zone in the facsimile and brings it into view. The zone
// layer exists only once the viewer has opened the image, so a pending open retries.
function outlineZone() {
  for (const z of document.querySelectorAll(".zone.is-chosen")) z.classList.remove("is-chosen");
  const m = current && itemById(current);
  if (!m) return;
  const zoneId = m.item.corresp?.replace("#", "") || m.zone;
  const poly = document.querySelector(`.zone[data-id="${CSS.escape(zoneId)}"]`);
  if (!poly) { if (state.facs && state.viewer && !state.viewer.world.getItemCount()) state.viewer.addOnceHandler("open", outlineZone); return; }
  poly.classList.add("is-chosen");
  const v = state.viewer;
  const z = state.data.zones.find((x) => x.id === zoneId);
  if (v && v.world.getItemCount() && z) {
    const pts = z.points.trim().split(/\s+/).map((p) => p.split(",").map(Number));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const zone = v.viewport.imageToViewportRectangle(x0, y0, x1 - x0, y1 - y0);
    const view = v.viewport.getBounds();
    const inView = zone.x >= view.x && zone.y >= view.y && zone.x + zone.width <= view.x + view.width && zone.y + zone.height <= view.y + view.height;
    // A zone already in view stays where the user sees it; otherwise bring it in.
    if (!inView) {
      const pad = 150;
      v.viewport.fitBounds(v.viewport.imageToViewportRectangle(x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad), matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }
}

// US4.1 form

export function selectMiniature(id, address = true) {
  const m = itemById(id);
  if (!m) return;
  if (!docIsImages() && !switchDocument("images", false)) return;
  current = id;
  draft = structuredClone(m.fields);
  syncList();
  outlineZone();
  if (address) setAddress(`${ADDRESS_PREFIX}/${id}`);
  const f = m.fields.folio;
  const where = f ? `fol. ${f.target}${f.n ? ` Z. ${f.n}` : ""}` : "";
  openPanel(
    [m.item.list === "miniatures" ? "Miniatur " : "Randbild ", el("span", { class: "context", text: [m.id, where].filter(Boolean).join(", ") })],
    m.item.sameAs && !m.fields.title ? emptyItem(m) : formNodes(m),
    () => { if (itemById(current)) selectMiniature(current, false); else closeInspector(); },
  );
  if (narrow.matches) $("#inspector-body").querySelector("input, textarea, button")?.focus();
}

function emptyItem(m) {
  const target = m.item.sameAs.replace("#", "");
  return [
    itemMeta(m),
    el("p", { class: "empty-note", text: `Ohne eigene Beschreibung. Das Bild verweist mit @sameAs auf ${target}.` }),
    el("button", { type: "button", class: "link-btn", text: `${target} öffnen`, onclick: () => selectMiniature(target) }),
  ];
}

// Responsibility values are shown, never edited: they record who described the field.
function respText(node) {
  if (!node) return "";
  const parts = [];
  if (node.resp) parts.push(`resp ${node.resp}`);
  if (node.anchored) parts.push(`anchored ${node.anchored}`);
  return parts.join(", ");
}

const respNode = (node) => { const t = respText(node); return t ? el("span", { class: "resp", text: t }) : null; };

function itemMeta(m) {
  const show = (v) => v ?? "nicht gesetzt";
  return el("p", { class: "item-meta" }, [
    el("span", { text: "item " }), el("code", { text: m.item.corresp || "" }),
    el("span", { text: `, Liste ${m.item.list}, resp ${show(m.item.resp)}, anchored ${show(m.item.anchored)}` }),
  ]);
}

// One labelled control bound to draft[key].text (or another path); the label carries
// the responsibility values of the element the field writes.
function textField(label, key, { multiline = false, prop = "text", resp = true, inputmode = null } = {}) {
  const node = draft[key];
  const value = node ? node[prop] ?? "" : "";
  const control = multiline ? el("textarea", { "data-key": key }) : el("input", { type: "text", "data-key": key });
  control.value = value;
  control.defaultValue = value;
  if (inputmode) control.setAttribute("inputmode", inputmode);
  control.addEventListener("input", () => {
    const v = control.value;
    const orig = itemById(current).fields[key];
    if (!orig && v === "" && Object.keys(draft[key] || {}).every((k) => k === prop || draft[key][k] == null)) { draft[key] = null; return; }
    if (!draft[key]) draft[key] = { [prop]: "" };
    draft[key][prop] = v;
  });
  const head = el("span", { class: "field-label" }, [el("span", { text: label })]);
  const r = resp && respNode(node);
  if (r) head.append(r);
  return el("label", { class: "field" }, [head, control]);
}

function formNodes(m) {
  const left = el("div", { class: "mini-col" }, [
    textField("Titel", "title"),
    objectTypeFields(),
    el("div", { class: "field-row" }, [
      textField("Höhe in Zeilen", "height", { prop: "value", resp: false, inputmode: "numeric" }),
      textField("Folio", "folio", { prop: "target", resp: false }),
      textField("Zeilen", "folio", { prop: "n", resp: false }),
    ]),
    artistFields(),
  ]);
  const right = el("div", { class: "mini-col" }, [
    textField("Kurzbeschreibung", "short", { multiline: true }),
    textField("Beschreibung", "long", { multiline: true }),
    tagList("Personen", "relatedPersons", state.data.registers.persons || [], "Personenregister"),
    tagList("Orte", "relatedPlaces", state.data.registers.places || [], "Ortsregister"),
  ]);
  return [
    itemMeta(m),
    el("div", { class: "mini-form" }, [left, right, iconclassSection(), textRelationSection(m)]),
    el("div", { class: "field-actions mini-actions" }, [
      el("button", { type: "button", class: "act-btn", text: "Abbrechen", onclick: cancel }),
      el("button", { type: "button", class: "act-btn is-primary", text: "Anwenden", onclick: apply }),
    ]),
  ];
}

function objectTypeFields() {
  if (!draft.objectTypes.length) draft.objectTypes.push({ text: "", rend: null });
  const wrap = el("div", { class: "field-group" });
  draft.objectTypes.forEach((o, i) => {
    const input = el("input", { type: "text", "data-key": "objectTypes" });
    input.value = o.text || "";
    input.defaultValue = input.value;
    input.addEventListener("input", () => { draft.objectTypes[i].text = input.value; });
    wrap.append(el("label", { class: "field" }, [
      el("span", { class: "field-label" }, [el("span", { text: "Objekttyp" }), el("span", { class: "resp" }, ["rend ", el("code", { text: o.rend || "nicht gesetzt" })])]),
      input,
    ]));
  });
  return wrap;
}

// Artists: sigle chosen from the header siglas (registers.artists), shown with the name.
function artistFields() {
  if (!draft.artists) draft.artists = { resp: null, entries: [] };
  const known = state.data.registers.artists || [];
  const wrap = el("fieldset", { class: "field-set" });
  const legend = el("legend", { class: "field-label" }, [el("span", { text: "Künstler" })]);
  const r = respNode(draft.artists);
  if (r) legend.append(r);
  wrap.append(legend);
  const render = () => {
    wrap.replaceChildren(legend);
    draft.artists.entries.forEach((a, i) => {
      const sel = el("select", { "aria-label": `Künstler ${i + 1}`, "data-key": "artists" }, known.map(([sigle, name]) => el("option", { value: sigle, text: `${sigle}, ${name}` })));
      sel.value = a.sigle;
      sel.addEventListener("change", () => {
        const name = known.find(([s]) => s === sel.value)?.[1] || "";
        draft.artists.entries[i] = { ...a, sigle: sel.value, corresp: `#${sel.value}`, name };
      });
      wrap.append(el("div", { class: "artist-row" }, [sel, el("button", {
        type: "button", class: "icon-btn", "aria-label": `Künstler ${a.sigle} entfernen`, text: "✕",
        onclick: () => { draft.artists.entries.splice(i, 1); render(); wrap.querySelector("select, .link-btn")?.focus(); },
      })]));
    });
    wrap.append(el("button", {
      type: "button", class: "link-btn", text: "+ Künstler",
      onclick: () => {
        const free = known.find(([s]) => !draft.artists.entries.some((a) => a.sigle === s));
        if (!free) { inspectorNote("Alle Künstler der Kopfdaten sind schon eingetragen."); return; }
        draft.artists.entries.push({ sigle: free[0], corresp: `#${free[0]}`, name: free[1] });
        render();
        [...wrap.querySelectorAll("select")].pop().focus();
      },
    }));
  };
  render();
  return wrap;
}

// Related persons or places as an editable tag list. Only register IDs are accepted,
// because person/@corresp must point to an entry; creating one is the register's task.
function tagList(label, key, register, registerName) {
  const wrap = el("div", { class: "field-group" });
  const listId = `mini-${key}-options`;
  const render = () => {
    const tags = el("ul", { class: "tags", "aria-label": label });
    draft[key].forEach((p, i) => {
      if (!p.id) { if (p.desc) tags.append(el("li", { class: "tag-note", text: p.desc })); return; }
      tags.append(el("li", { class: "tag" }, [el("span", { text: p.id }), el("button", {
        type: "button", class: "tag-remove", "aria-label": `${p.id} entfernen`, text: "✕",
        onclick: () => { draft[key].splice(i, 1); render(); input.focus(); },
      })]));
    });
    const input = el("input", { type: "text", list: listId, "aria-label": `${label} hinzufügen`, placeholder: "ID hinzufügen …", autocomplete: "off", "data-key": key });
    const add = () => {
      const id = input.value.trim();
      if (!id) return;
      if (!register.includes(id)) { inspectorNote(`${label}: „${id}“ steht nicht im ${registerName}.`); return; }
      if (draft[key].some((p) => p.id === id)) { inspectorNote(`${label}: „${id}“ ist schon eingetragen.`); return; }
      // A desc-only entry ("kein eindeutiger Bezug") no longer holds once an ID is added.
      draft[key] = draft[key].filter((p) => p.id);
      draft[key].push({ id, corresp: `#${id}`, desc: null });
      render();
      wrap.querySelector("input").focus();
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
    wrap.replaceChildren(
      el("span", { class: "field-label" }, [el("span", { text: label })]),
      tags,
      el("div", { class: "tag-add" }, [input, el("button", { type: "button", class: "act-btn", text: "Hinzufügen", onclick: add })]),
      el("datalist", { id: listId }, register.map((r) => el("option", { value: r }))),
    );
  };
  render();
  return wrap;
}

// US4.2: ICONCLASS entries and the lookup in the local catalogue

const fold = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
const strip = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const searchKey = (s) => `${strip(s)}\n${fold(s)}`;

let catalogueIndex = null;
function catalogue() {
  if (!catalogueIndex) {
    catalogueIndex = (state.data.iconclass || []).map((e) => ({
      e, notation: e.notation.toLowerCase(),
      key: searchKey([e.de, e.en, ...(e.variants || []).flatMap((v) => [v.de, v.en])].join("\n")),
    }));
  }
  return catalogueIndex;
}

// Notation prefix hits first, then term hits in the German or English labels.
export function searchIconclass(query) {
  const q = query.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const qs = [strip(q), fold(q)];
  const byNotation = catalogue().filter((c) => c.notation.startsWith(lower));
  const byTerm = catalogue().filter((c) => !c.notation.startsWith(lower) && qs.some((x) => c.key.includes(x)));
  return [...byNotation, ...byTerm].map((c) => c.e);
}

const catalogueEntry = (notation) => (state.data.iconclass || []).find((e) => e.notation === notation);

function variantsNote(notation) {
  const v = catalogueEntry(notation)?.variants;
  if (!v?.length) return null;
  return el("p", { class: "ic-variants" }, [
    el("strong", { text: "Abweichende Bezeichnungen im Bestand: " }),
    ...v.flatMap((x, i) => [i ? "; " : "", `de „${x.de}“, en „${x.en}“ (${x.count}×)`]),
  ]);
}

function iconclassSection() {
  const sec = el("div", { class: "mini-wide ic-section" });
  const render = (focusRow = -1) => {
    const rows = el("ul", { class: "ic-entries", "aria-label": "ICONCLASS-Einträge" });
    draft.iconclass.forEach((entry, i) => {
      const input = (label, prop) => {
        const x = el("input", { type: "text", "aria-label": `${label} ${i + 1}`, "data-key": "iconclass" });
        x.value = entry[prop] || "";
        x.defaultValue = x.value;
        x.addEventListener("input", () => {
          entry[prop] = x.value;
          if (prop === "notation") entry.uri = entry.corresp = `https://iconclass.org/${x.value.trim()}`;
        });
        return el("label", { class: "field" }, [el("span", { text: label }), x]);
      };
      const isNew = !itemById(current).fields.iconclass.some((o) => o.notation === entry.notation);
      rows.append(el("li", { class: "ic-entry" }, [
        el("div", { class: "ic-entry-head" }, [
          el("span", { class: "resp", text: `resp ${entry.resp || "nicht gesetzt"}${isNew ? ", neu, noch nicht angewendet" : ""}` }),
          el("button", { type: "button", class: "link-btn", text: "Entfernen", "aria-label": `ICONCLASS ${entry.notation} entfernen`, onclick: () => { draft.iconclass.splice(i, 1); render(); sec.querySelector(".ic-search-open").focus(); } }),
        ]),
        el("div", { class: "ic-fields" }, [input("Notation", "notation"), input("Deutsch", "de"), input("Englisch", "en")]),
        ...[variantsNote(entry.notation)].filter(Boolean),
      ]));
    });
    if (!draft.iconclass.length) rows.append(el("li", { class: "empty-note", text: "Keine ICONCLASS-Einträge." }));
    const open = el("button", { type: "button", class: "link-btn ic-search-open", "aria-expanded": "false", text: "ICONCLASS suchen …" });
    const search = searchPanel((hit) => {
      if (draft.iconclass.some((e) => e.notation === hit.notation)) { inspectorNote(`ICONCLASS ${hit.notation} ist schon eingetragen.`); return; }
      draft.iconclass.push({ notation: hit.notation, uri: hit.uri, corresp: hit.uri, resp: "#ICONCLASS", de: hit.de, en: hit.en });
      render(draft.iconclass.length - 1);
    });
    open.addEventListener("click", () => {
      const show = search.hidden;
      search.hidden = !show;
      open.setAttribute("aria-expanded", String(show));
      if (show) search.querySelector("input").focus();
    });
    sec.replaceChildren(el("div", { class: "group-title", text: "ICONCLASS" }), rows, open, search);
    if (focusRow >= 0) rows.children[focusRow].querySelector("input").focus();
  };
  render();
  return sec;
}

function searchPanel(onPick) {
  const input = el("input", {
    type: "search", role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": "ic-hits",
    "aria-label": "ICONCLASS nach Notation oder Begriff suchen", placeholder: "Notation oder Begriff, z. B. 11C21", autocomplete: "off",
  });
  const status = el("p", { class: "ic-count", role: "status" });
  const list = el("ul", { class: "ic-hits", id: "ic-hits", role: "listbox", "aria-label": "ICONCLASS-Treffer", hidden: "" });
  let active = -1;
  let hits = [];
  const setActive = (i) => {
    const opts = [...list.children];
    active = opts.length ? (i + opts.length) % opts.length : -1;
    opts.forEach((o, j) => { o.classList.toggle("is-active", j === active); o.setAttribute("aria-selected", String(j === active)); });
    if (active >= 0) { input.setAttribute("aria-activedescendant", opts[active].id); opts[active].scrollIntoView({ block: "nearest" }); }
  };
  // refocus false: another layer (an opening menu) takes over and keeps the focus.
  list.closeList = (refocus = true) => {
    list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
    if (refocus) input.focus();
  };
  const pick = (hit) => { list.closeList(); input.value = ""; status.textContent = ""; panel.hidden = true; panel.previousElementSibling.setAttribute("aria-expanded", "false"); onPick(hit); };
  const update = () => {
    hits = searchIconclass(input.value);
    list.replaceChildren(...hits.slice(0, 20).map((h, i) => el("li", { class: "ic-hit", id: `ic-hit-${i}`, role: "option", "aria-selected": "false", onclick: () => pick(h) }, [
      el("code", { text: h.notation }),
      el("span", {}, [el("span", { class: "lang", text: "de " }), h.de, el("br"), el("span", { class: "lang", text: "en " }), h.en,
        ...(h.variants?.length ? [el("br"), el("span", { class: "ic-variant-flag", text: `${h.variants.length} abweichende Bezeichnung${h.variants.length > 1 ? "en" : ""} im Bestand` })] : [])]),
    ])));
    active = -1;
    input.removeAttribute("aria-activedescendant");
    const q = input.value.trim();
    status.textContent = !q ? "" : hits.length ? `${hits.length} Treffer${hits.length > 20 ? ", die ersten 20 angezeigt" : ""}` : "Kein Treffer im lokalen Katalog.";
    list.hidden = !hits.length;
    input.setAttribute("aria-expanded", String(!list.hidden));
    if (!list.hidden) list.scrollIntoView({ block: "nearest" });
  };
  input.addEventListener("input", update);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) update();
      if (!list.hidden) setActive(active < 0 && e.key === "ArrowUp" ? -1 : active + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!list.hidden && active >= 0) pick(hits[active]);
    }
  });
  list.addEventListener("mousedown", (e) => e.preventDefault());
  const panel = el("div", { class: "ic-search", hidden: "" }, [
    el("p", { class: "ic-scope", text: "Durchsucht den lokalen Katalog: die Notationen, die in den Bildannotationen des Codex verwendet sind. Die Abfrage des ICONCLASS-Dienstes gehört zum eigentlichen Build." }),
    input, status, list,
  ]);
  return panel;
}

// US4.3: text relation

// statistic/@corresp has the form "#range(first-word-id, last-word-id)".
function parseRange(stat) {
  const hit = /^#range\(\s*([^,\s)]+)\s*,\s*([^,\s)]+)\s*\)$/.exec(stat?.corresp || "");
  return hit ? { first: hit[1], last: hit[2] } : null;
}

function textRelationSection(m) {
  const stat = m.fields.statistic;
  const range = parseRange(stat);
  const sec = el("div", { class: "mini-wide" }, [textField("Textbezug (Inhalt)", "textRelation", { multiline: true })]);
  const box = el("div", { class: "range" }, [el("div", { class: "field-label" }, [el("span", { text: "Textbezug (Umfang)" }), ...[respNode(stat)].filter(Boolean)])]);
  if (stat?.text) box.append(el("p", { text: stat.text }));
  if (range) {
    const cov = coverage(m);
    box.append(el("dl", { class: "range-ids" }, [
      el("dt", { text: "Erstes Wort" }), el("dd", {}, [el("code", { text: range.first }), cov.firstHere ? "" : " (nicht auf dieser Seite)"]),
      el("dt", { text: "Letztes Wort" }), el("dd", {}, [el("code", { text: range.last }), cov.lastHere ? "" : ` (nicht auf fol. ${state.data.folio}, ${rangeEndHint(stat)})`]),
    ]));
    box.append(el("button", { type: "button", class: "act-btn", text: "Im Text zeigen", onclick: () => showMiniatureText(m.id) }));
  } else {
    box.append(el("p", { class: "empty-note", text: "Kein Wortbereich erfasst." }));
  }
  sec.append(box);
  return sec;
}

// The statistic text names the end in folio terms ("bis f.2r Z.6-6"); that is all the
// page knows about a range end on another folio.
function rangeEndHint(stat) {
  const end = /bis f\.(\S+)\s+Z\.(\S+)/.exec(stat.text || "");
  return end ? `endet auf fol. ${end[1]} Z. ${end[2]}` : "endet auf einer anderen Seite";
}

// Words of the page in reading order (column a, then b), without running heads, which
// are not part of any text range. Words without an xml:id are kept: they lie inside a
// range by their position even though no range can start or end on them.
function pageWords() {
  return state.data.columns.flatMap((c, ci) => c.lines.flatMap((l) => l.tokens.filter((t) => t.type === "w" && !t.fw).map((t) => ({ tok: t, id: t.id, column: ci }))));
}

// Coverage on this page: from the first word (or the page start when it lies earlier)
// to the last word (or the page end when it lies later). A range with neither end on
// the page cannot be placed from this page alone and covers nothing here.
function coverage(m) {
  const range = parseRange(m.fields.statistic);
  const words = pageWords();
  if (!range) return { toks: new Set(), firstHere: false, lastHere: false };
  const a = words.findIndex((w) => w.id === range.first);
  const b = words.findIndex((w) => w.id === range.last);
  const res = { toks: new Set(), firstHere: a >= 0, lastHere: b >= 0 };
  if (a < 0 && b < 0) return res;
  for (const w of words.slice(a < 0 ? 0 : a, b < 0 ? words.length : b + 1)) res.toks.add(w.tok);
  return res;
}

export function showMiniatureText(id) {
  const m = itemById(id);
  const range = m && parseRange(m.fields.statistic);
  if (!range) return;
  if (docIsImages() && !switchDocument("codex")) return;
  if (state.view !== "text") setView("text");
  const col = pageWords().find((w) => w.id === range.first)?.column ?? 0;
  if (state.column !== col) setColumn(col);
  markedFor = id;
  markRange();
  const k = state.words.findIndex((w) => w.tok.id === range.first);
  if (k >= 0) placeCaret(k);
}

function markRange() {
  for (const n of document.querySelectorAll(".w.in-mini-range")) n.classList.remove("in-mini-range");
  const m = markedFor && itemById(markedFor);
  if (!m || docIsImages()) return;
  const toks = coverage(m).toks;
  for (const w of state.words) if (toks.has(w.tok)) w.node.classList.add("in-mini-range");
}

// Inspector section of the word states: the images whose text range covers a selected word.
sections.push((words) => {
  if (!state.data.miniatures) return null;
  const hits = items().map((m) => ({ m, cov: coverage(m) })).filter(({ cov }) => words.some((w) => cov.toks.has(w.tok)));
  if (!hits.length) return null;
  const sec = el("div", { class: "mini-refs" }, [el("div", { class: "group-title", text: words.length > 1 ? "Bilder zu dieser Auswahl" : "Bilder zu diesem Wort" })]);
  const list = el("ul", { class: "mini-ref-list" });
  for (const { m, cov } of hits) {
    const stat = m.fields.statistic;
    const li = el("li", {}, [
      el("button", { type: "button", class: "link-btn", onclick: () => selectMiniature(m.id) }, [el("code", { text: m.id }), ` ${itemTitle(m)}`]),
      el("span", { class: "range-note", text: `Umfang: ${stat.text.split(" WB:")[0]}${cov.lastHere ? "" : `; der Bereich ${rangeEndHint(stat)}, markiert ist er bis zum Seitenende`}` }),
    ]);
    if (markedFor === m.id) li.append(el("button", { type: "button", class: "link-btn", text: "Markierung entfernen", onclick: () => { markedFor = null; markRange(); } }));
    list.append(li);
  }
  sec.append(list);
  return sec;
});

// Anwenden and Abbrechen of the form

function cancel() {
  refreshInspector();
  inspectorNote("Eingaben verworfen, die gespeicherten Werte sind wiederhergestellt.");
}

function apply() {
  const m = itemById(current);
  if (!m) return;
  const clean = structuredClone(draft);
  clean.objectTypes = clean.objectTypes.filter((o) => o.text.trim() || o.rend);
  if (clean.height && !clean.height.unit) clean.height.unit = "line";
  if (!m.fields.artists && !clean.artists.entries.length) clean.artists = null;
  const changed = Object.keys(FIELD_LABEL).filter((k) => JSON.stringify(clean[k] ?? null) !== JSON.stringify(m.fields[k] ?? null));
  if (!changed.length) { inspectorNote("Keine Änderung."); return; }
  const h = clean.height?.value?.trim();
  if (changed.includes("height") && h && !/^\d+$/.test(h)) { refuse("height", "Höhe in Zeilen muss eine ganze Zahl sein."); return; }
  if (changed.includes("iconclass") && clean.iconclass.some((e) => !e.notation.trim())) { refuse("iconclass", "Jeder ICONCLASS-Eintrag braucht eine Notation."); return; }
  const labels = changed.map((k) => FIELD_LABEL[k]).join(", ");
  commit(`Bildannotation ${m.id}: ${labels}`, (data) => {
    const target = data.miniatures.find((x) => x.id === current);
    for (const k of changed) target.fields[k] = clean[k];
  }, "images");
  refreshInspector();
  syncTitleInList();
  inspectorNote(`Übernommen: ${labels}.`);
}

function refuse(key, reason) {
  inspectorNote(`${reason} Nichts geändert.`);
  $(`#inspector-body [data-key="${key}"]`)?.focus();
}

function syncTitleInList() { if (docIsImages()) renderList(); }

onChange((kind) => { if ((kind === "undo" || kind === "redo") && docIsImages() && $("#minis").hidden === false) renderList(); });

// The hit list is the topmost Escape layer while open (design.md, Escape order). The
// window capture phase runs before menu.js's document listener, which would otherwise
// close the whole inspector.
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const hits = document.querySelector(".ic-hits:not([hidden])");
  if (!hits) return;
  e.preventDefault();
  e.stopPropagation();
  hits.closeList();
}, true);
