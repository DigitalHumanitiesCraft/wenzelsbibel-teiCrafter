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

wenzelsbibel-teiCrafter is the teiCrafter legacy editor under `docs/` plus a Wenzelsbibel project layer, derived by a Git fork that keeps merging the base. The fork changes three zones and leaves the generic editor untouched, so every base improvement arrives through an ordinary merge. Requirements live in [specification](specification.md), the interface in [design](design.md), the editorial rules in [editorial-guidelines](editorial-guidelines.md).

## Derivation model

The repository is a Git clone of teiCrafter with two remotes.

| Remote | Repository | Use |
| --- | --- | --- |
| `upstream` | DigitalHumanitiesCraft/teiCrafter | Source of base changes, fetched and merged |
| `origin` | DigitalHumanitiesCraft/wenzelsbibel-teiCrafter | The fork's own publication repository |

Base changes enter with `git fetch upstream` and `git merge upstream/main`. The fork removed the inherited `knowledge/` folder and carries its own knowledge base. A merge that touches a base knowledge file therefore produces a modify/delete conflict; the resolution is always to keep the deletion (`git rm` the file). Base knowledge is read in the base repository, not copied here.

The fork changes three zones.

| Zone | Content | Merge behaviour |
| --- | --- | --- |
| Shell: `docs/index.html`, `docs/editor.html` | The fork's start page and the editor page with the new interface | Conflicts with base edits to these two files are resolved in favour of the fork, then base changes that matter (new script or stylesheet links) are carried over by hand |
| Project folder: `docs/js/projects/wenzelsbibel/` | The Wenzelsbibel specialisation after the base refactor | The base owns the folder's existence; the fork changes its content, so conflicts are local to this folder |
| Editorial layer: `editorial/` | Tool-neutral rules: transcription guidelines, `wenzelsbibel.sch`, `xml-model.md`, `fixtures/` | Fork-only, no conflicts |

Everything else stays as merged from the base: `docs/js/editor/`, `docs/css/style.css` with the design tokens, `docs/schemas/` including the vendored TEI All RelaxNG, `docs/vendor/`, `src/`, `prototypes/`, `pipeline/`, the build and test configuration. New fork-only files (new shell components, fork browser tests) avoid conflicts because the base never writes them.

## Current state

The fork equals the base at commit `b2a057d` plus its own knowledge base. The Wenzelsbibel code still sits in the generic editor folder as `docs/js/editor/wenzels-*.js`, with `docs/css/wenzels-workspace.css`, `docs/schemas/wenzelsbibel-editorial.sch` and the manifest `docs/data/editor/wb-codex/teicrafter.project.json`. Five places in the generic editor name the workspace literally: `editor-app.js`, `project-manifest.js`, `working-copy.js`, `project-output-controller.js`, `page-xml-onramp.js`, plus the stylesheet link in `editor.html`. This changes when the base refactor described in the teiCrafter `knowledge/plan.md` lands and is merged here ([plan](plan.md), phase 3).

## Stack

| Choice | Reason |
| --- | --- |
| Plain ES modules in the browser, no framework | Inherited from the base legacy editor, which is the derivable base since 2026-10-10 |
| `tei-document.js` offset tree over the canonical XML string | Byte-faithful editing: every change is a splice of the raw string, untouched XML stays identical |
| libxml2-wasm in a module worker for RelaxNG | Inherited validation runtime of the base |
| Browser XPath 1.0 for raw Schematron | No SaxonJS dependency; the editorial layer is written to that subset |
| OpenSeadragon, vendored under `docs/vendor/` | Facsimile viewer with IIIF tile sources and zone overlays |
| German interface text, English code and documentation | The edition team and its handbook work in German |

## Components

The target module map after the base refactor has three parts.

Generic editor, `docs/js/editor/`, merged from the base and not edited in the fork:

| Module | Purpose |
| --- | --- |
| `editor-app.js` | Composition of session, controllers and the base shell |
| `editor-session.js` | Document identity, revision, history, dirty savepoint |
| `tei-document.js` | Canonical string, namespace-aware offset tree, splice and reparse |
| `project-manifest.js` with the workspace registry | Manifest validation; `workspace` is checked against registered names instead of the literal `"wenzelsbibel"` |
| `schema-set.js`, `schema-validation.js`, worker client and worker, `validation-view.js` | Ordered schema set, RelaxNG in the worker, raw Schematron in the page, results bound to session and revision |
| `facsimile.js`, `project-profiles.js` | OpenSeadragon viewer, IIIF resolution from the manifest template |
| `source-view.js` | XML view of the canonical source |
| `staged-input.js`, `working-copy.js`, `session-recovery.js` | Unfinished-input ownership, portable working copy, IndexedDB recovery; the staged mode name comes from the registry |
| `project-documents.js` | Linked file collection (codex, image annotations, registers) with separate sources, schemas and dirty states |
| `output-controller.js` | Save gate: every effective schema must pass for the exact bytes |
| XML record helpers (today `wenzels-xml.js`, renamed by the base) | ID index, attribute and text patches, record removal; also used by the witness modules |
| `iconclass-lookup.js`, `page-xml-import.js`, `page-xml-onramp.js` | ICONCLASS requests, PAGE intake; the TEI type of an imported draft becomes a workspace parameter |

Project folder, `docs/js/projects/wenzelsbibel/`:

| Module | Purpose |
| --- | --- |
| Entry file | Exports the workspace object: detection (TEI types `wenzelsbibel-registers`, `wenzelsbibel-transcription`, PID pattern `^o:wen\.`), default schema set, panels, working-copy mode, flags such as model features off |
| Text model | Words with `@orig` and `@norm`, stand-off apparatus with anchors, register references |
| Image model | Image-annotation records, codex index for text relations |
| Register model | Persons, places and peoples in the separate register file |
| Project checks | Cross-file checks that Schematron cannot perform (register targets, image-to-codex pointers) |
| Forms, workspace stylesheet | Staged form ownership; only project-specific style rules |
| Schematron | Source of truth is `editorial/wenzelsbibel.sch`; the manifest schema set references a published copy under `docs/` |

New shell components of the fork:

| Component | Proposed location | Reason |
| --- | --- | --- |
| Menu bar | `docs/js/projects/wenzelsbibel/ui/` (definition), rendering open | German menu entries and their actions are project-specific |
| Document bar | `docs/js/projects/wenzelsbibel/ui/` | Document chooser (codex, image annotations) and folio, column, miniature navigation are project-specific |
| Bottom inspector | `docs/js/editor/` as a reusable component rendering forms from a field table | The mechanism is generic; the field tables for word, apparatus and miniature stay in the project folder |
| Register autocomplete | `docs/js/editor/` as a reusable component over any list in a register file | Same mechanism serves any project with registers |
| Status line and findings list | Generic status logic, German labels in the project folder | Reuses `validation-view.js` results |

Whether inspector and autocomplete become base components is an open decision of the base (see the teiCrafter plan). Built here as new files, they do not conflict with merges; if the base later adopts them under the same name, the fork takes the base version.

Whether the new `editor.html` composes the generic controllers through `editor-app.js` or through a fork-specific composition module is open. `editor-app.js` assembles the base shell's DOM, so a separate composition module in the project folder that reuses session, validation, facsimile, recovery and output controllers is the likely path (inference from the module structure, to be confirmed while building phase 5).

## Data flow

All five workflows of the meeting prototype pass through the same chain.

```text
selection in the text view (word, word sequence, line, zone) or cursor in the XML view
  -> element and offset range in the raw string (tei-document offset tree, word xml:id)
  -> project model computes the edit (text, register or image model)
  -> splice through tei-document, new canonical string, EditorSession revision
  -> re-render of text view, inspector, facsimile overlay
  -> validation: RelaxNG in the worker, Schematron in the page, bound to the revision
  -> status line; Save passes the output gate only when every schema result is valid
```

| Workflow | Modules involved |
| --- | --- |
| 1 Page, facsimile, word edit | Document bar navigation over the navigation model; `facsimile.js` with the IIIF template and Transkribus zone polygons; zone and line selection in both directions; inspector word fields write `w/@orig` and `w/@norm` through the text model |
| 2 Apparatus comment | Selection of a word range; the text model inserts empty anchors and an `app` with `@from`/`@to` and bilingual notes with sigle in the stand-off apparatus |
| 3 Register link | Autocomplete over the register file held in the project collection; the link encoding follows the pending decision (typed `ref` on the words per handbook, see [editorial-guidelines](editorial-guidelines.md)); a new entry is written to the register file as a companion edit |
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
| `editorial/` | Tool-neutral project layer: `transcription-guidelines.md`, `wenzelsbibel.sch`, `xml-model.md`, `fixtures/` |
| `docs/` | Published application; `index.html` start page, `editor.html` new interface, `js/editor/` generic editor, `js/projects/wenzelsbibel/` specialisation |
| `test/` | Inherited proofs and browser tests plus the fork's demo workflow tests |
| `snapshots/` | Demo protocol and test runs with real files |
| `wireframe/` | Static wireframe with fol. 1r, not published |
| `data/` | Local edition files and extractions, ignored by git |
| `src/`, `prototypes/`, `pipeline/`, `reports/` | Inherited from the base, unchanged |

## Build and deployment

The fork publishes `docs/` directly on GitHub Pages from `main:/docs`, without a build step. The base additionally runs `vite build` from `docs/` into `dist/` (inputs `index.html`, `editor.html`, `about.html`; versioned files under `docs/data`, `docs/schemas` and `docs/vendor` are copied). The inherited Playwright configuration builds and serves that artifact for tests, so the tested form and the published form differ by bundling (see [testing](testing.md)). Repository creation, push and the Pages setting are operator actions.

Runtime dependencies are the browser, the ONB IIIF service for images, the vendored TEI All RelaxNG (`docs/schemas/tei-p5-4.11.0/`), the vendored libxml2-wasm runtime and OpenSeadragon. The base Schematron runtime supports XPath 1.0 query binding, namespaces, phases, scalar `let`, `assert`, `report`, diagnostics and common child or attribute rule contexts. Includes, abstract patterns, advanced match patterns, node-set `let` and XPath 2.0 or later require precompiled XSLT and are otherwise reported as unavailable, which blocks output. The runtime executes the schema's `defaultPhase`; the base review action switches phases by rewriting that attribute. A Schematron cannot read a second file, so cross-file checks remain in project checks.

Pages serves only `docs/`, so `editorial/wenzelsbibel.sch` is not reachable by the published editor. The proposed resolution is a byte-identical copy under `docs/js/projects/wenzelsbibel/`, guarded by a check that fails when the two differ; a build step would contradict the no-build publication. This is open until phase 4 ([plan](plan.md)).
