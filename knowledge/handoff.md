---
title: Handoff
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Handoff
  version: 0.1
  url: https://dhcraft.org/Promptotyping/promptotyping-document/handoff
status: active
created: 2026-10-10
updated: 2026-10-10
language: en
related: [INDEX, journal, plan]
---

# Handoff

This process inbox holds received deltas awaiting integration. Verify each source and current destination, integrate durable content into its owning document, record source, destination and outcome in [journal.md](journal.md), then remove the processed item. Open items carry `Received`, `Source`, `Target` and `Context`.

## Open handoff items

### Design skills for the harness

- Received: 2026-10-10
- Source: web search of 2026-10-10 for agent skills on interface work, stands from summer 2026 onwards: Impeccable (pbakaus, tag 4.5.2 of 2026-10-09), the Anthropic frontend-design skill (rewrite of 2026-09-03), Vercel web-design-guidelines (agent-skills, 2026-08-28).
- Target: the operator's environment, the vault document "UI-Praxis für agentisch erzeugte Frontends" (vault session), [design.md](design.md) acceptance.
- Context: Impeccable fits this project best, with a product mode, no framework dependency, deterministic detector rules that run without a model, the `critique` and `audit` commands and a hook on interface edits. Its README asks to review the installed hooks before unattended runs and to review the validate script before using live mode in an unfamiliar checkout. That validate script is one the target project itself defines in `package.json`, and live mode runs it in a shell. web-design-guidelines adds an accessibility and interface audit, but it fetches its rules unpinned from a remote main branch at runtime, which makes the rules third-party text taken as instructions and the result unreproducible. frontend-design has no reference files, and its interface-copy rules (active verbs, errors as direction, no filler) are a few sentences that belong in the UI practice document rather than in a loaded skill.
- Operator point: review the hooks, then install Impeccable, and web-design-guidelines only from a pinned copy of its rules, and run `critique` and `audit` on the wireframe. Carry the interface-copy rules into the vault document in a vault session.

### Interface lessons for the UI practice document

- Received: 2026-10-10
- Source: the comparison of 2026-10-10 between the two operator feedback rounds on the wireframe, the vault document "UI-Praxis für agentisch erzeugte Frontends" with its Abnahmecheck, the skill `web-style`, [design.md](design.md) and the three agent skills Impeccable, frontend-design and web-design-guidelines, read in full from their public repositories; the delta is written out in the [snapshot](../snapshots/ui-practice-delta-2026-10-10.md).
- Target: the vault document and its Abnahmecheck, the skill `web-style` (verification step and `references/css.md`), both in a vault session; the parts that belong to this repository are already in [design.md](design.md) (interaction rules, interaction latency).
- Context: Of the six lessons of the first two feedback rounds the vault document states none as a rule and the Abnahmecheck asks none, while design.md carries four as rules; the continuous selection highlight and the measurement rule are missing everywhere. The third round added the lessons on the place of an action, controls that follow the view, single-field forms, search fields over a value space, chrome semantics, defaults and space, recorded in the snapshot section "Dritte Runde". The snapshot names the sections to add, the Abnahmecheck items, the conflicts between the vault document and design.md that the vault session resolves, and what a deterministic check in `web-style` carries better than a document sentence.
- Operator point: start a vault session on the snapshot.

### Vault session: project state in ACTIVE-WORK and the Project Overview

- Received: 2026-10-10
- Source: the operator's request of 2026-10-10 that the audit, the feedback rounds and the decisions of this day reach the vault as well; the vault was read from this session, which does not write into it.
- Target: the vault documents `ACTIVE-WORK.md` (entry Wenzelsbibel), `Projects/Wenzelsbibel/Project Overview Wenzelsbibel.md`, `Vault Operations/Erledigt-Log.md`, in a vault session, which checks every mutable statement below against this repository before writing.
- Context: ACTIVE-WORK still asks the operator to play through the wireframe with a bottom inspector and to release the interaction model, which happened in three feedback rounds today; its next step still describes inspector forms. The Project Overview names the project Schematron at `editorial/wenzelsbibel.sch`, which moved to `docs/schemas/wenzelsbibel.sch` beside the vocabulary. Proposed texts, German as the vault requires:
  - `stand::` "Das Fortsetzungsprojekt läuft seit dem 01.10.2026, die Zusage zum Erstgespräch steht aus. Die Wenzelsbibel-Version von teiCrafter hat eine durchgeprüfte Wissensbasis, die Editionsregeln mit Vokabular als Regeldateien, ein Wireframe, das nach den Feedback-Runden des Operators auf direkte Manipulation umgestellt ist, und einen Vertrag für die Basismechanismen, der an teiCrafter geht. Regelquelle ist das öffentliche Transkriptionshandbuch, dessen Abweichungen von den Daten mit dem Team zu klären sind."
  - The operator point `[Freigabe] Den Wireframe ... freigeben` (anchor `^op-wenzelsbibel-wireframe-freigabe`) is answered and moves to the Erledigt-Log as one line: "Wireframe der Wenzelsbibel-Version in drei Feedback-Runden am Bildschirm geprüft, Interaktionsmodell auf direkte Manipulation entschieden (2026-10-10)".
  - New operator points: `[Entscheidung]` die Design-Skills: installierte Hooks lesen, Impeccable installieren, web-design-guidelines nur mit gepinnter Regelkopie; `[Aktion]` das Editionsteam über den getrackten öffentlichen Auszug fol. 1r informieren; `[Aktion]` die Maschine für das geerbte Gate einrichten, das Node 24.13.0 und npm 11.6.2 pinnt; `[Aktion]` die Vault-Session für das UI-Praxis-Delta ([snapshot](../snapshots/ui-practice-delta-2026-10-10.md)).
  - The next-step arrow "Nach der Freigabe den Editor bauen ..." becomes: "→ Den Vertrag für Phase 5a in das Handoff der Basis teiCrafter übernehmen und die Mechanismen dort bauen: einzeilige Arbeitsleiste, Popover mit Feldtabelle, rechte Spalte mit Faksimile und Liste, Registersuche, Hinweisleiste und Befundliste, Fluss- und XML-Ansicht in CodeMirror, Meldungstabelle; danach im Fork die Shell komponieren, Startseite und Hilfeseite bauen, je Workflow einen Demo-Test auf fol. 1r, dann das Wireframe löschen". The Erstgespräch arrow stays.
  - Project Overview: the Schematron row of "Source of Truth" names `docs/schemas/wenzelsbibel.sch` with `wenzelsbibel-vocabulary.json` beside it; the "Live & Code" entry for the repository may name the plan under `knowledge/plan.md` as the place of the phase state.
- Operator point: start the vault session, which also takes the UI practice delta of the item above.

### Third wireframe round and the contract revision

- Received: 2026-10-10
- Source: the operator's decisions of the third feedback round, recorded in [design.md](design.md) and the [specification](specification.md) (key decisions of 2026-10-10), and the read-only audit of the wireframe at commit 48d27e4, whose finished findings lie in the [audit snapshot](../snapshots/ui-audit-findings-2026-10-10.md).
- Target: `wireframe/` for the third round, then the [handoff text of phase 5a](../snapshots/base-handoff-5a-contract-2026-10-10.md), which still describes two toolbar rows, a tab row, Anwenden in every form and a register type filter.
- Context: The session ended before the third round was built. The second round is committed; the third round builds the popover rows, the markup search field, the one-row toolbar with view-dependent controls, the facsimile on by default, the draggable handles, the right column without tabs, the viewer without library chrome and the folio pager over every folio, and takes the audit findings with it, the unverified ones checked at the file state first. Three small decisions the knowledge pass left open are taken in the design: Zonen stays rendered and disabled while the facsimile is off, XML-Stelle carries the route for a word with inner markup, and the Bildannotationen item list leaves the lower pane because the miniature chooser already chooses the item. After the round the contract text is brought to the decided shell and carried to the base.
- Next action: start the third wireframe round from [plan](plan.md#next-steps) item 2.

### Edition team and the tracked excerpt

- Received: 2026-10-10
- Source: operator decision of 2026-10-10 to keep `prototypes/d-flow/fixture/fol1r.xml` with its NOTICE.
- Target: [project.md](project.md) rights boundary (already states the rule).
- Context: The excerpt is public and licensed CC BY 4.0, but the team has not been told that a piece of its data sits in a public repository.
- Operator point: inform the edition team.
