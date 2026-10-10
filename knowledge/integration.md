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
| Not changed in the fork | Generic editor modules, the manifest validator, the token sheet, `src/`, the build and test configuration files. A needed change goes to the base first and arrives by merge |
| Built in the base for the fork | The toolbar, the popover at the selection rendering forms from a field table, the side panel, the autocomplete over register lists, the notice bar and findings list, the CodeMirror flow view with its vendored bundle, the `tei-document` seam between the legacy offset tree and `src/core`, phase selection for a Schematron entry in the schema set, the contrast of two base tokens, the removal of the base draft `wenzelsbibel-editorial.sch` from `docs/schemas/` and `public/schemas/`, and fixes for bugs found here |

The fork stays a derivation of teiCrafter permanently. Every generic mechanism is built in the base and arrives by merge, and the fork keeps only its vocabularies, Schematron, field tables, German labels and the shell composition ([architecture](architecture.md#components)). The fork's requirements reach the base as a handoff that the operator writes into the base's `knowledge/handoff.md`; the base processes it under its own plan.

Two base tokens in `docs/css/style.css` fall below the text contrast minimum of [design](design.md#accessibility-minima) against white: `--color-review` (about 2.9:1, computed from the token value), which the base uses for the unsaved marker, and `--color-orgName` (about 4.3:1), which the wireframe uses for XML attribute names. The point for the base is to darken both or to add text variants. Until the base changes them, the fork uses `--color-problem` or `--color-link` for the unsaved dot and `--color-text-secondary` for XML attribute names.

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
- The codex is split into book files with a shared apparatus and a shared register. This is the open file-topology point of [editorial guidelines](editorial-guidelines.md#open-ratification-points), now with a reason, because one file for the whole codex makes Git conflicts likely whenever two people work in it, and every validation runs over the whole codex. A shared apparatus file moves anchor resolution across files, which a Schematron cannot see, so that check would probably move to the tool's project checks and the pipeline.
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

The rules and the two phases, `editing` as the save gate and `review` as a report, are owned by the [editorial layer](../editorial/README.md#phases), which also records the exact processing instructions and the open point whether the Oxygen version in use honours the `phase` pseudo-attribute. Without touching the edition files, Oxygen would bind the layer through a framework: an `.exf` extension script, Author mode CSS and actions defined without Java, distributed as an add-on URL. XPath 1.0 keeps the Schematron runnable in the browser without SaxonJS. The interface, the inspector forms, autocomplete and the cross-file checks (register targets, image-to-codex pointers) are implemented separately in each tool; this duplication is unavoidable.

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

- Register encoding: the written form and the pointer syntax of the decision in [specification](specification.md#key-decisions) await the edition team's ratification.
- Working model: the [proposal](#working-model) needs the edition team's confirmation.
- Which list element in the register file carries peoples. The handbook says only "Register".
- Licence of the edition data for project storage. The public TEI header declares CC BY 4.0; the operator's vault records the question as unresolved, so working copies are treated as local material, and only a published and licensed excerpt with a NOTICE is tracked ([data](data.md#storage-and-rights)).
- The original project Schematron `Bilderfassung.sch` referenced in `Bildannotationen.xml` is not available.
- Roles of the users in the edition team, to be confirmed by the edition team.

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
