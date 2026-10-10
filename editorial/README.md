# Editorial layer

This folder holds the project rules of the Wenzelsbibel edition in a form that both teiCrafter and Oxygen XML Editor can read. The rules come from [knowledge/editorial-guidelines.md](../knowledge/editorial-guidelines.md), which states them against the *Transkriptionshandbuch* (version February 2025) and the real data. Nothing here depends on the editor's code.

| File | Purpose |
|---|---|
| `wenzelsbibel.sch` | ISO Schematron, `queryBinding="xslt1"`, TEI namespace, phases `editing` (default) and `review`, German messages for the editor |
| `fixtures/` | One synthetic positive and one synthetic negative TEI file per rule, named `<rule-id>.pass.xml` and `<rule-id>.fail.xml`, listed in `fixtures/index.json` with rule, phase, severity, expected outcome and file |
| `check_fixtures.py` | Runs every fixture in its phase and reports per-rule counts over real files |
| `data-findings.md` | Dated snapshot of a review run over the public edition files |

The fixtures are hand-built and CC0. They model the structures of the codex and the image annotations (words with `@orig` and `@norm`, `standOff/listApp` with anchors, typed `ref`, annotation items) and contain no edition text beyond single words.

## Phases

The `editing` phase holds only what a save must never break, and the published codex and image annotations pass it unchanged. The `review` phase activates the editing patterns as well and adds word identifiers, non-empty register pointers, the handbook vocabularies, the apparatus and register checks and the completeness rules for image annotations. Every assert and report carries an `id` and a `role`. Values that the handbook does not name but the data uses are reported with `role="warning"`, so the edition team sees them without the file failing on values that await its decision. Values that appear in neither source are errors.

## Rules

| Rule | Phase | Severity | Checks |
|---|---|---|---|
| `tei-root` | editing | error | Root element `TEI` in the TEI namespace |
| `app-from-to` | editing | error | `app` has `@from` and `@to`, or `@sameAs` |
| `register-type` | editing | error | Register link (`rs`, or `ref` in the codex body) has `@type` person, place or folk, case-insensitive |
| `w-id` | review | error | `w` with `@orig` or `@norm` has an `xml:id` |
| `register-pointer` | review | error | `rs/@ref` or `ref/@target` is not empty |
| `hi-rend-known` | review | error | `hi/@rend` is a handbook or data value |
| `hi-rend-data-only` | review | warning | `hi/@rend` is `ligature`, `textStyle`, `decoration`, `full_page`, `marginalia` or `italic` |
| `supplied-reason-known` | review | error | `supplied` has `@reason` from handbook or data |
| `supplied-reason-data-only` | review | warning | `supplied/@reason="additionalPunctuation"` |
| `surplus-reason-known` | review | error | `surplus/@reason` absent or from the handbook |
| `del-type-known` | review | error | `del/@type` absent, `erasure`, `redemption_point` or `erasure_point` |
| `del-type-data-only` | review | warning | `del/@type="erasure_point"` (handbook XPath says `redemption_point`) |
| `foreign-lang-known` | review | error | `foreign/@xml:lang` is `lat` or `cze` |
| `num-type-known` | review | error | `num/@type="chapter"` |
| `note-type-known` | review | error | `note` in the codex body has `@type="instruction"` |
| `fw-ana-known` | review | error | `fw/@ana` is one of the seven handbook region types |
| `seg-ana-known` | review | error | `seg/@ana` is a handbook region type or one of the data spellings `border-decoration`, `border_decoration` |
| `seg-ana-data-only` | review | warning | Every region encoded as `seg/@ana`, because the handbook encodes regions as `fw/@ana` |
| `app-type-known` | review | error | `app/@type` is one of the seven types in the guidelines |
| `app-sameas-unanchored` | review | warning | `app` with `@sameAs` but without `@from` and `@to` |
| `app-anchors-resolve` | review | error | `@from` and `@to` have the form `#ID` and resolve to `anchor` elements in the same document's `text` |
| `app-order` | review | error | The `@from` anchor precedes the `@to` anchor, and they differ |
| `register-pointer-syntax` | review | error | Register pointer has no leading, trailing or inner whitespace |
| `register-type-case` | review | warning | Register `@type` deviates in case from person, place, folk |
| `image-title` | review | error | Annotation item (miniatures and margins, without `@sameAs`) has a non-empty `title` |
| `image-description` | review | error | Same items have a non-empty `note[@type='description']` without subtype |
| `image-folio` | review | error | Same items have `ref[@type='folio']` with `@target` |
| `image-artist` | review | error | Same items have `listPerson[@type='artists']/person/@corresp` |
| `image-short-description` | review | error | Miniature items have a non-empty short description |
| `image-height` | review | error | Miniature items have a positive `dimensions/height` |
| `image-artist-resolves` | review | error | Each artist pointer resolves to a distinct header `respStmt/persName/@xml:id` |
| `iconclass-target` | review | error | `ref[@type='iconclass-label']` has `@corresp` |
| `iconclass-label-de` | review | error | ICONCLASS entry has a non-empty `desc[@xml:lang='de']` |
| `iconclass-label-en` | review | error | ICONCLASS entry has a non-empty `desc[@xml:lang='en']` |
| `image-range-syntax` | review | error | A statistical text relation with `@corresp` has the form `#range(start, end)` with two non-empty IDs |

The image rules come from the base draft `docs/schemas/wenzelsbibel-editorial.sch` of teiCrafter with three changes. Items with `@sameAs` are exempt from completeness, because the data uses them as empty pointers to an equivalent item. Short description and height are required for miniatures only, because marginal decorations carry neither in the data and the editor's form covers the miniature list. The range syntax is checked where `@corresp` is present, so that an empty statistical note on a marginal decoration is no error, while `#range(,)` still is.

Some decisions in the rules are provisional and follow open ratification points of the guidelines. The editing phase accepts `type="Person"` so that the existing codex stays saveable, and the review phase reports it. The register context covers `rs` anywhere and `ref` in a `body` outside the image-annotation lists, which matches the handbook form `ref[@type][@target]` and the proposed form `rs[@type][@ref]`. The pointer form (`#ID` or `registers.xml#ID`) is not checked, because it is undecided. `damage/@agent`, `add/@place`, `div/@type`, `milestone/@unit`, `p/@ana` and `objectType/@rend` have no handbook value list and are not checked.

## Runtime limits

The schema uses only XPath 1.0, `sch:rule`, `sch:assert`, `sch:report`, scalar `sch:let` and `sch:value-of`. Rule contexts begin with a child step or `/`, so the raw Schematron runtime of teiCrafter accepts them, and no rule needs precompiled XSLT. That runtime evaluates every rule of a pattern independently, whereas XSLT applies the first matching rule per pattern. The rules within one pattern therefore have disjoint contexts, so both engines report the same findings.

Two rules are expensive. `app-anchors-resolve` and `app-order` look up anchors with `/tei:TEI/tei:text/descendant::tei:anchor[@xml:id = ...]`, which scans the text once per lookup. Each `app` costs two scans, one `count` and one first-in-document-order lookup. Over the full codex this pattern took about 90 seconds in lxml on 2026-10-10, and the browser runtime will probably need a comparable or longer time. Two upgrade paths exist. A precompiled XSLT with `xsl:key` makes the lookup linear, and the XPath function `id()` is constant-time in libxml2, which treats `xml:id` as an ID. Browser support for `xml:id` in `id()` is not established, so the raw schema avoids it. Alternatively the tool's project checks can take over anchor resolution.

The runtime keeps the `role` of each finding, but in the base version read for this layer every finding, warnings included, makes the result invalid. The `review` phase is therefore a report and should not gate saving.

## Binding in Oxygen

Oxygen associates a Schematron through an `xml-model` processing instruction at the top of the TEI file:

```xml
<?xml-model href="https://tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<?xml-model href="editorial/wenzelsbibel.sch" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron" phase="review"?>
```

The `href` is relative to the TEI file. Without `phase`, Oxygen runs the `defaultPhase` `editing`. Oxygen documents a `phase` pseudo-attribute for Schematron associations. Whether the version in use honours it was not tested for this layer. A validation scenario in Oxygen can fix the phase instead. The processing instructions change the edition files, so they belong in the working copies of the edition team. A later Oxygen framework (an `.exf` extension script with Author mode CSS) can bind the same schema without touching the files, as described in [knowledge/integration.md](../knowledge/integration.md).

## Binding in teiCrafter

The project manifest `teicrafter.project.json` declares the schema set in `schema.schemas`, with paths relative to the project folder:

```json
"schema": {
  "schemas": [
    { "type": "relaxng", "path": "schemas/tei-p5-4.11.0/tei_all.rng", "name": "TEI All" },
    { "type": "schematron", "path": "wenzelsbibel.sch", "name": "Editionsregeln" }
  ]
}
```

Paths resolve inside the granted project folder. The runtime executes the schema's `defaultPhase`, and the review action switches to `review` by rewriting that attribute. GitHub Pages serves only `docs/`, so the published editor reads a byte-identical copy of `wenzelsbibel.sch` under `docs/`, guarded by an equality check. This copy is planned in [knowledge/plan.md](../knowledge/plan.md) and not yet in place.

## Running the check

The script needs Python 3.11 or later and lxml. It carries its dependency as PEP 723 metadata, so `uv run editorial/check_fixtures.py` installs lxml on the fly, and plain `python` works where lxml is already installed.

```
python editorial/check_fixtures.py
python editorial/check_fixtures.py --data path/to/codex-2759.xml path/to/Bildannotationen.xml
python editorial/check_fixtures.py --phase editing --data path/to/codex-2759.xml
```

The first form checks the fixture manifest against the schema (every rule has one pass and one fail fixture with matching phase and severity), runs all fixtures and exits with 1 on any mismatch. A pass fixture must leave its rule silent, a fail fixture must trigger it. The `--data` form prints findings per rule with one example each and writes nothing. The edition files stay outside the repository, see [knowledge/data.md](../knowledge/data.md#storage-and-rights).

A new rule needs an `id`, a `role` and both fixtures with their entries in `fixtures/index.json`. The check fails until all of them exist.
