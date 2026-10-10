<!-- template: Vorlage Action-Layer v0.5, https://dhcraft.org/Promptotyping/promptotyping-document/action-layer -->

# wenzelsbibel-teiCrafter: Project Instructions

wenzelsbibel-teiCrafter is the editing environment for the Wenzelsbibel edition (Codex 2759), derived from teiCrafter. The documents in `knowledge/` hold the rules, the specification and the architecture from which the tool is implemented. The edition team at the Paris Lodron University Salzburg is the critical expert and decides data model, rights and acceptance; the operator of this repository decides scope and design; the agent implements and reports.

## Knowledge base

After this file read `knowledge/INDEX.md`, then `knowledge/handoff.md`, then the document the task needs. Read `knowledge/journal.md` for the reason behind a decision.

| Read first when | Document |
|---|---|
| an encoding, a vocabulary or a divergence from the handbook is at stake | `knowledge/editorial-guidelines.md` |
| a file, the manifest or the schema set is in question | `knowledge/data.md` |
| a requirement, a decision or an acceptance scenario is at stake | `knowledge/specification.md` |
| interface or interaction work | `knowledge/design.md` |
| modules, the merge path from the base or deployment | `knowledge/architecture.md` |
| what is checked and what is not claimed | `knowledge/testing.md` |
| the boundary to the base, the edition team or Oxygen, or the working model | `knowledge/integration.md` |
| what comes next | `knowledge/plan.md` |

## Working rules

- Handoff. Verify source and current target of an item before using it, integrate durable content into the owning document, write the journal entry, remove the item. The empty state of the inbox is `Keine offenen Handoff-Punkte.`.
- Journal. One entry per coherent transition, typed integrated, rejected or corrected, with source, target and result. No status, no open tasks, no proof counts.
- Truth hierarchy. The handbook of the edition outranks the DHCraft specification and the base's conventions for what an encoding means; the real XML outranks every description of it; the base's specification outranks this repository for the invariants it inherits (canonical raw XML, offset splices, byte-identical no-op roundtrip, schema-gated save). Report a contradiction, never diverge silently.
- Base and derivation. Generic mechanisms are built in the base teiCrafter and merged in; this repository changes only its own zones, see `knowledge/architecture.md`. Before touching a file outside those zones, check whether the change belongs upstream.
- Verification. Browser tests and proofs establish technical behaviour; no run, report or document claims scholarly correctness or acceptance. A run with real files names the files it used.
- Quantities. No volatile counts in this file or in knowledge documents; name the living source.

## Design principles

Read `knowledge/design.md` before generating or changing interface or interface text. Views and interface text are accepted against the Abnahmecheck of the vault document "UI-Praxis für agentisch erzeugte Frontends" (operator's vault, `Coding/Webentwicklung/`), the acceptance checklist for every view. Derived from both:

- The human decides. Offer no model proposals in this project; the toggle stays off.
- Use the base's design tokens only; introduce no raw colour.
- Label controls in German by their function, consistently across views.
- Render each column as one continuous flow, the reading unit; use the manuscript line as the reference unit for line numbers, facsimile linking and line selection; keep the selection across the Text and XML switch.
- Render no control that cannot work in the detected browser; end a failed capability check in a working alternative.
- Keep no permanent status line. Show the notice bar only when well-formedness breaks or a requested check has findings, with the reason and the route to the findings list; keep the unsaved dot next to the file name until a save succeeds.

## Scope

The prototype for the first meeting shows five workflows and nothing else; its scope and exclusions are decided in `knowledge/specification.md` (Purpose and scope). Edition data and images are never committed and never redistributed.

## Tools

- Commands: `npm install`, `npm run dev` (serves `docs/`), `npm run test:e2e` (the inherited Playwright suites against the Vite build in `dist/`, per `playwright.config.js`), `npm run test:e2e:fork` (the fork's `wb-demo-` suites through the allow-list in `playwright.fork.config.js`), `node test/verify.mjs` (proofs and contract checks), `npm run check:biome`.
- Required before a commit: `python editorial/check_fixtures.py` (fixture check), `node prototypes/d-flow/check.mjs` (spike check), `npm run typecheck:src`, `python -m ruff check editorial`, plus the inherited gate `node test/verify.mjs`. After a change to `wireframe/`, run the walkthroughs `node wireframe/checks/<name>.mjs` against `python -m http.server 8765` at the root. `fork-checks.yml` runs the first four on GitHub; `knowledge/testing.md` holds the full list.
- Conventions: code, identifiers, comments, commit messages and knowledge documents in English; interface labels in German. No emojis. No em or en dashes as punctuation. Commit messages imperative, one line, body only where the diff does not explain itself.
- Git: `upstream` is DigitalHumanitiesCraft/teiCrafter, `origin` is DigitalHumanitiesCraft/wenzelsbibel-teiCrafter. Merge the base with `git fetch upstream` and `git merge upstream/main`; on a conflict in the base's former `knowledge/` files keep the deletion. Push, tags and releases stay with the operator.
- Data: `/data/` at the repository root is ignored, `docs/data/` is not affected. Never add edition files or images to the repository.
