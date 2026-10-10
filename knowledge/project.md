---
title: wenzelsbibel-teiCrafter Project Overview
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Projekt-Wissensdokument
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/project
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[Digital Scholarly Editing]]", "[[TEI XML]]", "[[Scholar-Centered Design]]"]
related: [editorial-guidelines, data, specification, design, architecture, testing, integration, plan, journal, handoff]
---

# wenzelsbibel-teiCrafter Project Overview

## Identity

wenzelsbibel-teiCrafter is the editing environment for the digital edition of Codex 2759, the Wenzelsbibel held by the Austrian National Library in Vienna. It is a derived version of [teiCrafter](https://github.com/DigitalHumanitiesCraft/teiCrafter), the browser-based TEI editor of Digital Humanities Craft, specialised for the word-level TEI of the codex, its image annotations and its registers. The repository holds the tool and its project layer. The edition itself, meaning the TEI files, the Transkribus exports and the images, belongs to the edition team at the Paris Lodron University Salzburg (PLUS) and stays outside this repository.

The derivation is permanent and follows one principle. teiCrafter is the product, and everything the Wenzelsbibel needs that another edition could need as well is built in the teiCrafter base and merged into this repository. Everything that encodes the rules of this edition, its vocabularies, its field tables, its schema set and its German interface labels, lives here. The [architecture](architecture.md) describes the merge path and the three zones this repository changes.

## Purpose and users

The tool lets the edition team continue the existing word edition in the browser without an Oxygen licence or a server. The edition team decides whether it moves from the expected Oxygen workflow to this tool, and the tool is finished enough when the team actually edits with it. The [specification](specification.md) names the five workflows that form its core and what is deliberately left out.

Users are the project lead at the department of German studies at PLUS and the student assistants who transcribe and annotate. The exact roles and their division of labour are confirmed by the edition team.

## Rule source

The edition's own transcription handbook, published on the edition server of the Austrian National Library, is the rule the tool fulfils. It maps every Transkribus tag to a TEI encoding and defines the controlled vocabularies. The DHCraft specification in the operator's vault and the conventions implemented in the teiCrafter base are drafts and implementation choices that the edition team has not ratified. [editorial-guidelines.md](editorial-guidelines.md) owns the comparison of the three layers and the open ratification points. Where the handbook and the base diverge, the handbook wins in this repository, and the generic mechanism behind it is kept in the base.

## Authority and acceptance

PLUS decides the scholarly data model, the project-specific schema rules, the rights to data and images, and the acceptance of the edition. Technical checks in this repository, including schema validation, browser tests and runs with the real files, establish that the tool behaves as specified. They do not ratify an encoding and do not accept the edition. The human editor authorises every substantive change; the tool offers no model proposals for this project.

## Rights boundary

The codex and the image annotations are accessible on the edition server of the Austrian National Library, and the images resolve through its IIIF image service. Technical access implies no permission to store, redistribute or publish the data or the images. The repository therefore carries no working copy of the edition data and no page image; a local `data/` folder is ignored by Git, and an extraction of fol. 1r for the wireframe stays local. A publicly published and licensed excerpt may be tracked when a `NOTICE.md` beside it carries the attribution its licence requires, which holds for the CC BY 4.0 excerpt `prototypes/d-flow/fixture/fol1r.xml` of the flow spike. All other test material consists of synthetic twins and hand-built fixtures, see [data.md](data.md#storage-and-rights).

## Relation to the base

The base teiCrafter is maintained as a generic editor. Its legacy application under `docs/` is the derivable base since 2026-10-10; its source-first core under `src/` is a parallel line that this repository does not use until it carries an application. The [integration contract](integration.md) states what this repository consumes from the base, what it must not change and what it contributes back. The operator's vault keeps the project status in its working list and the scholarly long form in the TEI specification of the Wenzelsbibel; this knowledge base keeps the implementation truth.
