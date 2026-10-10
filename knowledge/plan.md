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

This plan orders the work from the knowledge base to a published prototype that the edition team can see in the first meeting, and the preparation of the edition repository that follows the meeting. Phases are ordered by dependency and carry no dates. Decisions taken along the way go to [specification](specification.md) and [journal](journal.md).

## Target picture

- The five meeting workflows (page with facsimile and word edit, apparatus comment, register link, miniature annotation, validate and save) run in the new German interface on the real files.
- The text view is the flow of [specification](specification.md#text-view), a CodeMirror module hosted by the legacy app.
- The Wenzelsbibel code lives in `docs/js/projects/wenzelsbibel/`, and the generic editor is identical to the base.
- `editorial/` holds `wenzelsbibel.sch`, its fixtures and the fixture check, readable by the editor, by Oxygen and by the planned GitLab pipeline.
- A demo protocol and a real-file run are recorded under `snapshots/`.

## Phases

| Phase | Deliverable | Acceptance check | Blocker |
| --- | --- | --- | --- |
| 1 Knowledge base | `knowledge/` documents, `data/` added to `.gitignore`, fork `CLAUDE.md` and `README.md` | Documents follow the Promptotyping convention; every link resolves | Operator review |
| 2 Static wireframe | `wireframe/` at the repository root with real fol. 1r data | The agreed layout (menu bar, document bar, flowing text with facsimile, bottom inspector, notice bar) shows fol. 1r with its ONB image | None |
| 3 Base refactor and merge | Refactor steps a to e in teiCrafter, merged into the fork | Base acceptance holds (teiCrafter `knowledge/plan.md`); the inherited checks workflow passes on the fork | None |
| 4 Editorial layer | Divergence list in [editorial-guidelines](editorial-guidelines.md); `editorial/wenzelsbibel.sch` with the phases `editing` and `review`; one pass and one fail fixture per rule; `check_fixtures.py`; a dated findings snapshot of the public data; published copy under `docs/` with an equality check, referenced by the workspace default schema set | Fixture check green; the editing phase accepts the published codex and image annotations unchanged; the published copy equals the source | None |
| 5 Interface rebuild | The flow view as a CodeMirror module hosted by the legacy app with a vendored bundle; new `editor.html` shell with menu bar, document bar, bottom inspector, register autocomplete, notice bar and findings list, inline register links (`rs[@type][@ref]` written, `ref[@target]` read); `wb-demo-*.spec.js` tests | One demo test per workflow green in Chromium and Firefox; Biome clean; the flow view keeps untouched bytes identical on the full codex | Operator decision on typing in the flow (specification F18) before the word commands |
| 6 Verification with real files | Real-file run and demo protocol under `snapshots/` | All five workflows on the real codex, image annotations and registers; output passes the gate; untouched bytes identical | Edition files are on the operator's other machine |
| 7 Publication | Pages from `main:/docs` | The published start page and editor load and open a user-supplied file | Operator action: enabling Pages |
| 8 Edition repository preparation | One-time preparation after the meeting and before the team starts: split the codex into book files with a shared apparatus and register, format every file once with "XML formatieren", seed the register from the existing link values, set up the GitLab pipeline (TEI All and the `review` phase, findings report) | The split files together carry the content of the codex unchanged apart from formatting; the editing phase accepts every file; the pipeline reports on a test push | Edition team confirms the [working model](specification.md#working-model) and the file topology; access to the university's GitLab |

### Phase 2 notes

The wireframe sits at `wireframe/` outside `docs/`, so Pages does not publish it. Only its HTML, CSS and JavaScript are versioned. It reads the fol. 1r extraction from the ignored `data/wireframe/` folder, loads OpenSeadragon from `docs/vendor/` and the image from the ONB IIIF service at runtime, and is served by a local static server at the repository root. Its menu still lists the retired Ansicht entries Zeilenweise and Fließtext, which [design](design.md#menu-bar) no longer carries.

### Phase 4 notes

The rule table, the phase model and the bindings for teiCrafter and Oxygen are documented in `editorial/README.md`, the findings on the public data in `editorial/data-findings.md`. The remaining item is the published copy under `docs/` with its equality check, after which the default schema set in `docs/js/projects/wenzelsbibel/index.js` points to it instead of the base draft.

### Phase 5 notes

A feasibility study for the flow view divides the work into packages. Package 1, the spike in `prototypes/d-flow`, covers the model, the decorations, typing with `@orig` kept in step, selection snapping, the `rs` wrap and its refusals. The remaining packages keep the study's numbering:

2. Folio-window virtualisation, so that the flow model is built for the visible folio only, and a load test on the full codex.
3. Wrap command rules: which elements a wrap may enclose, register type and pointer form, unwrapping.
4. Word commands: editing `@norm`, assigning `xml:id` to new words, splitting and joining words.
5. The vendored CodeMirror bundle and the integration of the view into the legacy app, with the undo history handed over to `EditorSession`.
6. Validation of flow edits through the schema set, and Playwright tests for the flow view.

The inherited browser suites that drive the base shell are excluded in the fork through a fork-only Playwright configuration ([testing](testing.md#known-exceptions-and-limits)). Inspector and autocomplete are built as new files in `docs/js/editor/` so they can be offered to the base. Field tables and German labels go to `docs/js/projects/wenzelsbibel/ui/`.

## Status tracker

| Phase | Status | Notes |
| --- | --- | --- |
| 1 Knowledge base | in progress | `data/` is ignored; operator review pending |
| 2 Static wireframe | completed | Flowing text with caret, OpenSeadragon facsimile with SVG zones, notice bar, "XML formatieren" |
| 3 Base refactor and merge | completed | Steps a to e completed in the base; merged with the base knowledge deletions kept ([architecture](architecture.md#derivation-model)); the inherited checks workflow passed on the fork on 2026-10-10 |
| 4 Editorial layer | in progress | Schematron, fixtures, fixture check and findings snapshot done; published copy under `docs/` outstanding |
| 5 Interface rebuild | pending | Flow spike done in `prototypes/d-flow` |
| 6 Verification with real files | pending | |
| 7 Publication | pending | |
| 8 Edition repository preparation | pending | After the meeting |

Legend: completed, in progress, pending.

## Open decisions and dependencies

| Decision | Needed before | Recommendation |
| --- | --- | --- |
| Written form of register links (`rs[@type][@ref]` proposed) and pointer syntax | Edition team meeting; the prototype writes the proposed form meanwhile | Proposed form |
| List element for peoples in the register file | Phase 8 (seeding the register) | Open |
| Whether typing in the flow writes to the source | Phase 5, work package 4 (word commands) | Yes, limited to words without inner markup ([specification](specification.md#open-questions)) |
| Visible confirmation of a clean check | Phase 5, notice bar | A brief confirmation that dismisses itself |
| `xml:space` handling in "XML formatieren" | Phase 5, before phase 8 formats the files | Leave elements under `xml:space="preserve"` untouched |
| Working model and file topology | Phase 8 | The operator's proposal in [specification](specification.md#working-model) |
| Whether inspector and autocomplete become base components | Phase 5 (does not block it) | Generic components in the base |
| Composition of the new shell through `editor-app.js` or a fork-specific module | Phase 5 | Fork-specific module reusing the generic controllers |

Phase 5 depends on the completed phase 3, because the new shell binds to the project folder and the workspace registry. Phase 8 depends on the meeting and uses "XML formatieren" from phase 5.

## Out of scope for the prototype

- Project ODD. TEI All plus `wenzelsbibel.sch` carries the rules.
- Project package (ZIP) as a delivery format.
- Bible-verse form and Bible-verse menu entries.
- A findings surface beyond the notice bar and its bottom-area list.
- A keyboard shortcut scheme beyond browser and editor defaults, Esc for the inspector and Ctrl+E for allowed elements.
- PAGE import, witness management, entry workspace.
- Language model features.
- Git operations inside the tool. The working model leaves them to a Git desktop client.

## Deviations

A phase may be reordered when a blocker holds and a later phase is independent of it. The change and its reason go to [journal](journal.md). Independent of order, untouched bytes stay identical and Save stays behind the output gate.
