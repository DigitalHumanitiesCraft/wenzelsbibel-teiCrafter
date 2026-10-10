---
title: Journal
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Journal
  version: 0.4
  url: https://dhcraft.org/Promptotyping/promptotyping-document/journal
status: active
created: 2026-10-10
updated: 2026-10-10
language: en
related: [project, specification, plan, handoff]
---

# Journal

This journal is the curated backward-looking provenance index of the project. Current facts and rules stand in the responsible declarative or action documents, accepted future work in [plan.md](plan.md), open inputs in [handoff.md](handoff.md).

## Entries

### 2026-10-10 integrated Register encoding follows the handbook

- Source: operator decision in the session of 2026-10-10, after the finding that the codex already carries the handbook's typed `ref` on the words with bare target IDs, and the TEI P5 reference pages for `span`, `seg`, `rs` and att.canonical (read on 2026-10-10).
- Target: [specification.md](specification.md) (Key decisions), [editorial-guidelines.md](editorial-guidelines.md), [data.md](data.md), later the register model of the project folder.
- Result: Register links stay inline on the words as the handbook rules; the base's stand-off `spanGrp` links are not used for this project. The operator judged the handbook's `ref/@target` imprecise, because `ref` is a hyperlink element, and the written form proposed to the edition team is `rs[@type][@ref]`, with `@ref` from att.canonical as the attribute TEI provides for pointing a name at its canonical entry. The tool reads both forms. The handoff item is closed; the team's decision on the written form and the pointer syntax is an open ratification point.

### 2026-10-10 integrated Repository founded as a derived version of teiCrafter

- Source: session of 2026-10-10 in the operator's vault (operator decisions), the teiCrafter repository at commit b2a057d, the public transcription handbook of the Wenzelsbibel edition, the public TEI of Codex 2759 and the image annotations on the edition server of the Austrian National Library.
- Target: this knowledge base, the action layer `CLAUDE.md` and `README.md`.
- Result: The operator decided that the legacy teiCrafter application becomes the derivable base, that the derivation is a Git clone with an upstream remote, that the repository is named wenzelsbibel-teiCrafter because it holds the tool and not the edition, that the specialisation fulfils the published handbook while the mechanisms stay generic in the base, and that a prototype for the first meeting with the edition team is built from the legacy application under its own name. The inherited knowledge folder of the base was removed and replaced by this knowledge base. The session found that the edition publishes a transcription handbook which the vault specification did not know, and that it encodes register links as a typed `ref` on the words, which the base implements differently; the decision on the register encoding is open with the operator, see [handoff.md](handoff.md).
