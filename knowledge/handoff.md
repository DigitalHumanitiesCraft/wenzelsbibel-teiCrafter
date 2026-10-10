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

### Operator actions for the repository

- Received: 2026-10-10
- Source: session of 2026-10-10; the GitHub CLI on the operator's machine is not authenticated.
- Target: GitHub organisation DigitalHumanitiesCraft.
- Context: The repository exists locally with the remotes `upstream` (teiCrafter) and `origin` (wenzelsbibel-teiCrafter). The GitHub repository has to be created and the first push made by the operator. The edition files for test runs with real data lie on the operator's other machine.
- Operator point: create the GitHub repository, push, and name the machine that holds the edition files.
