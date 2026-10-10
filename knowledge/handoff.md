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
- Context: Of the six lessons of the feedback rounds the vault document states none as a rule and the Abnahmecheck asks none, while design.md carries four as rules; the continuous selection highlight and the measurement rule are missing everywhere. The snapshot names the sections to add, the Abnahmecheck items, the conflicts between the vault document and design.md that the vault session resolves, and what a deterministic check in `web-style` carries better than a document sentence.
- Operator point: start a vault session on the snapshot.

### Edition team and the tracked excerpt

- Received: 2026-10-10
- Source: operator decision of 2026-10-10 to keep `prototypes/d-flow/fixture/fol1r.xml` with its NOTICE.
- Target: [project.md](project.md) rights boundary (already states the rule).
- Context: The excerpt is public and licensed CC BY 4.0, but the team has not been told that a piece of its data sits in a public repository.
- Operator point: inform the edition team.
