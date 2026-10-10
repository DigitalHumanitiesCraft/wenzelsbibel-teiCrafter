---
title: Data
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Datengrundlage
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/data
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-data
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[TEI XML]]", "[[Data Modelling]]", "[[Controlled Vocabularies]]", "[[IIIF]]"]
knowledge-sources:
  institutions:
    Paris Lodron University Salzburg: https://www.plus.ac.at/
    Austrian National Library: https://www.onb.ac.at/
  standards:
    TEI P5 Guidelines: https://tei-c.org/guidelines/p5/
    TEI All RelaxNG: https://tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng
    IIIF Image API: https://iiif.io/api/image/
  vocabularies:
    ICONCLASS: https://iconclass.org/
related: [editorial-guidelines, project, specification, architecture, testing, integration, plan]
---

# Data

The tool processes three linked TEI files of the Wenzelsbibel edition: the codex transcription, the image annotations and a shared register file, together with page images from the Austrian National Library (ONB) IIIF service. This document describes their formats, identifiers and cross-file references, the project manifest and schema set that bind them in the tool, the fixtures, and where the real data lives. The encoding rules for the content are in [editorial guidelines](editorial-guidelines.md).

## Subject

Codex 2759 of the Austrian National Library is the Wenzelsbibel, a German Bible translation with miniatures. The digital edition, published by the Paris Lodron University Salzburg (PLUS) and the ONB, transcribes it word by word with diplomatic and normalised readings, a bilingual commentary apparatus and an iconographic description of its miniatures and decorations.

## Sources

| Material | Producer and provenance | Form | Rights |
|---|---|---|---|
| `codex-2759.xml`, PID `o:wen.codex-2759` | Edition team at PLUS; first transcription in Transkribus by the HTR model WB-DEA, then annotation with Transkribus tags, exported to TEI; the header lists the Transkribus batch IDs as `sourceDesc/bibl/idno[@type='Transkribus']` | One TEI file with `teiHeader`, `standOff`, `facsimile` and `text` | Header declares CC BY 4.0 |
| `Bildannotationen.xml`, PID `o:wen.bildannotationen--codex-2759` | Edition team at PLUS; art-historical annotation of miniatures, marginal decorations and pages | One TEI file, annotation lists in `body`, bibliography in `back` | Header declares CC BY 4.0 |
| `registers.xml` | Created in teiCrafter; the edition data contain no register file and no `listPerson`, `listPlace` or `listOrg` in the codex | TEI file with lists in `standOff` | Project file, rights follow the edition |
| Page images | ONB digitisation, served through the IIIF Image API | JPEG 2000 behind `https://iiif.onb.ac.at/images/REPO/8977428/{stem}.jp2/info.json` | Technical access implies no permission to store, redistribute or publish |
| Transkribus exports (PAGE XML, METS) | Edition team | Per-page PAGE files | Same as the edition data |

The public TEI of both edition files is served by edition.onb.ac.at under the PIDs above. The DHCraft project storage records the licence for its own copies as unresolved; the tool therefore treats all edition data as local, unversioned material.

## Model

### Topology and cross-file references

The relation between the files is directed. The image annotations and the register links point into the codex; the codex carries no pointer back to the image annotations.

| From | To | Mechanism | ID form and example |
|---|---|---|---|
| Image item | Codex image zone | `item/@corresp` | `#Image_1676476154286_76` → `zone[@xml:id='Image_1676476154286_76'][@type='ImageRegion'][@subtype='img_miniature']` |
| Image item | Codex word range | `note[@type='text-relation'][@subtype='statistic']/@corresp` | `#range(region_1639399488602_10l3_0, region_1639577288773_22l29_4)` |
| Image item | Artist sigla in its own header | `listPerson[@type='artists']/person/@corresp` | `#BA` → `persName[@xml:id='BA']` |
| Image item | Register entry | `listPerson[@type='related']/person/@corresp`, `listPlace[@type='related']/place/@corresp` | `#Gott`, `#Kanaan` |
| Image item | Bibliography in its own `back` | `@resp` | `#JT`, `#KS` → `listBibl/bibl[@xml:id]` |
| Codex word | Register entry (handbook form, present in the data, read by the tool) | `ref[@type][@target]` around the words | `<ref target="Martin" type="person">` |
| Codex word | Register entry (proposed written form, see [specification](specification.md#key-decisions)) | `rs[@type][@ref]` around the words | `<rs type="person" ref="#Martin">`, pointer syntax open |
| Codex word range | Register entry (base teiCrafter form, not used in this project) | `standOff/spanGrp[@type='register-links']/span` with `@from`, `@to`, `@ana` | `registers.xml#entry-id` |
| Codex apparatus | Codex text | `app/@from`, `app/@to` | `#start_42597` → `anchor[@xml:id='start_42597']` |
| Codex text | Facsimile | `pb/@facs`, `lb/@facs`, `seg/@facs`, `fw/@facs`, `milestone/@facs` | `#page_32494516`, `#region_1639399488602_10l1`, `#line_1639401326021_84` |
| Codex header | Codex divisions | `msItem/locus/@target` | `#Transition0`, `#GenLat` |

Pointer syntax is not uniform. The codex writes register targets as bare tokens, the image file as `#`-fragments, and the base teiCrafter as a file-relative fragment. Which pointer syntax the project adopts is an open ratification point in [editorial guidelines](editorial-guidelines.md#open-ratification-points).

### Transkribus zone IDs as the bridge

Transkribus generated the identifiers that connect text, layout and image. They are opaque strings and stay unchanged when the text is edited.

| ID family | Example | Carried by |
|---|---|---|
| Page | `page_32494516` | `surface/@xml:id` |
| Text region | `region_1639399488602_10`, `TextRegion_1662382236174_172` | `zone/@xml:id` |
| Line | `region_1639399488602_10l1`, `line_1639401326021_84` | `zone/@xml:id` |
| Image region | `Image_1676476154286_76` | `zone/@xml:id` |
| Word | `region_1639399488602_10l1_0`, `line_1639401326021_84_0` | `w/@xml:id` |
| Line break | `lb_42528` | `lb/@xml:id` |
| Apparatus anchor | `start_42597`, `end_42599` | `anchor/@xml:id` |

A word ID is formed from a line ID plus a token index, which is an inference from the pattern. The line part of a word ID does not reliably match the line on which the word now stands: on fol. 1r the word "Hie" has the ID `region_1639399488602_10l3_0` but follows `<lb facs="#region_1639399488602_10l1"/>`. The position of a word is therefore taken from the preceding `lb/@facs`, never parsed from its ID.

### Facsimile and IIIF resolution

Each page is a `surface` whose extent equals the pixel size of its master image, for example `<surface lrx="9243" lry="13067" ulx="0" uly="0" xml:id="page_32494516">` with `<graphic url="00000010.jpg" width="9243px" height="13067px"/>`. Zones carry `@points` polygons in the same pixel space, typed as `TextRegion` (`paragraph`, `header`), `Line` or `ImageRegion` (`img_miniature`, `img_marginalia`).

The manifest's resolver of type `iiif-image-template` takes the file stem of `graphic/@url` (`00000010`) and fills the template `https://iiif.onb.ac.at/images/REPO/8977428/{stem}.jp2/info.json`. Zone coordinates map onto the IIIF full-resolution image without conversion; this is an inference from the equal extents and holds as long as the ONB images keep the size recorded in the TEI.

### Codex text and standOff apparatus

The body is divided into `div` elements for the prologue, paratexts and the books Genesis to Josua, with chapters and verses as `div[@xml:id='Genesis.1']` and `l[@xml:id='Genesis.1.1']`. Within paragraphs, `pb`, `cb` and `lb` are empty markers, and every word is a `w` with `@xml:id`, `@orig` and `@norm`. Inline phenomena (highlighting, corrections, regions, register references) wrap the words as described in [editorial guidelines](editorial-guidelines.md).

The apparatus is a single `standOff/listApp`. Each `app` carries `@type`, `@from` and `@to` and holds two notes, `note[@xml:lang='de']` and `note[@xml:lang='en']`, whose text ends with the author sigle in parentheses. The anchors are empty elements placed in the text flow, between words or inside a `w`. Apparatus entries never point at `w/@xml:id`.

### Image annotations

`text/body/div[@type='codex-2759']` holds three lists: `list[@type='image-annotations'][@subtype='miniatures']` with items `miniatures_NN`, `list[@type='image-annotations'][@subtype='margins']` with items `margins_NN` for marginal decoration, and `list[@type='page-annotations']` with items `page_NN` describing a whole folio. An item may stand empty with `@sameAs` pointing to an equivalent item. The header's `editionStmt/respStmt` declares the artist siglas as `persName[@xml:id]`; `back/listBibl` holds the bibliography that `@resp` cites. The item fields are listed in [editorial guidelines](editorial-guidelines.md#image-annotations).

### Registers file

The current teiCrafter form keeps three lists in the top-level `standOff` of `registers.xml`:

| Register | Container and entry | Name | Authority links |
|---|---|---|---|
| Persons | `listPerson/person[@xml:id]` | `persName` | `idno[@type]` |
| Places | `listPlace/place[@xml:id]` | `placeName` | `idno[@type]` |
| Peoples | `listOrg[@type='peoples']/org[@type='people'][@xml:id]` | `orgName` | `idno[@type]` |

The project keeps the register as a separate file and links from the codex inline on the words ([specification](specification.md#key-decisions)), so that the register entry IDs equal the link values (`Martin`, `Ägypten`, `Israeliten`) and the image-file fragments (`#Gott`, `#Kanaan`). The existing values in both files are the seed vocabulary for a first register. Which list element holds peoples and which pointer syntax applies (`#ID` or `register.xml#ID`) are decided with the edition team ([editorial guidelines](editorial-guidelines.md#open-ratification-points)).

### Project manifest

`docs/data/editor/wb-codex/teicrafter.project.json` declares today:

| Field | Value |
|---|---|
| `workspace` | `wenzelsbibel`, which selects the specialised interface |
| `imageResolver` | `iiif-image-template` with the ONB template above |
| `markup` | the elements `hi`, `foreign`, `title`, `num`, `supplied`, `surplus`, `corr`, `sic`, `del`, `add`, `unclear`, `damage`, each without a value list |
| `indices` | `persons` (`listPerson`), `places` (`listPlace`), `peoples` (no list type), with authority registers GND, GeoNames, Wikidata |
| `views` | `diplomatic`, `bible-verse`, `image-annotation` |
| `schema` | absent; the workspace registry applies the default schema set of the workspace object in `docs/js/projects/wenzelsbibel/index.js` |

The served manifest stays without a schema, because a user-granted project folder resolves schema paths only inside that folder, so a manifest cannot point to a schema shipped with the application (decided in the base refactor, step d). A project folder of its own, such as a clone of the edition repository in the [working model](integration.md#working-model), can carry the project Schematron and declare it in `schema.schemas` with folder-relative paths, as `editorial/README.md` shows. A declared schema wins over the workspace default. Value lists for the markup actions from the [controlled vocabularies](editorial-guidelines.md#controlled-vocabularies) are still to be added to the manifest.

### Schema set

| Schema | Location | Scope |
|---|---|---|
| TEI All RelaxNG, TEI P5 4.11.0 | `docs/schemas/tei-p5-4.11.0/tei_all.rng`, vendored | All three files |
| `wenzelsbibel.sch` | `editorial/`, the project's source of truth | ISO Schematron, XPath 1.0; covers codex, image annotations and register links, with rules and phases in the [editorial layer](../editorial/README.md) |
| Published copy of `wenzelsbibel.sch` | planned under `docs/` | The copy the published editor can reach ([architecture](architecture.md#build-and-deployment)) |
| `wenzelsbibel-editorial.sch` | `docs/schemas/`, inherited from the base | The base draft for image annotations. It is still the Schematron in the workspace default schema set and is replaced by the published copy |

The `editing` phase is the save gate and the `review` phase a report on request ([editorial layer](../editorial/README.md#phases)); the findings of a review run over the public data are recorded with their counts as a dated snapshot in `editorial/data-findings.md`.

The project Schematron keeps to XPath 1.0, so that the same file runs in the browser, in Oxygen ([integration](integration.md)) and with lxml in the fixture check ([testing](testing.md)); its slow anchor rules and their upgrade path are described under [runtime limits](../editorial/README.md#runtime-limits). Cross-file targets (zones, ranges, register entries) are resolved by the tool's companion checks, because the Schematron sees one document at a time.

## Fixtures

| Fixture | Location | Nature |
|---|---|---|
| `wb-synthetic-folio.xml`, `wb-dual-reading.xml`, `synthetic-codex.xml` | `test/fixtures-synthetic/` | Hand-authored structural twins, CC0, no ONB data |
| Tier files `tier1-1folio.xml`, `tier2-5folio.xml`, `tier3-20folio.xml` | `test/fixtures-synthetic/tiers/` | Synthetic content with a CC0 statement; their manifests name `codex-2759.xml` as `derivedFrom`, which does not match the file content |
| `Bilderfassung-synthetic.sch`, `tiers/Bilderfassung.sch` | `test/fixtures-synthetic/` | Small synthetic Schematron stand-ins, not the missing original |
| `wenzelsbibel-synthetic-codex.xml` | `docs/data/editor/` | Synthetic sample for the start page |
| `editorial/fixtures/` | `editorial/`, listed in `fixtures/index.json` | Hand-built Schematron fixtures, CC0, under the rules of the [editorial layer](../editorial/README.md) |
| `fol1r.xml` | `prototypes/d-flow/fixture/`, tracked | An excerpt of fol. 1r from the public ONB TEI of the codex with its CC BY 4.0 header, used by the flow spike's checks. As a tracked excerpt of real edition data it departs from the storage rule below, and whether it stays is an operator decision ([handoff](handoff.md)) |
| fol. 1r extraction (`fol-1r.json`) | `data/wireframe/`, local and ignored | Generated by a script from the public ONB TEI: columns, lines and tokens with their markup, apparatus entries anchored on the page, register IDs from the image file, miniature `miniatures_01`, zones and the IIIF base URL; input for the wireframe |

The synthetic twins model surfaces, zones, words and simple `standOff` notes. They contain neither `listApp` with anchors, nor typed `ref`, nor `hi`, so they cannot exercise the handbook vocabularies; tests of those need either new synthetic twins built from the [controlled vocabularies](editorial-guidelines.md#controlled-vocabularies) or opt-in runs against the local real files ([testing](testing.md)).

## Limits

- The edition data cover the prologue, paratexts and the books Genesis to Josua. Further books are not part of the TEI files; how they will be added is undecided.
- No register file exists in the edition data. Register identity rests on the ID strings in `ref/@target` and `@corresp`; no authority identifiers are attached.
- The original project Schematron `Bilderfassung.sch` is missing. According to the DHCraft specification the project's copy of `Bildannotationen.xml` references it together with TEI All; the copy served by the ONB carries no `xml-model` processing instruction.
- The data contain inconsistencies that the `review` phase reports, recorded with their counts in `editorial/data-findings.md`. Among them are apparatus types beyond the seven the Schematron accepts, apparatus pointers that resolve to no anchor, words with readings but without `xml:id`, and register pointers with leading, trailing or inner spaces ([editorial guidelines](editorial-guidelines.md) records them against the rules). The artist pointer `#STW` resolves to no sigla; `#ICONCLASS` resolves to no element; every statistical range that fails the syntax check is the empty form `#range(,)`; some `ref` elements lack `@target`; one `ref` has `type="Person"`; the `msItem/locus` targets `#Prologue`, `#Gen` and `#Transition2` match no `div/@xml:id` (the divisions are `Prologus`, `Genesis`, `Transition2.1`).
- `w/@norm` is present throughout, but its production rules are not documented.
- Image access through IIIF is technical only. Storing or redistributing images or edition data needs the rights holders' permission.

## Storage and rights

Real edition data stay outside this repository. In a working copy they belong in a local `data/` folder at the repository root, which the `.gitignore` excludes with the anchored pattern `/data/`, so `docs/data/` is not affected. Under the [working model](integration.md#working-model) the edition data live in the edition team's own repository on the university's GitLab. The inherited rule that ignores `docs/data/editor/*/*` except manifest, README and NOTICE keeps the manifest tracked and any local payload out. The public header licence CC BY 4.0 is not treated as clearance, because the licence for a project copy is recorded as unresolved; the tool and its fixtures therefore ship only synthetic data, and the fol. 1r extraction stays local. The spike excerpt `prototypes/d-flow/fixture/fol1r.xml` is the one exception in the repository and awaits the operator's decision.

## Examples

A register reference on fol. 1r, wrapping three words with rubrication and a line break inside a word:

```xml
<ref target="Martin" type="person">
  <w norm="Rotlebin" orig="Rotlebín" xml:id="region_1639399535558_19l6_1"><hi rend="rubrication">Rotlebín</hi></w>
  <w norm="herren" orig="herren" xml:id="region_1639399535558_19l6_2">herren</w>
  <w norm="mertein" orig="merteín" xml:id="region_1639399535558_19l6_3"><hi rend="rubrication">mer<lb facs="#region_1639399535558_19l7" xml:id="lb_43234"/>teín</hi></w>
</ref>
```

An apparatus entry and its anchors inside a word on fol. 1r (note text shortened):

```xml
<!-- standOff/listApp -->
<app from="#start_42597" to="#end_42599" type="comment_edition">
  <note xml:lang="de">Die doppelte Apostrophe "O Got got" wird wohl als Ausdruck der Emphase aufzufassen sein … (MK)</note>
  <note xml:lang="en">The double apostrophe "O Got got" is probably to be understood as an expression of emphasis … (MK)</note>
</app>
<!-- text -->
<w norm="got" orig="got" xml:id="region_1639399497290_13l1_0"><anchor xml:id="start_42597"/>got<anchor xml:id="end_42599"/></w>
```

The miniature on fol. 1r, abbreviated to its reference fields:

```xml
<item corresp="#Image_1676476154286_76" xml:id="miniatures_01">
  <title resp="#JT #KS">Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron</title>
  <dimensions><height unit="line">14</height></dimensions>
  <ref n="4-17" target="1ra" type="folio"/>
  <listPerson resp="#JT #KS" type="artists"><head>Künstlerzuweisung</head><person corresp="#BA"/></listPerson>
  <listPerson type="related"><head>Relevante Personen</head><person corresp="#Gott"/><person corresp="#Engel"/></listPerson>
  <listRef>
    <ref corresp="https://iconclass.org/11C21(+0)" resp="#ICONCLASS" type="iconclass-label">
      <desc xml:lang="de">Gottvater als junger oder erwachsener Mann</desc>
      <desc xml:lang="en">God the Father as young or adult man</desc>
    </ref>
  </listRef>
  <objectType rend="initial_historisiert">Historisierte Initiale (O)</objectType>
  <note corresp="#range(region_1639399488602_10l3_0, region_1639577288773_22l29_4)" resp="editor" subtype="statistic" type="text-relation">gesamter Prolog bis fol. 2r WB: f.1r Z.1-1 bis f.2r Z.6-6</note>
</item>
```
