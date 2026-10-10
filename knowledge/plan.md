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

- The five workflows (page with facsimile and word edit, apparatus comment, register link, miniature annotation, validate and save) run in the new German interface on the real files, entered from the fork's start page and explained by its help page.
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
| 5a Base mechanisms in teiCrafter | The [phase 5a mechanisms](integration.md#phase-5a-mechanisms), built in the base and merged | Accepted against the base's own plan and checks (teiCrafter `knowledge/plan.md`); the merge leaves the inherited proofs green; the flow view keeps untouched bytes identical on the full codex | The contract handoff to the base is written as a [snapshot](../snapshots/base-handoff-5a-contract-2026-10-10.md) that predates the third feedback round and is not yet carried into the base, and the base plan still lists the inspector (now the popover) and autocomplete as an open decision |
| 5b Fork composition | The project composition in `docs/js/projects/wenzelsbibel/`, the new `editor.html` shell, the fork's start page and help page, and the `wb-demo-*.spec.js` tests, as listed in the [phase 5b notes](#phase-5b-notes) | One demo test per workflow green in Chromium and Firefox on the tracked fol. 1r excerpt, locally and in CI; an axe run per view, the keyboard paths of [design](design.md#interaction-rules) and the latency measurement of [testing](testing.md#interface-acceptance-layer) within the thresholds of [design](design.md#interaction-latency); `npm run check:fork` clean; the wireframe deleted | Phase 5a merged |
| 6 Verification with real files | Real-file run and demo protocol under `snapshots/` | All five workflows on the real codex, image annotations and registers; output passes the gate; untouched bytes identical | Operator names the machine that holds the edition files |
| 7 Publication | Pages from `main:/docs` | The published start page is the fork's, and it opens the example and a user-supplied file in the published editor | Operator action: enabling Pages from `main:/docs` |
| 8 Edition repository preparation | One-time preparation before the team starts editing: split the codex into book files with a shared apparatus and register, format every file once with "XML formatieren", seed the register from the existing link values, set up the GitLab pipeline (TEI All and the `review` phase, findings report), and add the `revisionDesc` change entry on save (W1) | The split files together carry the content of the codex unchanged apart from formatting; the editing phase accepts every file; the pipeline reports on a test push; a save with edits adds one change entry, and the gate validates the bytes that include it | Edition team confirms the [working model](integration.md#working-model) and the file topology; access to the university's GitLab |

### Phase 2 notes

The wireframe is the instrument on which the operator gives interface feedback with the real fol. 1r data until the real interface exists. It takes corrections from that feedback, no new features and no refactoring, and each correction that concerns the real build goes into the specification or the design as a requirement. It is deleted once the real interface passes the demo workflow tests of phase 5b. What the real build needs from it stands as requirements in the specification and the design. The [first](../snapshots/wireframe-review-2026-10-10.md) and the [second](../snapshots/wireframe-review-2026-10-10-2.md) review snapshot record the wireframe before the shell pivot.

### Phase 4 notes

The rules, phases and bindings live in the [editorial layer](../editorial/README.md), the value lists in the [project vocabulary](data.md#controlled-vocabulary), the findings on the public data in the [findings snapshot](../snapshots/schematron-findings-2026-10-10.md). The base draft `wenzelsbibel-editorial.sch` leaves `docs/schemas/` and `public/schemas/` through the base, under the handoff the operator writes there ([integration](integration.md#phase-5a-mechanisms)).

### Phase 5 notes

Phase 5a is base work and is ordered by the base's plan. A feasibility study for the flow view divides the flow part into packages. Package 1, the spike in `prototypes/d-flow`, covers the model, the decorations, typing with `@orig` kept in step, selection snapping, the `rs` wrap and its refusals. The remaining packages keep the study's numbering:

2. Folio-window virtualisation, so that the flow model is built for the visible folio only, and a load test on the full codex, measured as [testing](testing.md#interface-acceptance-layer) describes against the thresholds of [design](design.md#interaction-latency).
3. Wrap command rules: which elements a wrap may enclose, register type and pointer form, unwrapping.
4. Word commands: editing `@norm`, assigning `xml:id` to new words, splitting, joining and deleting words (F18, F54).
5. The vendored CodeMirror bundle and the integration of the view into the legacy app, with the undo history handed over to `EditorSession`.
6. Validation of flow edits through the schema set, and Playwright tests for the flow view.

The mark tables and register types these packages consume are project data and belong to phase 5b. `npm run test:e2e:fork` runs only the fork's `wb-demo-` suites, while the inherited `checks.yml` still runs every inherited browser suite against the base shell until phase 5b switches the fork's CI ([testing](testing.md#known-exceptions-and-limits)).

### Phase 5b notes

Phase 5b composes the fork from the merged base mechanisms and delivers the following.

- The field tables, the markup value lists and the register types with their German labels, read from the project vocabulary, and the German message texts of the project modules.
- The toolbar definitions, the lists and forms of the lower pane and the composition of the new `editor.html` shell.
- Inline register links in place of the stand-off links the inherited register model writes ([specification](specification.md#key-decisions)).
- The replacement of the inherited project panel (`wenzels-workspace.js`, `wenzels-form.js`, `wenzels-workspace.css` and the panel object in `index.js`) by the new shell, after which these files are deleted, while the text, image and register models stay and are brought to the vocabulary.
- The document chooser and the apparatus write composed from the project's file list as the manifest or the built-in detection assigns it, so that the later split of the codex into book files ([working model](integration.md#working-model)) changes data and not code.
- The fork's start page and the German help page ([design](design.md#start-page)).
- The tracked fol. 1r excerpt made loadable by the published app and extended for the demo tests ([data](data.md#fixtures)).
- The `wb-demo-*.spec.js` tests, one per workflow, and the switch of the fork's CI to `fork-checks.yml` with the fork Playwright configuration once `editor.html` changes ([testing](testing.md#known-exceptions-and-limits)).

The panel files are base-owned files in the project folder, so a later base change to one of them produces a modify/delete conflict, resolved by keeping the deletion. Deleting the panel object presumes the fork-specific composition module, because `editor-app.js` calls `createPanel` for every registered workspace ([architecture](architecture.md#components)).

## Next steps

The order of the remaining work after the operator's feedback rounds and the audit of 2026-10-10, as the living list of what is still to do. An item leaves this list when its phase row records it as done.

1. The second feedback round on the wireframe, covering word commands in the flow with undo and an `xml:id` for a new word, the folding of `xml:id` and `facs` with "IDs anzeigen", the findings-list texts that still name the page excerpt, the facsimile following a line selection when the line lies outside the visible image, the notice bar overlaying the work area without layout shift, a word containing an `lb` on the line on which it begins, and the Prüfen labels "Editionsregeln" and "Editionsregeln, Bericht".
2. The third feedback round on the wireframe, once the second is committed, covering the popover rows, the single-field rule and the markup search field ([design](design.md#popover-at-the-selection)), the one-row toolbar with view-dependent controls and switches drawn distinct from actions ([design](design.md#arbeitsleiste)), the facsimile on by default and remembered, the draggable column width and pane divider ([design](design.md#editor-frame)), the right column without tabs and its lower pane ([design](design.md#seitenleiste)), and the viewer reduced to "Seite einpassen" with the page fitted on open ([design](design.md#facsimile-pane)), and every folio of the codex with the folio pager, the extraction writing one file per folio and an index ([data](data.md#fixtures), F12).
3. The start page and help requirements ([specification](specification.md#start-page-and-help), [design](design.md#start-page)), reviewed by the operator together with the proposed purpose sentence.
4. The vault session on the [UI practice delta](../snapshots/ui-practice-delta-2026-10-10.md), which carries the interface lessons of the three feedback rounds into the UI practice document and its Abnahmecheck ([handoff](handoff.md)).
5. The contract handoff of phase 5a to the base, written as the [handoff text of 2026-10-10](../snapshots/base-handoff-5a-contract-2026-10-10.md), brought to the one-row toolbar, the popover rows, the lower pane and the draggable handles of the third feedback round, and carried by the operator into the base's `knowledge/handoff.md` ([integration](integration.md#phase-5a-mechanisms)).
6. Phase 5b, then 6, 7 and 8 as the phase table orders them.
7. Operator points in [handoff](handoff.md): review and install the design skills, and inform the edition team about the tracked excerpt.

## Status tracker

| Phase | Status | Notes |
| --- | --- | --- |
| 1 Knowledge base | in progress | Operator review pending |
| 2 Static wireframe | in progress | Shell pivot to toolbar, popover and side panel and the correction package of the audit done and verified by the walkthroughs; second and third feedback rounds listed under [next steps](#next-steps); deleted in phase 5b |
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
| List element for peoples in the register file ([ratification point](editorial-guidelines.md#open-ratification-points)) | Phase 8 (seeding the register) | Open |
| `xml:space` handling in "XML formatieren" | Phase 5a, before phase 8 formats the files | Leave elements under `xml:space="preserve"` untouched |
| Working model and file topology | Phase 8, while phase 5b composes chooser and apparatus write from the project's file list, so the decision does not hold up the composition | The operator's proposal in [integration](integration.md#working-model) |
| Composition of the new shell through `editor-app.js` or a fork-specific module | Phase 5b | Fork-specific module reusing the generic controllers, which the deletion of the inherited panel presumes |
| Who edits the project vocabulary `docs/schemas/wenzelsbibel-vocabulary.json` in future, the operator or a member of the edition team | Phase 8, before the team's ratifications enter the value lists | Open with the operator |
| Where the example and demo excerpt lives so that the published app can load it, given that Pages serves only `docs/` and the inherited ignore rule excludes payload under `docs/data/editor/*/*` | Phase 5b | One tracked source under `docs/` that the spike, Beispiel öffnen and the demo tests read |
| How the demo tests of workflow 3 get a register file, since the edition data contain none | Phase 5b | A register seeded from the link values on fol. 1r, in the way phase 8 seeds the full register |

Phase 5a depends on the completed phase 3, because the mechanisms bind to the project folder and the workspace registry. Phase 5b depends on the merge of phase 5a. Phase 8 depends on the edition team's confirmation of the working model and uses "XML formatieren" from phase 5a.

## Out of scope

What the tool leaves out is decided in [specification](specification.md#purpose-and-scope).

## Deviations

A phase may be reordered when a blocker holds and a later phase is independent of it. The change and its reason go to [journal](journal.md). Independent of order, untouched bytes stay identical and Save stays behind the output gate.
