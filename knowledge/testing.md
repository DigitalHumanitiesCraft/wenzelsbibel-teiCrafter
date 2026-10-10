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

This document states what the Wenzelsbibel editor guarantees, what it does not, and how each claim is checked. The fork inherits the base's evidence layers unchanged and adds its own: one browser test per meeting workflow, Schematron fixtures per rule with a review run as report, the checks of the flow spike, and a recorded run against the real edition files. Technical evidence never stands in for the edition team's scholarly judgment.

## Test strategy

| Layer | Source | Fault class it catches |
| --- | --- | --- |
| Engine proofs | Inherited `test/proofs/`, including the `wenzels_*_check.mjs` proofs for text, image, register and project-check models | Lost or altered bytes outside a deliberate edit, wrong splice, unsafe register deletion, broken note projection |
| Schema and contract checks | Inherited proofs for manifest, schema set, schema files, worker and cache | A manifest or schema set that loads wrongly, stale validation reused as authorisation |
| Browser checks | Inherited `test/e2e/`, including the `wenzelsbibel-*.spec.js` suites (import, project, references, register protection, schema, workspace) | Interaction, recovery, working copy, package and output gate failures in Chromium and Firefox |
| Demo workflow tests (fork) | `test/e2e/wb-demo-*.spec.js`, one per workflow | A meeting workflow that no longer runs end to end in the new interface |
| Schematron fixtures (fork) | `editorial/fixtures/` with `editorial/check_fixtures.py` (Python, lxml), one pass and one fail document per rule; a required run | A rule that fires on valid encoding or misses the error it names, a rule without both fixtures, a fixture whose phase or severity disagrees with the schema |
| Review run (fork) | `editorial/check_fixtures.py --data` over local edition files; a report, never a gate, recorded as a dated snapshot in `editorial/data-findings.md` | Data that violate the handbook rules or the editorial guidelines, as input for editorial decisions |
| Flow spike checks (fork) | `prototypes/d-flow/check.mjs` (Node) and `prototypes/d-flow/browser-check.mjs` (Chromium against the prototype dev server) on the fol. 1r excerpt | Lost bytes in a round trip or edit of the flow view, typing that touches a tag, wrong `@orig` sync, broken selection snapping, a wrap that inserts more than two tags or cuts an element |
| Real-file run (fork) | `snapshots/`, recorded on the operator's machine | Behaviour on the full codex, the real image annotations and registers |
| Scholarly acceptance | Edition team at PLUS | Readings, normalisations, register identifications, apparatus content |

The fork-only test files carry the prefix `wb-demo-` so that they never collide with base files during a merge.

## What is guaranteed

| Claim | Evidence | Result |
| --- | --- | --- |
| Opening and saving preserves every byte outside deliberate edits | Inherited engine proofs and browser round trips | Run in the inherited checks workflow, which passed on the fork on GitHub on 2026-10-10; rerun after each merge |
| Save is blocked unless TEI All and the project Schematron pass for the exact bytes | Inherited output-gate proofs and browser tests | Part of the same workflow, with the workspace default schema set, which still holds the base draft Schematron; the editorial Schematron enters the gate with its published copy in phase 4 |
| The flow view keeps untouched bytes identical and edits word text and `@orig` without touching tags | `prototypes/d-flow/check.mjs` | Passed on 2026-10-10 on the fol. 1r excerpt with LF and CRLF line endings; the full codex is open until phase 5 |
| Each meeting workflow runs end to end in the new interface | `wb-demo-*.spec.js` | Open until phase 5 |
| Each project Schematron rule accepts its positive and rejects its negative fixture | `python editorial/check_fixtures.py` | Passed on 2026-10-10 in lxml; not yet run in the browser runtime |
| The `editing` phase accepts the published codex and image annotations unchanged | `check_fixtures.py --phase editing --data` over the public files | No finding on 2026-10-10 ([data](data.md#schema-set)) |
| The real codex, image annotations and registers open, edit and save through the gate | Run recorded under `snapshots/` | Open until phase 6 |

## Acceptance

| Question | Method | Level | Evidence |
| --- | --- | --- | --- |
| Can a page be opened with facsimile, a line edited diplomatically and normalised? | Demo test 1, real-file run | automatic, contextual | Test result, snapshot |
| Can an apparatus comment be created on a selection? | Demo test 2 | automatic | Test result |
| Can a word be linked to a register entry, including a new one? | Demo test 3 | automatic | Test result |
| Can a miniature's annotation be edited with ICONCLASS and its text relation seen? | Demo test 4 (ICONCLASS response stubbed) | automatic | Test result |
| Do validation messages read clearly and does Save write a file? | Demo test 5, demo protocol | automatic, visual | Test result, snapshot |
| Does the encoding match the handbook? | Review by the edition team | professional | Ratification decision, recorded in [editorial-guidelines](editorial-guidelines.md) |

## What is deliberately not checked

- Scholarly correctness of readings, normalisations, register identifications and apparatus text. Only the edition team can establish it.
- User acceptance. The meeting demo shows the workflows; acceptance requires the team's decision.
- Performance on the full codex beyond the limits the base documents in its [editorial completion report](../reports/editorial-completion-2026-09-11.md). The first full validation of a changed codex is expensive, particularly in Firefox.
- Real-file evidence in CI. Edition files and images are not redistributable, so CI runs synthetic twins only; a real-file claim needs a run that actually supplied the files.
- Image rendering from the ONB server in CI. Browser tests stub the IIIF responses; the real-file run covers the live service.

## Known exceptions and limits

The new interface replaces the shell of `docs/editor.html`. Inherited browser tests that drive the base shell, including the `wenzelsbibel-*.spec.js` suites, then no longer apply to the fork's editor page. They stay valid in the base, where the refactor is accepted against them. In the fork they are excluded through a fork-only Playwright configuration with an ignore list, so that `playwright.config.js` and the test files remain identical to the base and merge without conflicts. Engine proofs remain fully inherited. This exclusion is a planned decision for phase 5 and is open until the new shell exists.

The fixture check runs the Schematron through lxml with the ISO skeleton for XSLT 1.0, while the editor runs raw Schematron on browser XPath. The XSLT path applies the first matching rule per pattern and the raw runtime evaluates every rule independently. The schema keeps the rules of one pattern on disjoint contexts so that both report the same findings, and a browser run of the fixtures against the teiCrafter runtime is still to be added.

The review run is slow on the full codex, mostly in the anchor rules ([data](data.md#schema-set)), so it runs on request and in the planned GitLab pipeline of the [working model](specification.md#working-model), and never on each edit.

The fork inherits the base's checks workflow `.github/workflows/checks.yml`, which runs `npm run evaluate:editorial` (proofs, harness, types, build and the browser workflows in Chromium and Firefox) on every push and pull request, and it passed on the fork on GitHub on 2026-10-10. The workflow covers neither the fixture check nor the flow spike checks. Adding them to the shared workflow would change a base file and is therefore a question for the base or for a fork-only workflow.

## How to run

Use the Node and npm versions pinned in `package.json`, then `npm ci` and `npx playwright install chromium firefox`. Commands run from the repository root.

```text
node test/verify.mjs           # engine proofs, Python/lxml harness, typecheck, Biome, Vite build, asset contract
npm run check:biome            # Biome over docs/js, test/e2e and the configs
npm run test:e2e               # Playwright, Chromium and Firefox
python editorial/check_fixtures.py                                   # required: fixture check
python editorial/check_fixtures.py --data <codex> <images>           # review run, report only
node prototypes/d-flow/check.mjs                                     # flow spike, Node
node prototypes/d-flow/browser-check.mjs                             # flow spike, needs npm run dev:prototypes
```

`npm run test:e2e` uses the inherited `playwright.config.js`: it runs `npm run build`, serves `dist/` with `vite preview` at `http://127.0.0.1:4173` and opens `index.html`. The published form is `docs/` served directly; `reports/source-browser-check.config.mjs` runs the same tests in Chromium against a server on port 4199 that serves `docs/` and must be started separately. The fork's real-file run uses the base variables `WB_CODEX`, `WB_IMAGES` and `WB_PAGE_ROOT` with `npm run evaluate:editorial -- --real`, plus the fork's demo tests against the same files; its record goes to `snapshots/`.
