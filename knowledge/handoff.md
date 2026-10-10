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
- Context: Impeccable fits this project best (product mode, framework-free, 59 deterministic detector rules without a model, `critique` and `audit` commands, a hook on UI edits); web-design-guidelines adds an accessibility and UX audit; frontend-design's interface-copy rules (active verbs, errors as direction, no filler) belong in the UI practice document rather than as a loaded skill. Impeccable's hook and its `impeccable:manual-edit-validate` script execute shell, which its README itself asks to review before installing.
- Operator point: read the hook, then install Impeccable and web-design-guidelines, and run `critique` and `audit` on the wireframe; carry the interface-copy rules into the vault document in a vault session.

### Edition team and the tracked excerpt

- Received: 2026-10-10
- Source: operator decision of 2026-10-10 to keep `prototypes/d-flow/fixture/fol1r.xml` with its NOTICE.
- Target: [project.md](project.md) rights boundary (already states the rule).
- Context: The excerpt is public and licensed CC BY 4.0, but the team has not been told that a piece of its data sits in a public repository.
- Operator point: inform the edition team.
