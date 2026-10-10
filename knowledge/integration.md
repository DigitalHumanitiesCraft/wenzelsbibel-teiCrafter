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

This repository exchanges code with the base teiCrafter, files and decisions with the Wenzelsbibel edition team at the Paris Lodron University Salzburg (PLUS), and a tool-neutral rule layer with Oxygen XML Editor. The first two exchanges are active. The Oxygen binding of the project Schematron is documented, and an Oxygen framework is planned and not implemented.

## Data flow

```text
teiCrafter (upstream) --(git merge: generic editor, registry, manifest contract, schema set, tokens)--> fork
fork --(pull requests to upstream: generic components, bug fixes)--> teiCrafter

edition team --(edition XML, Transkribus exports, handbook, ratification decisions)--> operator's machine (data/, not versioned)
fork (browser) --(edited XML per file)--> edition team

working model (proposed, to be confirmed with the edition team):
edition repository on the university GitLab <--(pull, commit, push with a Git desktop client)--> local clone
local clone <--(folder access in Chromium, save through the output gate)--> tool at its published address
edition repository --(every push)--> GitLab pipeline: TEI All and Schematron review, findings report

editorial/ (TEI All now, project ODD later, wenzelsbibel.sch)
  --> fork: workspace default schema set (published copy planned) or project manifest
  --> Oxygen: xml-model processing instruction or validation scenario; framework planned
  --> GitLab pipeline (planned)
```

## Exchange format

### Base teiCrafter

| Direction | Content |
| --- | --- |
| Consumed | Generic editor under `docs/js/editor/`, the workspace registry, the manifest contract (`teicrafter.project.json` with `workspace`, `imageResolver`, `markup`, `indices`, `views` and the schema set), the vendored TEI All RelaxNG, the Schematron runtime, the design tokens in `docs/css/style.css` |
| Not changed in the fork | Generic editor modules, the manifest validator, the token sheet, `src/`, the build and test configuration files. A needed change goes to the base first and arrives by merge |
| Contributed back | The bottom inspector rendering forms from a field table, the autocomplete over register lists, phase selection for a Schematron entry in the schema set, and bug fixes found here, as pull requests to the base |

Whether the base accepts inspector and autocomplete as generic components is the base's decision. Until then they live in the fork as new files ([architecture](architecture.md#components)).

### Edition team at PLUS

| Direction | Content |
| --- | --- |
| Inputs | Edition files (`codex-2759.xml`, `Bildannotationen.xml`, the register file), Transkribus exports, the published transcription handbook (version February 2025), ratification decisions on encoding |
| Outputs | Edited XML files, one per file, each passing the output gate. Under the [working model](specification.md#working-model) the team commits them to its own repository, and a pipeline there reports the review findings |

The formats are described in [data](data.md); the encoding rules and the list of divergences between handbook and implementation in [editorial-guidelines](editorial-guidelines.md).

### Oxygen co-use (binding documented, framework planned)

Shared use is possible when the rule-bearing layer consists of files both tools read. That layer lives in `editorial/`.

| Layer file | teiCrafter binding | Oxygen binding |
| --- | --- | --- |
| RelaxNG (TEI All now, project ODD later) | Manifest schema set | Framework validation scenario or `xml-model` processing instruction |
| `editorial/wenzelsbibel.sch` with phases `editing` and `review`, XPath 1.0 | The same file, through a published copy in the workspace default schema set or a project manifest; `editing` gates saving, `review` runs on request | The same file, through an `xml-model` processing instruction with an optional `phase` pseudo-attribute, or a validation scenario that fixes the phase |
| `xml-model` processing instructions (documented in `editorial/README.md`) | Inspected as schema evidence | Associates schemas on open; they change the edition files and belong in the team's working copies |

The exact processing instructions and the open point whether the Oxygen version in use honours the `phase` pseudo-attribute are recorded in `editorial/README.md`. Without touching the edition files, Oxygen would bind the layer through a framework: an `.exf` extension script, Author mode CSS and actions defined without Java, distributed as an add-on URL. XPath 1.0 keeps the Schematron runnable in the browser without SaxonJS. The interface, the inspector forms, autocomplete and the cross-file checks (register targets, image-to-codex pointers) are implemented separately in each tool; this duplication is unavoidable.

## Responsibilities

| Party | Decides or delivers |
| --- | --- |
| Edition team at PLUS | Scholarly data model, project-specific schema rules, rights, acceptance, ratification of the encoding |
| DHCraft | TEI specification draft, this editor, the editorial layer, technical verification |
| Base teiCrafter | Generic editor behaviour and its evidence |

## Acceptance criteria

- An output file passes TEI All and the `editing` phase of the project Schematron for its exact bytes. The `review` phase is reported and gates nothing.
- Every byte outside a deliberate edit is identical to the input.
- A fork merge from upstream leaves the inherited engine proofs green ([testing](testing.md)).
- Technical checks do not ratify. An encoding rule counts as agreed only after the edition team's decision is recorded in [editorial-guidelines](editorial-guidelines.md).

## Open points and input gaps

- Register encoding: decided by the operator as inline links on the words, written as `rs[@type][@ref]` and read in the handbook form `ref[@type][@target]` ([specification](specification.md#key-decisions)). The written form and the pointer syntax await the edition team's ratification.
- Working model: the edition repository on the university's GitLab, the split of the codex into book files and the pipeline are the operator's proposal and need the edition team's confirmation ([specification](specification.md#working-model)).
- Which list element in the register file carries peoples. The handbook says only "Register".
- Licence of the edition data for project storage. The public TEI header declares CC BY 4.0; the operator's vault records the question as unresolved, so the data are treated as local material.
- The original project Schematron `Bilderfassung.sch` referenced in `Bildannotationen.xml` is not available.
- Roles of the users in the edition team, to be confirmed in the first meeting.

## Pitfalls

| Wrong assumption | Correct reading |
| --- | --- |
| Technical access to the ONB IIIF service permits storing images | Access implies no permission to store, redistribute or publish images or edition data |
| A valid file is a correct edition | Validity covers the formal rules only; readings and identifications need the edition team |
| `docs/schemas/wenzelsbibel-editorial.sch` is the project's Schematron | It is a teiCrafter-authored draft for image annotations, still referenced by the workspace default schema set; the fork's rule layer is `editorial/wenzelsbibel.sch` |
| Review findings block saving | Only the `editing` phase gates saving; the `review` phase is a report on request and in the planned pipeline |
| The project used ediarum | The handbook describes a Transkribus-only workflow; there is no evidence of ediarum use |

## Authoritative documents

| Aspect | Source of truth | Path |
| --- | --- | --- |
| Project status, coordination | Project Overview Wenzelsbibel | Operator's vault, `Projects/Wenzelsbibel/` |
| Scholarly long form of the specification | TEI-Spezifikation Wenzelsbibel | Operator's vault, `Projects/Wenzelsbibel/` |
| Handbook rules and divergence list | [editorial-guidelines](editorial-guidelines.md) | `knowledge/editorial-guidelines.md` |
| Schematron rules, phases, Oxygen and teiCrafter binding | Editorial layer | `editorial/README.md`, `editorial/wenzelsbibel.sch` |
| Findings on the public data | Dated snapshot | `editorial/data-findings.md` |
| Formats | [data](data.md) | `knowledge/data.md` |
| Generic editor contracts | teiCrafter knowledge base | `knowledge/integration.md` and `knowledge/data.md` in the base repository |
| Base refactor | teiCrafter plan | `knowledge/plan.md` in the base repository |
