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

The tool processes three linked TEI files of the Wenzelsbibel edition: the codex transcription, the image annotations and a shared register file, together with page images from the Austrian National Library (ONB) IIIF service. This document describes their formats, identifiers and cross-file references, the project manifest, schema set and vocabulary that bind them in the tool, the fixtures, and where the real data lives. The encoding rules for the content are in [editorial guidelines](editorial-guidelines.md).

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
| Codex word | Register entry (handbook form, present in the data, read by the new shell from phase 5b) | `ref[@type][@target]` around the words | `<ref target="Martin" type="person">` |
| Codex word | Register entry (proposed written form, see [specification](specification.md#key-decisions)) | `rs[@type][@ref]` around the words | `<rs type="person" ref="#Martin">`, pointer syntax open |
| Codex word range | Register entry (base teiCrafter form, still written by the inherited register model of the project folder until phase 5b replaces it by the inline form) | `standOff/spanGrp[@type='register-links']/span` with `@from`, `@to`, `@ana` | `registers.xml#entry-id` |
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

A word ID is formed from a line ID plus a token index, which is an inference from the pattern. The line part of a word ID does not reliably match the line on which the word now stands: on fol. 1r the word "Hie" has the ID `region_1639399488602_10l3_0` but follows `<lb facs="#region_1639399488602_10l1"/>`. The position of a word is therefore taken from the `lb/@facs` that precedes its first character, never parsed from its ID ([codex text](#codex-text-and-standoff-apparatus)).

### Facsimile and IIIF resolution

Each page is a `surface` whose extent equals the pixel size of its master image, for example `<surface lrx="9243" lry="13067" ulx="0" uly="0" xml:id="page_32494516">` with `<graphic url="00000010.jpg" width="9243px" height="13067px"/>`. Zones carry `@points` polygons in the same pixel space, typed as `TextRegion` (`paragraph`, `header`), `Line` or `ImageRegion` (`img_miniature`, `img_marginalia`).

The manifest's resolver of type `iiif-image-template` takes the file stem of `graphic/@url` (`00000010`) and fills the template `https://iiif.onb.ac.at/images/REPO/8977428/{stem}.jp2/info.json`. Zone coordinates map onto the IIIF full-resolution image without conversion; this is an inference from the equal extents and holds as long as the ONB images keep the size recorded in the TEI.

### Codex text and standOff apparatus

The body is divided into `div` elements for the prologue, paratexts and the books Genesis to Josua, with chapters and verses as `div[@xml:id='Genesis.1']` and `l[@xml:id='Genesis.1.1']`. Within paragraphs, `pb`, `cb` and `lb` are empty markers, and every word is a `w` with `@xml:id`, `@orig` and `@norm`. Inline phenomena (highlighting, corrections, regions, register references) wrap the words as described in [editorial guidelines](editorial-guidelines.md).

An `lb` also stands inside a `w` where a word runs over a line end, as in `mer<lb/>teín` on fol. 1r (see [Examples](#examples)). Such a word belongs to the line on which it begins, the line of the `lb` that precedes its first character, and selecting that line includes the whole word. The real build follows this rule for line numbers, line selection, the popover's line state and the facsimile outline. The wireframe extraction applies it as follows: an `lb` inside a word adds a line break to the word text and opens its line, an `lb` before a word's first character moves the word to that line, and anchors inside a word belong to the word's line, so that a word whose `lb` is its last child, such as the marginal sign on fol. 1r, ends the line it begins.

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
| `markup` | the elements `hi`, `foreign`, `title`, `num`, `supplied`, `surplus`, `corr`, `sic`, `del`, `add`, `unclear`, `damage`, each without a value list and with an English label |
| `indices` | `persons` (`listPerson`), `places` (`listPlace`), `peoples` (no list type), with authority registers GND, GeoNames, Wikidata |
| `views` | `diplomatic`, `bible-verse`, `image-annotation` |
| `schema` | absent; the workspace registry applies the default schema set of the workspace object in `docs/js/projects/wenzelsbibel/index.js` |

The served manifest stays without a schema, because a user-granted project folder resolves schema paths only inside that folder, so a manifest cannot point to a schema shipped with the application (decided in the base refactor, step d). A project folder of its own, such as a clone of the edition repository in the [working model](integration.md#working-model), can carry the project Schematron and declare it in `schema.schemas` with folder-relative paths, as `editorial/README.md` shows. A declared schema wins over the workspace default. The manifest is base material outside the fork's zones, and the base shell reads its `markup` and `indices`. The new shell takes the value lists and German labels of the markup actions from the [controlled vocabulary](#controlled-vocabulary), and the `bible-verse` view lies outside the scope ([specification](specification.md#purpose-and-scope)).

### Schema set

| Schema | Location | Scope |
|---|---|---|
| TEI All RelaxNG, TEI P5 4.11.0 | `docs/schemas/tei-p5-4.11.0/tei_all.rng`, vendored | All three files |
| [`wenzelsbibel.sch`](../docs/schemas/wenzelsbibel.sch), named "Editionsregeln" | `docs/schemas/`, the single source, read by the published editor, the tested build, the fixture check and Oxygen | ISO Schematron, XPath 1.0; covers codex, image annotations and register links, with rules and phases in the [editorial layer](../editorial/README.md); the Schematron in the workspace default schema set |
| `wenzelsbibel-editorial.sch` | `docs/schemas/` and `public/schemas/`, inherited from the base | The base draft for image annotations, referenced by no schema set of this workspace; it stays until the base removes it |

The `editing` phase is the save gate and the `review` phase a report on request ([editorial layer](../editorial/README.md#phases)); the findings of a review run over the public data are recorded with their counts in the dated [findings snapshot](../snapshots/schematron-findings-2026-10-10.md).

The project Schematron keeps to XPath 1.0, so that the same file runs in the browser, in Oxygen ([integration](integration.md)) and with lxml in the fixture check ([testing](testing.md)); its slow anchor rules and their upgrade path are described under [runtime limits](../editorial/README.md#runtime-limits). Cross-file targets (zones, ranges, register entries) are resolved by the tool's companion checks, because the Schematron sees one document at a time.

### Controlled vocabulary

[`docs/schemas/wenzelsbibel-vocabulary.json`](../docs/schemas/wenzelsbibel-vocabulary.json) is the one hand-edited source of the controlled value lists. It holds the apparatus types, `hi/@rend`, `supplied/@reason`, `surplus/@reason`, `del/@type`, `foreign/@xml:lang`, `num/@type`, `note/@type`, `fw/@ana`, `seg/@ana` and the register types, and gives each list a German caption and each value its source (handbook or data) and a German label. Each caption and label names its own source, the wording of the Transkriptionshandbuch, a label the wireframe showed or a working label that awaits the edition team. Two consumers depend on it.

- The fixture check `editorial/check_fixtures.py` fails when a value list of the project Schematron, in a rule test or in the German message that repeats it, differs from the JSON, and when a caption or label is missing ([testing](testing.md#test-strategy)).
- The project modules of the new shell under `docs/js/projects/wenzelsbibel/` read values and labels from it. Today only the apparatus types are read, by the text model for new comments, and the other lists follow in phase 5b.

The wireframe keeps its own lists. Why a value is accepted, reported or open is argued against the handbook in [editorial guidelines](editorial-guidelines.md#controlled-vocabularies).

## Fixtures

| Fixture | Location | Nature |
|---|---|---|
| `wb-synthetic-folio.xml`, `wb-dual-reading.xml`, `synthetic-codex.xml` | `test/fixtures-synthetic/` | Hand-authored structural twins, CC0, no ONB data |
| Tier files `tier1-1folio.xml`, `tier2-5folio.xml`, `tier3-20folio.xml` | `test/fixtures-synthetic/tiers/` | Synthetic content with a CC0 statement; their manifests name `codex-2759.xml` as `derivedFrom`, which does not match the file content |
| `Bilderfassung-synthetic.sch`, `tiers/Bilderfassung.sch` | `test/fixtures-synthetic/` | Small synthetic Schematron stand-ins, not the missing original |
| `wenzelsbibel-synthetic-codex.xml` | `docs/data/editor/` | Synthetic fallback of the built-in example `wb`, which only the inherited base shell offers on local development hosts, and the fork's new shell shows it nowhere |
| `editorial/fixtures/` | `editorial/`, listed in `fixtures/index.json` | Hand-built Schematron fixtures, CC0, under the rules of the [editorial layer](../editorial/README.md) |
| `fol1r.xml` | `prototypes/d-flow/fixture/`, tracked, with [`NOTICE.md`](../prototypes/d-flow/fixture/NOTICE.md) beside it | Excerpt of fol. 1r from the public ONB TEI of the codex, the material of the flow spike's checks and the fork's example and demo material ([specification](specification.md#key-decisions)); a publicly published and licensed excerpt under the storage rule below, with the CC BY 4.0 attribution of its header in the NOTICE |
| Folio extraction (`index.json` and one `fol-<n>.json` per folio) | `data/wireframe/`, local and ignored | Input for the wireframe, generated by the tracked script `wireframe/extract_data.py` from the public ONB TEI of the codex and the image annotations, whose docstring describes the extraction. The index lists every folio with its image stem and its miniatures, and the wireframe loads the file of the chosen folio when the user turns the page, the loading model the real build follows with its folio window (operator decision of 2026-10-10 that the wireframe holds every folio) |

The synthetic twins model surfaces, zones, words and simple `standOff` notes. They contain neither `listApp` with anchors, nor typed `ref`, nor `hi`, so they cannot exercise the handbook vocabularies. The demo workflow tests of phase 5b therefore run on the fol. 1r excerpt, and the real-file run of phase 6 runs them again on the local real files ([testing](testing.md)).

The excerpt holds the text of fol. 1r with its words, renditions, anchors and the register link to `Martin`. It lacks the facsimile surface with its zones, the apparatus entries that point into the page, the image-annotation items of the page and a register file. Phase 5b adds the first three from the same public files, each excerpt with its NOTICE, and how the demo tests get a register file is an [open decision](plan.md#open-decisions-and-dependencies), because the edition data contain none.

## Limits

- The edition data cover the prologue, paratexts and the books Genesis to Josua. Further books are not part of the TEI files; how they will be added is undecided.
- No register file exists in the edition data. Register identity rests on the ID strings in `ref/@target` and `@corresp`; no authority identifiers are attached.
- The original project Schematron `Bilderfassung.sch` is missing. According to the DHCraft specification the project's copy of `Bildannotationen.xml` references it together with TEI All; the copy served by the ONB carries no `xml-model` processing instruction.
- The data contain inconsistencies that the `review` phase reports. [Editorial guidelines](editorial-guidelines.md) records them against the rules, and the [findings snapshot](../snapshots/schematron-findings-2026-10-10.md) holds the counts of a dated run.
- `w/@norm` is present throughout, but its production rules are not documented.
- Image access through IIIF is technical only. Storing or redistributing images or edition data needs the rights holders' permission.

## Storage and rights

Real edition data stay outside this repository. In a working copy they belong in a local `data/` folder at the repository root, which the `.gitignore` excludes with the anchored pattern `/data/`, so `docs/data/` is not affected. Under the [working model](integration.md#working-model) the edition data live in the edition team's own repository on the university's GitLab. The inherited rule that ignores `docs/data/editor/*/*` except manifest, README and NOTICE keeps the manifest tracked and any local payload out. The public header licence CC BY 4.0 is not treated as clearance for working copies, because the licence for a project copy is recorded as unresolved.

The repository rule distinguishes two kinds of material. Working copies of the edition data and page images are never tracked, so the fol. 1r extraction for the wireframe stays local. A publicly published and licensed excerpt may be tracked when a `NOTICE.md` beside it carries the attribution its licence requires, as for the spike excerpt `prototypes/d-flow/fixture/fol1r.xml`. Every other fixture is synthetic.

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
