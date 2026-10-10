---
title: Architecture
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Architecture
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/architecture
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-architecture
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[Software Architecture]]", "[[TEI XML]]"]
related: [project, specification, data, design, editorial-guidelines, testing, integration, plan]
---

# Architecture

wenzelsbibel-teiCrafter is the teiCrafter legacy editor under `docs/` plus a Wenzelsbibel project layer, derived by a Git fork that keeps merging the base permanently. teiCrafter is the product, and every generic mechanism is built there and merged in. The fork changes three zones and leaves the generic editor untouched, so every base improvement arrives through an ordinary merge. Requirements live in [specification](specification.md), the interface in [design](design.md), the editorial rules in [editorial-guidelines](editorial-guidelines.md).

## Derivation model

The repository is a Git clone of teiCrafter with two remotes.

| Remote | Repository | Use |
| --- | --- | --- |
| `upstream` | DigitalHumanitiesCraft/teiCrafter | Source of base changes, fetched and merged |
| `origin` | DigitalHumanitiesCraft/wenzelsbibel-teiCrafter | The fork's own publication repository |

Base changes enter with `git fetch upstream` and `git merge upstream/main`. The fork carries its own knowledge base in place of the base's `knowledge/` folder, so a merge that touches a base knowledge file produces a modify/delete conflict, which is always resolved by keeping the deletion (`git rm` the file). On a conflict in `CLAUDE.md` the fork's version holds. Base knowledge is read in the base repository and never copied here.

The fork changes three zones.

| Zone | Content | Merge behaviour |
| --- | --- | --- |
| Shell: `docs/index.html`, `docs/editor.html` (planned) | The fork's start page and the editor page with the new interface. Both files are still identical to the base; `editor.html` links the project stylesheet `js/projects/wenzelsbibel/wenzels-workspace.css` as merged from the base | Once the fork changes them, conflicts with base edits to these two files are resolved in favour of the fork, then base changes that matter (new script or stylesheet links) are carried over by hand |
| Project folder: `docs/js/projects/wenzelsbibel/` | The Wenzelsbibel specialisation after the base refactor | The base owns the folder's existence; the fork changes its content, so conflicts are local to this folder |
| Editorial layer: `docs/schemas/wenzelsbibel.sch`, `docs/schemas/wenzelsbibel-vocabulary.json` and `editorial/` | Tool-neutral rules: the project Schematron and the project vocabulary as single sources under `docs/schemas/`, and in `editorial/` the `fixtures/` with `index.json`, `check_fixtures.py`, and `README.md` with the phases and the Oxygen and teiCrafter bindings | Fork-only files, no conflicts; the base writes other files in `docs/schemas/` but never these two |

Everything else stays as merged from the base: `docs/js/editor/`, `docs/css/style.css` with the design tokens, the rest of `docs/schemas/` including the vendored TEI All RelaxNG, `docs/vendor/`, `src/`, `pipeline/`, the build and test configuration. Of `prototypes/` only `d-flow/` and `index.html` are present. Fork-only files (the fork browser tests, `wireframe/`, the flow spike `prototypes/d-flow/`) avoid conflicts because the base never writes them.

## Current state

The fork equals the base after its refactor (upstream commit `80313c0`, merged as `3c0b71f`) plus the fork's own knowledge base, the wireframe, the flow spike and the editorial layer. The specialisation lives in the project folder and reaches the generic editor only through the workspace registry ([components](#components)). One trace of the project remains in a generic place: the built-in example entries in `editor-app.js` name the Wenzelsbibel example files. The base draft `docs/schemas/wenzelsbibel-editorial.sch` and its twin under `public/schemas/` are base files that the workspace no longer references; they stay until the base removes them. The served manifest `docs/data/editor/wb-codex/teicrafter.project.json` declares no schema, so the workspace default set applies ([data](data.md#project-manifest)). The new interface is not built yet. The interaction model is settled in `wireframe/`, which takes corrections from operator feedback, and the flow editing in the spike `prototypes/d-flow/` ([plan](plan.md)).

## Stack

| Choice | Reason |
| --- | --- |
| Plain ES modules in the browser, no framework | Inherited from the base legacy editor, which is the derivable base since 2026-10-10 |
| `tei-document.js` offset tree over the canonical XML string | Byte-faithful editing: every change is a splice of the raw string, untouched XML stays identical |
| libxml2-wasm in a module worker for RelaxNG | Inherited validation runtime of the base |
| Browser XPath 1.0 for raw Schematron | No SaxonJS dependency; the editorial layer is written to that subset |
| One hand-edited JSON file for the controlled vocabularies, `docs/schemas/wenzelsbibel-vocabulary.json` | One source for the value lists of the project modules, which read it in the browser without a build step, and for the Schematron, whose lists the fixture check compares with it |
| OpenSeadragon, vendored under `docs/vendor/openseadragon/` | Facsimile viewer that takes the IIIF `info.json` as tile source; zones as one SVG overlay in image coordinates |
| CodeMirror 6 for the flow view, built in the base and vendored there as a prebuilt bundle for the legacy app (planned) | Replace decorations over the raw XML give a caret in the canonical string with the markup hidden, proven in `prototypes/d-flow`; a vendored bundle keeps the published app free of a build step |
| German interface text, English code and documentation | The edition team and its handbook work in German |

## Components

The module map after the base refactor has three parts.

Generic editor, `docs/js/editor/`, merged from the base and not edited in the fork:

| Module | Purpose |
| --- | --- |
| `editor-app.js` | Composition of session, controllers and the base shell |
| `editor-session.js` | Document identity, revision, history, dirty savepoint |
| `tei-document.js` | Canonical string, namespace-aware offset tree, splice and reparse |
| `workspace-registry.js`, with the registration point `docs/js/projects/index.js` | Registry of project workspaces: detection profiles, default schema sets applied when a project declares none, panels, staged modes, flags |
| `project-manifest.js` | Manifest validation; `workspace` is checked against registered names |
| `schema-set.js`, `schema-validation.js`, worker client and worker, `validation-view.js` | Ordered schema set, RelaxNG in the worker, raw Schematron in the page, results bound to session and revision |
| `facsimile.js`, `project-profiles.js` | OpenSeadragon viewer, IIIF resolution from the manifest template |
| `source-view.js` | XML view of the canonical source |
| `staged-input.js`, `working-copy.js`, `session-recovery.js` | Unfinished-input ownership, portable working copy, IndexedDB recovery; the staged mode name comes from the registry |
| `project-documents.js` | Linked file collection (codex, image annotations, registers) with separate sources, schemas and dirty states |
| `output-controller.js` | Save gate: every effective schema must pass for the exact bytes |
| `xml-records.js` | ID index, attribute and text patches, record removal; also used by the witness modules |
| `docs/css/editorial-forms.css` | Form styles shared by the project workspace, entry and witness workspaces, ICONCLASS lookup and PAGE intake |
| `iconclass-lookup.js`, `page-xml-import.js`, `page-xml-onramp.js` | ICONCLASS requests, PAGE intake; the TEI type of an imported draft becomes a workspace parameter |

The base's proposal and LLM modules (`ai-suggest.js`, `llm-prompt.js`, `gen-modal.js`, `generated-provenance.js` and the `proposal-*.js` modules) are merged with the rest and unused in this fork. Model proposals stay off for this project permanently (flag `modelFeatures: false` in the workspace object), so these modules are inherited dead weight that the fork neither changes nor removes.

Project folder, `docs/js/projects/wenzelsbibel/`:

| Module | Purpose |
| --- | --- |
| `index.js` | Exports the workspace object: detection profile (TEI types `wenzelsbibel-registers`, `wenzelsbibel-transcription`, PID pattern `^o:wen\.`, ONB IIIF template), default schema set, panel, staged mode, draft TEI type, flags (model features off) |
| `wenzels-text-model.js` | Words with `@orig` and `@norm`, stand-off apparatus with anchors, register references |
| `wenzels-image-model.js` | Image-annotation records, codex index for text relations |
| `wenzels-register-model.js` | Persons, places and peoples in the separate register file |
| `wenzels-project-checks.js` | Cross-file checks that Schematron cannot perform (register targets, image-to-codex pointers) |
| `wenzels-form.js`, `wenzels-workspace.js`, `wenzels-workspace.css` | Staged form ownership, the base workspace panel, project-specific style rules |
| Schematron and vocabulary | The default schema set in `index.js` names `docs/schemas/wenzelsbibel.sch`, the single source of the project Schematron, as "Editionsregeln". The project modules read their value lists from `docs/schemas/wenzelsbibel-vocabulary.json` ([data](data.md#controlled-vocabulary)) |

Components of the new shell. The base builds each mechanism and the fork composes it with its project data in `docs/js/projects/wenzelsbibel/` ([plan](plan.md), phases 5a and 5b):

| Component | Built in the base | Kept in the fork |
| --- | --- | --- |
| Menu bar and document bar | The rendering, where a generic one emerges (open) | German menu entries and their actions, document chooser (codex, image annotations), folio, column and miniature navigation |
| Bottom inspector | A component rendering forms from a field table | The field tables for word, apparatus and miniature |
| Register autocomplete | A component over any list in a register file | Register types and German labels |
| Flow view | The CodeMirror module hosted by the legacy app, with its vendored bundle, decorations over words, wrap and word commands, and "XML formatieren" | The mark tables |
| Notice bar and findings list | Logic over `validation-view.js` results | German labels |
| `tei-document` seam | The bridge between the legacy offset tree and `src/core` (see below) | Nothing |

A generic component built in the fork would have to be offered to the base and replaced by the base version later, so the fork builds none. The base's plan still lists inspector and autocomplete as an open decision, which this repository's decision settles from its side.

Whether the new `editor.html` composes the generic controllers through `editor-app.js` or through a fork-specific composition module is open. `editor-app.js` assembles the base shell's DOM, so a separate composition module in the project folder that reuses session, validation, facsimile, recovery and output controllers is the likely path (inference from the module structure, to be confirmed while building phase 5b).

The flow view has two integration seams. The spike parses with the source-first core's `src/core/tei-document.js`, whereas the legacy app holds its canonical string in `docs/js/editor/tei-document.js`, so the module either works on the legacy offset tree or carries the core parser in its bundle. CodeMirror keeps its own undo history, while `editor-session.js` owns revisions, history and the dirty savepoint, so each flow transaction has to become one session revision and undo has to be handed over to the session. Both seams are base work ([plan](plan.md), phase 5a).

## Data flow

All five workflows pass through the same chain.

```text
caret or selection in the flow view (word, word sequence, line, zone) or cursor in the XML view
  -> element and offset range in the raw string (tei-document offset tree, word xml:id)
  -> project model computes the edit (text, register or image model)
  -> splice through tei-document, new canonical string, EditorSession revision
  -> re-render of text view, inspector, facsimile overlay
  -> validation: RelaxNG in the worker, Schematron in the page, bound to the revision
  -> notice bar when well-formedness breaks or a requested check has findings;
     Save passes the output gate only when every schema result is valid
```

| Workflow | Modules involved |
| --- | --- |
| 1 Page, facsimile, word edit | Document bar navigation over the navigation model; `facsimile.js` with the IIIF template and Transkribus zone polygons; zone and line selection in both directions; inspector word fields write `w/@orig` and `w/@norm` through the text model; typing in the flow would write word text and `@orig` once the operator decides it ([specification](specification.md#text-view)) |
| 2 Apparatus comment | Selection of a word range; the text model inserts empty anchors and an `app` with `@from`/`@to` and bilingual notes with sigle in the stand-off apparatus |
| 3 Register link | Autocomplete over the register file held in the project collection; the selected words are wrapped inline in `rs[@type][@ref]`, and existing `ref[@type][@target]` links are read ([specification](specification.md#key-decisions)); a new entry is written to the register file as a companion edit |
| 4 Miniature | Zone selection opens the image-annotation form in the inspector; image model edits the record; `iconclass-lookup.js` fills German and English labels; the codex index resolves the text relation |
| 5 Validate and save | `validation-view.js` with TEI All and the project Schematron; findings list in the bottom area; `output-controller.js` writes the file |

## External services

| Service | Role | Endpoint |
| --- | --- | --- |
| ONB IIIF Image API | Facsimile images at runtime | `https://iiif.onb.ac.at/images/REPO/8977428/{stem}.jp2/info.json` |
| ICONCLASS | Label lookup on explicit user request | Official ICONCLASS service, as in the base |

The IIIF request is a network request to a third party. The project accepts it because the images are not redistributable and must not be stored in the repository. Language model features are switched off for this workspace.

## Security

The tool runs in the browser without a backend. Edition files are opened from the local disk and written back through the save gate or a download; nothing is uploaded. Image requests reveal the requested folio to the ONB server. ICONCLASS requests transmit only the search term or notation. Edition data and images are not versioned (see [data](data.md)).

## Accessibility

The base's automated Axe floor and keyboard paths apply to inherited views. The new shell components need the same: reachable by keyboard, Esc closes the inspector, Ctrl+E on a selection opens the list of allowed elements, `lang="de"` on the interface. Manual keyboard and screen-reader review of the new shell is open.

## Repository structure

| Folder | Function |
| --- | --- |
| `knowledge/` | The fork's knowledge base |
| `editorial/` | Tool-neutral project layer around the rule files in `docs/schemas/`: `fixtures/`, `check_fixtures.py`, `README.md` |
| `docs/` | Published application; `index.html` and `editor.html` as inherited from the base until the fork's shell replaces them, `js/editor/` generic editor, `js/projects/wenzelsbibel/` specialisation |
| `docs/schemas/` | The vendored TEI All RelaxNG and the base draft as merged from the base, plus the fork's `wenzelsbibel.sch` and `wenzelsbibel-vocabulary.json` |
| `test/` | Inherited proofs and browser tests plus the fork's demo workflow tests |
| `snapshots/` | Dated reports: the Schematron findings on the public data, the wireframe reviews, later the demo protocol and test runs with real files |
| `wireframe/` | Frozen wireframe with fol. 1r in which every workflow runs in memory with undo; `js/` modules, `css/` per feature using the base tokens from `src/ui/tokens.css`, `checks/` browser walkthroughs, `extract_data.py`, which generates the fol. 1r extraction from the public TEI files; not published, and deleted once the demo workflow tests pass ([plan](plan.md)) |
| `data/` | Local edition files and extractions, ignored by git |
| `prototypes/d-flow/` | Fork-only spike of the flow view (CodeMirror decorations over raw TEI on fol. 1r) with its Node and browser checks; `fixture/fol1r.xml` is the tracked public excerpt, with its attribution in `fixture/NOTICE.md` ([data](data.md#storage-and-rights)) |
| `prototypes/` | `d-flow/` only, with the inherited dev server configuration and an index page that lists it |
| `.github/workflows/` | The inherited `checks.yml`, unchanged, and the fork-only `fork-checks.yml` |
| `src/`, `pipeline/`, `public/` | Inherited from the base, unchanged; `src/` and `public/` serve the spike, the typecheck and the inherited checks |

The base's `reports/` folder and its prototypes `a-code`, `b-focus` and `c-hybrid` are absent in the fork. A base merge that changes them produces a modify/delete conflict, resolved by keeping the deletion as for the base knowledge files.

## Build and deployment

The fork publishes `docs/` directly on GitHub Pages from `main:/docs`, without a build step. The flow view keeps this by loading CodeMirror as a prebuilt bundle vendored under `docs/vendor/` (planned). The base additionally runs `vite build` from `docs/` into `dist/` (inputs `index.html`, `editor.html`, `about.html`; versioned files under `docs/data`, `docs/schemas` and `docs/vendor` are copied, so the project Schematron and vocabulary reach the tested build unchanged). The inherited Playwright configuration builds and serves that artifact for tests, so the tested form and the published form differ by bundling (see [testing](testing.md)). Repository creation, push and the Pages setting are operator actions.

Runtime dependencies are the browser, the ONB IIIF service for images, the vendored TEI All RelaxNG (`docs/schemas/tei-p5-4.11.0/`), the vendored libxml2-wasm runtime and OpenSeadragon. The base Schematron runtime supports XPath 1.0 query binding, namespaces, phases, scalar `let`, `assert`, `report`, diagnostics and common child or attribute rule contexts. Includes, abstract patterns, advanced match patterns, node-set `let` and XPath 2.0 or later require precompiled XSLT and are otherwise reported as unavailable, which blocks output. How the project Schematron selects its phase in this runtime is described in the [editorial layer](../editorial/README.md#binding-in-teicrafter). A Schematron cannot read a second file, so cross-file checks remain in project checks.

Pages serves only `docs/`, so the project Schematron and the vocabulary have their single source under `docs/schemas/`. The published editor, the tested build, the fixture check and Oxygen read the same file, and no copy and no equality check exist. The project Schematron keeps to this runtime's subset; its expensive anchor rules and their upgrade path are described in the [editorial layer](../editorial/README.md#runtime-limits).
