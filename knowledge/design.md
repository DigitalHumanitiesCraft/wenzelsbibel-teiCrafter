---
title: Design
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Design
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/design
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-design
status: draft
created: 2026-10-10
updated: 2026-10-10
language: en
topics: ["[[Scholar-Centered Design]]", "[[Human-Computer Interaction]]", "[[Digital Editions]]"]
related: [specification, architecture, project, editorial-guidelines, data, testing, integration, plan]
---

# Design

wenzelsbibel-teiCrafter is a working instrument for transcribers and editors of one manuscript, so its interface is one surface organised around the manuscript line, on which the user edits at the object. It inherits the design position and tokens of teiCrafter and replaces the base's two-pane editor frame with a two-row toolbar, a flowing text view with line numbers, a right column that the facsimile shares with a side panel for lists and large forms, a popover at the selection, and a notice bar below the toolbar that appears only when there is something to show. The behaviour this interface carries is defined in [Specification](specification.md), the module structure in [Architecture](architecture.md).

## Design position

The base position holds unchanged ([upstream design](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/a5f74d2889f98ebcba51bfbdd9fd8b58d9ba3bf5/knowledge/design.md)):

- The human editor decides scholarly content, and the interface shows the scope of each editorial action before it is applied.
- Deterministic edits use ordinary interface colours.
- Violet is reserved for model-origin content. LLM assistance is off for this project, so no violet surface appears.
- The design tokens in `docs/css/style.css` are the single source of truth, and component styles introduce no raw colour values.
- Status is stated in words with a second channel besides colour.

The fork adds two positions. Interface labels are German, because the edition team and its Transkriptionshandbuch work in German, while code and documentation stay English. The manuscript line is the reference unit, because the team transcribes in Transkribus line by line and checks every line against the facsimile, so line numbers, facsimile linking and the popover's line state all start from the `lb`, while the text itself reads and edits as one flow.

## Tokens

The fork reuses the upstream token families by name and defines no new raw colours.

| Family | Tokens | Use in the fork |
| --- | --- | --- |
| Surface | `--color-surface`, `--color-surface-sunken`, `--color-panel`, `--color-secondary`, `--color-border` | Text area, popover, toolbar and side panel backgrounds |
| Brand and action | `--color-header`, `--color-gold`, `--color-gold-hover`, `--color-link` | Primary action (Anwenden in the popover, Speichern), focus, links |
| Text | `--color-text`, `--color-text-body`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse` | Manuscript text, labels, line positions |
| Selection | `--color-selection`, `--color-selection-read` | Selected word, sequence or line in text and XML view |
| State | `--color-confident`, `--color-review`, `--color-problem` and their `-tint` partners | Notice bar and findings list |
| Entity | `--color-persName`, `--color-placeName`, `--color-orgName` and their `-bg` partners | Register chips |
| Geometry and type | `--space-*`, `--radius-*`, `--shadow-*`, `--font-ui`, `--font-mono`, `--font-serif`, `--font-size-*` | Layout, XML view, manuscript text |

The fork adds alias tokens that point to existing tokens, so a later palette change in the base reaches them.

| Alias | Points to | Second channel |
| --- | --- | --- |
| `--chip-person`, `--chip-person-bg` | `--color-persName`, `--color-persName-bg` | Type word "Person" and the ID in the chip |
| `--chip-place`, `--chip-place-bg` | `--color-placeName`, `--color-placeName-bg` | Type word "Ort" and the ID |
| `--chip-folk`, `--chip-folk-bg` | `--color-orgName`, `--color-orgName-bg` | Type word "Volk" and the ID |
| `--zone-line` | `--color-blue` | Thin solid outline |
| `--zone-text-region` | `--color-text-muted` | Dashed outline |
| `--zone-miniature` | `--color-workName` | Thick solid outline |
| `--zone-marginalia` | `--color-eventName` | Dotted outline |
| `--zone-selected` | `--color-selection` | Filled area |

The zone mapping borrows two entity tokens (`workName`, `eventName`) that no chip uses in this project. That choice is provisional and stays revisable when the base introduces dedicated zone tokens.

## Editor frame

### Arbeitsleiste

The toolbar is the single entry point for commands. Every action is visible, and an action the selection does not allow stays in place disabled, with its reason as tooltip and, when the disabled control is activated by pointer or keyboard, in the notice bar, so that touch and keyboard reach the reason too. A disabled control shows the dashed edge, the secondary text colour and the not-allowed cursor, a disabled menu entry colour and cursor. A control with several values or checks opens a menu from the toolbar. The toolbar follows the WAI-ARIA toolbar pattern, in which Tab enters it and arrow keys move inside it, and every control is labelled in German by its function. It has two rows.

| Row | Controls |
| --- | --- |
| Document and views | Datei (Öffnen, Projekt öffnen, Zuletzt geöffnet where the File System Access capability exists), the document chooser (Codex 2759, Bildannotationen) naming the document once with the file name as tooltip, the unsaved dot directly after it, folio and column a or b for the codex (the column hidden in the XML view) or the miniature chooser for Bildannotationen, Text or XML, Faksimile, Zonen, Rückgängig, Wiederholen, Suchen, Speichern, Herunterladen, Hilfe. In the wireframe the badge "Wireframe" with its tooltip follows at the end |
| Actions on the selection | Hervorhebung, Ergänzung, Tilgung, Fremdsprache, Zahl as value menus from the project vocabulary, Register (Verknüpfen, Neu anlegen, Verweise auf Eintrag), Apparatkommentar, XML formatieren, Prüfen ("Wohlgeformtheit", "TEI All", "Editionsregeln", "Editionsregeln, Bericht", "Befundliste"), IDs anzeigen in the XML view |

Öffnen, Projekt öffnen and Zuletzt geöffnet also stand on the [start page](#start-page), where the first reads Datei öffnen. Hilfe opens the [help page](#help-page) in a new tab, so the open document stays in place. Suchen (Ctrl+F) opens a field directly above the text area. The keyboard shortcuts Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+E, Ctrl+F and Escape stay. The unsaved dot carries the accessible name "ungesichert" and stays until a save of the current revision succeeds (F13). The Prüfen entries "Editionsregeln", the `editing` phase of the project Schematron that gates saving, and "Editionsregeln, Bericht", its `review` phase, are working labels until the operator confirms them.

The toolbar replaces menu bar and document bar, and the popover replaces the bottom inspector, for the reason recorded in the key decision [Editing at the object](specification.md#key-decisions).

### Text area

The text area renders the chosen column as one continuous editable flow with a real caret, in the reading font. Manuscript line breaks are soft breaks, and each line begins with a faint line number in `--color-text-muted` in the margin, header lines with the marker "Kopfzeile". A word whose text contains an `lb` belongs to the line on which it begins, the line of the `lb` that precedes its first character ([data](data.md#codex-text-and-standoff-apparatus)). Its inner `lb` renders as a soft break inside the word, and selecting the line on which the word begins includes the whole word. Markup appears as inline marks on the words, with renditions such as rubrication or initials in a form that adds a non-colour cue, and apparatus ranges as an underline with a small marker at the range end. Register chips follow the run of words they span, and chips, punctuation, milestones and line numbers are non-editable islands the caret passes over. A selection by mouse or Shift+Arrow snaps to whole words, a click on a line number selects the line, and the popover follows the caret. A range is shown by the native selection alone, continuous across the gaps between words; a per-word tint marks only the caret word, because two stacked highlights leave dark bars between the words. The wireframe builds the flow with `contenteditable`, the product with a CodeMirror 6 view whose replace decorations hide the raw XML ([Specification](specification.md#text-view)).

### Text view of Bildannotationen

With Bildannotationen chosen, the toolbar offers the miniature chooser in place of folio and column, and the text area shows the chosen item as a reading surface with its title, its description fields as read-only text and its text relation, which opens the codex at its range. The item list and the form live in the side panel under Bild, so the text area shows one item and repeats no list. This is the operator's proposal, to be checked in the next feedback round on the wireframe.

### Facsimile pane

The facsimile pane opens to the right of the text area and shows the IIIF image of the current page from the ONB image service in OpenSeadragon with zoom and pan. With Zonen on, it overlays the page's Transkribus zones as one SVG layer in image coordinates, which scales with the zoom, in the styles of the zone aliases above. At the fit-to-pane zoom the line zones are small targets, which the accessibility minima below leave open. Clicking a line zone selects the line in the text, and a text selection outlines and scrolls to its line zone. Clicking a miniature zone opens the miniature in the side panel, and a line selection brings its zone into the visible image when it lies outside.

### Popover at the selection

Editing happens at the object. A popover opens anchored below the first selected word or the start of the selected line, inside the text pane, without covering the selection and without shifting the layout. Its header names the state and the object (Wort "Rotlebín", fol. 1r b Z. 16) and offers XML-Stelle and a close control. Its foot carries one Anwenden and one Abbrechen, which apply or discard the changes of all its fields together, in the line state the rows of every word. Escape closes it and returns focus to the flow. A click outside closes it and keeps the selection. Tab reaches its controls from the flow. In the narrow layout it becomes a bottom sheet.

| State | Opened by | Content |
| --- | --- | --- |
| Wort | Click on a word or the caret in a word | Diplomatisch and Normalisiert. Register with the current chip, Verknüpfung lösen, Verweise, the search field with autocomplete and "+ neu anlegen". Apparat with the comments covering the word and "+ Kommentar" |
| Wortfolge | Drag or Shift+Arrow, snapped to whole words | Register and Apparat. The comment form (type, German and English note, sigle) opens in the popover |
| Zeile | Click on the line number or a line zone | The line's words as rows with Diplomatisch and Normalisiert, including a word that begins on the line and continues on the next |
| Element | Cursor in the XML view | Element name and attributes, or the matching form for `w`, register links (`rs`, `ref`) and `app`. An image-annotation `item` opens its form in the side panel |

The markup actions sit in the second toolbar row and act on the current selection.

### Seitenleiste

Lists and large forms live in a side panel on the right, which shares its column with the facsimile through a segmented switch Faksimile, Befunde, Verweise, Bild, so opening a list leaves the text where it is. Befunde is the findings list with jump-to-finding, Verweise the references of a register entry, Bild the image-annotation form (Miniatur or Randbild, see [Miniature form](#miniature-form)) and the miniature list. A miniature zone in the facsimile and choosing a miniature in Bildannotationen open Bild.

### XML view

The XML view shows the complete source in the same area as the text view, with the selection carried over. The view begins with the source. `xml:id` and `facs` are folded by default into a small marker on the element, shown by the toolbar switch "IDs anzeigen" and shown regardless on the selected element and on the target of a selected pointer; the source stays byte-identical, only the display folds. "XML formatieren" is reached through the toolbar, and its consequence, a change to every line of the document, appears once in the notice bar when the action runs. The column switch of the toolbar is hidden, because the source is not divided by column.

### Notice bar

The notice bar sits directly below the toolbar across the full width of the editor, overlaying the work area without shifting it, with the message first and its action at the end. It takes its colours from the state tokens above, states check and result in words as the second channel, and is a live region for assistive technology. What it shows is fixed by the notice rule under [Interaction rules](#interaction-rules) and by [F44](specification.md#validation-and-notice-bar). The wireframe under `wireframe/` shows it above an open findings list.

### Wireframes

One frame for the layout, with a word selected, the facsimile on, the popover open and an unsaved edit. The running wireframe under `wireframe/` is the design instrument.

```
+-----------------------------------------------------------------------------+
| Datei v  [Codex 2759 v] ●  fol. 1r  a|b  Text|XML  Faksimile  Zonen  <- ->  |
|   Suchen  Speichern  Herunterladen  Hilfe                                   |
| Hervorhebung v  Ergänzung v  Tilgung v  Fremdsprache v  Zahl v  Register v  |
|   Apparatkommentar  XML formatieren  Prüfen v                               |
+--------------------------------------+--------------------------------------+
|  15  ... werden getrewen díener      | Faksimile | Befunde | Verweise | Bild|
|  16  ... Dem [Rotlebín] herren mer   |  +--------------------------------+  |
|      +----------------------------+  |  |  IIIF 00000010                 |  |
|      | Wort "Rotlebín"  Z. 16  x  |  |  |    [==== line zone ====]       |  |
|      | Diplomatisch [Rotlebín   ] |  |  |                                |  |
|      | Normalisiert [Rotlebin   ] |  |  +--------------------------------+  |
|      | Register  Person: Martin   |  |                                      |
|      | Apparat   + Kommentar      |  |                                      |
|      |        Abbrechen  Anwenden |  |                                      |
|      +----------------------------+  |                                      |
|  17  teín (Person: Martin) , •       |                                      |
+--------------------------------------+--------------------------------------+
```

Line 16 ends with the first part of "merteín", whose inner `lb` opens line 17, and the word belongs to line 16. The text-only frame, the XML view and the notice bar above an open findings list are rendered by the wireframe under `wireframe/` ([plan](plan.md)).

Labels beyond the agreed toolbar labels, such as Diplomatisch, Normalisiert, Anwenden, XML-Stelle and the notice texts, are working labels until the edition team confirms them. The findings the wireframe shows are stand-ins, and the real messages come from the project Schematron.

## Content and interaction hierarchy

Each view below is specified by the six points of the content and interaction hierarchy from the UI practice document that the action layer names (user task, primary objects, first-decision information, optional depth, navigation targets and addressable states, wide and narrow rendering).

### Text view

1. The user reads a column of the codex as a flow, places the caret in a word or selects the word sequence or line to work on.
2. Lines (`lb` position, zone), words (diplomatic text, `@orig`, `@norm`, `@xml:id`), register links (type, ID) and apparatus ranges.
3. The diplomatic text in manuscript order with soft line breaks, the line numbers, inline marks, register chips and apparatus marks, the caret and the current selection.
4. Normalised readings, comment text and register details appear in the popover, which follows the caret.
5. Document, folio and column are part of the page address, and the selection maps to the XML view and the facsimile.
6. Wide screens show text and facsimile side by side with the line length of the text capped. Narrow screens show the text alone at full width, the flow wraps at the pane width, and the line numbers stay in the margin.

### XML view

1. The user inspects or edits the exact source around the current selection.
2. Elements with their names, attributes and positions in the raw string.
3. The source scrolled to the selected element with the selection marked, and a broken well-formedness in the notice bar.
4. Folding, search in the source, Ctrl+E for allowed elements, "XML formatieren" for the whole document, the element state of the popover.
5. The same page address as the text view without the column, plus the view switch, and the cursor maps back to a text selection.
6. Wide and narrow screens show the same source column. Long lines wrap visually without horizontal page scrolling, and the facsimile stays available on wide screens.

### Facsimile pane

1. The user compares the selected line or region with the manuscript image.
2. The page image (IIIF stem, size) and zones (ID, type, subtype, points).
3. The image of the current page, the outline of the selected line, the zone overlay when switched on.
4. Zoom and pan in OpenSeadragon, the miniature and marginal regions, which open their record on click.
5. Zone click selects the line or opens the miniature. The pane state (on or off, zones on or off) is a view setting.
6. Wide screens show the pane to the right of the text with a draggable split. Narrow screens stack it above the text at reduced height or hide it, according to the Faksimile switch.

### Popover

1. The user edits the selected object where it stands and applies or cancels the change.
2. The selected word, sequence, line or element with the fields its state defines.
3. The state name and object identity, the editable fields with their current values, and the reason when a field routes to the XML view.
4. Register autocomplete, the comment form and the list of existing comments.
5. One Anwenden and one Abbrechen for the whole popover, the jump from a comment or register reference to its target. The popover follows the selection and needs no address of its own.
6. Wide screens anchor it at the selection inside the text pane. Narrow screens show it as a bottom sheet, closed by Escape or a close control that returns to the text.

### Miniature form

1. The user describes a miniature and relates it to the codex text.
2. The image-annotation `item` with zone, title, short and long description, object type, height in lines, folio and lines, artists, related persons and places, ICONCLASS entries, content relation and statistical range.
3. Title, the miniature zone outlined in the facsimile, object type, artist sigle with name (BA, Balaam-Meister), and the text range in folio and line terms.
4. Long description, ICONCLASS search with German and English labels, the responsibility values, the jump to the text range in the codex.
5. The miniature (for example `miniatures_01`) is part of the page address when Bildannotationen is chosen. The text range opens the codex at its first word.
6. Wide screens show the form in the side panel under Bild, in two field columns where the panel is wide enough and in one otherwise. Narrow screens show it as a full-height sheet in one column.

### Findings list

1. The user finds out why a check failed and goes to the affected place.
2. Findings with document, check (Wohlgeformtheit, TEI All, Editionsregeln or Editionsregeln, Bericht), location and message.
3. The check and its result, then per finding the message and the location in folio, column and line where it lies in the text.
4. The XML path and the rule identifier of a finding.
5. Choosing a finding selects its location in the text or XML view, and the list opens from "Befunde anzeigen" in the notice bar or from Prüfen, Befundliste.
6. Wide screens show it in the side panel under Befunde. Narrow screens show it as a full-height sheet.

## Interaction rules

- The selection survives the switch between Text and XML in both directions, and unfinished input stays in the popover across the switch.
- Escape closes one layer per press in a fixed order, first an open autocomplete list, then an open toolbar menu, then the side panel while it holds the focus, then the popover, then the side panel and last the selection. Each step returns focus to the element that opened the closed layer. The facsimile is a view switched by its toggle, and Escape leaves it open.
- The notice bar shows two classes of notice and nothing else (F44). A standing notice stays until its cause is gone: a broken well-formedness with its reason and a jump to the place, and the findings of a requested check, including the checks a save runs, with the route to the findings list, or the reason why a check cannot run. A transient notice dismisses itself: the confirmation of a clean requested check, the confirmation of a completed save naming the document, the name of the step Rückgängig or Wiederholen restored, the reason of a refused keystroke or toolbar action, a keystroke at most once per second, and the consequence of "XML formatieren", a change to every line of the document, at the moment it runs. The bar overlays the work area below the toolbar and never shifts the layout, so that a transient notice moves neither the text nor the eye.
- The interface explains no limits of itself in sentences. A limitation of the wireframe is one badge "Wireframe" in the toolbar with a tooltip; the product shows only messages the user can act on.
- An object carries one visible name per surface and an action one control. A second identifier, such as the file name of a document, appears only where a task needs it, as a tooltip or in a dialog.
- A selection is drawn by one highlight that runs continuously across the gaps between its units, which means the selection colour also applies to the container's own text nodes. A mark per unit belongs to another state, such as the caret word, and is never laid over the selection.
- The popover follows the caret in the flow. After the user closes it, caret moves leave it closed until the next click or key in the text.
- A surface that looks like a text editor edits like one within the word model. Typing changes the text of one word, and the flow translates the other editor gestures into word commands (F18). A space inside a word splits it, Backspace or Delete at a word boundary joins the neighbours, and Delete on a selected whole word removes it, each as one undo step. Only a gesture that no word command can express is refused, with its reason, such as moving text by drag, typing `<` or `&`, an edit that would touch a tag or a split that would cut an element inside the word (F54).
- A refused entry in a popover field, such as a duplicate register ID, states its reason at that field, and a refused toolbar action, such as a wrap that would split an element, states it in the notice bar. The source stays unchanged in both cases.
- No control is rendered that cannot work in the detected browser. Native open, in-place save and Zuletzt geöffnet appear only after the File System Access capability check, and the download path replaces in-place save elsewhere.
- Printing and page zoom stay with the browser and get no controls of their own.

## Responsive behaviour

The wide layout places text and the right column (facsimile or side panel) side by side with the popover at the selection. The narrow layout shows the text alone, stacks the facsimile above it at reduced height or hides it, and turns popover and side panel into sheets. The toolbar wraps its rows on narrow screens and keeps every control reachable, and no view scrolls the document horizontally. The breakpoint lives in the stylesheet, and reading text stays under 80 characters per line in both layouts.

## Interaction latency

Direct manipulation holds only when the interface answers the hand at once. The measurement of the first feedback round found a timer delay on the selection and a stylesheet rule for one view that styled the elements of another ([journal](journal.md)), and the following rules generalise what it found.

- Visible feedback on a direct manipulation (caret, selection, popover, toggle) appears in the next frame, without a timer delay.
- Expensive work, such as rebuilding a view, reparsing or checking, runs after the gesture and outside it.
- A view is rebuilt only when its source changed.
- Component selectors are bound to their container, so that a rule for one view cannot style the elements of another.

The measured quantities per core interaction are the long tasks over 50 ms and the interaction to next paint. The operator's working thresholds for interaction to next paint are good up to 200 ms and acceptable up to 500 ms. Both thresholds are to be confirmed against the published definitions of the two measures. N5 in the [specification](specification.md#non-functional-requirements) refers to these rules, and [testing](testing.md#interface-acceptance-layer) names the measurement procedure.

## Accessibility minima

These minima are acceptance criteria for every view and are checked in the browser tests of [Testing](testing.md).

1. Text and interface elements reach a contrast of at least 4.5:1 against their background, measured on the rendered views. Two base tokens fail this as text colours: `--color-review`, which the base uses for the unsaved marker, and `--color-orgName`, which the wireframe uses for XML attribute names. Until the base changes them ([upstream point](integration.md#base-teicrafter)), the fork colours the unsaved dot with `--color-problem` or `--color-link` and XML attribute names with `--color-text-secondary`. The folk chip keeps `--color-orgName` for its outline only and sets its text in `--color-text`.
2. Every focusable element shows a visible focus indicator.
3. Interactive targets measure at least 24 by 24 CSS pixels, including chips, line numbers and menu entries. Line zones in the facsimile fall below this at the fit-to-pane zoom, and how they meet it is an open point ([Specification](specification.md#open-questions)).
4. Toolbar, text selection (word, sequence, line), popover, side panel and autocomplete are fully operable by keyboard.
5. Escape closes the topmost layer and returns focus to its origin.
6. Status changes (well-formedness, the results of a requested check including the brief confirmation of a clean one, refusals, save) are announced to assistive technology through the notice bar's live region, and no state relies on colour alone.
7. Animations and smooth scrolling are disabled under `prefers-reduced-motion`.
8. Every view stays usable at 200 percent browser zoom without loss of content or function and without horizontal page scrolling.
9. Input fields use a font size of at least 16 CSS pixels.

## Start page

The fork's start page takes the place of the base's `docs/index.html` ([architecture](architecture.md#derivation-model)). It states the tool's purpose in one plain German sentence, that the tool edits the TEI files of the edition locally in the browser and that no file leaves the machine. The proposed sentence is "Dieses Werkzeug bearbeitet die TEI-Dateien der Wenzelsbibel-Edition lokal in Ihrem Browser, und keine Datei verlässt dabei Ihren Rechner.", a working label until the operator confirms it. Its actions follow in this order: Projekt öffnen, Datei öffnen, Zuletzt geöffnet where the browser supports native file handles, and Beispiel öffnen, which opens the real fol. 1r excerpt in the editor ([data](data.md#fixtures)). A plain footer line carries Hilfe, the licence and the link to the teiCrafter base. The page carries no marketing copy, no feature list, no counters and no entry to model features.

## Help page

The help page explains the use of the editor in German. Each section describes one workflow and is derived from its demo workflow test, so the page describes only behaviour those tests prove and changes when they change. It links the published Transkriptionshandbuch and names the tool version, the teiCrafter base and the licence. The footer of the start page and the Hilfe control in the toolbar's first row open it, the latter in a new tab.

## Action layer

The action layer of the fork, [CLAUDE.md](../CLAUDE.md), takes this document as its source of design values and translates them into instructions for coding agents. Views and interface text are accepted against the checklist of the UI practice document that the action layer names.
