# wenzelsbibel-teiCrafter

The editing environment for the digital edition of Codex 2759, the Wenzelsbibel of the Austrian National Library, derived from [teiCrafter](https://github.com/DigitalHumanitiesCraft/teiCrafter).

This repository holds the tool and its project layer. The edition itself, meaning the TEI files, the Transkribus exports and the images, belongs to the edition team at the Paris Lodron University Salzburg and is not part of this repository.

## What it is

teiCrafter is a browser-based editor for TEI XML that keeps the source document as the canonical state and writes it back byte-faithfully outside the deliberate edits. This derived version specialises it for the Wenzelsbibel: word-level transcription with diplomatic and normalised readings, a stand-off apparatus, registers of persons, places and peoples, image annotations with ICONCLASS references, facsimiles from the IIIF service of the Austrian National Library, and validation against TEI All plus the project's own Schematron. The rules it fulfils are the edition's published transcription handbook; the comparison with the earlier DHCraft specification and with the base's conventions is kept in [knowledge/editorial-guidelines.md](knowledge/editorial-guidelines.md).

The repository is a Git clone of teiCrafter with the base as `upstream`. Generic mechanisms are built in the base and merged in; this repository changes only its own zones, see [knowledge/architecture.md](knowledge/architecture.md).

## Status

The project knowledge base under [knowledge/](knowledge/INDEX.md) is written. The base refactor is merged, the static wireframe shows the layout, a spike in `prototypes/d-flow/` tests the flowing text view, and `editorial/` holds the project Schematron with its fixtures, which the published editor does not use yet. The new interface is not built; the order of the remaining work is in [knowledge/plan.md](knowledge/plan.md). Nothing in this repository has been accepted by the edition team.

## Run locally

```
npm install
npm run dev
```

The editor is served from `docs/`. Open a local copy of the edition files from a `data/` folder next to the repository root; that folder is ignored by Git. Tests run with `npm run test:e2e` and `node test/verify.mjs`, see [knowledge/testing.md](knowledge/testing.md).

## Rights

The TEI files and the images of the codex are accessible on the edition server of the Austrian National Library. Technical access implies no permission to store, redistribute or publish them. This repository contains no edition data.

## Licence

Code under the MIT licence of the base, see [LICENSE](LICENSE). Documentation under CC BY 4.0.
