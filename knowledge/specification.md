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

wenzelsbibel-teiCrafter is the teiCrafter editor derived for the edition of the Wenzelsbibel (Codex 2759, Austrian National Library), reduced to one workspace in which the edition team at the Paris Lodron University Salzburg (PLUS) transcribes, comments, links registers, describes miniatures and validates against the project rules. This document states what the tool must do for that edition and why. Its core is five workflows, specified and tested on real data of fol. 1r. The editorial rules come from the project's own Transkriptionshandbuch (version February 2025), distilled in [Editorial guidelines](editorial-guidelines.md). The interface that carries these requirements is defined in [Design](design.md).

## Purpose and scope

The tool is meant to let the edition team edit the Wenzelsbibel in a browser-based open-source tool instead of the expected ediarum adaptation for Oxygen XML. It therefore has to work on the real codex and image-annotation files, follow the handbook encodings, and keep the source fidelity of the base. It is finished enough when the edition team actually edits with it. PLUS decides on the scholarly data model, project-specific schema rules, rights and acceptance, so every editorial convention below that the handbook does not settle is marked open.

The scope is the five workflows in [Epics and user stories](#epics-and-user-stories), the product core that grows from here, together with the start page and the help page that lead into them. The following are outside the scope and get no interface surface:

- ODD customisation and generation
- project ZIP package (export and restore of the linked collection as one archive)
- Bible verse form and verse alignment
- a findings surface beyond the notice bar and the findings list it opens
- a keyboard shortcut scheme beyond browser and editor defaults, Escape and Ctrl+E
- PAGE XML import
- witness management
- entry workspace
- language model features
- Git operations inside the tool

Edition data (`codex-2759.xml`, `Bildannotationen.xml`, the register file, Transkribus exports) stay outside this repository, apart from the tracked and licensed fol. 1r excerpt that serves as example and demo material ([Data](data.md#storage-and-rights)). Technical access to the ONB IIIF image service implies no permission to store, redistribute or publish images or edition data. Data handling is defined in [Data](data.md), the external services in [Architecture](architecture.md), and the exchange with the base, the edition team and Oxygen, including the proposed [working model](integration.md#working-model), in [Integration](integration.md).

## Inherited invariants

The fork derives from the legacy application under `docs/` of teiCrafter, whose normative contract is the upstream specification at commit `a5f74d2` ([upstream specification](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/a5f74d2889f98ebcba51bfbdd9fd8b58d9ba3bf5/knowledge/specification.md), [upstream Wenzelsbibel contract](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/a5f74d2889f98ebcba51bfbdd9fd8b58d9ba3bf5/knowledge/wenzelsbibel.md)). Later upstream specifications describe the source-first core under `src/`. The flow and XML views of the new shell may consume `src/core` and `src/editor` through the vendored bundle, subject to the base's decision ([Integration](integration.md#base-teicrafter)). Every requirement below holds under these invariants, and a fork change that would break one of them is a defect.

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

Two roles use the tool, the project lead (Germanistik, PLUS) and the student assistant. Both roles are assumptions until the edition team confirms them. Each story names its role, the acceptance criteria a browser test can check on fol. 1r, and the encoding it reads or writes. Every story is a hypothesis whose validation is the edition team's assessment of the running workflow.

### Epic 1: Transcribe a page against the facsimile

#### US1.1 Open a page with its facsimile

As a student assistant, I want to open a folio of the codex and see the ONB facsimile beside the text, so that I can check the transcription against the manuscript.

1. Choosing Codex, folio 1r and column a in the toolbar shows column a as one continuous flow, starting with the header line PROLOGUS, in which every manuscript line begins with its line number in the margin.
2. Switching Faksimile on shows the IIIF image `00000010` of 1r and, with zones on, the outlines of the line zones of the page.
3. Choosing column b shows the second column without reloading the document.

The story reads `pb/@n` and `pb/@facs` for the folio and its `surface`, the sequence of `cb` within a page for the column (`cb` carries no `@n` in the source), `lb/@facs` for the line zones, `fw[@ana='header']` for header lines, and `surface/zone` with `@type` and `@points` for the overlay.

#### US1.2 Select a line and edit its words

As a student assistant, I want to click a line in the text or in the facsimile and edit the words of that line diplomatically and normalised, so that I correct Transkribus output where the manuscript shows it.

1. Clicking the line number of the first text line of column a selects the line, outlines its line zone in the facsimile and opens the popover with the words `Hie`, `hebt`, `ſich`, `an`, `die`, `voꝛ`, `rede`, `vnd` and their normalised readings.
2. Clicking a line zone in the facsimile selects the same line in the text.
3. Changing the normalised reading of `ſich` changes only `@norm` of that `w`, the toolbar shows the unsaved marker, and Undo restores the original bytes.
4. Changing the diplomatic reading of a simple word changes its text content and `@orig` together and leaves its `@xml:id` and every other attribute unchanged.
5. For `merteín`, whose text contains `hi[@rend='rubrication']` and an `lb`, the diplomatic field offers the route to the XML view, and the normalised field remains editable.
6. For `<w>Got</w>`, which has no `@orig` and `@norm`, entering a normalised reading adds `@norm` and changes nothing else.

The story reads and writes `w` text, `w/@orig` and `w/@norm`. Line membership follows the position of `lb` in document order, and a word that contains an `lb` belongs to the line on which it begins ([Data](data.md#codex-text-and-standoff-apparatus)), because word IDs such as `region_1639399488602_10l3_0` on the first word of line 1 do not encode the line.

### Epic 2: Comment on the text

#### US2.1 Create an apparatus comment

As the project lead, I want to select a word or word sequence and attach a bilingual comment with my sigle, so that the commentary stays bound to the exact passage.

1. Selecting a word or a word sequence and choosing Apparatkommentar in the toolbar (or "+ Kommentar" in the popover) opens the comment form with type, German note, English note and sigle.
2. Applying inserts one empty start anchor before and one end anchor after the selection, with IDs that are unique in the document, and appends one `app` to the top-level `standOff/listApp` in the same undo step.
3. The new comment appears in the popover of every word inside the range.
4. A selection whose boundaries cannot take an anchor without altering structure is refused with the reason.

The story writes `anchor[@xml:id]` inline and `app[@from='#start_N'][@to='#end_N'][@type]` with `note[@xml:lang='de']` and `note[@xml:lang='en']`, following the existing data. Types offered are the encoded `comment_edition` and the base's `comment_understanding`. The sigle is written as the trailing `(MK)` form the existing notes carry. Existing comments whose anchors stand inside a `w`, including those on part of a word, are read, shown and kept unchanged ([Editorial guidelines](editorial-guidelines.md#apparatus)).

#### US2.2 Read existing comments on a passage

As a student assistant, I want to see which comments cover the word I am editing, so that I do not contradict an existing editorial decision.

1. Selecting the second `got` in the line "O Got got" shows the `comment_edition` comment whose German note begins "Die doppelte Apostrophe".
2. The comment's text is editable in the popover, and its anchors stay in place.

The story reads `standOff/listApp/app` and resolves `@from` and `@to` against `anchor/@xml:id` in the text.

### Epic 3: Link names to the registers

#### US3.1 Link a word to an existing register entry

As a student assistant, I want to link a word or a word sequence to a person, place or people entry through autocomplete, so that names are encoded as the handbook prescribes.

1. Selecting `Rotlebín`, `herren` or `merteín` shows the existing link to the person entry `Martin` as a chip over all three words and in the popover's register field.
2. Typing in the register field lists hits from all three registers, each with its type and ID, and an optional type filter narrows the list.
3. Enter on a hit wraps the selected words in one `rs` with `@type` and `@ref` in one undo step.
4. A selection that cannot be wrapped without splitting an existing element is refused with the reason, and the source stays unchanged.
5. Verknüpfung lösen on `herren` removes the link over all three words in one undo step, and Undo restores it.

The story reads the handbook form `ref[@type][@target]` (handbook sections 1.4.19 to 1.4.21), which the real data carries as `<ref target="Martin" type="person">` with a bare ID, and writes the proposed form `rs[@type='person' or 'place' or 'folk'][@ref]` with the same values around the word or words ([Key decisions](#key-decisions)). The pointer syntax (`#ID` or `register.xml#ID`) is decided with the edition team.

#### US3.2 Create a register entry from the text

As a student assistant, I want to create a missing register entry directly from the word I am annotating, so that I do not leave the text to maintain the register.

1. When no hit matches, "+ neu anlegen" opens a minimal form with type, ID and preferred name, prefilled from the selected text.
2. Applying adds the entry to the register file and links the selection to it, and an ID that already exists is refused.
3. Register, Verweise auf Eintrag lists every register link pointing to the entry, in either form (`rs/@ref` or `ref/@target`), and jumps to each.

The story writes `listPerson/person[@xml:id]/persName` and `listPlace/place[@xml:id]/placeName` in the separate register file. The list element for peoples is an [open ratification point](editorial-guidelines.md#open-ratification-points).

### Epic 4: Describe miniatures

#### US4.1 Edit an image annotation

As the project lead, I want to open a miniature from the facsimile or the document chooser and edit its description, so that image and text are described in one place.

1. Clicking the `img_miniature` zone `Image_1676476154286_76` on 1r opens `miniatures_01` in the side panel under Bild, with the title "Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron".
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

1. Well-formedness is checked after each pause in editing. Deleting an end tag in the XML view shows the notice bar with the reason and a jump to the place, and the bar disappears once the document is well-formed again.
2. Prüfen, TEI All runs in the background, and the interface stays usable.
3. Prüfen, "Editionsregeln" and Prüfen, "Editionsregeln, Bericht" each report the result of their phase separately. A run with findings shows the notice bar with the check, the number of findings, the first message and the action "Befunde anzeigen".
4. "Befunde anzeigen" opens the findings list in the side panel, and choosing a finding selects its location in the text or XML view.
5. An edit after a run makes its result outdated, and the findings list says so.

The story reads the schema set of the manifest, TEI All RelaxNG from the vendored TEI P5 release and the project Schematron `docs/schemas/wenzelsbibel.sch`, named "Editionsregeln", with the phases `editing` and `review` ([editorial layer](../editorial/README.md#phases)).

#### US5.2 Save as file

As a student assistant, I want to save my work as an XML file, so that the edition file on disk reflects my corrections.

1. Speichern runs the configured schema set when no current result exists and writes the file only when every schema passes.
2. In Chromium with a writable handle the file is written in place, and in Firefox the same bytes are offered as a download.
3. When a schema fails, nothing is written, the notice bar names the failed schema with its findings, and the unsaved marker stays.
4. Saving an unchanged file returns the original bytes.

## Functional requirements

Labels in quotation marks are the German interface strings. Visual form and layout follow [Design](design.md), which is the source of the labels.

### Arbeitsleiste

- F1 A two-row toolbar is the single entry point for commands, with the controls listed in [Design](design.md#arbeitsleiste); every control performs the function its label names, an action the selection does not allow is disabled with its reason as tooltip, and the toolbar is keyboard-operable in the WAI-ARIA toolbar pattern.
- F2 Öffnen in the Datei control (Datei öffnen on the start page) opens one XML file through the file picker in Chromium and Firefox.
- F3 Projekt öffnen opens a project folder where the browser offers directory access and otherwise accepts several files through file input. It assigns codex, image annotations and register file by the project manifest or the built-in detection (TEI types `wenzelsbibel-transcription` and `wenzelsbibel-registers`, PID pattern `o:wen.`).
- F4 Zuletzt geöffnet lists recently opened native handles and is rendered only where the File System Access capability exists.
- F5 Rückgängig and Wiederholen step through the active document's history, each step restoring the exact earlier source string. For edits and wraps in the flow this is proven in `prototypes/d-flow`.
- F6 Suchen (Ctrl+F) opens a search field above the text that searches word text in the text view and the source in the XML view.
- F7 The toolbar switches between Text and XML and toggles Faksimile and Zonen. The text view of the codex has one rendering, the flow of F14, and the text view of Bildannotationen shows the chosen item ([Design](design.md#text-view-of-bildannotationen)).
- F8 Register offers Verknüpfen and Neu anlegen on the selection, and Verweise auf Eintrag opens the references in the side panel.
- F9 Prüfen offers "Wohlgeformtheit", "TEI All", "Editionsregeln" (the `editing` phase of the project Schematron, the save gate), "Editionsregeln, Bericht" (its `review` phase) and "Befundliste". The two Editionsregeln labels are working labels until the operator confirms them.
- F10 Hilfe in the toolbar's first row opens the help page (F61) in a new tab.
- F11 The document chooser lists the documents the opened project assigns (F3), for the current files Codex 2759 and Bildannotationen, names the document once and carries the file name as tooltip. Switching checkpoints the current document first and keeps it active when the checkpoint fails.
- F12 For the codex the toolbar offers folio and column a or b, for the image annotations the miniature. The choice is reflected in the page address so that reload and browser history restore it. The column switch is hidden in the XML view, which shows the whole document.
- F13 The unsaved dot stands directly after the document chooser and stays until a save of the current revision succeeds.

### Text view

- F14 The text view renders the chosen column as one continuous editable flow with a real caret. Manuscript line breaks (`lb`) are soft breaks, each line carries a faint line number in the margin, and header lines (`fw[@ana='header']`) carry the marker "Kopfzeile". In the product the flow is a CodeMirror 6 view with replace decorations over the raw XML, so the caret moves through the canonical source while the markup stays hidden.
- F15 Markup appears as inline marks on the words. Register chips, punctuation, milestones and line numbers are non-editable islands that the caret passes over.
- F16 A click places the caret in a word and selects it. A selection by mouse or by Shift+Arrow snaps to whole words, so each keyboard step adds or drops one word, and a click on a line number selects the line. The popover follows the caret and the selection. Selection snapping is proven in `prototypes/d-flow`.
- F17 Register links appear as chips coloured by type with type and ID as text, apparatus ranges as marks, and `hi/@rend` renditions in a form that does not rely on colour alone.
- F18 Typing in the flow writes to the source, limited to the text run of one word, with `@orig` kept in step where it equalled the word text (operator decision of 2026-10-10). Word commands make the flow edit like a text editor without losing the word model: a space inside a word splits it into two words, Backspace or Delete at a word boundary joins the neighbours, and Delete on a whole selected word removes it; each is one undo step, a new word receives an `xml:id`, and a command that would cut an element inside the word is refused with its reason (F33). A refused keystroke always states its reason in the notice bar.
- F53 Opening a document in the flow view and saving it without an edit returns byte-identical source, for LF and CRLF line endings (proven in `prototypes/d-flow`).
- F54 Where typing writes to the source (F18), an edit changes only the visible text of one word and, where `@orig` equalled that text before the edit, `@orig`, and every other byte stays identical. The characters `<` and `&`, an edit that would touch a tag and a command that would cut an element inside a word are refused with the reason, as is any other edit that the word commands of F18 cannot express. The byte invariant and these refusals are proven in `prototypes/d-flow`. The word commands are not yet proven there, and the spike still refuses the space and the boundary keystrokes that F18 turns into commands.

### XML view

- F19 The XML view shows the complete document source, scrolled to and selecting the element that corresponds to the text selection, and a cursor position maps back to the text selection on the switch.
- F20 In the XML view the popover shows the element under the cursor and, for `w`, register links (`rs` or `ref`) and `app`, the same form as in the text view. For an image-annotation `item` the cursor opens its form in the side panel (F34).
- F57 The XML view folds `xml:id` and `facs` attributes by default into a small marker on the element, because readers never need them and pointers resolve through the model; a switch "IDs anzeigen" in the toolbar shows them, and an attribute that is the target of the current selection or of a selected pointer is shown regardless. The folding is display only, the source stays byte-identical (I1, I3).
- F21 Ctrl+E on a selection opens a short list of the elements the manifest allows at that position, and choosing one wraps the selection when the wrap keeps the document well-formed.
- F56 "XML formatieren", offered in the toolbar, formats the whole document deterministically. Empty elements become self-closing, indentation is two spaces with one element per line, elements that carry text stay on one line so that mixed content and the transcription remain unchanged, and whitespace-only text nodes are dropped. The formatting is an explicit edit of the whole document, is one undo step and sets the unsaved marker. How `xml:space="preserve"` is honoured is open.

### Facsimile pane

- F22 The pane shows the IIIF image of the current page in OpenSeadragon, vendored from the base under `docs/vendor/openseadragon/`, with the `info.json` resolved through the ONB template `https://iiif.onb.ac.at/images/REPO/8977428/{stem}.jp2/info.json` as tile source, and offers zoom and pan.
- F23 With Zonen on, the pane overlays the page's zones as one SVG layer in image coordinates, which scales with the zoom, and distinguishes line zones, text regions, miniature regions and marginal image regions. Line zones are small at the fit-to-pane zoom, which is an open accessibility point on target size ([Design](design.md#accessibility-minima)).
- F24 Clicking a line zone selects that line in the text, and selecting a line or word outlines its line zone and brings it into the visible image when it lies outside.
- F25 Clicking a miniature zone opens the image-annotation record whose `@corresp` points to it. Editing activates Bildannotationen through the document switch of F11.
- F26 When the image cannot be loaded, the pane states the reason, and text and popover remain fully usable.

### Popover and side panel

- F27 A popover opens at the selection when a word, word sequence, line or (in the XML view) an element is selected, anchored inside the text pane without covering the selection or shifting the layout, the same component in both views, and closes with Escape. Lists and large forms (findings, references, image annotation) open in the side panel, which shares the right column with the facsimile.
- F28 For a word it shows the diplomatic and normalised fields, the register field and the comments covering the word. One Anwenden and one Abbrechen apply or discard the changes of all fields of the popover ([Design](design.md#popover-at-the-selection)), and the markup actions act from the toolbar.
- F29 A diplomatic edit of a simple word changes the text and `@orig` together. For a word with inline markup the diplomatic field offers the route to the XML view and the normalised field stays editable.
- F30 For a word sequence it shows the register field and the comments covering the sequence, and the comment form opens inside it.
- F31 For a line it lists the line's words with their diplomatic and normalised fields, including a word that begins on the line and continues on the next.
- F32 The markup actions Hervorhebung, Ergänzung, Tilgung, Fremdsprache and Zahl in the toolbar take their values and German labels from the project vocabulary `docs/schemas/wenzelsbibel-vocabulary.json` (`hi/@rend`, `supplied/@reason`, `del/@type` and `surplus/@reason`, `foreign/@xml:lang`, `num/@type`), the same source the project Schematron's value lists are checked against ([Data](data.md#controlled-vocabulary)).
- F33 A markup action that would split an existing element is refused with the reason and leaves the source unchanged.
- F34 For a miniature zone the side panel shows the image-annotation form of [US4.1](#us41-edit-an-image-annotation) with the ICONCLASS lookup and the text relation.
- F35 For any other element in the XML view the popover shows the element name and its attributes, editing being done in the XML source.
- F36 Unfinished input survives switching between text and XML view and is applied or cancelled explicitly before the selection moves to another document.

### Register autocomplete and entry creation

- F37 The register field searches persons, places and peoples together, shows type and ID with each hit, and accepts an optional type filter.
- F38 Enter on a hit wraps the selected whole words in one `rs[@type][@ref]` by inserting exactly one start and one end tag. Line breaks, punctuation, anchors, milestones and whole inline elements such as `supplied` or `hi` may lie between the words, and removing the wrapper restores the original bytes (proven in `prototypes/d-flow`). Existing links in the form `ref[@type][@target]` are read and shown in the same way.
- F55 A selection that would cut an enclosing element, such as a `hi`, a marginal `seg` or an existing `ref`, is refused with a reason that names the element, and the source stays unchanged (proven in `prototypes/d-flow`).
- F58 "Verknüpfung lösen" in the popover's register field removes the `rs` or `ref` wrapper around the whole linked run in which the selection lies, in one undo step, and restores the bytes the run had before it was linked (F38). Relinking is unlinking followed by linking.
- F39 "+ neu anlegen" creates an entry with type, ID and preferred name in the register file, refuses an existing ID and links the selection in the same step.
- F40 Verweise auf Eintrag lists all references to an entry across the loaded documents with a jump to each.

### Apparatus

- F41 "+ Kommentar" in the popover and Apparatkommentar in the toolbar create the anchors and the `app` with type, German and English note and sigle in one undo step, for a single word as for a word sequence.
- F42 Existing comments covering the selection are listed with type and both notes, and their note text is editable.
- F43 Existing types, languages and anchors keep their encoded values when a comment is edited.

### Validation and notice bar

- F44 The editor has no permanent status line or footer. A notice bar below the toolbar overlays the work area without shifting the layout, appears only with something to show, and shows two classes of notice and nothing else. Standing notices stay until their cause is gone:
  1. A broken well-formedness, with the reason and a jump to the place (F45).
  2. The findings of a requested check, including the checks a save runs, with the route to the findings list, or the reason why a check cannot run (F46, F51).

  Transient notices dismiss themselves:
  3. The confirmation of a clean requested check (F46).
  4. The confirmation of a completed save, naming the document (F49, F50).
  5. The name of the step that Rückgängig or Wiederholen restored (F5).
  6. The reason of a refused keystroke in the flow or of a refused toolbar action, for keystrokes at most once per second (F18, F33, F54).
  7. The consequence of "XML formatieren", a change to every line of the document, at the moment it runs (F56).

  A refused entry in a popover field states its reason at that field instead.
- F45 Well-formedness is checked after each pause in editing. When it breaks, the notice bar states the reason and offers a jump to the place, and it disappears once the document is well-formed again.
- F46 TEI All and Schematron run on explicit request from the Prüfen menu, outside the main thread, and can be cancelled. A run with findings shows the notice bar with the check, the number of findings, the first message and the action "Befunde anzeigen". A run that cannot execute states that the check is unavailable and why. A run without findings shows a brief confirmation in the notice bar that dismisses itself, in addition to the announcement to assistive technology (operator decision of 2026-10-10).
- F47 "Befunde anzeigen" and Prüfen, Befundliste open the findings list in the side panel. The list names the checked document once in its title, as the document chooser names it, and each finding names its location, rule and message and selects its location on choice. The list states when an edit after the run has made its results outdated.
- F48 Each finding names its location in folio, column and line where the location lies in the text, and Schematron findings use the message text of the project Schematron.

### Save

- F49 Speichern runs the schema set of the active document when no current result exists and writes that document only after every schema has passed for the exact bytes.
- F50 With a writable native handle Speichern writes the active document in place after checking the file on disk for external changes, and otherwise Herunterladen offers the same bytes as a download.
- F51 A failed schema writes nothing, shows the notice bar with the failed schema and its findings, and keeps the unsaved marker. How the work is preserved in that case is an open question.

### Start page and help

- F59 The start page states in one German sentence that the tool edits the TEI files of the edition locally in the browser and that no file leaves the machine. It offers Projekt öffnen, Datei öffnen, Zuletzt geöffnet (only where the File System Access capability exists) and Beispiel öffnen, carries Hilfe, the licence and the link to the teiCrafter base in a plain footer, and offers no model features ([Design](design.md#start-page)).
- F60 Beispiel öffnen opens the tracked fol. 1r excerpt in the editor, with its attribution reachable from the opened document.
- F61 The help page describes in German the workflows that the demo workflow tests prove, each section derived from its test, links the published Transkriptionshandbuch and names version, base and licence. The start page footer and Hilfe in the toolbar (F10) open it ([Design](design.md#help-page)).

## Non-functional requirements

- N1 The tool runs in current Chromium and Firefox without a backend. ICONCLASS and the ONB image service are the only network services it calls.
- N2 Interface labels are German, while code, identifiers and documentation are English.
- N3 Accessibility minima are acceptance criteria and are defined in [Design](design.md#accessibility-minima).
- N4 The tool uploads nothing. Edition data and images stay on the user's machine and in the browser, and edition data enter version control only through the edition team's own repository ([working model](integration.md#working-model)), never through this one.
- N5 Opening and editing the full codex stays responsive under the rules of [Design](design.md#interaction-latency), and schema validation never blocks typing. The measured quantities per core interaction (keystroke in a word, caret move, selection, popover open, view switch) are the long tasks over 50 ms and the interaction to next paint, against the working thresholds named there.

## Key decisions

| Decision | Date | Choice | Reason |
| --- | --- | --- | --- |
| Base of the fork | 2026-10-10 | The fork derives from the legacy application under `docs/`, and the source-first core under `src/` stays a parallel line upstream. | The legacy app already implements the Wenzelsbibel forms, the facsimile, the schema set and the save gate, while the new core has no application shell yet. |
| Fork mechanism | 2026-10-10 | A Git fork with the upstream remote, merging base changes, with no npm package for now. | Generic mechanisms are refactored in the base and reach the fork by merge without a packaging step. |
| Rule source | 2026-10-10 | The project's Transkriptionshandbuch is the rule source, and the DHCraft TEI specification is a derived draft. | The handbook is the edition team's published and practised rule set, and the real data follows it. |
| Register encoding | 2026-10-10 | Register links are inline on the words, as the handbook rules, and the base's stand-off `spanGrp[@type='register-links']` is not used for this project. The tool reads the handbook form `ref[@type][@target]` with bare IDs and the `#ID` form of the image annotations. The written form is proposed to the edition team as `rs[@type='person' or 'place' or 'folk'][@ref]`, because `@ref` of att.canonical is the TEI attribute for pointing a name at its canonical entry, while `ref` is a hyperlink element whose `@target` serves another purpose. Until the team decides, the tool writes the proposed form and reads both; the pointer form (`#ID` or `register.xml#ID`) is decided with the team. | The codex already carries thousands of handbook-form references. The proposal changes only the element and attribute name, keeps every value, and can be applied to the existing data in one deterministic run. |
| Shortcut scheme | 2026-10-10 | No shortcut scheme beyond browser and editor defaults (Ctrl+Z, Ctrl+Y, Ctrl+F, Ctrl+S), Escape and Ctrl+E. | A scheme the team has to learn is a cost before the workflows are accepted. |
| Interface language | 2026-10-10 | German interface labels. | The edition team and the handbook work in German. |
| Editing at the object | 2026-10-10 | A toolbar with visible actions, a popover at the selection and a side panel sharing the right column with the facsimile, replacing the menu bar and the bottom inspector decided earlier the same day. | In the operator's test hidden actions did not exist for the user and the bottom bar moved the eye away from the word; text and facsimile keep the width because the panel shares the facsimile column. |
| Check feedback | 2026-10-10 | No permanent status line and no check line per field. The unsaved marker is a dot directly after the document chooser, and a notice bar below the toolbar appears only with one of the notices of F44, among them the brief confirmation of a clean requested check, with "Befunde anzeigen" opening the findings list. | A permanent status line and per-field lines add standing noise, while a notice that appears only when something happened keeps the attention on the text. |
| Text view | 2026-10-10 | One continuous editable flow per column with a real caret, built in the product as a CodeMirror 6 view with replace decorations over the raw XML. Line numbers replace the switch between line-by-line and running text. | The spike in `prototypes/d-flow` showed on fol. 1r that such a view keeps untouched bytes identical and edits word text without touching tags, and one rendering keeps line reference and reading flow together. |
| Apparatus comment extent | 2026-10-10 | A comment covers a whole word or a word sequence. Comments on part of a word are read and kept, and creating one is an open question for the edition team ([Editorial guidelines](editorial-guidelines.md#open-ratification-points)). | The handbook sets no rule on the extent of a comment, and the public codex comments single words, word sequences and in one case part of a word. |
| Project Schematron phases | 2026-10-10 | The `editing` phase accepts the published codex and image annotations unchanged and is the save gate. The `review` phase is a report on request and never gates saving. Rules and phase assignment are listed in the [editorial layer](../editorial/README.md#phases). | The team must be able to save the existing data, while the review findings on the data ([findings snapshot](../snapshots/schematron-findings-2026-10-10.md)) need editorial decisions first. |
| Rule files under `docs/schemas/` | 2026-10-10 | The project Schematron has its single source in `docs/schemas/wenzelsbibel.sch`, with no copy and no equality check, and `editorial/` keeps fixtures, fixture check and README. The controlled value lists have one hand-edited source, `docs/schemas/wenzelsbibel-vocabulary.json`, which the project modules of the new shell read and against which the fixture check compares the Schematron's lists; the wireframe keeps its own lists. | GitHub Pages serves only `docs/`, and the Vite build copies `docs/schemas/` into the tested build, so a source there needs no copy mechanism, and Oxygen reads the file from the same path. One vocabulary source keeps Schematron and interface from drifting apart. |
| Tracked edition excerpts | 2026-10-10 | A publicly published and licensed excerpt may be tracked with a `NOTICE.md` beside it carrying the attribution, as the spike fixture `prototypes/d-flow/fixture/fol1r.xml` is. Working copies of the edition and page images are never tracked. | The excerpt is published by the Austrian National Library under CC BY 4.0, while the licence for project copies of the edition stays unresolved. The operator informs the edition team. |
| Example and demo material | 2026-10-10 | Every surface a person sees, namely Beispiel öffnen on the start page, the help page and the demo workflow tests, uses the real fol. 1r excerpt. Synthetic data remain only in Schematron fixtures that violate a rule on purpose and in the inherited tests of the base. | The edition team judges the tool on its own material, and only the real page can be checked against its facsimile. |
| Start page and help | 2026-10-10 | The fork has its own start page and a German help page, both built in phase 5b. The help page describes only what the demo workflow tests prove. | The base's start page is English and offers a model entry, and a help text derived from the tests promises no behaviour the tool lacks. |

## Open questions

Questions for the operator:

1. Save rule on schema failure: offer a working-copy action in the notice bar beside the failed schema and its findings when a schema fails (recommendation), or allow a confirmed unvalidated save.
2. `xml:space` in "XML formatieren" (F56): whether elements under `xml:space="preserve"` are left untouched (recommendation) or the formatting is refused for such documents.
3. Target size of line zones in the facsimile at fit-to-pane zoom (F23): whether a larger hit area around each zone or a zoom-to-line action satisfies the accessibility minimum.

The encoding questions for the edition team, among them the list element for peoples, a shared register file for codex and image annotations, and the sigle of comments, are the [open ratification points](editorial-guidelines.md#open-ratification-points) of the editorial guidelines. Beyond them the edition team answers two questions about the tool:

1. Which roles use the tool and with which permissions (project lead, student assistants, others).
2. Whether the team adopts the [working model](integration.md#working-model), including the split of the codex into book files.

## Working model

The operator's proposal for how the edition team works with the tool, with the edition data in a repository of the team and the tool opening its local clone, is the exchange contract in [Integration](integration.md#working-model). It is to be confirmed by the edition team, and the following requirements apply once it is confirmed.

- W1 On a save with edits the tool adds a `change` entry to `revisionDesc`, prepared in phase 8 ([plan](plan.md#phases)). The entry is written as an edit of its own before the gate validates the exact output bytes, so I4 holds for the bytes that include it.
- W2 "XML formatieren" (F56) formats each file once before the team starts, so that later diffs stay small and line-based merges work.
- W3 The tool performs no Git operation, and the browser working copy and local recovery stay machine-local.

## Acceptance scenarios

Each scenario is one narrative of a workflow on fol. 1r and the basis of one demo workflow test. In phase 5b the scenarios run on the tracked fol. 1r excerpt ([Data](data.md#fixtures)), and in phase 6 they run again on the real edition files.

| Workflow | Narrative and observable outcome |
| --- | --- |
| 1 Transcribe | The user opens the project folder, chooses Codex, 1r, column a, and switches the facsimile on. The line number of the first text line "Hie hebt ſich an die voꝛ rede vnd" is clicked, its line zone lights up in the image, and the popover lists the words. The normalised reading of `ſich` is corrected and undone, then clicking the line zone of the next line selects "der pꝛologus vber das buch" in the text. |
| 2 Comment | The user selects the second `got` in "O Got got", sees the existing comment beginning "Die doppelte Apostrophe ... (MK)" with its English counterpart, then selects another word, creates a comment with type `comment_edition`, a German and an English note and the sigle, and finds the new `app` and both anchors in the XML view with the selection still on the word. |
| 3 Register | The user selects `Rotlebín` and sees the chip for person `Martin` spanning "Rotlebín herren merteín" across the line break. On another name the user types in the register field, chooses a hit by type and ID, and the word is wrapped in `rs` with `@type` and `@ref`. For a missing name "+ neu anlegen" creates the entry and links it, and Verweise auf Eintrag lists the new reference. |
| 4 Miniature | The user clicks the miniature zone over the initial O, the side panel shows `miniatures_01` "Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron" with artist BA and the ICONCLASS entry `11C21(+0)`. A lookup for a further notation fills German and English labels, and choosing the text relation opens the codex at "Hie" with the prologue range marked. |
| 5 Validate and save | The user runs TEI All and Editionsregeln from the Prüfen menu, and each clean run confirms itself briefly in the notice bar. Editionsregeln, Bericht shows the notice bar with the number of findings and the first message, "Befunde anzeigen" opens the list, and choosing a finding jumps to its word. Saving an unchanged file writes identical bytes. After an edit that breaks a schema rule, Speichern writes nothing, the notice bar names the failed schema, and the dot after the document chooser stays. |

## Related

[Project](project.md) states purpose, partners and responsibilities. [Editorial guidelines](editorial-guidelines.md) distil the handbook vocabularies that the markup actions and Schematron use. [Data](data.md) defines the files, their encodings and their local handling. [Design](design.md) defines the interface that carries these requirements, [Architecture](architecture.md) the fork's modules, the base refactor and the external services ONB IIIF and ICONCLASS, [Testing](testing.md) the browser tests for the acceptance criteria, [Integration](integration.md) the exchange with the base, the edition team and Oxygen, and [Plan](plan.md) the order of the remaining work.
