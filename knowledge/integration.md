---
title: "Integration: base teiCrafter, edition team, Oxygen"
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Integration
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/integration
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-integration
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[TEI XML]]", "[[Data Flow]]"]
related: [project, architecture, editorial-guidelines, data, specification, testing, plan, handoff]
---

# Integration: base teiCrafter, edition team, Oxygen

This repository exchanges code with the base teiCrafter, files and decisions with the Wenzelsbibel edition team at the Paris Lodron University Salzburg (PLUS), and a tool-neutral rule layer with Oxygen XML Editor. The first two exchanges are active, and the [working model](#working-model) proposes how the edition team's own repository and the tool meet. The Oxygen binding of the project Schematron is documented, and an Oxygen framework is planned and not implemented.

## Data flow

```text
teiCrafter (upstream) --(git merge: generic editor, registry, manifest contract, schema set, tokens)--> fork
fork --(requirements for generic mechanisms, bug fixes)--> teiCrafter

edition team --(edition XML, Transkribus exports, handbook, ratification decisions)--> operator's machine (data/, not versioned)
fork (browser) --(edited XML per file)--> edition team

working model (proposed, to be confirmed with the edition team):
edition repository on the university GitLab <--(pull, commit, push with a Git desktop client)--> local clone
local clone <--(folder access in Chromium, save through the output gate)--> tool at its published address
edition repository --(every push)--> GitLab pipeline: TEI All and Schematron review, findings report

docs/schemas/ (TEI All now, project ODD later, wenzelsbibel.sch, wenzelsbibel-vocabulary.json)
  --> fork: workspace default schema set ("Editionsregeln") or project manifest; project modules read the vocabulary
  --> editorial/check_fixtures.py: fixtures and the vocabulary consistency check
  --> Oxygen: xml-model processing instruction or validation scenario; framework planned
  --> GitLab pipeline (planned)
```

## Exchange format

### Base teiCrafter

| Direction | Content |
| --- | --- |
| Consumed | Generic editor under `docs/js/editor/`, the workspace registry, the manifest contract (`teicrafter.project.json` with `workspace`, `imageResolver`, `markup`, `indices`, `views` and the schema set), the vendored TEI All RelaxNG, the Schematron runtime, the design tokens in `docs/css/style.css` |
| Not changed in the fork | Generic editor modules, the manifest validator, the token sheet, `src/`, and the base build and test configuration (`vite.config.js`, `playwright.config.js`, `biome.json`, `jsconfig.json`, `tsconfig.json`). A needed change goes to the base first and arrives by merge. The fork's own scripts in `package.json`, `playwright.fork.config.js` and `.github/workflows/fork-checks.yml` are fork zones ([architecture](architecture.md#derivation-model)) |
| Built in the base for the fork | The mechanisms of phase 5a listed below, and fixes for bugs found here |

The fork stays a derivation of teiCrafter permanently. Every generic mechanism is built in the base and arrives by merge, and the fork keeps only its vocabularies, Schematron, field tables, German labels and the shell composition ([architecture](architecture.md#components)). The fork's requirements reach the base as a handoff that the operator writes into the base's `knowledge/handoff.md`; the base processes it under its own plan.

#### Phase 5a mechanisms

This is the one list of what the base builds for the fork in phase 5a. The [plan](plan.md#phases) and the [component table](architecture.md#components) refer to it.

- A two-row toolbar with disabled-with-reason actions, menu buttons for value lists and check sets, and the WAI-ARIA toolbar keyboard pattern.
- A popover at the selection that renders forms from a field table, with one Anwenden and one Abbrechen per popover and a bottom-sheet variant for narrow screens.
- A side panel that shares the right column with the facsimile and renders lists and forms from a field table.
- A register autocomplete over any register list.
- A notice bar and a findings list, fed by validation results, the flow view and editor actions, with the notice kinds of F44 ([specification](specification.md#validation-and-notice-bar)).
- The CodeMirror flow view hosted by the legacy app, with its vendored bundle under `docs/vendor/`, the word commands of F18, wrap and unwrap, and "XML formatieren" (F56).
- A CodeMirror XML view in the same bundle, replacing the textarea overlay of `source-view.js`, with the display-only folding of `xml:id` and `facs` and the switch "IDs anzeigen" (F57), selection mapping (F19) and Ctrl+E (F21).
- Search in the flow view and the XML view (F6), where the base does not have it.
- The facsimile zone layer, with the zones' polygons drawn as one SVG layer styled by zone type, a line-zone click selecting the line and a line selection outlining its zone (F23, F24), and the navigation state in the page address (F12), where the base does not have them.
- The `tei-document` seam between the legacy offset tree and `src/core`.
- The `EditorSession` seam, in which each flow transaction becomes one session revision and undo is handed over to the session, without a parse of the whole codex per keystroke ([architecture](architecture.md#components)).
- The decision how "XML formatieren" treats elements under `xml:space="preserve"`, where the recommendation is to leave them untouched.
- Text contrast for `--color-review` and `--color-orgName`, by darkening them or adding text variants ([design](design.md#accessibility-minima)).
- Schematron diagnostics from the raw runtime and the compiled path that carry the assert or report `@id` as rule and `@role` as severity, so that the findings list can name the rule (F47).
- Schematron evaluated off the main thread and cancellable (F46, N5).
- Phase selection for a Schematron entry in the schema set.
- Every message the base generates taken from a table the project supplies, so that the fork shows its messages in German.
- The removal of the base draft `wenzelsbibel-editorial.sch` from `docs/schemas/` and `public/schemas/`, together with what depends on it in the base: the default schema set and panel schema of the base's Wenzelsbibel module, the proof `test/proofs/wenzels_project_controls_check.mjs` and the suite `test/e2e/wenzelsbibel-schema.spec.js`.
- The remaining flow packages of the [plan](plan.md#phase-5-notes), with the load test on the full codex.

The contract form of this handoff, with the mechanisms table, the schema of the field table, the interfaces of toolbar, popover, side panel and notice bar, the message table, the findings contract and the open decisions for the base, is the [handoff text of 2026-10-10](../snapshots/base-handoff-5a-contract-2026-10-10.md), which the operator carries into the base's `knowledge/handoff.md`; once the base has integrated it, the base's knowledge owns the living version and this list stays the fork's summary.

The flow view and the XML view may consume `src/core` and `src/editor` through the vendored bundle, as the flow spike already does. This conflicts with the rule of the base's plan that the source-first rebuild under `src/` writes nothing into `docs/`, which is an open decision for the base: either that rule admits the vendored bundle, or both views work on the legacy offset tree.

The base's own start page shows the entry "New from text (LLM)", because `docs/js/index-app.js` checks only the global model setting and ignores the workspace flag `modelFeatures: false`. This is an item for the base handoff, independent of the fork's own start page.

The text contrast point arises because two base tokens in `docs/css/style.css` fall below the minimum of [design](design.md#accessibility-minima) against white: `--color-review` (about 2.9:1, computed from the token value), which the base uses for the unsaved marker, and `--color-orgName` (about 4.3:1), which the wireframe uses for XML attribute names. The fork's interim colours are stated in the design.

### Edition team at PLUS

| Direction | Content |
| --- | --- |
| Inputs | Edition files (`codex-2759.xml`, `Bildannotationen.xml`, the register file), Transkribus exports, the published transcription handbook (version February 2025), ratification decisions on encoding |
| Outputs | Edited XML files, one per file, each passing the output gate. Under the [working model](#working-model) the team commits them to its own repository, and a pipeline there reports the review findings |

The formats are described in [data](data.md); the encoding rules and the list of divergences between handbook and implementation in [editorial-guidelines](editorial-guidelines.md).

### Working model

This is the operator's proposal for how the edition team works with the tool. It is to be confirmed by the edition team and is not yet built. The requirements it places on the tool are listed in [specification](specification.md#working-model).

- The edition data live in a Git repository on the GitLab instance of the university. This repository holds the tool, and the data stay in the edition repository.
- The tool runs from its published address without installation and opens the local clone of the edition repository through the folder access of a Chromium browser. Firefox lacks that folder access and falls back to file input and download, so the working model assumes Chromium.
- The codex is split into book files with a shared apparatus and a shared register. This is the open file-topology point of [editorial guidelines](editorial-guidelines.md#open-ratification-points), now with a reason, because one file for the whole codex makes Git conflicts likely whenever two people work in it, and every validation runs over the whole codex. A shared apparatus file moves anchor resolution across files, which a Schematron cannot see, so that check would probably move to the tool's project checks and the pipeline. Phase 5b composes the document chooser and the apparatus write from the project's file list, so that the split changes data and not code ([plan](plan.md#phase-5b-notes)).
- The files are formatted once with one element per line ("XML formatieren"), so that later diffs stay small and line-based merges work.
- Each person has a responsibility range, such as a set of books, and simultaneous editing of the same file is not supported.
- Before work each person pulls, after work commits and pushes, with a Git desktop client. The tool itself performs no Git operation.
- A GitLab pipeline validates every push against TEI All and the `review` phase of the project Schematron and publishes a findings report.
- On a save with edits the tool adds a `change` entry to `revisionDesc`.
- The browser working copy and local recovery are machine-local and do not travel with the repository.
- The images stay at the ONB and are loaded through IIIF.

The one-time preparation (splitting the codex, formatting, seeding the register, setting up the pipeline) is ordered in [plan](plan.md#phases).

### Oxygen co-use (binding documented, framework planned)

Shared use is possible when the rule-bearing layer consists of files both tools read. That layer is `docs/schemas/wenzelsbibel.sch` with the vocabulary beside it, and its fixtures, check and bindings live in `editorial/`.

| Layer file | teiCrafter binding | Oxygen binding |
| --- | --- | --- |
| RelaxNG (TEI All now, project ODD later) | Manifest schema set | Framework validation scenario or `xml-model` processing instruction |
| `docs/schemas/wenzelsbibel.sch`, XPath 1.0 | The same file, as "Editionsregeln" in the workspace default schema set or declared in a project manifest | The same file at the same path, through an `xml-model` processing instruction with an optional `phase` pseudo-attribute, or a validation scenario that fixes the phase |
| `xml-model` processing instructions (documented in `editorial/README.md`) | Inspected as schema evidence | Associates schemas on open; they change the edition files and belong in the team's working copies |

The rules and the two phases, `editing` as the save gate and `review` as a report, are owned by the [editorial layer](../editorial/README.md#phases), which also records the exact processing instructions and the open point whether the Oxygen version in use honours the `phase` pseudo-attribute. Without touching the edition files, Oxygen would bind the layer through a framework: an `.exf` extension script, Author mode CSS and actions defined without Java, distributed as an add-on URL. XPath 1.0 keeps the Schematron runnable in the browser without SaxonJS. The interface, the popover forms, autocomplete and the cross-file checks (register targets, image-to-codex pointers) are implemented separately in each tool; this duplication is unavoidable.

## Responsibilities

| Party | Decides or delivers |
| --- | --- |
| Edition team at PLUS | Scholarly data model, project-specific schema rules, rights, acceptance, ratification of the encoding |
| DHCraft | TEI specification draft, this editor, the editorial layer, technical verification |
| Base teiCrafter | Generic editor behaviour and its evidence |

## Acceptance criteria

- An output file passes TEI All and the `editing` phase of the project Schematron for its exact bytes.
- Every byte outside a deliberate edit is identical to the input.
- A fork merge from upstream leaves the inherited engine proofs green ([testing](testing.md)).
- Technical checks do not ratify. An encoding rule counts as agreed only after the edition team's decision is recorded in [editorial-guidelines](editorial-guidelines.md).

## Open points and input gaps

- Encoding questions for the edition team, among them the register encoding, the list element for peoples and the missing original Schematron `Bilderfassung.sch`, are the [open ratification points](editorial-guidelines.md#open-ratification-points) of the editorial guidelines.
- Working model: the [proposal](#working-model) needs the edition team's confirmation.
- Licence of the edition data for project storage. The public TEI header declares CC BY 4.0; the operator's vault records the question as unresolved, so working copies are treated as local material, and only a published and licensed excerpt with a NOTICE is tracked ([data](data.md#storage-and-rights)).
- Roles of the users in the edition team, an [open question](specification.md#open-questions) of the specification.
- The src boundary of the flow and XML views, an open decision for the base ([phase 5a mechanisms](#phase-5a-mechanisms)).

## Pitfalls

| Wrong assumption | Correct reading |
| --- | --- |
| Technical access to the ONB IIIF service permits storing images | Access implies no permission to store, redistribute or publish images or edition data |
| A valid file is a correct edition | Validity covers the formal rules only; readings and identifications need the edition team |
| `docs/schemas/wenzelsbibel-editorial.sch` is the project's Schematron | It is a teiCrafter-authored draft for image annotations that no schema set of this workspace references; the project Schematron is `docs/schemas/wenzelsbibel.sch` |
| The project used ediarum | The handbook describes a Transkribus-only workflow; there is no evidence of ediarum use |

## Authoritative documents

| Aspect | Source of truth | Path |
| --- | --- | --- |
| Project status, coordination | Project Overview Wenzelsbibel | Operator's vault, `Projects/Wenzelsbibel/` |
| Scholarly long form of the specification | TEI-Spezifikation Wenzelsbibel | Operator's vault, `Projects/Wenzelsbibel/` |
| Handbook rules and divergence list | [editorial-guidelines](editorial-guidelines.md) | `knowledge/editorial-guidelines.md` |
| Schematron rules, phases, Oxygen and teiCrafter binding | Editorial layer | `editorial/README.md`, `docs/schemas/wenzelsbibel.sch` |
| Controlled value lists | Project vocabulary | `docs/schemas/wenzelsbibel-vocabulary.json`, described in [data](data.md#controlled-vocabulary) |
| Requirements of the fork on the base | Handoff written by the operator | `knowledge/handoff.md` in the base repository |
| Findings on the public data | Dated snapshot | `snapshots/schematron-findings-2026-10-10.md` |
| Formats | [data](data.md) | `knowledge/data.md` |
| Generic editor contracts | teiCrafter knowledge base | `knowledge/integration.md` and `knowledge/data.md` in the base repository |
| Base refactor | teiCrafter plan | `knowledge/plan.md` in the base repository |
