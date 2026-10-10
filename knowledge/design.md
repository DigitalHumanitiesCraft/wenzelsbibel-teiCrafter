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

wenzelsbibel-teiCrafter is a working instrument for transcribers and editors of one manuscript, so its interface is one surface organised around the manuscript line, on which the user edits at the object. It inherits the design position and tokens of teiCrafter and replaces the base's two-pane editor frame with a one-row toolbar, a flowing text view with line numbers, a right column in which the facsimile stands above a lower pane for lists and large forms, a popover at the selection, and a notice bar below the toolbar that appears only when there is something to show. The behaviour this interface carries is defined in [Specification](specification.md), the module structure in [Architecture](architecture.md).

## Design position

The base position holds unchanged ([upstream design](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/a5f74d2889f98ebcba51bfbdd9fd8b58d9ba3bf5/knowledge/design.md)):

- The human editor decides scholarly content, and the interface shows the scope of each editorial action before it is applied.
- Deterministic edits use ordinary interface colours.
- Violet is reserved for model-origin content. LLM assistance is off for this project, so no violet surface appears.
- The design tokens in `docs/css/style.css` are the single source of truth, and component styles introduce no raw colour values.
- Status is stated in words with a second channel besides colour.

The fork adds three positions. Interface labels are German, because the edition team and its Transkriptionshandbuch work in German, while code and documentation stay English. The manuscript line is the reference unit, because the team transcribes in Transkribus line by line and checks every line against the facsimile, so line numbers, facsimile linking and the popover's line state all start from the `lb`, while the text itself reads and edits as one flow. The place of an action is the place of its object, so an action on the selection stands at the selection and an action on the document or the view in the toolbar, and a control whose object is absent from the current view is not rendered ([key decisions](specification.md#key-decisions)).

## Tokens

The fork reuses the upstream token families by name and defines no new raw colours.

| Family | Tokens | Use in the fork |
| --- | --- | --- |
| Surface | `--color-surface`, `--color-surface-sunken`, `--color-panel`, `--color-secondary`, `--color-border` | Text area, popover, toolbar and lower pane backgrounds |
| Brand and action | `--color-header`, `--color-gold`, `--color-gold-hover`, `--color-link` | Primary action (Anwenden in a form, Speichern), focus, links |
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

The one-row toolbar stands above the work area, and the notice bar overlays the top edge of the work area when it has something to show. The work area places the text column on the left and the [Seitenleiste](#seitenleiste) on the right, the right column with the facsimile above and the lower pane below. The boundary between the two columns is a draggable handle, which also moves by arrow keys when it has the focus, with a minimum width for each side, and the browser remembers the width last set. This handle and the divider above the lower pane follow the WAI-ARIA window splitter pattern, and the browser remembers the divider's position in the same way.

### Arbeitsleiste

The toolbar is one row of controls for the document and the place in it, the view, the history and the way the work leaves the tool. Actions on the selection stand in the [popover](#popover-at-the-selection), so the toolbar carries none of them. A control whose object is absent from the current view is not rendered, so the text view shows the column switch and Zonen, and the XML view shows IDs anzeigen and XML formatieren. An action whose object is present but whose state forbids it, such as Rückgängig without a step or Befundliste before a check has run, stays in place disabled, with its reason as tooltip and, when the disabled control is activated by pointer or keyboard, in the notice bar, so that touch and keyboard reach the reason too. A disabled control keeps its label in the muted text colour, which carries the state, with a thin dashed edge as the second channel and the not-allowed cursor, and a disabled menu entry takes the same colour and cursor. The toolbar follows the WAI-ARIA toolbar pattern, in which Tab enters it and arrow keys move inside it, and every control is labelled in German by its function. Zonen stays rendered while the facsimile is off, disabled with the reason "Erst das Faksimile einblenden.", so that toggling the facsimile does not shift the row.

The controls stand in groups from left to right, separated by spacing without dividing lines, and the last group is right-aligned.

| Group | Controls |
| --- | --- |
| Document and place | Datei (Öffnen, Projekt öffnen, Zuletzt geöffnet where the File System Access capability exists), the document chooser (Codex 2759, Bildannotationen) naming the document once with the file name as tooltip, the unsaved dot directly after it, for the codex the folio pager (a step back, the folio as a field that Enter jumps to, a step forward) and, in the text view, column a or b, for Bildannotationen the miniature chooser, then Suchen |
| View | Text or XML, Faksimile, and Zonen in the text view or IDs anzeigen and XML formatieren in the XML view |
| History | Rückgängig, Wiederholen |
| Check and output, right-aligned | Prüfen ("Wohlgeformtheit", "TEI All", "Editionsregeln", "Editionsregeln, Bericht", "Befundliste"), Speichern, Herunterladen, Hilfe. In the wireframe the badge "Wireframe" with its tooltip stands at the far right |

Switches that hold a state, namely column a or b, Text or XML, Faksimile, Zonen and IDs anzeigen, are drawn as segmented switches whose chosen or pressed segment is filled and exposed as pressed to assistive technology. Actions are plain buttons with their label, and Datei and Prüfen are the only menus. Öffnen, Projekt öffnen and Zuletzt geöffnet also stand on the [start page](#start-page), where the first reads Datei öffnen. Hilfe opens the [help page](#help-page) in a new tab, so the open document stays in place. Suchen (Ctrl+F) opens a field directly above the text area. The keyboard shortcuts Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+E, Ctrl+F and Escape stay, and Ctrl+E opens the Markup field of the popover. The unsaved dot carries the accessible name "ungesichert" and stays until a save of the current revision succeeds (F13). The Prüfen entries "Editionsregeln", the `editing` phase of the project Schematron that gates saving, and "Editionsregeln, Bericht", its `review` phase, are working labels until the operator confirms them.

Turning the folio, by the pager, by Alt with Page Up or Page Down or by typing a folio into the field, shows the text, the facsimile and the miniatures of that folio and writes folio and column into the page address, so that reload, the browser history and a shared link restore the place. Unapplied input in the popover holds the turn with its reason, as it holds the document switch (F12, F36).

The toolbar replaces menu bar and document bar, and the popover replaces the bottom inspector, for the reasons recorded in the [key decisions](specification.md#key-decisions) Editing at the object and One-row toolbar.

### Text area

The text area renders the chosen column as one continuous editable flow with a real caret, in the reading font. Manuscript line breaks are soft breaks, and each line begins with a faint line number in `--color-text-muted` in the margin, header lines with the marker "Kopfzeile". A word whose text contains an `lb` belongs to the line on which it begins, the line of the `lb` that precedes its first character ([data](data.md#codex-text-and-standoff-apparatus)). Its inner `lb` renders as a soft break inside the word, and selecting the line on which the word begins includes the whole word. Markup appears as inline marks on the words, with renditions such as rubrication or initials in a form that adds a non-colour cue, and apparatus ranges as an underline with a small marker at the range end. Register chips follow the run of words they span, and chips, punctuation, milestones and line numbers are non-editable islands the caret passes over. A selection by mouse or Shift+Arrow snaps to whole words, a click on a line number selects the line, and the popover follows the caret. A range is shown by the native selection alone, continuous across the gaps between words, and a per-word tint marks only the caret word, because two stacked highlights leave dark bars between the words. The wireframe builds the flow with `contenteditable`, the product with a CodeMirror 6 view whose replace decorations hide the raw XML ([Specification](specification.md#text-view)).

### Text view of Bildannotationen

With Bildannotationen chosen, the toolbar offers the miniature chooser in place of folio and column, and the text area shows the chosen item as a reading surface with its title, its description fields as read-only text and its text relation, which opens the codex at its range. The form opens in the lower pane of the right column, and the miniature chooser in the toolbar is the one control that chooses an item, so the text area shows one item and repeats no list. This is the operator's proposal, to be checked in the next feedback round on the wireframe.

### Facsimile pane

The facsimile fills the right column above the lower pane. It is on by default, the browser remembers the state last chosen with the Faksimile switch, and on narrow screens it starts off. It shows the IIIF image of the current page from the ONB image service in OpenSeadragon, fitted into the column when a page opens. The wheel and a double-click zoom, dragging pans, and one control "Seite einpassen" in the house style fits the page again. The viewer's default buttons for zoom, home view and full screen are not rendered. With Zonen on, it overlays the page's Transkribus zones as one SVG layer in image coordinates, which scales with the zoom, in the styles of the zone aliases above. At the fitted zoom the line zones are small targets, which the accessibility minima below leave open. Clicking a line zone selects the line in the text, and a word or line selection outlines its line zone and brings it into the visible image when it lies outside. Clicking a miniature zone opens its image annotation in the lower pane.

### Popover at the selection

A popover opens anchored below the first selected word or the start of the selected line, inside the text pane, without covering the selection and without shifting the layout. Its head names the state, the object in quotation marks and its place (Wort "Rotlebín", fol. 1r b Z. 16) and offers XML-Stelle and a close control. Below the head stand rows with a label column, one row per kind of work on the object, and the popover repeats nothing that the flow already shows and edits. Escape closes it and returns focus to the flow. A click outside closes it and keeps the selection. Tab reaches its controls from the flow. In the narrow layout it becomes a bottom sheet.

| State | Opened by | Rows |
| --- | --- | --- |
| Wort | Click on a word or the caret in a word | Normalisiert, Markup, Register, Apparat, Bild |
| Wortfolge | Drag or Shift+Arrow, snapped to whole words | Markup, Register, Apparat, Bild |
| Zeile | Click on the line number or a line zone | One row per word of the line, the word as it stands in the label column and its Normalisiert field beside it, including a word that begins on the line and continues on the next |
| Element | Cursor in the XML view | Element name and attributes, or the rows of the Wort or Wortfolge state for `w`, register links (`rs`, `ref`) and `app`. An image-annotation `item` opens its form in the lower pane |

- Normalisiert is a single field. Enter applies the value as one undo step, Escape reverts it, and Rückgängig takes back what was applied. The diplomatic text is edited by typing in the flow (F18), so the popover carries no field for it. For a word with inner markup the XML-Stelle control in the head carries the route to the XML view, and no second control repeats it.
- Markup is one search field over the markup values of the project vocabulary, whose list is grouped as Hervorhebung, Ergänzung, Tilgung, Fremdsprache and Zahl, each value with its German label. Typing narrows the list, Enter or a click applies the value to the selection, and Ctrl+E (F21) opens the field. Markup the selection already carries stands as chips before the field, each with a control that removes it.
- Register is one combobox over all registers, each hit with its type and ID, and "+ neu anlegen" when no hit matches. A linked selection shows its chip with Verknüpfung lösen and with Verweise, which opens the references of the entry in the lower pane.
- Apparat lists the comments covering the selection and offers "+ Kommentar". Choosing a comment or "+ Kommentar" opens the comment form in the popover.
- Bild names each image annotation that refers to the selection in one line, its title as a link that opens the annotation in the lower pane, and is rendered only when such an annotation exists.

A row without a value shows its control alone, and a row with neither value nor control is not rendered. Anwenden and Abbrechen stand only in the forms with several fields, namely the comment form (type, German and English note, sigle), the register entry form (type, ID, preferred name) and the image-annotation form in the lower pane, and apply or discard all fields of their form together.

### Seitenleiste

The right column holds the [facsimile](#facsimile-pane) and, below it, a lower pane for lists and large forms, and it has no tab row. A list or form opens from the action that asks for it. The findings list opens from Prüfen, Befundliste or from "Befunde anzeigen" in the notice bar, the references of a register entry from Verweise at the register chip, and the image-annotation form (Miniatur or Randbild, see [Miniature form](#miniature-form)) with the item list of Bildannotationen from a miniature zone, from the Bild row of the popover or from the miniature chooser. The pane carries a title that names its content once and a close control, and a list opened later replaces the one shown. The divider between facsimile and pane is a draggable handle ([Editor frame](#editor-frame)). With the facsimile off the pane takes the whole column, and with the pane closed as well the column closes and the text takes the width. The Faksimile switch and the close control of the pane open and close the parts of the column, which has no close control of its own.

### XML view

The XML view shows the complete source in the same area as the text view, with the selection carried over. The view begins with the source. `xml:id` and `facs` are folded by default into a small marker on the element, shown by the toolbar switch "IDs anzeigen" and shown regardless on the selected element and on the target of a selected pointer. The source stays byte-identical, and only the display folds. "XML formatieren" stands in the toolbar of the XML view, and its consequence, a change to every line of the document, appears once in the notice bar when the action runs. The toolbar renders no column switch here, because the source is not divided by column.

### Notice bar

The notice bar sits directly below the toolbar across the full width of the editor, overlaying the work area without shifting it, with the message first and its action at the end. It takes its colours from the state tokens above, states check and result in words as the second channel, and is a live region for assistive technology. What it shows is fixed by the notice rule under [Interaction rules](#interaction-rules) and by [F44](specification.md#validation-and-notice-bar). The wireframe under `wireframe/` shows it above an open findings list.

### Wireframes

One frame for the layout, with a word selected, the facsimile on, the popover open, the references of the word's register entry in the lower pane and an unsaved edit. Braces mark switches that hold a state, brackets choosers and fields, a trailing v a menu or a list, parentheses a chip, the arrows Rückgängig and Wiederholen, and plain words the other actions. The double line between the columns and the line of equals signs above the lower pane are the draggable handles. The running wireframe under `wireframe/` is the design instrument.

```
+------------------------------------------------------------------------------------------------------------------------------------------+
| Datei v [Codex 2759 v] ● [fol. 1r v] {a|b} Suchen   {Text|XML} {Faksimile} {Zonen}   <- ->        Prüfen v Speichern Herunterladen Hilfe |
+-----------------------------------------------------------++-----------------------------------------------------------------------------+
|  15  ... werden getrewen díener                           ||  Seite einpassen                                                            |
|  16  ... Dem [Rotlebín] herren mer                        ||  +----------------------------------------------------------------------+   |
|    +----------------------------------------------------+ ||  |  IIIF 00000010                                                       |   |
|    | Wort "Rotlebín"  fol. 1r b Z. 16   XML-Stelle  x   | ||  |        [======= line zone, Z. 16 =======]                            |   |
|    | Normalisiert  [Rotlebin                          ] | ||  |                                                                      |   |
|    | Markup        [                                v ] | ||  +----------------------------------------------------------------------+   |
|    | Register      (Person: Martin)                     | || ==========================================================================  |
|    |               Verknüpfung lösen  Verweise          | || Verweise  Person: Martin                                                x   |
|    | Apparat       + Kommentar                          | ||   fol. 1r b Z. 16                                                           |
|    | Bild          Anfangs-Initiale (O) zum Prolog ...  | ||   Rotlebín herren merteín                                                   |
|    +----------------------------------------------------+ ||                                                                             |
|  17  teín (Person: Martin) , •                            ||                                                                             |
|                                                           ||                                                                             |
+-----------------------------------------------------------++-----------------------------------------------------------------------------+
```

Line 16 ends with the first part of "merteín", whose inner `lb` opens line 17, and the word belongs to line 16. The text-only frame, the XML view and the notice bar above an open findings list are rendered by the wireframe under `wireframe/` ([plan](plan.md)).

Labels beyond the agreed toolbar labels, such as the row labels of the popover, Anwenden, XML-Stelle, Seite einpassen and the notice texts, are working labels until the edition team confirms them. The findings the wireframe shows are stand-ins, and the real messages come from the project Schematron.

## Content and interaction hierarchy

Each view below is specified by the six points of the content and interaction hierarchy from the UI practice document that the action layer names (user task, primary objects, first-decision information, optional depth, navigation targets and addressable states, wide and narrow rendering).

### Text view

1. The user reads a column of the codex as a flow, places the caret in a word or selects the word sequence or line to work on.
2. Lines (`lb` position, zone), words (diplomatic text, `@orig`, `@norm`, `@xml:id`), register links (type, ID) and apparatus ranges.
3. The diplomatic text in manuscript order with soft line breaks, the line numbers, inline marks, register chips and apparatus marks, the caret and the current selection.
4. Normalised readings, markup values, comment text, register details and image titles appear in the popover, which follows the caret.
5. Document, folio and column are part of the page address, and the selection maps to the XML view and the facsimile.
6. Wide screens show text and facsimile side by side with the line length of the text capped. Narrow screens show the text alone at full width, the flow wraps at the pane width, and the line numbers stay in the margin.

### XML view

1. The user inspects or edits the exact source around the current selection.
2. Elements with their names, attributes and positions in the raw string.
3. The source scrolled to the selected element with the selection marked, and a broken well-formedness in the notice bar.
4. Folding, search in the source, Ctrl+E opening the popover's Markup field with the elements allowed at the position, "XML formatieren" for the whole document, the element state of the popover.
5. The same page address as the text view without the column, plus the view switch, and the cursor maps back to a text selection.
6. Wide and narrow screens show the same source column. Long lines wrap visually without horizontal page scrolling, and the facsimile stays available on wide screens.

### Facsimile pane

1. The user compares the selected line or region with the manuscript image.
2. The page image (IIIF stem, size) and zones (ID, type, subtype, points).
3. The image of the current page, the outline of the selected line, the zone overlay when switched on.
4. Zoom by wheel and double-click, pan by drag, "Seite einpassen", and the miniature and marginal regions, which open their record in the lower pane on click.
5. Zone click selects the line or opens the miniature. The pane state (on or off, zones on or off) is a view setting that the browser remembers.
6. Wide screens show the pane to the right of the text, divided from it by the draggable boundary of the [editor frame](#editor-frame). Narrow screens start with the facsimile off and stack it above the text at reduced height when it is switched on.

### Popover

1. The user works on the selected object where it stands, applying a single field with Enter and a form with several fields with Anwenden.
2. The selected word, sequence, line or element with the rows its state defines.
3. The state, the object in quotation marks and its place, then the rows with their current values, namely the normalised reading, the markup chips, the register chip, the covering comments and the image titles, and the route to the XML view for a word with inner markup.
4. The grouped markup list, the register list, the comment form and the register entry form.
5. XML-Stelle, Verweise at the register chip and the image title, which open their target in the XML view or in the lower pane. The popover follows the selection and needs no address of its own.
6. Wide screens anchor it at the selection inside the text pane. Narrow screens show it as a bottom sheet, closed by Escape or a close control that returns to the text.

### Miniature form

1. The user describes a miniature and relates it to the codex text.
2. The image-annotation `item` with zone, title, short and long description, object type, height in lines, folio and lines, artists, related persons and places, ICONCLASS entries, content relation and statistical range.
3. Title, the miniature zone outlined in the facsimile, object type, artist sigle with name (BA, Balaam-Meister), and the text range in folio and line terms.
4. Long description, ICONCLASS search with German and English labels, the responsibility values, the jump to the text range in the codex.
5. The miniature (for example `miniatures_01`) is part of the page address when Bildannotationen is chosen. The text range opens the codex at its first word.
6. Wide screens show the form in the lower pane under the facsimile, titled with the item's title, in two field columns where the pane is wide enough and in one otherwise. Narrow screens show it as a full-height sheet in one column.

### Findings list

1. The user finds out why a check failed and goes to the affected place.
2. Findings with document, check (Wohlgeformtheit, TEI All, Editionsregeln or Editionsregeln, Bericht), location and message.
3. The check and its result, then per finding the message and the location in folio, column and line where it lies in the text.
4. The XML path and the rule identifier of a finding.
5. Choosing a finding selects its location in the text or XML view, and the list opens from "Befunde anzeigen" in the notice bar or from Prüfen, Befundliste.
6. Wide screens show it in the lower pane under the facsimile. Narrow screens show it as a full-height sheet.

## Interaction rules

- The selection survives the switch between Text and XML in both directions, and unfinished input stays in the popover across the switch.
- Escape closes one layer per press in a fixed order, first an open markup or register list, then a value typed into a single field and not yet applied, which it reverts, then an open toolbar menu, then the lower pane while it holds the focus, then the popover, then the lower pane and last the selection. Each closing step returns focus to the element that opened the closed layer. The facsimile is a view switched by its toggle, and Escape leaves it open.
- The notice bar shows two classes of notice and nothing else (F44). A standing notice stays until its cause is gone, namely a broken well-formedness with its reason and a jump to the place, the findings of a requested check, including the checks a save runs, with the route to the findings list, or the reason why a check cannot run, and a running check with its cancel action. A transient notice dismisses itself, namely the confirmation of a clean requested check, the confirmation of a completed save naming the document, the name of the step Rückgängig or Wiederholen restored, the reason of a refused keystroke or toolbar action, a keystroke at most once per second, and the consequence of "XML formatieren", a change to every line of the document, at the moment it runs. The bar overlays the work area below the toolbar and never shifts the layout, so that a transient notice moves neither the text nor the eye.
- The interface explains no limits of itself in sentences. A limitation of the wireframe is one badge "Wireframe" in the toolbar with a tooltip, and the product shows only messages the user can act on.
- An object carries one visible name per surface and an action one control. A second identifier, such as the file name of a document, appears only where a task needs it, as a tooltip or in a dialog.
- The place of an action is the place of its object. Actions on the selection, among them markup, register link and apparatus comment, stand in the popover, actions on the document and the view in the toolbar, and actions on a finding, a reference or an image record in the lower pane that lists it.
- A selection is drawn by one highlight that runs continuously across the gaps between its units, which means the selection colour also applies to the container's own text nodes. A mark per unit belongs to another state, such as the caret word, and is never laid over the selection.
- The popover follows the caret in the flow. After the user closes it, caret moves leave it closed until the next click or key in the text.
- A form with one field applies its value on Enter as one undo step and reverts it on Escape, and it carries no buttons. Anwenden and Abbrechen stand only in forms with several fields and apply or discard all of their fields together.
- An empty state carries no sentence. The absence of a chip, a comment or an image row shows that there is none.
- A surface that looks like a text editor edits like one within the word model. Typing changes the text of one word, and the flow translates the other editor gestures into word commands (F18). A space inside a word splits it, Backspace or Delete at a word boundary joins the neighbours, and Delete on a selected whole word removes it, each as one undo step. Only a gesture that no word command can express is refused, with its reason, such as moving text by drag, typing `<` or `&`, an edit that would touch a tag or a split that would cut an element inside the word (F54).
- A refused entry or action in the popover, such as a duplicate register ID or a markup wrap that would split an element, states its reason at its row, and a refused keystroke or an activated disabled toolbar control states it in the notice bar. The source stays unchanged in both cases.
- No control is rendered that cannot work in the detected browser or that has no object in the current view. Native open, in-place save and Zuletzt geöffnet appear only after the File System Access capability check, and the download path replaces in-place save elsewhere. The column switch and Zonen appear in the text view, IDs anzeigen and XML formatieren in the XML view, and Faksimile in both.
- Printing and page zoom stay with the browser and get no controls of their own.

## Responsive behaviour

The wide layout places the text column and the right column side by side, divided by the draggable boundary, with the popover at the selection. The narrow layout shows the text alone, starts with the facsimile off and stacks it above the text at reduced height when it is switched on, and turns popover and lower pane into sheets. The toolbar row wraps at group boundaries on narrow screens and keeps every control reachable, and no view scrolls the document horizontally. The breakpoint lives in the stylesheet, and reading text stays under 80 characters per line in both layouts.

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
3. Interactive targets measure at least 24 by 24 CSS pixels, including chips, line numbers, menu entries and the two draggable handles. Line zones in the facsimile fall below this at the fit-to-pane zoom, and how they meet it is an open point ([Specification](specification.md#open-questions)).
4. Toolbar, text selection (word, sequence, line), popover with its markup and register lists, lower pane and the two draggable handles are fully operable by keyboard.
5. Escape closes the topmost layer and returns focus to its origin.
6. Status changes (well-formedness, the results of a requested check including the brief confirmation of a clean one, refusals, save) are announced to assistive technology through the notice bar's live region, and no state relies on colour alone.
7. Animations and smooth scrolling are disabled under `prefers-reduced-motion`.
8. Every view stays usable at 200 percent browser zoom without loss of content or function and without horizontal page scrolling.
9. Input fields use a font size of at least 16 CSS pixels.

## Start page

The fork's start page takes the place of the base's `docs/index.html` ([architecture](architecture.md#derivation-model)). It states the tool's purpose in one plain German sentence, that the tool edits the TEI files of the edition locally in the browser and that no file leaves the machine. The proposed sentence is "Dieses Werkzeug bearbeitet die TEI-Dateien der Wenzelsbibel-Edition lokal in Ihrem Browser, und keine Datei verlässt dabei Ihren Rechner.", a working label until the operator confirms it. Its actions follow in this order: Projekt öffnen, Datei öffnen, Zuletzt geöffnet where the browser supports native file handles, and Beispiel öffnen, which opens the real fol. 1r excerpt in the editor ([data](data.md#fixtures)). A plain footer line carries Hilfe, the licence and the link to the teiCrafter base. The page carries no marketing copy, no feature list, no counters and no entry to model features.

## Help page

The help page explains the use of the editor in German. Each section describes one workflow and is derived from its demo workflow test, so the page describes only behaviour those tests prove and changes when they change. It links the published Transkriptionshandbuch and names the tool version, the teiCrafter base and the licence. The footer of the start page and the Hilfe control at the right end of the toolbar open it, the latter in a new tab.

## Action layer

The action layer of the fork, [CLAUDE.md](../CLAUDE.md), takes this document as its source of design values and translates them into instructions for coding agents. Views and interface text are accepted against the checklist of the UI practice document that the action layer names.
