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

This plan orders the work from the knowledge base to an editor in which the edition team edits the Wenzelsbibel, and the preparation of the edition repository the team then works in. Phases are ordered by dependency and carry no dates. Decisions taken along the way go to [specification](specification.md), the provenance of finished steps to [journal](journal.md).

## Target picture

The tool is finished enough when the edition team actually edits with it. Until then the five workflows of the [specification](specification.md#purpose-and-scope) are the product core that grows.

- The five workflows (page with facsimile and word edit, apparatus comment, register link, miniature annotation, validate and save) run in the new German interface on the real files.
- Every generic mechanism is built in teiCrafter and arrives by merge. The fork keeps only vocabularies, Schematron, field tables, German labels and the shell composition in `docs/js/projects/wenzelsbibel/` ([architecture](architecture.md#derivation-model)).
- `docs/schemas/wenzelsbibel.sch` and `docs/schemas/wenzelsbibel-vocabulary.json` hold the project rules and value lists, readable by the editor, by Oxygen and by the planned GitLab pipeline, and `editorial/` holds their fixtures and the fixture check.
- A demo protocol and a real-file run are recorded under `snapshots/`, and the wireframe is deleted.

## Phases

| Phase | Deliverable | Acceptance check | Blocker |
| --- | --- | --- | --- |
| 1 Knowledge base | `knowledge/` documents, `data/` added to `.gitignore`, fork `CLAUDE.md` and `README.md` | Documents follow the Promptotyping convention; every link resolves | Operator review |
| 2 Static wireframe | `wireframe/` at the repository root with real fol. 1r data, kept as the feedback instrument until phase 5b | The agreed layout and every workflow run in memory on fol. 1r; the walkthroughs under `wireframe/checks/` pass | None |
| 3 Base refactor and merge | Refactor steps a to e in teiCrafter, merged into the fork | Base acceptance holds (teiCrafter `knowledge/plan.md`); the inherited checks workflow passes on the fork | None |
| 4 Editorial layer | Divergence list in [editorial-guidelines](editorial-guidelines.md); the project Schematron `docs/schemas/wenzelsbibel.sch` as single source, named "Editionsregeln" in the workspace default schema set; the project vocabulary `docs/schemas/wenzelsbibel-vocabulary.json`; the [editorial layer](../editorial/README.md) with fixtures and the fixture check including the vocabulary comparison; the [findings snapshot](../snapshots/schematron-findings-2026-10-10.md) of the public data | Fixture check green, including equal value lists in Schematron and vocabulary; the editing phase accepts the published codex and image annotations unchanged | None |
| 5a Base mechanisms in teiCrafter | Built in the base and merged: the toolbar, the popover at the selection rendering forms from a field table, the side panel, the register autocomplete over any register list, the notice bar and findings list over `validation-view.js` results, the folding of `xml:id` and `facs` in the XML view, the CodeMirror flow view with its vendored bundle and "XML formatieren", and the `tei-document` seam between the legacy offset tree and `src/core` | Accepted against the base's own plan and checks (teiCrafter `knowledge/plan.md`); the merge leaves the inherited proofs green; the flow view keeps untouched bytes identical on the full codex | The base plan still lists the inspector (now the popover) and autocomplete as an open decision |
| 5b Fork composition | In `docs/js/projects/wenzelsbibel/`: field tables, markup value lists and labels read from the project vocabulary, German labels, menu and document bar definitions, and the composition of the new `editor.html` shell from the base mechanisms; inline register links ([specification](specification.md#key-decisions)); `wb-demo-*.spec.js` tests | One demo test per workflow green in Chromium and Firefox; `npm run check:fork` clean; the wireframe deleted | Phase 5a merged |
| 6 Verification with real files | Real-file run and demo protocol under `snapshots/` | All five workflows on the real codex, image annotations and registers; output passes the gate; untouched bytes identical | Operator names the machine that holds the edition files |
| 7 Publication | Pages from `main:/docs` | The published start page and editor load and open a user-supplied file | Operator action: enabling Pages from `main:/docs` |
| 8 Edition repository preparation | One-time preparation before the team starts editing: split the codex into book files with a shared apparatus and register, format every file once with "XML formatieren", seed the register from the existing link values, set up the GitLab pipeline (TEI All and the `review` phase, findings report) | The split files together carry the content of the codex unchanged apart from formatting; the editing phase accepts every file; the pipeline reports on a test push | Edition team confirms the [working model](integration.md#working-model) and the file topology; access to the university's GitLab |

### Phase 2 notes

The wireframe is the instrument on which the operator gives interface feedback with the real fol. 1r data until the real interface exists. It takes corrections from that feedback, no new features and no refactoring, and each correction that concerns the real build goes into the specification or the design as a requirement. It is deleted once the real interface passes the demo workflow tests of phase 5b. What it leaves to the real build is recorded in the [first](../snapshots/wireframe-review-2026-10-10.md) and the [second](../snapshots/wireframe-review-2026-10-10-2.md) review snapshot.

### Phase 4 notes

The rules, phases and bindings live in the [editorial layer](../editorial/README.md), the value lists in the [project vocabulary](data.md#controlled-vocabulary), the findings on the public data in the [findings snapshot](../snapshots/schematron-findings-2026-10-10.md). The base draft `wenzelsbibel-editorial.sch` leaves `docs/schemas/` and `public/schemas/` through the base, under the handoff the operator writes there ([integration](integration.md#base-teicrafter)).

### Phase 5 notes

Phase 5a is base work and is ordered by the base's plan. A feasibility study for the flow view divides the flow part into packages. Package 1, the spike in `prototypes/d-flow`, covers the model, the decorations, typing with `@orig` kept in step, selection snapping, the `rs` wrap and its refusals. The remaining packages keep the study's numbering:

2. Folio-window virtualisation, so that the flow model is built for the visible folio only, and a load test on the full codex.
3. Wrap command rules: which elements a wrap may enclose, register type and pointer form, unwrapping.
4. Word commands: editing `@norm`, assigning `xml:id` to new words, splitting and joining words.
5. The vendored CodeMirror bundle and the integration of the view into the legacy app, with the undo history handed over to `EditorSession`.
6. Validation of flow edits through the schema set, and Playwright tests for the flow view.

The mark tables and register types these packages consume are project data and belong to phase 5b. The inherited browser suites that drive the base shell are excluded in the fork through a fork-only Playwright configuration ([testing](testing.md#known-exceptions-and-limits)).

## Next steps

The order of the remaining work after the operator's feedback rounds of 2026-10-10, as the living list of what is still to do. An item leaves this list when its phase row records it as done.

1. Wireframe, second feedback round: word commands in the flow (a space splits a word, Backspace at a word boundary joins, Delete on a whole word removes it, each with undo and an `xml:id` for a new word); `xml:id` and `facs` folded in the XML view with a switch "IDs anzeigen"; the findings-list texts that still name the page excerpt; the facsimile follows a line selection when the line lies outside the visible image.
2. Wireframe observations still open from the pivot: the single-word state shows Anwenden and Abbrechen twice (once per field), and Apparatkommentar is disabled on a single word; decide whether a word may receive a comment alone.
3. Phase 5a in the base: the five mechanisms, with the popover at the selection in place of the bottom inspector, and the XML view folding as a CodeMirror decoration.
4. Phase 5b, then 6, 7 and 8 as the phase table orders them.
5. Operator points in [handoff](handoff.md): review and install the design skills, inform the edition team about the tracked excerpt, the vocabulary editor, the German summary layer.

## Status tracker

| Phase | Status | Notes |
| --- | --- | --- |
| 1 Knowledge base | in progress | Operator review pending |
| 2 Static wireframe | in progress | Shell pivot to toolbar, popover and side panel done and verified by the walkthroughs; second feedback round listed under [next steps](#next-steps); deleted in phase 5b |
| 3 Base refactor and merge | completed | Merged with the base knowledge deletions kept |
| 4 Editorial layer | in progress | Move to `docs/schemas/`, vocabulary and its consistency check to be verified |
| 5a Base mechanisms in teiCrafter | pending | Flow spike done in `prototypes/d-flow` |
| 5b Fork composition | pending | |
| 6 Verification with real files | pending | |
| 7 Publication | pending | |
| 8 Edition repository preparation | pending | |

Legend: completed, in progress, pending.

## Open decisions and dependencies

| Decision | Needed before | Recommendation |
| --- | --- | --- |
| Written form and pointer syntax of register links ([specification](specification.md#key-decisions)) | Phase 8 (seeding the register); the tool writes the proposed form meanwhile | Proposed form |
| List element for peoples in the register file | Phase 8 (seeding the register) | Open |
| `xml:space` handling in "XML formatieren" | Phase 5a, before phase 8 formats the files | Leave elements under `xml:space="preserve"` untouched |
| Working model and file topology | Phase 8 | The operator's proposal in [integration](integration.md#working-model) |
| Composition of the new shell through `editor-app.js` or a fork-specific module | Phase 5b | Fork-specific module reusing the generic controllers |
| Who edits the project vocabulary `docs/schemas/wenzelsbibel-vocabulary.json` in future, the operator or a member of the edition team | Phase 8, before the team's ratifications enter the value lists | Open with the operator |
| Whether the edition team reads `knowledge/`, which decides whether a German summary layer is written | Before the knowledge base goes to the edition team for review | Open with the operator |

Phase 5a depends on the completed phase 3, because the mechanisms bind to the project folder and the workspace registry. Phase 5b depends on the merge of phase 5a. Phase 8 depends on the edition team's confirmation of the working model and uses "XML formatieren" from phase 5a.

## Out of scope

What the tool leaves out is decided in [specification](specification.md#purpose-and-scope).

## Deviations

A phase may be reordered when a blocker holds and a later phase is independent of it. The change and its reason go to [journal](journal.md). Independent of order, untouched bytes stay identical and Save stays behind the output gate.
