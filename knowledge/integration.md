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

This repository exchanges code with the base teiCrafter, files and decisions with the Wenzelsbibel edition team at the Paris Lodron University Salzburg (PLUS), and a tool-neutral rule layer with Oxygen XML Editor. The first two exchanges are active; the Oxygen co-use is planned and not implemented.

## Data flow

```text
teiCrafter (upstream) --(git merge: generic editor, registry, manifest contract, schema set, tokens)--> fork
fork --(pull requests to upstream: generic components, bug fixes)--> teiCrafter

edition team --(edition XML, Transkribus exports, handbook, ratification decisions)--> operator's machine (data/, not versioned)
fork (browser) --(edited XML per file; later a project package)--> edition team

editorial/ (RelaxNG or later ODD, wenzelsbibel.sch, xml-model PIs)
  --> fork: manifest schema set
  --> Oxygen: framework (planned)
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
| Outputs | Edited XML files, one per file, each passing the output gate; a validated project package as one archive is a later step |

The formats are described in [data](data.md); the encoding rules and the list of divergences between handbook and implementation in [editorial-guidelines](editorial-guidelines.md).

### Oxygen co-use (planned, not implemented)

Shared use is possible when the rule-bearing layer consists of files both tools read. That layer lives in `editorial/`.

| Layer file | teiCrafter binding | Oxygen binding |
| --- | --- | --- |
| RelaxNG (TEI All now, project ODD later) | Manifest schema set | Framework validation scenario or `xml-model` processing instruction |
| `wenzelsbibel.sch` with phases `editing` and `review`, XPath 1.0 | Manifest schema set; phase selection through the runtime | Framework validation scenario with phase choice |
| `xml-model` processing instructions (`xml-model.md`) | Inspected as schema evidence | Associates schemas on open |

Oxygen would bind the layer through a framework: an `.exf` extension script, Author mode CSS and actions defined without Java, distributed as an add-on URL. XPath 1.0 keeps the Schematron runnable in the browser without SaxonJS. The interface, the inspector forms, autocomplete and the cross-file checks (register targets, image-to-codex pointers) are implemented separately in each tool; this duplication is unavoidable.

## Responsibilities

| Party | Decides or delivers |
| --- | --- |
| Edition team at PLUS | Scholarly data model, project-specific schema rules, rights, acceptance, ratification of the encoding |
| DHCraft | TEI specification draft, this editor, the editorial layer, technical verification |
| Base teiCrafter | Generic editor behaviour and its evidence |

## Acceptance criteria

- An output file passes TEI All and the project Schematron in the phase the manifest declares, for its exact bytes.
- Every byte outside a deliberate edit is identical to the input.
- A fork merge from upstream leaves the inherited engine proofs green ([testing](testing.md)).
- Technical checks do not ratify. An encoding rule counts as agreed only after the edition team's decision is recorded in [editorial-guidelines](editorial-guidelines.md).

## Open points and input gaps

- Register encoding: typed `ref` on the words as in the handbook, or the current stand-off register links. Operator decision pending, recommendation is the handbook form.
- Which list element in the register file carries peoples. The handbook says only "Register".
- Licence of the edition data for project storage. The public TEI header declares CC BY 4.0; the operator's vault records the question as unresolved, so the data are treated as local material.
- The original project Schematron `Bilderfassung.sch` referenced in `Bildannotationen.xml` is not available.
- Roles of the users in the edition team, to be confirmed in the first meeting.

## Pitfalls

| Wrong assumption | Correct reading |
| --- | --- |
| Technical access to the ONB IIIF service permits storing images | Access implies no permission to store, redistribute or publish images or edition data |
| A valid file is a correct edition | Validity covers the formal rules only; readings and identifications need the edition team |
| `docs/schemas/wenzelsbibel-editorial.sch` is the project's Schematron | It is a teiCrafter-authored draft for image annotations; the fork's rule layer is `editorial/wenzelsbibel.sch` |
| The project used ediarum | The handbook describes a Transkribus-only workflow; there is no evidence of ediarum use |

## Authoritative documents

| Aspect | Source of truth | Path |
| --- | --- | --- |
| Project status, coordination | Project Overview Wenzelsbibel | Operator's vault, `Projects/Wenzelsbibel/` |
| Scholarly long form of the specification | TEI-Spezifikation Wenzelsbibel | Operator's vault, `Projects/Wenzelsbibel/` |
| Handbook rules and divergence list | [editorial-guidelines](editorial-guidelines.md) | `knowledge/editorial-guidelines.md` |
| Formats | [data](data.md) | `knowledge/data.md` |
| Generic editor contracts | teiCrafter knowledge base | `knowledge/integration.md` and `knowledge/data.md` in the base repository |
| Base refactor | teiCrafter plan | `knowledge/plan.md` in the base repository |
