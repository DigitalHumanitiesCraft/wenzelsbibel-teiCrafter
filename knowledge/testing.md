---
title: Testing
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Testing
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/testing
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-testing
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[Software Testing]]", "[[TEI XML]]"]
related: [architecture, specification, editorial-guidelines, data, integration, plan]
---

# Testing

This document states what the Wenzelsbibel editor guarantees, what it does not, and how each claim is checked. The fork inherits the base's evidence layers unchanged and adds its own: one browser test per workflow on the real fol. 1r excerpt, an acceptance layer for the new shell, Schematron fixtures per rule with a review run as report, the checks of the flow spike, and a recorded run against the real edition files. Technical evidence never stands in for the edition team's scholarly judgment.

## Test strategy

| Layer | Source | Fault class it catches |
| --- | --- | --- |
| Engine proofs | Inherited `test/proofs/`, including the `wenzels_*_check.mjs` proofs for text, image, register and project-check models | Lost or altered bytes outside a deliberate edit, wrong splice, unsafe register deletion, broken note projection |
| Schema and contract checks | Inherited proofs for manifest, schema set, schema files, worker and cache | A manifest or schema set that loads wrongly, stale validation reused as authorisation |
| Browser checks | Inherited `test/e2e/`, including the `wenzelsbibel-*.spec.js` suites (import, project, references, register protection, schema, workspace), all against the base shell | Interaction, recovery, working copy, package and output gate failures in Chromium and Firefox |
| Demo workflow tests (fork) | `test/e2e/wb-demo-*.spec.js`, one per workflow, on the tracked fol. 1r excerpt, locally and in CI | A workflow that no longer runs end to end in the new interface |
| Interface acceptance (fork) | The [interface acceptance layer](#interface-acceptance-layer) inside the demo workflow tests | A view that misses an accessibility minimum, a keyboard path that breaks, an interaction that answers too slowly |
| Schematron fixtures and vocabulary consistency (fork) | `editorial/fixtures/` with `editorial/check_fixtures.py` (Python, lxml) against `docs/schemas/wenzelsbibel.sch`, under the fixture rules of the [editorial layer](../editorial/README.md), and the comparison of the Schematron's value lists with `docs/schemas/wenzelsbibel-vocabulary.json` ([data](data.md#controlled-vocabulary)); a required run | A rule that fires on valid encoding or misses the error it names, a rule without both fixtures, a fixture whose phase or severity disagrees with the schema, a value list in the Schematron that differs from the vocabulary |
| Review run (fork) | `editorial/check_fixtures.py --data` over local edition files; a report, never a gate, recorded as a dated snapshot under `snapshots/`, such as the [findings snapshot](../snapshots/schematron-findings-2026-10-10.md) | Data that violate the handbook rules or the editorial guidelines, as input for editorial decisions |
| Flow spike checks (fork) | `prototypes/d-flow/check.mjs` (Node) and `prototypes/d-flow/browser-check.mjs` (Chromium against the prototype dev server) on the fol. 1r excerpt | Lost bytes in a round trip or edit of the flow view, typing that touches a tag, wrong `@orig` sync, broken selection snapping, a wrap that inserts more than two tags or cuts an element |
| Real-file run (fork) | `snapshots/`, recorded on the operator's machine | Behaviour on the full codex, the real image annotations and registers |
| Scholarly acceptance | Edition team at PLUS | Readings, normalisations, register identifications, apparatus content |

The fork-only test files carry the prefix `wb-demo-` so that they never collide with base files during a merge.

### Interface acceptance layer

Each demo workflow test of phase 5b also accepts the views it passes through against [design](design.md), in three parts.

- An axe run per view (text view, XML view, facsimile, popover in each state, side panel with findings, references and image form, start page, help page) checks the automatable accessibility minima of [design](design.md#accessibility-minima).
- The keyboard paths of [design](design.md#interaction-rules) are driven without the mouse, among them entering and leaving the toolbar, selecting word, sequence and line, the popover and side panel by Tab, and the Escape order.
- A latency measurement drives each core interaction (keystroke in a word, caret move, word and line selection, popover open, view switch, facsimile on) in headless Chromium. A `PerformanceObserver` records long-task and event-timing entries, each attributed to the interaction in whose window it starts, and the run reports per interaction the long tasks over 50 ms and the interaction to next paint, taken as the longest event with an interaction ID. The thresholds are those of [design](design.md#interaction-latency). The run on the excerpt is part of CI, and the run on the full codex belongs to the real-file run of phase 6.

Contrast at 4.5:1, the 200 percent zoom and the screen-reader announcement of the notice bar are checked by hand on the rendered views and recorded with the demo protocol under `snapshots/`.

## What is guaranteed

| Claim | Established by | Limit |
| --- | --- | --- |
| Opening and saving preserves every byte outside deliberate edits | Inherited engine proofs and browser round trips in `node test/verify.mjs` and the inherited `checks.yml`, rerun after each merge | The browser round trips drive the base shell, and after phase 5b the demo tests carry the round trip in the new shell |
| Save is blocked unless TEI All and the project Schematron pass for the exact bytes | Inherited output-gate proofs and browser tests in the same runs, with the workspace default schema set naming `docs/schemas/wenzelsbibel.sch` | The inherited tests prove the gate mechanism; a browser run of the project Schematron inside the gate is open until the demo test of workflow 5 |
| The flow view keeps untouched bytes identical and edits word text and `@orig` without touching tags | `node prototypes/d-flow/check.mjs`, part of `npm run check:fork`, with LF and CRLF line endings | fol. 1r excerpt only; the full codex is open until phase 5a |
| Each workflow runs end to end in the new interface | `npm run test:e2e:fork` over `wb-demo-*.spec.js` on the tracked fol. 1r excerpt | No suite exists until phase 5b. The real files follow in phase 6 |
| Each view meets the automatable accessibility minima and the keyboard paths | The interface acceptance layer in the same suites | No suite exists until phase 5b. The manual checks are recorded with the demo protocol |
| Core interactions stay within the latency thresholds | The latency measurement of the interface acceptance layer | No suite exists until phase 5b. Measured in Chromium, where the long-task entries are available |
| Each project Schematron rule accepts its positive and rejects its negative fixture | `python editorial/check_fixtures.py`, part of `npm run check:fork` | Runs in lxml; not yet in the browser runtime |
| The Schematron's value lists equal the project vocabulary | The same run of `python editorial/check_fixtures.py` | Covers the attributes the vocabulary lists; the project modules' use of the JSON is checked by the demo tests of phase 5b |
| The `editing` phase accepts the published codex and image annotations unchanged | The review run `check_fixtures.py --phase editing --data` over the public files, recorded under `snapshots/` | Holds for the data state of the recorded run |
| The real codex, image annotations and registers open, edit and save through the gate | Real-file run recorded under `snapshots/` | Open until phase 6 |

## Acceptance

| Question | Method | Level | Evidence |
| --- | --- | --- | --- |
| Can a page be opened with facsimile, a line edited diplomatically and normalised? | Demo test 1, real-file run | automatic, contextual | Test result, snapshot |
| Can an apparatus comment be created on a selection? | Demo test 2 | automatic | Test result |
| Can a word be linked to a register entry, including a new one? | Demo test 3 | automatic | Test result |
| Can a miniature's annotation be edited with ICONCLASS and its text relation seen? | Demo test 4 (ICONCLASS response stubbed) | automatic | Test result |
| Do validation messages read clearly and does Save write a file? | Demo test 5, demo protocol | automatic, visual | Test result, snapshot |
| Do the views meet the accessibility minima and answer quickly enough? | Interface acceptance layer, manual checks | automatic, visual | Test result, snapshot |
| Does the encoding match the handbook? | Review by the edition team | professional | Ratification decision, recorded in [editorial-guidelines](editorial-guidelines.md) |

## What is deliberately not checked

- Scholarly correctness of readings, normalisations, register identifications and apparatus text. Only the edition team can establish it.
- User acceptance. The demo workflow tests show that the workflows run; acceptance requires the team's decision.
- The runtime of validation runs on the full codex beyond the limits the base documents in its [editorial completion report](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/main/reports/editorial-completion-2026-09-11.md). The first full validation of a changed codex is expensive, particularly in Firefox.
- Real-file evidence in CI. Working copies of the edition files and the images are not redistributable, so CI runs the inherited synthetic twins and the tracked, licensed fol. 1r excerpt. A real-file claim needs a run that actually supplied the files.
- Image rendering from the ONB server in CI. Browser tests stub the IIIF responses; the real-file run covers the live service.

## Known exceptions and limits

The new interface will replace the shell of `docs/editor.html`. Every inherited browser suite in `test/e2e/`, including the `wenzelsbibel-*.spec.js` suites, opens `/editor.html` and drives the base shell. The inherited `checks.yml` runs all of them in the fork too, through `npm run evaluate:editorial`, which calls Playwright with the inherited configuration, and they test the base shell as long as `editor.html` equals the base. `npm run test:e2e:fork` reuses the base configuration through `playwright.fork.config.js` with the allow-list `testMatch: /wb-demo-.*\.spec\.js/`, so it runs only the fork's suites, and `playwright.config.js` and the inherited test files stay identical to the base and merge without conflicts. When phase 5b changes `editor.html`, the inherited suites lose their target, so phase 5b switches the fork's CI to `fork-checks.yml` with the fork configuration, which then runs the demo suites, and takes `checks.yml` out of the fork's CI. The browser round trip and the real-file path of the inherited evaluation then pass to the demo suites. No `wb-demo-` suite exists yet, so the fork run finds no tests until phase 5b. Engine proofs remain fully inherited.

The fixture check runs the Schematron through lxml with the ISO skeleton for XSLT 1.0, while the editor runs raw Schematron on browser XPath; why both report the same findings is explained under [runtime limits](../editorial/README.md#runtime-limits), and a browser run of the fixtures against the teiCrafter runtime is still to be added.

The review run is slow on the full codex, mostly in the anchor rules ([runtime limits](../editorial/README.md#runtime-limits)), so it runs on request and in the planned GitLab pipeline of the [working model](integration.md#working-model), and never on each edit.

Two workflows run on GitHub.

- `.github/workflows/checks.yml` is inherited and stays identical to the base. It runs `npm run evaluate:editorial` (proofs, harness, types, build and the inherited browser workflows in Chromium and Firefox) on every push and pull request. Because `test/evaluate-editorial.mjs` expects the base suites, it tests the base shell, until phase 5b takes it out of the fork's CI.
- `.github/workflows/fork-checks.yml` is fork-only and runs on push and pull request to `main`. It runs `npm run check:fork`, whose steps `package.json` defines (flow spike check, the typechecks of `src/` and `docs/js`, fixture check, ruff over `editorial/` and `wireframe/`, Biome), and from phase 5b on the demo suites with their interface acceptance. It uploads no Pages artifact.

The flow spike browser check needs the prototype dev server and runs locally only.

## How to run

Use the Node and npm versions pinned in `package.json`, then `npm ci` and `npx playwright install chromium firefox`. Commands run from the repository root.

```text
npm run check:fork                                         # required: the fork's checks, steps in package.json
node test/verify.mjs                                       # required: inherited engine proofs, Python/lxml harness, typecheck, Biome, Vite build, asset contract
npm run test:e2e:fork                                      # fork demo suites (wb-demo-*.spec.js) through playwright.fork.config.js
python editorial/check_fixtures.py --data <codex> <images> # review run, report only
python editorial/check_fixtures.py --vocabulary            # vocabulary comparison only; the plain run includes it
node wireframe/checks/<file>                               # wireframe walkthroughs (.mjs and checks-markup.cjs), need python -m http.server 8765 at the root
node test/wb-latency.mjs [out.json]                        # long tasks and interaction latency per core interaction of the wireframe, needs python -m http.server 8766 at the root
```

The wireframe walkthroughs under `wireframe/checks/` drive the wireframe in headless Chromium at desktop and phone widths and assert the acceptance criteria of the user stories on the fol. 1r extraction, feature by feature. They write screenshots to `test-results/wireframe/`. They are plain scripts rather than Playwright specs because the wireframe is a design instrument that the real build replaces; the `wb-demo-*` specs of phase 5b are their successors, and the walkthroughs are deleted with the wireframe.

The fork's real-file run uses the base variables `WB_CODEX`, `WB_IMAGES` and `WB_PAGE_ROOT` with `npm run evaluate:editorial -- --real` as long as the base shell is in place, plus the fork's demo tests and their latency measurement against the same files; its record goes to `snapshots/`.
