---
title: Plan
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Plan
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/plan
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-plan
status: active
created: 2026-10-10
updated: 2026-10-10
language: en
related: [specification, architecture, testing, integration, editorial-guidelines, design, journal, handoff, INDEX]
---

# Plan

This plan orders the work from the knowledge base to a published prototype that the edition team can see in the first meeting. Phases are ordered by dependency and carry no dates; decisions taken along the way go to [specification](specification.md) and [journal](journal.md).

## Target picture

- The five meeting workflows (page with facsimile and word edit, apparatus comment, register link, miniature annotation, validate and save) run in the new German interface on the real files.
- The Wenzelsbibel code lives in `docs/js/projects/wenzelsbibel/`, merged from the base refactor, and the generic editor is identical to the base.
- `editorial/` holds the divergence list, `wenzelsbibel.sch` and its fixtures, readable by the editor and later by Oxygen.
- A demo protocol and a real-file run are recorded under `snapshots/`.

## Phases

| Phase | Deliverable | Acceptance check | Blocker |
| --- | --- | --- | --- |
| 1 Knowledge base | `knowledge/` documents, `data/` added to `.gitignore`, fork `CLAUDE.md` and `README.md` | Documents follow the Promptotyping convention; every link resolves | Operator review |
| 2 Static wireframe | `wireframe/` at the repository root with real fol. 1r data | The agreed layout (menu bar, document bar, text with facsimile, bottom inspector, status line) shows fol. 1r with its ONB image | The fol. 1r extraction must be copied into the ignored `data/` folder |
| 3 Base refactor and merge | Refactor steps a to e in teiCrafter, merged into the fork | Base acceptance holds (see teiCrafter `knowledge/plan.md`); after the merge, `node test/verify.mjs` is green in the fork | Push of the base refactor to GitHub by the operator, or a temporary fetch from the local base clone |
| 4 Editorial layer | Divergence list completed in [editorial-guidelines](editorial-guidelines.md); `editorial/wenzelsbibel.sch` with phases; one positive and one negative fixture per rule; published copy and equality check | Fixture check green; manifest schema set validates the synthetic codex | Operator decision on register encoding |
| 5 Interface rebuild | New `editor.html` shell: menu bar, document bar, bottom inspector, register autocomplete, status line and findings list, `ref` encoding once decided; `wb-demo-*.spec.js` tests | One demo test per workflow green in Chromium and Firefox; Biome clean | Register encoding decision (phase 4) |
| 6 Verification with real files | Real-file run and demo protocol under `snapshots/` | All five workflows on the real codex, image annotations and registers; output passes the gate; untouched bytes identical | Edition files are on the operator's other machine |
| 7 Publication | GitHub repository, push, Pages from `main:/docs` | The published start page and editor load and open a user-supplied file | Operator action: `gh` is not authenticated in this environment; repository creation and push stay with the operator |

### Phase 2 notes

The wireframe sits at `wireframe/` outside `docs/`, so Pages does not publish it. Only its HTML, CSS and JavaScript are versioned; it reads the fol. 1r extraction (columns, lines, tokens, apparatus, registers, `miniature_01`, zones, IIIF reference) from `data/` and loads the image from the ONB IIIF service at runtime. It is served by a local static server at the repository root. It uses the base design tokens and serves the review of [design](design.md) before code is written.

### Phase 3 notes

The base refactor is done in teiCrafter, not here, so the generic editor stays identical in both repositories. The merge brings modify/delete conflicts for base knowledge files; the deletion is kept ([architecture](architecture.md#derivation-model)).

### Phase 5 notes

The inherited browser suites that drive the base shell are excluded in the fork through a fork-only Playwright configuration ([testing](testing.md#known-exceptions-and-limits)). Inspector and autocomplete are built as new files in `docs/js/editor/` so they can be offered to the base; field tables and German labels go to `docs/js/projects/wenzelsbibel/ui/`.

## Status tracker

| Phase | Status | Notes |
| --- | --- | --- |
| 1 Knowledge base | in progress | Started 2026-10-10 |
| 2 Static wireframe | pending | Extraction of fol. 1r exists in the session scratchpad |
| 3 Base refactor and merge | pending | |
| 4 Editorial layer | pending | |
| 5 Interface rebuild | pending | |
| 6 Verification with real files | pending | |
| 7 Publication | pending | |

Legend: completed, in progress, pending.

## Open decisions and dependencies

| Decision | Needed before | Recommendation |
| --- | --- | --- |
| Register encoding: typed `ref` on the words (handbook) or stand-off register links | Phase 4 | Handbook form |
| List element for peoples in the register file | Phase 4 | Open |
| Whether inspector and autocomplete become base components | Phase 5 (does not block it) | Generic components in the base |
| Published copy of `editorial/wenzelsbibel.sch` under `docs/` with an equality check | Phase 4 | Copy plus check, no build step |
| Composition of the new shell through `editor-app.js` or a fork-specific module | Phase 5 | Fork-specific module reusing the generic controllers |

Phases 4 and 5 depend on phase 3 because the editorial layer and the new shell bind to the project folder and the workspace registry. Phase 2 depends only on phase 1 and can run in parallel with phase 3.

## Out of scope for the prototype

- Project ODD; TEI All plus `wenzelsbibel.sch` carries the rules.
- Project package (ZIP) as a delivery format.
- Bible-verse form and Bible-verse menu entries.
- A findings list beyond the status line and its bottom-area list.
- A keyboard shortcut scheme beyond browser and editor defaults, Esc for the inspector and Ctrl+E for allowed elements.
- PAGE import, witness management, entry workspace.
- Language model features.

## Deviations

A phase may be reordered when a blocker holds and a later phase is independent of it; the change and its reason go to [journal](journal.md). Independent of order, untouched bytes stay identical and Save stays behind the output gate.
