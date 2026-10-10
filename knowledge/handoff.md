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

### Real fol. 1r excerpt in the repository

- Received: 2026-10-10
- Source: `prototypes/d-flow/fixture/fol1r.xml`, written by the spike and pushed with it; finding of the knowledge sync of the same day.
- Target: [data.md](data.md) (fixtures and storage), [project.md](project.md) (rights boundary).
- Context: The spike fixture is a verbatim excerpt of fol. 1r from the TEI that the Austrian National Library publishes on its edition server, whose header declares CC BY 4.0. The project rule says that only synthetic material enters the repository because the licence of a project storage is unresolved. The excerpt is public and attributed, but the rule was not followed.
- Operator point: keep the excerpt under the CC BY 4.0 attribution, or replace it with the synthetic twin and rewrite the spike checks.

### Typing in the flow and clean-check feedback

- Received: 2026-10-10
- Source: wireframe rework and spike of 2026-10-10.
- Target: [specification.md](specification.md) F18 and open questions.
- Context: Whether typing in the text flow writes to the source (recommendation yes, limited to one text run of a word with `@orig` kept in step), and whether a clean check shows a brief visible confirmation (recommendation yes).
- Operator point: decide both.
