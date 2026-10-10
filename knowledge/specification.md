---
title: Specification
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Specification
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/specification
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-specification
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[Requirements Engineering]]", "[[User Stories]]", "[[Decision Records]]", "[[TEI XML]]", "[[Digital Editions]]"]
related: [project, editorial-guidelines, data, design, architecture, testing, integration, plan]
---

# Specification

wenzelsbibel-teiCrafter is the teiCrafter editor derived for the edition of the Wenzelsbibel (Codex 2759, Austrian National Library), reduced to one workspace in which the edition team at the Paris Lodron University Salzburg (PLUS) transcribes, comments, links registers, describes miniatures and validates against the project rules. This document states what the tool must do for that edition and why. Its first target is a prototype for the first meeting with the edition team, which shows five workflows on real data of fol. 1r. The editorial rules come from the project's own Transkriptionshandbuch (version February 2025), distilled in [Editorial guidelines](editorial-guidelines.md). The interface that carries these requirements is defined in [Design](design.md).

## Purpose and scope

The prototype lets the edition team judge whether a browser-based open-source tool can replace the expected ediarum adaptation for Oxygen XML. It therefore has to work on the real codex and image-annotation files, follow the handbook encodings, and keep the source fidelity of the base. PLUS decides on the scholarly data model, project-specific schema rules, rights and acceptance, so every editorial convention below that the handbook does not settle is marked open.

The meeting prototype covers the five workflows in [Epics and user stories](#epics-and-user-stories). The following are outside the prototype and get no interface surface in it:

- ODD customisation and generation
- project ZIP package (export and restore of the linked collection as one archive)
- Bible verse form and verse alignment
- a findings surface beyond the status line and the findings list it opens
- a keyboard shortcut scheme beyond browser and editor defaults, Escape and Ctrl+E
- PAGE XML import
- witness management
- entry workspace

Edition data (`codex-2759.xml`, `Bildannotationen.xml`, the register file, Transkribus exports) stay local and outside the repository. Technical access to the ONB IIIF image service implies no permission to store, redistribute or publish images or edition data. Data handling is defined in [Data](data.md), the external services in [Architecture](architecture.md), and the exchange with the base, the edition team and Oxygen in [Integration](integration.md).

## Inherited invariants

The fork derives from the legacy application under `docs/` of teiCrafter, whose normative contract is the upstream specification at commit `a5f74d2` ([upstream specification](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/a5f74d2889f98ebcba51bfbdd9fd8b58d9ba3bf5/knowledge/specification.md), [upstream Wenzelsbibel contract](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/a5f74d2889f98ebcba51bfbdd9fd8b58d9ba3bf5/knowledge/wenzelsbibel.md)). The current upstream `specification.md` of 2026-10-04 describes the source-first core under `src/` and leaves the Save gate open. The fork follows the legacy contract, because the decision of 2026-10-10 makes `docs/` the derivable base. Every requirement below holds under these invariants, and a fork change that would break one of them is a defect.

| ID | Invariant | Upstream reference |
| --- | --- | --- |
| I1 | The complete raw XML string is the canonical document state, and every view derives from it. | D.1 |
| I2 | An edit is a splice at exact string offsets and changes only the source ranges it addresses. | D.2, D.6 |
| I3 | Opening a supported UTF-8 file and saving it without an edit returns the identical bytes, including an optional BOM and the original line endings. | D.2, D.5 |
| I4 | Save and download write TEI only after every schema of the configured schema set has passed for the exact output bytes of the current revision. | V.1 to V.5, B.4 |
| I5 | Local recovery and the portable working copy preserve unfinished work regardless of any schema result and claim no validated output. | D.9 |
| I6 | The project manifest declares data and policy (workspace, resolver, markup values, registers, schema set) and never executable code. | P.6, L.7 |
| I7 | No structural rewrite happens silently. Input is literal, a field without a lossless inverse routes to the XML view, and an impossible operation is refused with its reason. | D.7, D.8, W.2, S.5 |

LLM assistance is switched off for this project, so the model-provenance requirements of the base hold vacuously.

## Epics and user stories

Two roles use the tool, the project lead (Germanistik, PLUS) and the student assistant. Both roles are assumptions until the first meeting confirms them. Each story names its role, the acceptance criteria a browser test can check on fol. 1r, and the encoding it reads or writes. Every story is a hypothesis whose validation is the meeting demo and the edition team's assessment there.

### Epic 1: Transcribe a page against the facsimile

#### US1.1 Open a page with its facsimile

As a student assistant, I want to open a folio of the codex and see the ONB facsimile beside the text, so that I can check the transcription against the manuscript.

1. Choosing Codex, folio 1r and column a in the document bar shows the lines of column a, one manuscript line per row, starting with the header line PROLOGUS.
2. Switching Faksimile on shows the IIIF image `00000010` of 1r and, with zones on, the outlines of the line zones of the page.
3. Choosing column b shows the second column without reloading the document.

The story reads `pb/@n` and `pb/@facs` for the folio and its `surface`, the sequence of `cb` within a page for the column (`cb` carries no `@n` in the source), `lb/@facs` for the line zones, `fw[@ana='header']` for header lines, and `surface/zone` with `@type` and `@points` for the overlay.

#### US1.2 Select a line and edit its words

As a student assistant, I want to click a line in the text or in the facsimile and edit the words of that line diplomatically and normalised, so that I correct Transkribus output where the manuscript shows it.

1. Clicking the first text line of column a selects it, outlines its line zone in the facsimile and opens the inspector with the words `Hie`, `hebt`, `ſich`, `an`, `die`, `voꝛ`, `rede`, `vnd` and their normalised readings.
2. Clicking a line zone in the facsimile selects the same line in the text.
3. Changing the normalised reading of `ſich` changes only `@norm` of that `w`, the status line shows the unsaved marker, and Undo restores the original bytes.
4. Changing the diplomatic reading of a simple word changes its text content and `@orig` together and leaves its `@xml:id` and every other attribute unchanged.
5. For `merteín`, whose text contains `hi[@rend='rubrication']` and an `lb`, the diplomatic field offers the route to the XML view, and the normalised field remains editable.
6. For `<w>Got</w>`, which has no `@orig` and `@norm`, entering a normalised reading adds `@norm` and changes nothing else.

The story reads and writes `w` text, `w/@orig` and `w/@norm`. Line membership follows the position of `lb` in document order, because word IDs such as `region_1639399488602_10l3_0` on the first word of line 1 do not encode the line.

### Epic 2: Comment on the text

#### US2.1 Create an apparatus comment

As the project lead, I want to select a word or word sequence and attach a bilingual comment with my sigle, so that the commentary stays bound to the exact passage.

1. Selecting a word sequence and choosing Bearbeiten, Apparatkommentar zur Auswahl (or "+ Kommentar zur Auswahl" in the inspector) opens the comment form with type, German note, English note and sigle.
2. Applying inserts one empty start anchor before and one end anchor after the selection, with IDs that are unique in the document, and appends one `app` to the top-level `standOff/listApp` in the same undo step.
3. The new comment appears in the inspector of every word inside the range.
4. A selection whose boundaries cannot take an anchor without altering structure is refused with the reason.

The story writes `anchor[@xml:id]` inline and `app[@from='#start_N'][@to='#end_N'][@type]` with `note[@xml:lang='de']` and `note[@xml:lang='en']`, following the existing data. Types offered are the encoded `comment_edition` and the base's `comment_understanding`. The sigle is written as the trailing `(MK)` form the existing notes carry.

#### US2.2 Read existing comments on a passage

As a student assistant, I want to see which comments cover the word I am editing, so that I do not contradict an existing editorial decision.

1. Selecting the second `got` in the line "O Got got" shows the `comment_edition` comment whose German note begins "Die doppelte Apostrophe".
2. The comment's text is editable in the inspector, and its anchors stay in place.

The story reads `standOff/listApp/app` and resolves `@from` and `@to` against `anchor/@xml:id` in the text.

### Epic 3: Link names to the registers

#### US3.1 Link a word to an existing register entry

As a student assistant, I want to link a word or a word sequence to a person, place or people entry through autocomplete, so that names are encoded as the handbook prescribes.

1. Selecting `Rotlebín`, `herren` or `merteín` shows the existing link to the person entry `Martin` as a chip over all three words and in the inspector's register field.
2. Typing in the register field lists hits from all three registers, each with its type and ID, and an optional type filter narrows the list.
3. Enter on a hit wraps the selected words in one `ref` with `@target` and `@type` in one undo step.
4. A selection that cannot be wrapped without splitting an existing element is refused with the reason, and the source stays unchanged.

The story writes `<ref target="[ID]" type="person|folk|place">` around the word or words (handbook sections 1.4.19 to 1.4.21). The real data carries `<ref target="Martin" type="person">` with a bare ID, whereas the recommended form uses `#ID`. The target form is an open question.

#### US3.2 Create a register entry from the text

As a student assistant, I want to create a missing register entry directly from the word I am annotating, so that I do not leave the text to maintain the register.

1. When no hit matches, "+ neu anlegen" opens a minimal form with type, ID and preferred name, prefilled from the selected text.
2. Applying adds the entry to the register file and links the selection to it, and an ID that already exists is refused.
3. Register, Verweise auf Eintrag anzeigen lists every `ref` pointing to the entry and jumps to each.

The story writes `listPerson/person[@xml:id]/persName` and `listPlace/place[@xml:id]/placeName` in the separate register file. The list element for peoples is open.

### Epic 4: Describe miniatures

#### US4.1 Edit an image annotation

As the project lead, I want to open a miniature from the facsimile or the document chooser and edit its description, so that image and text are described in one place.

1. Clicking the `img_miniature` zone `Image_1676476154286_76` on 1r opens `miniatures_01` with the title "Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron" in the inspector.
2. The form shows title, short and long description, object type `Historisierte Initiale (O)`, height `14` in lines, artist `BA` (Balaam-Meister) chosen from the header siglas, related persons `Gott` and `Engel` and the ICONCLASS entries.
3. Editing a field and applying changes only that field's element, and existing `@resp` and `@anchored` stay.

The story reads and writes `list[@type='image-annotations']/item` in `Bildannotationen.xml` with `@corresp` to the codex zone, `title`, `note[@type='description'][@subtype='short']`, `note[@type='description']`, `objectType/@rend`, `dimensions/height[@unit='line']`, `ref[@type='folio']`, `listPerson[@type='artists']/person/@corresp`, `listPerson[@type='related']/person/@corresp` and `listPlace[@type='related']/place/@corresp`.

#### US4.2 Look up ICONCLASS

As the project lead, I want to search ICONCLASS by term or notation and take over the German and English labels, so that the iconographic classification uses the authority's wording.

1. Searching for the notation `11C21(+0)` returns the entry with the German label "Gottvater als junger oder erwachsener Mann" and the English label "God the Father as young or adult man".
2. Choosing a hit fills the new entry's fields, which stay editable before Apply.
3. When the service fails, the fields remain available for manual entry and the failure reason is shown at the lookup.

The story writes `listRef/ref[@type='iconclass-label'][@corresp]` with `@resp` and `desc[@xml:lang='de']` and `desc[@xml:lang='en']`.

#### US4.3 See the text relation in the codex

As a student assistant, I want to see which words of the codex a miniature relates to, so that I can check the recorded range.

1. The miniature form shows the content relation note and the recorded range "gesamter Prolog bis fol. 2r".
2. Choosing the range opens the codex at its first word `region_1639399488602_10l3_0` and marks the range.
3. Selecting a word inside the range shows the miniature among the images referring to that word.

The story reads `note[@type='text-relation'][@subtype='content']` and `note[@type='text-relation'][@subtype='statistic']/@corresp` in the form `#range(first-word-id, last-word-id)`.

### Epic 5: Validate and save

#### US5.1 Validate with readable findings

As the project lead, I want to run well-formedness, TEI All and the project Schematron and read the findings in plain words, so that I know whether a file meets the project rules before it leaves the tool.

1. Well-formedness is shown at the status line after each pause in editing, and deleting an end tag in the XML view shows the error with its line.
2. Prüfen, TEI All runs in the background, the interface stays usable, and the status line shows valid, invalid, outdated or unavailable.
3. Prüfen, Schematron editing and Schematron review each report their phase result separately.
4. Clicking the status line opens the findings list, and choosing a finding selects its location in the text or XML view.
5. An edit after a run marks the result outdated.

The story reads the schema set of the manifest, TEI All RelaxNG from the vendored TEI P5 release and the project Schematron with the phases `editing` and `review`.

#### US5.2 Save as file

As a student assistant, I want to save my work as an XML file, so that the edition file on disk reflects my corrections.

1. Datei, Speichern runs the configured schema set when no current result exists and writes the file only when every schema passes.
2. In Chromium with a writable handle the file is written in place, and in Firefox the same bytes are offered as a download.
3. When a schema fails, nothing is written, the status line names the failed schema, and the unsaved marker stays.
4. Saving an unchanged file returns the original bytes.

## Functional requirements

Labels in quotation marks are the German interface strings. Visual form and layout follow [Design](design.md).

### Menu bar

- F1 The menu bar carries the menus Datei, Bearbeiten, Ansicht, Register, Prüfen and Hilfe with the entries listed in [Design](design.md#menu-bar), and every entry performs the function its label names.
- F2 Datei, Öffnen opens one XML file through the file picker in Chromium and Firefox.
- F3 Datei, Projekt öffnen opens a project folder where the browser offers directory access and otherwise accepts several files through file input. It assigns codex, image annotations and register file by the project manifest or the built-in detection (TEI types `wenzelsbibel-transcription` and `wenzelsbibel-registers`, PID pattern `o:wen.`).
- F4 Datei, Zuletzt geöffnet lists recently opened native handles and is rendered only where the File System Access capability exists.
- F5 Bearbeiten, Rückgängig and Wiederholen step through the active document's history, each step restoring the exact earlier source string.
- F6 Bearbeiten, Suchen opens a search field above the text that searches word text in the text view and the source in the XML view.
- F7 Ansicht switches between Text and XML, toggles Faksimile, Zonen and Inspector, and switches between Zeilenweise and Fließtext.
- F8 Register offers Personen, Orte and Völker öffnen, Eintrag anlegen and Verweise auf Eintrag anzeigen.
- F9 Prüfen offers Wohlgeformtheit, TEI All, Schematron editing, Schematron review and Befundliste.
- F10 Hilfe offers Transkriptionsrichtlinie, which opens the published Transkriptionshandbuch, and Über, which names the tool, its version, its teiCrafter base and its licence.

### Document bar

- F11 The document chooser offers Codex and Bildannotationen. Switching checkpoints the current document first and keeps it active when the checkpoint fails.
- F12 For the codex the bar offers folio and column a or b, for the image annotations the miniature. The choice is reflected in the page address so that reload and browser history restore it.
- F13 The bar's right side carries only the switch Text or XML and the switch Faksimile on or off.

### Text view

- F14 The text view renders the chosen column line by line as in the manuscript, each row starting at an `lb`, with a column marker and the line position. Header lines (`fw[@ana='header']`) are marked as such.
- F15 Fließtext renders the same column as running text with visible line-break marks, and the selection persists across the switch.
- F16 A click selects a word, a drag or Shift+click extends the selection to a word sequence, and a click on the line position selects the line.
- F17 Register links appear as chips coloured by type with type and ID as text, apparatus ranges as marks, and `hi/@rend` renditions in a form that does not rely on colour alone.
- F18 The text view never changes the source. Only inspector actions and XML edits do.

### XML view

- F19 The XML view shows the complete document source, scrolled to and selecting the element that corresponds to the text selection, and a cursor position maps back to the text selection on the switch.
- F20 The inspector shows the element under the cursor and, for `w`, `ref`, `app` and image-annotation `item`, the same form as in the text view.
- F21 Ctrl+E on a selection opens a short list of the elements the manifest allows at that position, and choosing one wraps the selection when the wrap keeps the document well-formed.

### Facsimile pane

- F22 The pane shows the IIIF image of the current page, resolved through the ONB template `https://iiif.onb.ac.at/images/REPO/8977428/{stem}.jp2/info.json`, with zoom and pan.
- F23 With Zonen on, the pane overlays the page's zones and distinguishes line zones, text regions, miniature regions and marginal image regions.
- F24 Clicking a line zone selects that line in the text, and selecting a line or word outlines its line zone.
- F25 Clicking a miniature zone opens the image-annotation record whose `@corresp` points to it. Editing activates Bildannotationen through the document switch of F11.
- F26 When the image cannot be loaded, the pane states the reason, and text and inspector remain fully usable.

### Inspector

- F27 The inspector opens at the bottom when a word, word sequence, line, miniature zone or (in the XML view) an element is selected, is the same component in both views, has a draggable height and closes with Escape.
- F28 For a word it shows the diplomatic and normalised fields, the markup actions, the register field and the comments covering the word.
- F29 A diplomatic edit of a simple word changes the text and `@orig` together. For a word with inline markup the diplomatic field offers the route to the XML view and the normalised field stays editable.
- F30 For a word sequence it shows the markup actions, the register field and the comments covering the sequence.
- F31 For a line it lists the line's words with their diplomatic and normalised fields.
- F32 The markup actions Hervorhebung, Ergänzung, Tilgung, Fremdsprache and Zahl take their values from the manifest, which carries the handbook vocabularies (`hi/@rend`, `supplied/@reason`, `del/@type` and `surplus/@reason`, `foreign/@xml:lang`, `num/@type`).
- F33 A markup action that would split an existing element is refused with the reason and leaves the source unchanged.
- F34 For a miniature zone it shows the image-annotation form of [US4.1](#us41-edit-an-image-annotation) with the ICONCLASS lookup and the text relation.
- F35 For any other element in the XML view it shows the element name and its attributes, editing being done in the XML source.
- F36 Unfinished input survives switching between text and XML view and is applied or cancelled explicitly before the selection moves to another document.

### Register autocomplete and entry creation

- F37 The register field searches persons, places and peoples together, shows type and ID with each hit, and accepts an optional type filter.
- F38 Enter on a hit wraps the selection in `ref[@target][@type]`, and a sequence of sibling words is wrapped as one `ref`.
- F39 "+ neu anlegen" creates an entry with type, ID and preferred name in the register file, refuses an existing ID and links the selection in the same step.
- F40 Verweise auf Eintrag anzeigen lists all references to an entry across the loaded documents with a jump to each.

### Apparatus

- F41 "+ Kommentar zur Auswahl" creates the anchors and the `app` with type, German and English note and sigle in one undo step.
- F42 Existing comments covering the selection are listed with type and both notes, and their note text is editable.
- F43 Existing types, languages and anchors keep their encoded values when a comment is edited.

### Validation and status line

- F44 The status line shows well-formedness, the TEI All result, the Schematron phase result and the unsaved marker as text, each in its own segment.
- F45 Well-formedness is checked after each pause in editing.
- F46 TEI All and Schematron run on request outside the main thread, can be cancelled, and report valid, invalid, outdated or unavailable.
- F47 Clicking the status line opens the findings list in the bottom area, with each finding naming document, location, rule and message and selecting its location on choice.
- F48 Each finding names its location in folio, column and line where the location lies in the text, and Schematron findings use the message text of the project Schematron.

### Save

- F49 Datei, Speichern runs the schema set when no current result exists and writes only after every schema has passed for the exact bytes.
- F50 With a writable native handle Save writes in place after checking the file on disk for external changes, and otherwise it offers a download of the same bytes.
- F51 A failed schema writes nothing, names the failed schema at the status line and keeps the unsaved marker. How the work is preserved in that case is an open question.
- F52 The unsaved marker stays until a save of the current revision succeeds.

## Non-functional requirements

- N1 The tool runs in current Chromium and Firefox without a backend. ICONCLASS and the ONB image service are the only network services it calls.
- N2 Interface labels are German, while code, identifiers and documentation are English.
- N3 Accessibility minima are acceptance criteria and are defined in [Design](design.md#accessibility-minima).
- N4 Edition data and images stay on the user's machine and in the browser, and nothing is uploaded or committed.
- N5 Opening and editing the full codex stays responsive, and schema validation never blocks typing.

## Key decisions

| Decision | Date | Choice | Reason |
| --- | --- | --- | --- |
| Base of the fork | 2026-10-10 | The fork derives from the legacy application under `docs/`, and the source-first core under `src/` stays a parallel line upstream. | The legacy app already implements the Wenzelsbibel forms, the facsimile, the schema set and the save gate, while the new core has no application shell yet. |
| Fork mechanism | 2026-10-10 | A Git fork with the upstream remote, merging base changes, with no npm package for now. | Generic mechanisms are refactored in the base and reach the fork by merge without a packaging step. |
| Rule source | 2026-10-10 | The project's Transkriptionshandbuch is the rule source, and the DHCraft TEI specification is a derived draft. | The handbook is the edition team's published and practised rule set, and the real data follows it. |
| Register encoding | 2026-10-10 | Register links are inline on the words, as the handbook rules, and the base's stand-off `spanGrp[@type='register-links']` is not used for this project. The tool reads the handbook form `ref[@type][@target]` with bare IDs and the `#ID` form of the image annotations. The written form is proposed to the edition team as `rs[@type='person' or 'place' or 'folk'][@ref]`, because `@ref` of att.canonical is the TEI attribute for pointing a name at its canonical entry, while `ref` is a hyperlink element whose `@target` serves another purpose. Until the team decides, the prototype writes the proposed form and reads both; the pointer form (`#ID` or `register.xml#ID`) is decided with the team. | The codex already carries thousands of handbook-form references. The proposal changes only the element and attribute name, keeps every value, and can be applied to the existing data in one deterministic run. |
| Shortcut scheme | 2026-10-10 | No shortcut scheme beyond browser and editor defaults (Ctrl+Z, Ctrl+Y, Ctrl+F, Ctrl+S), Escape and Ctrl+E. | A scheme the team has to learn is a cost before the workflows are accepted. |
| Interface language | 2026-10-10 | German interface labels. | The edition team and the handbook work in German. |
| Inspector position | 2026-10-10 | A bottom inspector instead of a third column. | Text and facsimile need the width, and the inspector serves both views as one component. |
| Check feedback | 2026-10-10 | Results at the status line with a findings list and no check line per field. | Per-field lines add standing noise, while the status line keeps one place for the state. |

## Open questions

Questions for the operator:

2. Save rule on schema failure: offer a working-copy action in the Datei menu next to the finding when a schema fails (recommendation), or allow a confirmed unvalidated save.
3. Default text rendering: Zeilenweise as default (recommendation, because the team works from Transkribus line by line) or Fließtext.
4. Inspector height: a fixed default share of the window with drag (recommendation) or remembered per user.

Questions for the edition team:

1. Which list element carries peoples in the register file (`listOrg/org` as in the base, `listPerson` as in the image annotations, or another form), since the handbook says only "Register".
2. Whether codex `ref` targets and image-annotation `person/@corresp` resolve against one shared register file.
3. Which roles use the tool and with which permissions (project lead, student assistants, others).
4. Whether the comment sigle stays as trailing text such as `(MK)` or moves to `@resp`.
5. Whether linking needs unlinking and relinking in the prototype, since the agreed scope names linking and entry creation only.

## Acceptance scenarios

Each scenario is one narrative for the meeting demo on fol. 1r, run with the local edition files.

| Workflow | Narrative and observable outcome |
| --- | --- |
| 1 Transcribe | The user opens the project folder, chooses Codex, 1r, column a, and switches the facsimile on. The first text line "Hie hebt ſich an die voꝛ rede vnd" is clicked, its line zone lights up in the image, and the inspector lists the words. The normalised reading of `ſich` is corrected and undone, then clicking the line zone of the next line selects "der pꝛologus vber das buch" in the text. |
| 2 Comment | The user selects the second `got` in "O Got got", sees the existing comment beginning "Die doppelte Apostrophe ... (MK)" with its English counterpart, then selects another word, creates a comment with type `comment_edition`, a German and an English note and the sigle, and finds the new `app` and both anchors in the XML view with the selection still on the word. |
| 3 Register | The user selects `Rotlebín` and sees the chip for person `Martin` spanning "Rotlebín herren merteín" across the line break. On another name the user types in the register field, chooses a hit by type and ID, and the word is wrapped in `ref`. For a missing name "+ neu anlegen" creates the entry and links it, and Verweise auf Eintrag anzeigen lists the new reference. |
| 4 Miniature | The user clicks the miniature zone over the initial O, the inspector shows `miniatures_01` "Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron" with artist BA and the ICONCLASS entry `11C21(+0)`. A lookup for a further notation fills German and English labels, and choosing the text relation opens the codex at "Hie" with the prologue range marked. |
| 5 Validate and save | The user runs TEI All and Schematron editing, reads the status line, opens the findings list and jumps to a finding. Saving an unchanged file writes identical bytes. After an edit that breaks a schema rule, Save writes nothing and the status line names the failed schema. |

## Related

[Project](project.md) states purpose, partners and responsibilities. [Editorial guidelines](editorial-guidelines.md) distil the handbook vocabularies that the markup actions and Schematron use. [Data](data.md) defines the files, their encodings and their local handling. [Design](design.md) defines the interface that carries these requirements, [Architecture](architecture.md) the fork's modules and the base refactor, [Testing](testing.md) the browser tests for the acceptance criteria, [Integration](integration.md) the exchange with ONB, ICONCLASS and Oxygen, and [Plan](plan.md) the order of work toward the meeting.
