---
title: Editorial Guidelines
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Domänenwissen
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/domain-knowledge
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-domain-knowledge
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[TEI XML]]", "[[Editorial Guidelines]]", "[[Critical Apparatus]]", "[[Controlled Vocabularies]]"]
knowledge-sources:
  standards:
    Wenzelsbibel Transkriptionshandbuch (Version Februar 2025): https://edition.onb.ac.at/fedora/objects/o:wen.red-editionguidelines/datastreams/EDITION_GUIDELINES/content
    TEI P5 Guidelines: https://www.tei-c.org/release/doc/tei-p5-doc/en/html/index.html
  vocabularies:
    ICONCLASS: https://iconclass.org/
related: [data, project, specification, architecture, design, testing, integration, plan]
---

# Editorial Guidelines

This document states which scholarly rules govern the TEI encoding of the Wenzelsbibel edition (Codex 2759, Austrian National Library) and where the project's published handbook, the DHCraft specification and the teiCrafter implementation agree or diverge. It is the rule layer from which the project Schematron, the manifest vocabularies and the inspector forms are derived; the material itself is described in [data](data.md), the tool behaviour in [specification](specification.md).

## Guideline layers and their authority

| Layer | Status | Authority |
|---|---|---|
| *Transkriptionshandbuch* (Version Februar 2025), published by the edition project | Published project rule; maps each Transkribus tag to a TEI XPath and to the renderings in the reading views "Transkription" and "Edition" | Binding. The Paris Lodron University Salzburg (PLUS) edition team decides on the data model and ratifies changes |
| DHCraft vault document "TEI-Spezifikation Wenzelsbibel" | Draft derived from the existing XML; element inventory without controlled vocabularies | Working basis, not ratified by the edition team |
| teiCrafter conventions (shared `registers.xml`, `spanGrp[@type='register-links']`, `spanGrp[@type='bible-verses']`, `wenzelsbibel-editorial.sch`) | Implemented in the upstream legacy app under `docs/` | Implementation choices awaiting ratification |

Where the layers conflict, the handbook prevails, and the real data shows how the handbook was applied in practice. Several handbook rules are marked "Noch nicht umgesetzt" (not yet implemented), yet the codex already contains some of them; those rules need ratification of the state found in the data rather than new implementation.

The handbook describes a Transkribus workflow: text regions with structure types, first transcription by the PyLaia HTR model WB-DEA, transcription "so genau wie möglich" without normalisation in Transkribus, and tags with properties that an export maps to TEI. The rendering columns of the handbook govern the ONB reading views; the tool's text view can reuse them as display conventions (for example red underline for rubrication, bold for initials), which [design](design.md) decides.

Observations in the tables below come from the public TEI of the codex and the image annotations, downloaded from edition.onb.ac.at on 2026-10-10, and from the review run of the project Schematron over the same files, whose counts stand in `editorial/data-findings.md`. "fol. 1r" marks an example from the first page; "codex" marks a value found elsewhere in the body.

## Transcription layer

The handbook (1.3) fixes the character repertoire: Latin letters plus r rotunda (U+A75A, U+A75B), long s (U+017F), Tironian et (U+204A), punctuation such as the bullet (U+2022) as general separator, functional characters for line-end hyphenation, column start, verse start and omissions, and combining marks (nasal bar U+0304, r hook U+035B, dot below U+0323 as deletion point). Each word carries its diplomatic form in text and `@orig` and a normalised form in `@norm`.

| Aspect | Handbook | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Diplomatic and normalised reading | Transcribe exactly, no normalisation in Transkribus (1.3) | Yes. fol. 1r: `<w xml:id="region_1639399488602_10l1_1" orig="ſich" norm="sich">ſich</w>`, `orig="voꝛ" norm="vor"` | Word form edits text and `w/@orig` (diplomatic) and `w/@norm` (normalised) | The handbook gives no rule for producing `@norm`; who normalises and by which rules is open. Decorative or empty tokens carry `norm=""` |
| Ligatures | Not covered | Yes. fol. 1r: `<w orig="der" norm="der"><hi rend="ligature">de</hi>r</w>` | Preserved as inline markup | `ligature` is the most frequent `hi/@rend` value in the codex and appears in no handbook section |
| Added punctuation | Not covered | Yes. fol. 1r: `<supplied reason="additionalPunctuation"><pc>,</pc></supplied>` | Preserved | Value missing from the handbook vocabulary of `supplied/@reason` |
| Word identifiers | Not covered | Words with `@orig` and `@norm` carry `xml:id`, except some words inside `supplied` and `choice/corr` (codex): `<corr><w norm="schreibit" orig="ſchreibit">ſchreibit</w></corr>` | Word IDs anchor selection and register links | Words added during editorial or historical correction appear to have received no ID; whether they get one is open |

## Text regions

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Header | `fw[@ana='header']` (1.2.1) | Yes. fol. 1r: `<fw ana="header" facs="#region_1639399465019_4">` | No dedicated action; preserved | Agree |
| Instruction note | `fw[@ana='instruction_note']` (1.2.2) | Yes, as `seg[@ana='instruction_note']` (codex) | Preserved | Element differs: the data uses `seg`, the handbook `fw` |
| Marginalia | `fw[@ana='marginalia']` (1.2.3) | Yes, as `seg[@ana='marginalia']` with `hi[@rend='marginalia']` inside. fol. 1r: `<seg ana="marginalia" facs="#region_1639399585108_22">` | Preserved | Element differs; `hi/@rend="marginalia"` is not in the handbook |
| Text in image | `fw[@ana='text_in_image']` (1.2.4) | Yes, as `seg[@ana='text_in_image']` (codex) | Preserved | Element differs |
| Border decoration | `fw[@ana='borderdecoration']` (1.2.5) | Yes, as `seg[@ana='border-decoration']` and `seg[@ana='border_decoration']` (codex) | Preserved | Element differs and three spellings exist (handbook XPath, Transkribus tag `border-decoration`, data variant `border_decoration`); one value needs to be fixed |
| Scroll | `fw[@ana='scroll']` (1.2.6) | Yes, as `seg[@ana='scroll']` (codex) | Preserved | Element differs |
| Painter instruction | `fw[@ana='painter_instruction']` (1.2.7) | Yes, as `seg[@ana='painter_instruction']` (codex) | Preserved | Element differs |

Only the header is encoded as `fw` in the data; every other region type is a `seg` with `@ana` and `@facs` pointing to its Transkribus region. Whether the handbook's `fw` or the data's `seg` is the rule is a ratification point.

## Highlighting

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Rubrication | `hi[@rend='rubrication']` (1.4.2) | Yes. fol. 1r: `<hi rend="rubrication">Rotlebín</hi>` | Manifest markup action `hi` without value list | Values must come from the manifest |
| Red ink | `hi[@rend='inkRed']` (1.4.3) | Yes. fol. 1r: `<hi rend="inkRed">` around the opening words "Hie hebt ſich an die voꝛ rede" | As above | Agree |
| Gold script | Transkribus `inkGold`, TEI `hi[@rend='gold']` (1.4.4) | Yes (codex) | As above | Tag and attribute value differ by design |
| Initial | `hi[@rend='initial']` (1.4.5) | Yes. fol. 1r: `<w orig="Reiche" norm="Reiche"><hi rend="initial">R</hi>eiche</w>` | As above | Agree |
| Historiated initial | `hi[@rend='initial_historisiert']` (1.4.16) | Yes. fol. 1r: `<hi rend="initial_historisiert">O</hi>` | As above | Agree; the same value reappears as `objectType/@rend` in the image annotations |
| Text in border decoration | `hi[@rend='border_decoration']` with `@style` holding the colour (1.4.14) | No. The data uses `seg[@ana='border-decoration']` with `hi[@rend='decoration']` inside; no `hi/@style` occurs | As above | Rule and data differ in element and value |
| Further values | Not covered | Yes (codex): `ligature`, `textStyle`, `decoration`, `full_page`, `marginalia`, `italic` | As above | Each needs ratification or cleanup |

## Abbreviations and chapter numbers

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Abbreviation | Transkribus `abbrev` with property `expansion`; XPath `//abbr/@expan` (1.4.1) | Yes, as `choice/abbr` plus `expan`. fol. 1r: `<choice><abbr>⁊c͛</abbr><expan>etcetera</expan></choice>`; no `abbr/@expan` occurs | Existing `choice` structures take part in the reading projection; no dedicated action | The handbook XPath does not match the data; by our reading it is a notation slip for `choice/abbr/expan`, which the edition team should confirm |
| Chapter number | `num[@type='chapter']` (1.4.6) | Yes (codex): `<num type="chapter" value="2">`, also without `@value` | Manifest markup action `num` without value list | `@value` is set only on part of the chapter numbers; whether it is required is open |

## Surplus, deletions and supplied text

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Surplus without reason (letters at line end) | `surplus` without `@reason` (1.4.7) | Yes (codex): `<surplus>ſ</surplus>` | Manifest markup action `surplus` | Agree |
| Dittography | `surplus[@reason='Diplography']` (1.4.7); Transkribus property `diplography` | Yes (codex): `<surplus reason="Diplography">` | As above | Agree; the capitalised value deviates from the otherwise lower-case vocabulary |
| Decoration | `surplus[@reason='decor']` (1.4.7) | Yes (codex): `<surplus reason="decor">ł</surplus>` | As above | Agree |
| Text erasure | `surplus[@reason='text_erasure']` (1.4.7) | Yes (codex) | As above | Agree |
| Transposition, original position | `surplus[@reason='switch']` (1.4.7), paired with `supplied[@reason='switch']` | Yes (codex), with the paired `supplied` | As above | The pairing is positional; no pointer links the two halves |
| Executed instruction | `surplus[@reason='instruction_note']` (1.4.10) | Yes (codex), inside `seg[@ana='instruction_note']` | As above | Agree |
| Struck-through text | `del` (1.4.8) | Yes (codex): `<del>w</del>` inside `hi[@rend='textStyle']` | Manifest markup action `del` | Agree |
| Erasure | `del[@type='erasure']` (1.4.8), marked not yet implemented | Yes. fol. 1r: `<w orig="ſp" norm="sp"><del type="erasure">ſp</del></w>` | As above | Implemented in the data despite the marker |
| Deletion point | Transkribus property `erasure_point`; XPath `del[@type='redemption_point']` (1.4.8) | Yes, as `del[@type='erasure_point']` (codex): `yſmahele<del type="erasure_point">ṇ</del>` | As above | The handbook XPath value `redemption_point` does not occur; the data uses `erasure_point` |
| Editorial addition | `supplied[@reason='text_intervention']` (1.4.9) | Yes (codex): `<supplied reason="text_intervention"><w>kein</w></supplied>` | Manifest markup action `supplied` | Agree |
| Supplied text without reason | Not covered; every handbook form of `supplied` carries `@reason` | Yes (codex), rarely: `<supplied><w>volke</w></supplied>` in `l[@xml:id='Exodus.30.33']`, and once around a punctuation mark | Preserved; the review phase reports it | Add the missing reason or ratify `supplied` without reason |
| Transposition, new position | `supplied[@reason='switch']` (1.4.9) | Yes (codex) | As above | Agree |
| Damaged text | `supplied[@reason='damage']` inside `damage`; `damage/@agent` marked not yet implemented (1.4.15) | Yes. fol. 1r: `<damage agent="water"><supplied reason="damage">ue</supplied></damage>bit`; codex also has `agent="stain"` and `damage` without agent | Manifest markup actions `damage` and `supplied` | `@agent` is implemented in the data; its value list (`water`, `stain`) is not ratified |
| Unclear reading | Not covered | Yes. fol. 1r: `í<unclear>nt</unclear>rewen` | Manifest markup action `unclear` | Element outside the handbook |

## Instructions and foreign languages

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Unexecuted instruction | `note[@type='instruction']` (1.4.10; the handbook XPath carries a trailing space in the value) | Yes (codex): `<w orig="es" norm="es"><note type="instruction">e</note>s</w>` | No markup action for `note` | `note` is not in the manifest; the inspector needs it |
| Latin passage | `foreign[@xml:lang='lat']` (1.4.11) | Yes (codex): the paratext `div[@xml:id='GenLat']` | Manifest markup action `foreign` without value list | Language code question below |
| Czech passage | `foreign[@xml:lang='cze']` (1.4.12) | Yes (codex), inside `seg[@ana='scroll']` | As above | As above |
| Czech gold passage in the Bible text | `choice/sic/hi[@rend='gold']/foreign[@xml:lang='cze']/w` with an empty `corr` (1.4.13) | Yes (codex): `<choice><sic><hi rend="gold"><foreign xml:lang="cze"><w orig="Toho" norm="Toho">Toho</w>…</foreign></hi></sic><corr></corr></choice>` | Preserved as source | The empty `corr` is a deliberate suppression in the Edition view; cleanup actions must leave it in place |

## Corrections and errors

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Historical correction | `corr` (1.4.17) | Yes (codex): `<w orig="von" norm="von"><corr>von</corr></w>` | Manifest markup action `corr` | Agree |
| Erroneous text with historical correction | `choice/sic/corr` (1.4.17) | Yes (codex): `<choice><sic>n</sic><corr>r</corr></choice>` | Existing `choice` in the reading projection | Agree |
| Missing text supplied by a historical addition | `add/@place` (1.4.17), marked not yet implemented | Yes (codex): `<add place="marginal left">von</add>` | Manifest markup action `add` | Implemented in the data; the `@place` value list is not defined |
| Obvious error | `choice/sic/corr` (1.4.18) | Yes (codex), same form as above | As above | Historical and editorial corrections share one encoding; nothing distinguishes them in the XML |

## Persons, peoples and places

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Person | `<ref target="[ID]" type="person">` around the words; Transkribus property `firstname` holds the ID, recorded in a register (1.4.19) | Yes. fol. 1r: `<ref target="Martin" type="person">` wraps three words of the name Mertein Rotleb | `spanGrp[@type='register-links']/span` with `@from`, `@to` and `@ana="registers.xml#id"` in the codex `standOff` | Different mechanism; the project links inline on the words ([decision](specification.md#key-decisions)), see open ratification points |
| People | `<ref target="[ID]" type="folk">` (1.4.20) | Yes (codex): `<ref target="Philister" type="folk">` | Same span mechanism; entries as `listOrg[@type='peoples']/org[@type='people']` | Mechanism as above; the list element for peoples is open |
| Place | `<ref target="[ID]" type="place">` (1.4.21) | Yes (codex): `<ref target="Ägypten" type="place">` | Same span mechanism; entries as `listPlace/place` | Mechanism as above |

Five observations bear on the decision. The codex writes `@target` as a bare token (`Martin`, not `#Martin`), while the image annotations point with a hash (`<person corresp="#Gott"/>`); the planned interface uses `#ID`, so the pointer syntax has to be fixed together with the mechanism. The codex also contains `ref` elements with a type but no `@target` and one `type="Person"` with a capital letter. Some `@target` values carry leading, trailing or inner spaces, such as `Sodomit, Sodomiten`, `König Wenzel` and `Arpachschad ` with a trailing space; whether multi-word IDs are intended or need normalising belongs to the register decision. Typed `ref` elements also occur inside other typed `ref` elements, a nesting the Schematron does not check and the inspector has to show and edit as stacked chips. The image annotations list peoples such as `#Israeliten`, `#Kanaaniter` and `#Amalekiter` as `person`, whereas the codex types the same IDs as `folk`.

## Apparatus

| Phenomenon | Handbook encoding | Real data | teiCrafter | Divergence and open decision |
|---|---|---|---|---|
| Commentary entry | Not covered | `standOff/listApp/app` with `@from="#start_NNNN"` and `@to="#end_NNNN"` pointing to empty `anchor` elements in the text flow, also inside `w`. fol. 1r: `<anchor xml:id="start_42597"/>got<anchor xml:id="end_42599"/>`. Some pointers resolve to no anchor: they lack the leading `#` and name no existing ID, read `to="#"`, or point `@from` and `@to` at the same start anchor; some anchors are referenced by no entry | Creates the two anchors and the `app` in one transaction | Agree in mechanism; the unresolved pointers need correction by the edition team |
| Shared comment | Not covered | `app` with `@sameAs` pointing to another `app/@xml:id`, mostly without anchors of its own (`<app sameAs="#d3c_vsn_qbc" type="comment_translation"/>`), in some entries together with `@from` and `@to` | Retained | Whether an entry without anchors names a text position, and what `@sameAs` beside anchors means, is open |
| Comment type | Not covered | Seven established values: `comment_edition`, `comment_understanding`, `comment_translation`, `comment_translation_ses`, `comment_translation_vev`, `comment_manuscript`, `comment_variant`; further values on a few entries each, listed below, and one entry without a type | Offers `comment_edition` and `comment_understanding` for new entries; existing types are retained | The tool needs the full list; the meaning of the `_ses` and `_vev` suffixes is not documented |
| Bilingual notes and sigle | Not covered | One `note[@xml:lang='de']` and one `note[@xml:lang='en']` per `app`, author sigle in parentheses at the end of the text, for example `(MK)`; no `note/@resp` | Each note keeps its own text, `xml:lang` and `resp` | Responsibility lives in the text, not in an attribute; whether new entries keep the sigle convention or add `@resp` is open |

The further `app/@type` values fall into two groups by our reading. Whether each one is a typing error to correct or a category to ratify is for the edition team to decide; the review phase reports all of them as errors until then.

| Value | Reading | Decides |
|---|---|---|
| `comment_understandning`, `comment_unerstanding` | Possibly a typing error for `comment_understanding` | Edition team: treat as typo or ratify as category |
| `comment_comment_translation_ses` | Possibly a doubled prefix of `comment_translation_ses` | Edition team: treat as typo or ratify as category |
| `edition`, `translation` | Possibly short forms of `comment_edition` and `comment_translation` | Edition team: treat as typo or ratify as category |
| `comment_participle`, `comment_AcI`, `comment_Abl.abs.` | Possible further categories for grammatical phenomena | Edition team: treat as typo or ratify as category |
| `comment_exegesis`, `comment_adaption`, `comment_V-addition`, `comment_painting_instruction`, `comment_vulgate_template`, `comment_tb` | Possible further categories | Edition team: treat as typo or ratify as category |
| `app` without `@type` | Missing value | Edition team |

## Image annotations

The image annotations live in a separate file and are outside the handbook; their rules come from the existing data and from the missing project Schematron `Bilderfassung.sch`.

| Phenomenon | Encoding in the data (`Bildannotationen.xml`) | teiCrafter | Divergence and open decision |
|---|---|---|---|
| Item | `list[@type='image-annotations'][@subtype='miniatures']/item[@corresp='#Image_…'][@xml:id='miniatures_NN']`; further lists `@subtype='margins'` and `list[@type='page-annotations']`; items may carry `@sameAs`. The later miniature items, from `miniatures_191` on, carry title, height and folio but no descriptions and no artist attribution | Form for items in the miniature list; new items are appended there | Editing of the margins and page-annotation lists is not documented upstream; the incomplete items suggest that annotation of the later folios is in progress, which the review phase reports as missing fields |
| Title and descriptions | `title`, `note[@type='description'][@subtype='short']`, `note[@type='description']`, each with `@resp` and `@anchored="true"` | Form fields with responsibility; `@anchored` preserved | Agree |
| Height, folio, object type | `dimensions/height[@unit='line']`, `ref[@type='folio'][@target='1ra'][@n='4-17']`, `objectType` with `@rend` = `miniature`, `initial_historisiert` or absent | Form fields | `objectType/@rend` vocabulary is not ratified |
| Artists | `listPerson[@type='artists']/person/@corresp` pointing to header `persName/@xml:id`: `BA` Balaam-Meister, `ES` Esra-Meister, `FR` Frana, `KU` Kuthner, `MO` Morgan-Meister, `RU` Rut-Meister, `SA` Salomo-Meister, `SI` Simson-Meister, `ST` Siebentage-Meister | Choice from the header siglas; review phase checks resolution | The data also uses `#STW`, which resolves to no header sigla |
| Related persons and places | `listPerson[@type='related']/person/@corresp="#Gott"`, `listPlace[@type='related']/place/@corresp="#Kanaan"`; a `place` may hold only a `desc` stating that no place applies | Pointers into the shared register | Peoples sit in the person list; no field for peoples exists in the data or the tool |
| ICONCLASS | `listRef/ref[@type='iconclass-label'][@corresp='https://iconclass.org/11C21(+0)'][@resp='#ICONCLASS']` with `desc[@xml:lang='de']` and `desc[@xml:lang='en']` | Explicit lookup fills both labels; review phase requires both | `#ICONCLASS` resolves to no element in the file |
| Text relation | `note[@type='text-relation'][@subtype='content']` (prose) and `note[@type='text-relation'][@subtype='statistic'][@corresp='#range(first-word-id, last-word-id)']` with a human-readable span such as `WB: f.1r Z.1-1 bis f.2r Z.6-6` | Range picker against the attached codex; review phase checks syntax | The empty form `#range(,)` occurs, with an empty note, a statement that no text relation is recognisable, or an unfilled template such as `WB: f. Z. bis f. Z., Bibel: Jos 2`; no other malformed range occurs. The separator is written with and without a space. Whether well-formed ranges name existing word IDs is a cross-file check outside the Schematron |
| Responsibility | `@resp` = `#JT #KS`, `editor`, `editor #JT`, `editor #KS`; `#JT` and `#KS` resolve to `back/listBibl/bibl` entries | Responsibility fields | `editor` is a bare string, not a pointer |

## Structure outside the handbook

| Feature | Encoding in the codex | Open decision |
|---|---|---|
| Book and paratext divisions | `div[@type='book'][@xml:id='Genesis']`, `div[@type='paratext'][@xml:id='Transition1']`, `div[@type='prologus'][@xml:id='Prologus']`; one `div[@type='Transition2.1']` | The irregular type value needs cleanup |
| Chapters and verses | `div[@xml:id='Genesis.1']` and `l[@xml:id='Genesis.1.1']` | See verse numbering below |
| Paragraphs | `p[@ana='paragraph']`; `milestone/@unit` = `paragraph_beginning` or `paragraph-continued_beginning` | Agree with Transkribus export |
| Page, column, line | `pb[@n='1r'][@facs='#page_32494516']`, empty `cb`, `lb[@facs='#region_…']` or `lb[@facs='#line_…']` | Stable |

## Controlled vocabularies

The following values are the input for `editorial/wenzelsbibel.sch` and for the markup value lists in the manifest. "Handbook" lists the ratified values, "Data only" the values found in the codex or image annotations without a handbook rule. The project Schematron accepts the union in its save gate and reports "Data only" values in its review run until the edition team decides ([editorial layer](../editorial/README.md#phases)).

| Attribute | Handbook | Data only |
|---|---|---|
| `fw/@ana` | `header`, `instruction_note`, `marginalia`, `text_in_image`, `borderdecoration`, `scroll`, `painter_instruction` | none beyond `header` in use |
| `seg/@ana` | none | `instruction_note`, `marginalia`, `text_in_image`, `border-decoration`, `border_decoration`, `scroll`, `painter_instruction` |
| `hi/@rend` | `rubrication`, `inkRed`, `gold`, `initial`, `initial_historisiert`, `border_decoration` (with `@style`) | `ligature`, `textStyle`, `decoration`, `full_page`, `marginalia`, `italic` |
| `num/@type` | `chapter` | none |
| `surplus/@reason` | absent, `Diplography`, `decor`, `text_erasure`, `switch`, `instruction_note` | none |
| `del/@type` | absent, `erasure`, `redemption_point` | `erasure_point` |
| `supplied/@reason` | `text_intervention`, `switch`, `damage` | `additionalPunctuation`, absent |
| `damage/@agent` | named, values unspecified | `water`, `stain` |
| `note/@type` (codex body) | `instruction` | none |
| `foreign/@xml:lang` | `lat`, `cze` | none |
| `add/@place` | named, values unspecified | `marginal left` |
| `ref/@type` (codex body) | `person`, `folk`, `place` | `Person` (variant) |
| `app/@type` | none | `comment_edition`, `comment_understanding`, `comment_translation`, `comment_translation_ses`, `comment_translation_vev`, `comment_manuscript`, `comment_variant`; further values in the [apparatus](#apparatus) table |
| `note/@xml:lang` in `app` | none | `de`, `en` |
| `milestone/@unit` | none | `paragraph_beginning`, `paragraph-continued_beginning` |
| `p/@ana` | none | `paragraph` |
| `div/@type` | none | `prologus`, `paratext`, `book`, `Transition2.1` |
| `zone/@type` and `@subtype` | none | `TextRegion` (`paragraph`, `header`), `Line`, `ImageRegion` (`img_miniature`, `img_marginalia`) |
| `list/@type` and `@subtype` (image file) | none | `image-annotations` (`miniatures`, `margins`), `page-annotations` |
| `listPerson/@type`, `listPlace/@type` (image file) | none | `artists`, `related` |
| `note/@type` and `@subtype` (image file) | none | `description` (`short`, absent), `text-relation` (`content`, `statistic`) |
| `ref/@type` (image file) | none | `folio`, `iconclass-label` |
| `objectType/@rend` | none | `miniature`, `initial_historisiert` |
| `dimensions/height/@unit` | none | `line` |
| Artist siglas | none | `BA`, `ES`, `FR`, `KU`, `MO`, `RU`, `SA`, `SI`, `ST` (header); `STW` used but undeclared |

## Open ratification points

| Point | State | Effect on encoding | Decides |
|---|---|---|---|
| Register encoding | Handbook and data use `ref[@type][@target]` on the words; teiCrafter used `spanGrp[@type='register-links']`. The project links inline on the words and proposes the written form `rs[@type][@ref]` to the edition team, with decision and reason in [specification](specification.md#key-decisions) | Determines the written form, the pointer syntax (`#ID` or `register.xml#ID`), the normalisation of IDs with spaces and the Schematron reference check | Edition team |
| List element for peoples | The handbook says only "Register"; teiCrafter uses `listOrg[@type='peoples']`; the image file puts peoples into `listPerson` | Shape of `registers.xml` and of the image form | Edition team |
| `Bilderfassung.sch` | Referenced by the image annotations according to the DHCraft specification, found neither in the material nor on the ONB server | The project Schematron is a new draft, not a reconstruction | Edition team, if the file can be recovered |
| Rules marked "Noch nicht umgesetzt" | `del[@type='erasure']`, `damage/@agent`, `add/@place` already occur in the data | Ratify as implemented and fix their value lists | Edition team |
| Text region element | Handbook `fw/@ana`, data `seg/@ana` except for the header; three spellings of border decoration | Schematron rule and inspector action for regions | Edition team |
| Verse numbering | The codex carries chapters and verses as `div/@xml:id` and `l/@xml:id` (`Genesis.1.1`); the handbook names a verse-start character with reference to Vulgate and Einheitsübersetzung; teiCrafter offers a separate `spanGrp[@type='bible-verses']` | Whether verse IDs are authoritative and which reference edition they follow; the Bible-verse form is out of the meeting prototype | Edition team |
| Normalisation policy | `w/@norm` exists throughout; the handbook documents no normalisation rules | Field semantics in the inspector, review criteria | Edition team |
| Values outside the handbook | See the "Data only" column above | Accept, rename or clean up | Edition team |
| Apparatus types and responsibility | Seven established types, further values to be treated as typo or ratified ([apparatus](#apparatus)); sigle in the note text | Inspector type list; whether `@resp` is added | Edition team |
| Language codes | `lat` and `cze` follow ISO 639-2; by our reading `xml:lang` in TEI expects BCP 47 tags, whose registry uses `la` and `cs` | Possibly a value change across the codex; to be checked against the TEI Guidelines before raising it | Edition team |
| File topology for further books | The codex covers the prologue, paratexts and the books Genesis to Josua in one file; PAGE import creates independent drafts | Whether further books join the codex file or become book files with a shared apparatus | Edition team |

## Sources

- *Die Wenzelsbibel. Digitale Edition und Analyse. Transkriptionshandbuch (Version: Februar 2025)*, https://edition.onb.ac.at/fedora/objects/o:wen.red-editionguidelines/datastreams/EDITION_GUIDELINES/content, accessed 2026-10-10. The PDF was read in full on 2026-10-10; this document relies on its text extraction, so the example images of the PDF were not re-examined for it.
- Public TEI of `o:wen.codex-2759` and `o:wen.bildannotationen--codex-2759` from edition.onb.ac.at, downloaded 2026-10-10. Element and attribute values were inventoried over the full files; examples are quoted from them.
- DHCraft vault document "TEI-Spezifikation Wenzelsbibel" (status draft, updated 2026-10-08), read in full.
- teiCrafter upstream knowledge documents `knowledge/wenzelsbibel.md` and `knowledge/data.md` in https://github.com/DigitalHumanitiesCraft/teiCrafter, read in full; the register and apparatus behaviour was cross-checked in `docs/js/projects/wenzelsbibel/wenzels-register-model.js` and `wenzels-text-model.js`.
- `editorial/data-findings.md`, the dated review run of the project Schematron over the public files of 2026-10-10, read in full.
- The TEI P5 Guidelines are named as the governing standard; no rule in this document is derived from a reading of them in this session.
