---
title: wenzelsbibel-teiCrafter Knowledge Base Index
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Index
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/index
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
version: "0.1"
related: [project, editorial-guidelines, data, specification, design, architecture, testing, integration, plan, journal, handoff]
---

# wenzelsbibel-teiCrafter Knowledge Base

This knowledge base documents the editing environment derived from teiCrafter for the Wenzelsbibel edition, for the coding agents that build it, for the operator and for the edition team that reviews it. It holds the rules the tool fulfils, what it must do, how it is built and how it is checked. The operator's vault holds the project status and coordination, [plan](plan.md) the phase tracker, the teiCrafter repository the base's own knowledge, and the edition data stay outside every repository.

## Documents

| Path | Function | Routing question | Updated when |
|---|---|---|---|
| [project.md](project.md) | Charter | What is this tool, for whom, within which boundaries? | identity, users or boundaries change |
| [editorial-guidelines.md](editorial-guidelines.md) | Domain Knowledge | Which scholarly rules govern the encoding, and where do handbook, DHCraft specification and base implementation diverge? | the handbook, a ratification or an observed encoding changes |
| [data.md](data.md) | Material | Which files and formats does the tool process? | a file, the manifest or the schema set changes |
| [specification.md](specification.md) | Specification | What must the tool do and why? | a requirement, a decision or an acceptance scenario changes |
| [design.md](design.md) | Design | How does the interface look and behave? | the interface or its interaction rules change |
| [architecture.md](architecture.md) | Architecture | How is the derived tool built and kept mergeable with the base? | a module, the merge path or the deployment changes |
| [testing.md](testing.md) | Quality Assurance | What is guaranteed, what is not, how is it checked? | a test layer or a claim changes |
| [integration.md](integration.md) | Integration | What does this repository exchange with the base, the edition team and Oxygen, and under which working model? | a contract changes |
| [plan.md](plan.md) | Planning | What comes next and in which order? | a phase is accepted, finished or dropped |
| [journal.md](journal.md) | Provenance | Which transitions were integrated, rejected or corrected? | after a coherent transition |
| [handoff.md](handoff.md) | Handoff | Which received inputs await integration? | an input arrives or is processed |

## Storage zones

- `knowledge/` holds the maintained documents above, including `handoff.md` as the process inbox.
- `editorial/` holds the tool-neutral project layer: the project Schematron `wenzelsbibel.sch`, its fixtures, the fixture check, the dated findings snapshot and a README with the rule table and the tool bindings. Oxygen and this tool are meant to read the same files from here.
- `docs/` holds the published application, inherited from the base; the start page and editor shell of this repository are planned there ([architecture](architecture.md#derivation-model)).
- `wireframe/` holds the wireframe with fol. 1r, in which every workflow of the specification runs in memory with undo; `wireframe/checks/` holds its browser walkthroughs. It is served locally and not published.
- `prototypes/d-flow/` holds the spike of the flow view with its Node and browser checks.
- `snapshots/` is the place for dated reports such as the demo protocol and test runs with the real files.
- `data/` is ignored by Git and holds the edition files on a machine that has them.

## Reading paths

- Onboarding: project, editorial-guidelines, specification, design, architecture.
- Encoding question: editorial-guidelines, data, then the real file.
- Interface work: design, specification, then the base's design document for the tokens.
- Merge from the base: architecture, integration, plan.
- Why a decision stands: specification (Key decisions), journal.

## Convention

The knowledge base follows the Promptotyping Documents convention of the operator's vault, mirrored publicly at https://dhcraft.org/Promptotyping/#konvention-v0.1, which defines the naming contract, the frontmatter schema and the routing heuristic. This index owns the shared documentation schema version in its `version` field; sibling documents inherit it.

## Terms

Base
: The teiCrafter repository and its legacy application under `docs/`, from which this repository derives and merges.

Bildannotationen
: The second TEI file of the edition, holding one item per miniature with descriptions, artist attribution, ICONCLASS references and the text relation to the codex.

Codex
: Codex 2759 of the Austrian National Library, and the TEI file `codex-2759.xml` that encodes it word by word with facsimile zones and a stand-off apparatus.

Handbook
: The edition's published Transkriptionshandbuch (version February 2025), the rule source for the encoding, see editorial-guidelines.

Inspector
: The bottom bar of the editor that shows and edits what is selected, in text and XML view alike.

Project folder
: The folder in the base that holds the Wenzelsbibel specialisation after the base refactor, `docs/js/projects/wenzelsbibel/`.

Register
: The shared file of persons, places and peoples that words in the codex and items in the image annotations refer to.

Workspace registry
: The mechanism in the base through which a project folder registers its workspace, replacing hard-wired references.
