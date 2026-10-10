# Editorial layer

This folder holds the fixtures and the check for the project rules of the Wenzelsbibel edition, whose Schematron both teiCrafter and Oxygen XML Editor can read. The rules come from [knowledge/editorial-guidelines.md](../knowledge/editorial-guidelines.md), which states them against the *Transkriptionshandbuch* (version February 2025) and the real data. Nothing here depends on the editor's code.

| File | Purpose |
|---|---|
| `../docs/schemas/wenzelsbibel.sch` | ISO Schematron, `queryBinding="xslt1"`, TEI namespace, phases `editing` (default) and `review`, German messages for the editor. It lives under `docs/` because GitHub Pages serves only that folder, and it is the single source of the rules |
| `../docs/schemas/wenzelsbibel-vocabulary.json` | The controlled value lists, edited by hand. Each list names its element and attribute, the schema rules that encode it and a German caption, and each value carries its source (`handbook` or `data`) and a German label. A `labelSource` beside every caption and label says whether it takes the wording of the handbook, a label the wireframe shows or a working label that awaits the edition team's confirmation. The editor reads the offered apparatus types and their labels from it |
| `fixtures/` | One synthetic positive and one synthetic negative TEI file per rule, named `<rule-id>.pass.xml` and `<rule-id>.fail.xml`, listed in `fixtures/index.json` with rule, phase, severity, expected outcome and file |
| `check_fixtures.py` | Runs every fixture in its phase, checks that the schema's rule tests and the value lists its messages repeat agree with the vocabulary and that every caption and label exists, reports per-rule counts over real files and prints the rule table |

The fixtures are hand-built and CC0. They model the structures of the codex and the image annotations (words with `@orig` and `@norm`, `standOff/listApp` with anchors, typed `ref`, annotation items) and contain no edition text beyond single words.

## Phases

The `editing` phase holds only what a save must never break, and the published codex and image annotations pass it unchanged. It checks the TEI root element, that every apparatus entry has `@from` and `@to` or a `@sameAs`, and the register type of `rs` and `ref`, which it compares with person, place and folk in any capitalisation. It checks no other value list, so every other value passes the phase, including one that neither the handbook nor the data uses.

The `review` phase activates the editing patterns as well and adds word identifiers, non-empty register pointers, the handbook vocabularies, the apparatus and register checks and the completeness rules for image annotations. Every assert and report carries an `id` and a `role`. A warning (`role="warning"`) shows the edition team a value that awaits its decision without the file failing on it. How a value is reported depends on its list.

- For `hi/@rend`, `supplied/@reason` and `del/@type`, a handbook value passes, a value only the data uses is a warning, and any other value is an error. A `supplied` without `@reason` is an error, although the data contains such elements.
- For `surplus/@reason`, `foreign/@xml:lang`, `num/@type`, `note/@type` in the codex text and `fw/@ana`, the handbook values pass and any other value is an error.
- Every `seg/@ana` is a warning, because the handbook encodes text regions as `fw`. A value outside the handbook region types and the two data spellings of border decoration is an error as well.
- The apparatus types have no handbook source. The established types of the vocabulary pass without a finding, and any other value, the further types in the data included, is an error.
- A register type that is not person, place or folk in any capitalisation is already an error of the editing phase, and the review phase adds a warning for a spelling other than lower case, such as `Person`.

## Rules

The rule table with id, phase, severity and message is generated from `docs/schemas/wenzelsbibel.sch` and `fixtures/index.json` by `python editorial/check_fixtures.py --list`.

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
<?xml-model href="docs/schemas/wenzelsbibel.sch" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron" phase="review"?>
```

The `href` is relative to the TEI file, so the example fits a TEI file at the root of a clone of this repository; a file elsewhere names the path from its own folder or the published URL of the schema. Without `phase`, Oxygen runs the `defaultPhase` `editing`. Oxygen documents a `phase` pseudo-attribute for Schematron associations. Whether the version in use honours it was not tested for this layer. A validation scenario in Oxygen can fix the phase instead. The processing instructions change the edition files, so they belong in the working copies of the edition team. A later Oxygen framework (an `.exf` extension script with Author mode CSS) can bind the same schema without touching the files, as described in [knowledge/integration.md](../knowledge/integration.md).

## Binding in teiCrafter

The project manifest `teicrafter.project.json` declares the schema set in `schema.schemas`, with paths relative to the project folder:

```json
"schema": {
  "schemas": [
    { "type": "relaxng", "path": "schemas/tei-p5-4.11.0/tei_all.rng", "name": "TEI All" },
    { "type": "schematron", "path": "schemas/wenzelsbibel.sch", "name": "Editionsregeln" }
  ]
}
```

Paths resolve inside the granted project folder, so a folder that declares the schema holds the file itself. Without a declared schema the workspace applies its default set, TEI All and `docs/schemas/wenzelsbibel.sch` under the name "Editionsregeln", which the published editor loads directly from `docs/`. The runtime executes the schema's `defaultPhase`, and the review action switches to `review` by rewriting that attribute.

## Running the check

The script needs Python 3.11 or later and lxml. It carries its dependency as PEP 723 metadata, so `uv run editorial/check_fixtures.py` installs lxml on the fly, and plain `python` works where lxml is already installed.

```
python editorial/check_fixtures.py
python editorial/check_fixtures.py --list
python editorial/check_fixtures.py --vocabulary
python editorial/check_fixtures.py --data path/to/codex-2759.xml path/to/Bildannotationen.xml
python editorial/check_fixtures.py --phase editing --data path/to/codex-2759.xml
```

The first form checks the fixture manifest against the schema (every rule has one pass and one fail fixture with matching phase and severity), checks the vocabulary, runs all fixtures and exits with 1 on any mismatch. A manifest entry that lacks a key or names a phase other than `editing` or `review` stops the run with its index and file, and a manifest that disagrees with the schema stops it before any fixture runs. A pass fixture must leave its rule silent, a fail fixture must trigger it. The `--list` form prints the rule table as Markdown after the same manifest check. The `--data` form prints findings per rule with one example each and writes nothing. It names every missing input file before reading any, and it reports a file that is not well-formed XML by name and still reads the others. The review run over the public files of 2026-10-10 is recorded in [snapshots/schematron-findings-2026-10-10.md](../snapshots/schematron-findings-2026-10-10.md). The edition files stay outside the repository, see [knowledge/data.md](../knowledge/data.md#storage-and-rights).

The vocabulary check reads every value list a rule test enumerates, as `contains(' a b c ', concat(' ', @x, ' '))` or as `@x = 'a'` comparisons outside predicates, and compares it in both directions with the JSON list that names the rule. Scope `all` takes every value, scope `data` only the values with source `data`, and a rule that enumerates values no list claims is an error. The check also reads the value lists the German messages repeat for the editor, after "Zulässig nach Handbuch:" or "aus dem Handbuch:" (the values with source `handbook`), after "Zulässig:" (every value) and in "erwartet wird … in Kleinbuchstaben" (the handbook register types), and fails when one of them differs from the vocabulary. A message without one of these markers is not compared. The check fails as well when a list lacks its German caption, a value its German label, or either of them a `labelSource` of `handbook`, `wireframe` or `working label`. `--vocabulary` runs this check alone. A changed value list is therefore edited in the schema's tests, in its messages and in the JSON together.

A new rule needs an `id`, a `role` and both fixtures with their entries in `fixtures/index.json`, a rule that enumerates values needs its entry under `rules` in the vocabulary, and a new value needs its German label. The check fails until all of them exist.
