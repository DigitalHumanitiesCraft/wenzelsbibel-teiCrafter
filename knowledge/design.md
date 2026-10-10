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

wenzelsbibel-teiCrafter is a working instrument for transcribers and editors of one manuscript, so its interface is one surface organised around the manuscript line, with the facsimile beside the text and a single inspector below it. It inherits the design position and tokens of teiCrafter and replaces the base's two-pane editor frame with a menu bar, a document bar, a line-by-line text view, a switchable facsimile pane, a bottom inspector and a status line. The behaviour this interface carries is defined in [Specification](specification.md), the module structure in [Architecture](architecture.md).

## Design position

The base position holds unchanged ([upstream design](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/a5f74d2889f98ebcba51bfbdd9fd8b58d9ba3bf5/knowledge/design.md)):

- The human editor decides scholarly content, and the interface shows the scope of each editorial action before it is applied.
- Deterministic edits use ordinary interface colours.
- Violet is reserved for model-origin content. LLM assistance is off for this project, so no violet surface appears.
- The design tokens in `docs/css/style.css` are the single source of truth, and component styles introduce no raw colour values.
- Status is stated in words with a second channel besides colour.

The fork adds two positions. Interface labels are German, because the edition team and its Transkriptionshandbuch work in German, while code and documentation stay English. The manuscript line is the reading unit, because the team transcribes in Transkribus line by line and checks every line against the facsimile, so selection, facsimile linking and the inspector's line state all start from the `lb`.

## Tokens

The fork reuses the upstream token families by name and defines no new raw colours.

| Family | Tokens | Use in the fork |
| --- | --- | --- |
| Surface | `--color-surface`, `--color-surface-sunken`, `--color-panel`, `--color-secondary`, `--color-border` | Text area, inspector, menu and document bar backgrounds |
| Brand and action | `--color-header`, `--color-gold`, `--color-gold-hover`, `--color-link` | Primary action (Apply in the inspector, Speichern), focus, links |
| Text | `--color-text`, `--color-text-body`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse` | Manuscript text, labels, line positions |
| Selection | `--color-selection`, `--color-selection-read` | Selected word, sequence or line in text and XML view |
| State | `--color-confident`, `--color-review`, `--color-problem` and their `-tint` partners | Status line segments and findings |
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

### Menu bar

The menu bar is the single entry point for commands. Its entries are fixed for the prototype.

| Menu | Entries |
| --- | --- |
| Datei | Öffnen, Projekt öffnen, Speichern, Zuletzt geöffnet |
| Bearbeiten | Rückgängig, Wiederholen, Suchen, Apparatkommentar zur Auswahl |
| Ansicht | Text, XML, Faksimile ein/aus, Zonen ein/aus, Inspector ein/aus, Zeilenweise/Fließtext |
| Register | Personen, Orte, Völker öffnen, Eintrag anlegen, Verweise auf Eintrag anzeigen |
| Prüfen | Wohlgeformtheit, TEI All, Schematron editing, Schematron review, Befundliste |
| Hilfe | Transkriptionsrichtlinie, Über |

Zuletzt geöffnet is rendered only where the File System Access capability exists. Toggle entries show their state as a check mark. Where Register, Personen, Orte or Völker öffnen render their list is an open point, and the recommendation is the bottom area, in the same way as the findings list.

### Document bar

The document bar sits below the menu bar. Its left side holds the document chooser with the two entries Codex and Bildannotationen and the navigation that fits the chosen document, folio and column a or b for the codex, miniature for the image annotations. Its right side holds exactly two switches, Text|XML and Faksimile. The bar carries no register tab and no search field. Suchen (Ctrl+F) opens a field directly above the text area.

### Text area

The text area renders the chosen column line by line as in the manuscript. Each row begins with the column marker and the line position in `--color-text-muted`, followed by the diplomatic text in the reading font. Header lines carry a "Kopfzeile" marker. Register links appear as chips under the words they span, apparatus ranges as an underline with a small marker at the range end, and renditions such as rubrication or initials in a form that adds a non-colour cue. Fließtext renders the same column as running text with visible line-break marks.

### Facsimile pane

The facsimile pane opens to the right of the text area and shows the IIIF image of the current page from the ONB image service with zoom and pan. With Zonen on, it overlays the page's Transkribus zones in the styles of the zone aliases above. Clicking a line zone selects the line in the text, and a text selection outlines and scrolls to its line zone. Clicking a miniature zone opens the miniature in the inspector.

### Inspector

The inspector is a bottom bar that opens on a selection and is the same component in the text and XML views. Its height is draggable, and Escape closes it. Its header names the state and the selected object. Apply is the primary action, Abbrechen restores the represented values.

| State | Opened by | Content |
| --- | --- | --- |
| Wort | Click on a word | Diplomatisch, Normalisiert, markup actions (Hervorhebung, Ergänzung, Tilgung, Fremdsprache, Zahl), Register field, Apparat with existing comments and "+ Kommentar zur Auswahl" |
| Wortfolge | Drag or Shift+click | Markup actions, Register field, Apparat |
| Zeile | Click on the line position or a line zone | The line's words as rows with Diplomatisch and Normalisiert |
| Miniatur | Click on a miniature zone or choice in Bildannotationen | The image-annotation form (see [Miniature form](#miniature-form)) |
| Element | Cursor in the XML view | Element name and attributes, or the matching form for `w`, `ref`, `app` and image-annotation `item` |

The findings list opens in the same bottom area through a click on the status line.

### Status line

The status line at the bottom shows four segments as words: Wohlgeformtheit, TEI All, Schematron with its phase, and the save state. Each segment states its value (gültig, ungültig, veraltet, nicht verfügbar, nicht geprüft) in text with the state token as second channel. The status line carries no per-field check line and no counter outside a finding count that results from a run.

### Wireframes

Text only, after opening fol. 1r, column a.

```
+-----------------------------------------------------------------------------+
| Datei  Bearbeiten  Ansicht  Register  Prüfen  Hilfe                         |
+-----------------------------------------------------------------------------+
| [Codex v]  Folio [1r v]  Spalte (a) b                   [Text|XML] [Faks.]  |
+-----------------------------------------------------------------------------+
| a     PROLOGUS                                              Kopfzeile       |
| a  1  Hie hebt ſich an die voꝛ rede vnd •                                   |
| a  2  der pꝛologus vber das buch , daz do ...                               |
| a  3  ...                                                                   |
|                                                                             |
+-----------------------------------------------------------------------------+
| Wohlgeformt | TEI All: nicht geprüft | Schematron editing: nicht geprüft | Gespeichert |
+-----------------------------------------------------------------------------+
```

Word selected, facsimile on, inspector open. Column b of 1r, word `Rotlebín`.

```
+-----------------------------------------------------------------------------+
| Datei  Bearbeiten  Ansicht  Register  Prüfen  Hilfe                         |
+-----------------------------------------------------------------------------+
| [Codex v]  Folio [1r v]  Spalte a (b)                   [Text|XML] [Faks.]  |
+--------------------------------------+--------------------------------------+
| b  ..  ... getrewen díener           |  +--------------------------------+  |
| b  ..  deín , • Dem [Rotlebín] herren|  |  IIIF 00000010                 |  |
|        mer                           |  |    [==== line zone ====]       |  |
| b  ..  teín , • Der ín rechter ...   |  |                                |  |
|        '-- Person Martin: Rotlebín   |  |                                |  |
|            herren merteín --------'  |  |                                |  |
|                                      |  +--------------------------------+  |
+--------------------------------------+--------------------------------------+
| Wort  Rotlebín                                     [Abbrechen] [Anwenden]   |
| Diplomatisch [Rotlebín] (enthält Auszeichnung, im XML bearbeiten)            |
| Normalisiert [Rotlebin]                                                      |
| Auszeichnung  Hervorhebung  Ergänzung  Tilgung  Fremdsprache  Zahl           |
| Register     [Person Martin x]  [Suchen ...          ]  + neu anlegen       |
| Apparat      + Kommentar zur Auswahl                                         |
+-----------------------------------------------------------------------------+
| Wohlgeformt | TEI All: veraltet | Schematron editing: veraltet | Ungespeichert |
+-----------------------------------------------------------------------------+
```

XML view, same selection, inspector in element state.

```
+-----------------------------------------------------------------------------+
| Datei  Bearbeiten  Ansicht  Register  Prüfen  Hilfe                         |
+-----------------------------------------------------------------------------+
| [Codex v]  Folio [1r v]  Spalte a (b)                   [Text|XML] [Faks.]  |
+-----------------------------------------------------------------------------+
|  <ref target="Martin" type="person">                                        |
|    <w norm="Rotlebin" orig="Rotlebín" xml:id="region_..._19l6_1">            |
|      <hi rend="rubrication">Rotlebín</hi>          <- selection              |
|    </w>                                                                     |
|    <w norm="herren" orig="herren" ...>herren</w>                             |
+-----------------------------------------------------------------------------+
| Element  w  region_1639399535558_19l6_1            [Abbrechen] [Anwenden]   |
| Diplomatisch [Rotlebín]   Normalisiert [Rotlebin]   Register [Person Martin] |
+-----------------------------------------------------------------------------+
| Wohlgeformt | TEI All: veraltet | Schematron editing: veraltet | Ungespeichert |
+-----------------------------------------------------------------------------+
```

Labels beyond the agreed menu entries, such as Diplomatisch, Normalisiert, Anwenden and the status values, are working labels until the meeting confirms them.

## Content and interaction hierarchy

Each view below is specified by the six points of the interface yardstick (user task, primary objects, first-decision information, optional depth, navigation targets and addressable states, wide and narrow rendering).

### Text view

1. The user reads a column of the codex line by line and selects the word, sequence or line to work on.
2. Lines (`lb` position, zone), words (diplomatic text, `@orig`, `@norm`, `@xml:id`), register links (type, ID) and apparatus ranges.
3. The diplomatic text in manuscript line order, the column and line position, register chips and apparatus marks, the current selection.
4. Normalised readings, comment text and register details appear in the inspector on selection, and Fließtext is an alternative rendering.
5. Document, folio and column are part of the page address, and the selection maps to the XML view and the facsimile.
6. Wide screens show text and facsimile side by side with the line length of the text capped. Narrow screens show the text alone at full width, lines wrap inside their row and keep their position marker.

### XML view

1. The user inspects or edits the exact source around the current selection.
2. Elements with their names, attributes and positions in the raw string.
3. The source scrolled to the selected element with the selection marked, and well-formedness at the status line.
4. Folding, search in the source, Ctrl+E for allowed elements, the element state of the inspector.
5. The same page address as the text view plus the view switch, and the cursor maps back to a text selection.
6. Wide and narrow screens show the same source column. Long lines wrap visually without horizontal page scrolling, and the facsimile stays available on wide screens.

### Facsimile pane

1. The user compares the selected line or region with the manuscript image.
2. The page image (IIIF stem, size) and zones (ID, type, subtype, points).
3. The image of the current page, the outline of the selected line, the zone overlay when switched on.
4. Zoom, pan, the miniature and marginal regions, which open their record on click.
5. Zone click selects the line or opens the miniature. The pane state (on or off, zones on or off) is a view setting.
6. Wide screens show the pane to the right of the text with a draggable split. Narrow screens stack it above the text at reduced height or hide it, according to the Faksimile switch.

### Inspector

1. The user edits the selected object and applies or cancels the change.
2. The selected word, sequence, line, miniature or element with the fields its state defines.
3. The state name and object identity, the editable fields with their current values, and the reason when a field routes to the XML view.
4. Markup action values, register autocomplete, the comment form and the list of existing comments.
5. Apply and Abbrechen, the jump from a comment or register reference to its target. The inspector state follows the selection and needs no address of its own.
6. Wide screens show it as a bottom bar of draggable height. Narrow screens show it as a full-height sheet over the text, closed by Escape or a close control that returns to the text.

### Miniature form

1. The user describes a miniature and relates it to the codex text.
2. The image-annotation `item` with zone, title, short and long description, object type, height in lines, folio and lines, artists, related persons and places, ICONCLASS entries, content relation and statistical range.
3. Title, the miniature zone outlined in the facsimile, object type, artist sigle with name (BA, Balaam-Meister), and the text range in folio and line terms.
4. Long description, ICONCLASS search with German and English labels, the responsibility values, the jump to the text range in the codex.
5. The miniature (for example `miniatures_01`) is part of the page address when Bildannotationen is chosen. The text range opens the codex at its first word.
6. Wide screens show the form in the bottom bar in two field columns. Narrow screens show it as a full-height sheet in one column.

### Findings list

1. The user finds out why a check failed and goes to the affected place.
2. Findings with document, check (Wohlgeformtheit, TEI All, Schematron phase), location and message.
3. The check and its result, then per finding the message and the location in folio, column and line where it lies in the text.
4. The XML path and the rule identifier of a finding.
5. Choosing a finding selects its location in the text or XML view, and the list opens from the status line or Prüfen, Befundliste.
6. Wide screens show it in the bottom area of draggable height. Narrow screens show it as a full-height sheet.

## Interaction rules

- The selection survives the switch between Text and XML in both directions, and unfinished input stays in the inspector across the switch.
- Escape closes in a fixed order: first an open autocomplete list, then the inspector, then the selection. Each step returns focus to the element that opened the closed layer.
- The unsaved marker stays at the status line until a save of the current revision succeeds.
- A failed check shows its reason at the status line and in the findings list, from which a finding jumps to its location.
- A refused action (a wrap that would split an element, a duplicate register ID) states its reason at the inspector field that triggered it and leaves the source unchanged.
- No control is rendered that cannot work in the detected browser. Native open, in-place save and Zuletzt geöffnet appear only after the File System Access capability check, and the download path replaces in-place save elsewhere.
- Printing and page zoom stay with the browser and get no controls of their own.

## Responsive behaviour

The wide layout places text and facsimile side by side with the inspector below both. The narrow layout shows the text alone, stacks the facsimile above it at reduced height or hides it, and turns the inspector and the findings list into full-height sheets. The menu bar keeps all six menus reachable on narrow screens, the document bar wraps its navigation onto a second row, and no view scrolls the document horizontally. The breakpoint lives in the stylesheet, and reading text stays under 80 characters per line in both layouts.

## Accessibility minima

These minima are acceptance criteria for every view and are checked in the browser tests of [Testing](testing.md).

1. Text and interface elements reach a contrast of at least 4.5:1 against their background, measured on the rendered views.
2. Every focusable element shows a visible focus indicator.
3. Interactive targets measure at least 24 by 24 CSS pixels, including chips, line positions and menu entries.
4. Menu bar, document bar, text selection (word, sequence, line), inspector and autocomplete are fully operable by keyboard.
5. Escape closes the topmost layer and returns focus to its origin.
6. Status changes (well-formedness, validation results, save) are announced to assistive technology, and no state relies on colour alone.
7. Animations and smooth scrolling are disabled under `prefers-reduced-motion`.

## Start page

The fork's start page (`docs/index.html`) states the tool's purpose in one German sentence, namely that it edits the TEI files of the Wenzelsbibel edition locally in the browser against the project's transcription rules. Its primary path is two actions, Projekt öffnen and Datei öffnen, followed by Zuletzt geöffnet where the browser supports it. It carries no marketing copy, no feature list and no counters. Licence and the link to the teiCrafter base sit in a plain footer line.

## Action layer

The action layer of the fork, [CLAUDE.md](../CLAUDE.md), takes this document as its source of design values and translates them into instructions for coding agents. Rules for the content of interface text follow the global UI practice yardstick that the action layer names.
