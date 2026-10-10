# Phase 5a contract for the base mechanisms of the Wenzelsbibel fork, handoff text of 2026-10-10

This is the handoff the fork gives the base teiCrafter for phase 5a, written on 2026-10-10 from the fork's knowledge base, its wireframe after the second feedback round and the base's code at its current revision. The operator carries it into the base's `knowledge/handoff.md`; after integration the base owns the living contract and the fork's [integration document](../knowledge/integration.md#phase-5a-mechanisms) keeps the summary.

teiCrafter builds the mechanisms below in its legacy application under `docs/`, and the Wenzelsbibel fork (wenzelsbibel-teiCrafter) composes them in phase 5b from data and German text in its project folder `docs/js/projects/wenzelsbibel/`, without editing generic code. A mechanism that lacks the configuration point named here would force a base change during 5b or a divergence in the fork. F, N and W numbers refer to the [fork specification](https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter/blob/main/knowledge/specification.md), I1 to I7 to its inherited invariants, which hold for every mechanism below, and D numbers to the [base specification at revision 6d720a6](https://github.com/DigitalHumanitiesCraft/teiCrafter/blob/6d720a632e5ad307e98d7eae536b3d7e8a981bbd/knowledge/specification.md). The fork's wireframe under `wireframe/js/` is the behavioural reference, and its spike `prototypes/d-flow/` is package 1 of the flow view.

## Mechanisms

Acceptance runs in the base on synthetic fixtures, because the edition files and the public fol. 1r excerpt stay in the fork. The fork repeats the full-codex checks with the real files in its phase 6.

| Mechanism | Generic behaviour the base builds | Data the fork supplies | Acceptance the base proves | Serves |
| --- | --- | --- | --- | --- |
| Arbeitsleiste (toolbar) | Two toolbar rows built from a declarative item list of buttons, toggles, segmented switches, value menus, a document select and a status dot. The rows follow the WAI-ARIA toolbar pattern with one Tab stop per row, arrow keys, Home and End, and Down or Up opening a menu on its first or last entry. An action that is not allowed stays visible with `aria-disabled` and its reason as tooltip, and activating it puts the reason into the notice bar. A value menu rebuilds its entries when it opens and marks the value the selection carries. The unsaved dot follows the dirty state of the active document's session. Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+E and Ctrl+F reach their actions, and a field with unapplied typing keeps the browser's own text undo. A control that needs File System Access renders only after the capability check. | Item list and order of both rows, labels and titles as message keys, the markup value menus from the project vocabulary, the disabled-reason callback for project actions, the document chooser entries | Keyboard walk through both rows and their menus, the Axe floor on the shell, a reason on every control in a disabled state, no File System Access control in Firefox, the dot still shown after a refused save | F1, F4, F5, F7, F9, F11, F12, F13, F32, N3 |
| Popover at the selection | One component for the text and the XML view that opens on a selection, anchored inside the text pane below the selection, or above it where there is more room, without covering it or shifting the layout, and that becomes a bottom sheet below the narrow breakpoint. Its head names state, object and place and offers the jump to the XML place and a close control. Its body renders field tables ([Field table schema](#field-table-schema)) with one Anwenden and one Abbrechen per form, and an applied form is one session revision. A field whose binding has no lossless inverse renders as a route to the XML view with its reason. Unfinished input is owned through `staged-input.js`. Escape and the close control return focus to the flow, and after a close, caret moves leave the popover closed until the next click or key in the text. Ctrl+E lists the elements allowed at the selection. | Field tables per state, the operations and queries they name, the vocabulary lists, labels | An applied form changes only its bound source ranges, and one undo restores the exact bytes. A word with inline markup shows the route in place of an editable diplomatic field. A geometry check finds no overlap between popover and selection and an unchanged text pane width. Unapplied input survives the switch between Text and XML and holds a document switch with its reason. | F16, F20, F21, F27 to F31, F35, F36, I2, I7 |
| Seitenleiste (side panel) | A right column shared with the facsimile through a segmented tab row with manual activation. A tab keeps its content unless it is marked fresh, filled tabs are rebuilt after undo and redo, and opening a tab never changes the width of the text pane. Below the narrow breakpoint a tab other than the facsimile is a sheet over the text, and the covered text pane is inert while it is open. Escape closes the panel and returns focus to the control that opened it. | Tab set and labels (Faksimile, Befunde, Verweise, Bild), the tab renderers, the image-annotation form as a field table | Text pane width unchanged on every tab switch, keyboard operation of the tab row, focus return after a close, no focus reachable behind the sheet | F27, F34, F40, F47 |
| Register autocomplete and linking | A combobox over the entries of any list in a register document of the project collection, searching all types together with an optional type filter, each hit with type and ID, and an entry that creates a new one when no hit equals the query. Choosing a hit wraps the selected whole words in one wrapper element as one revision, or refuses with a reason that names the element the wrap would cut. The current link of the selection is read from the written and the read form, and unlinking removes the two tags of the wrapper. Creating an entry writes it to the register document and refuses an existing ID. The references to an entry across the loaded documents open in the side panel with a jump to each. | Register types and labels (vocabulary list `register-type`), the list element per type, the written form `rs[@type][@ref]`, the read form `ref[@type][@target]`, the pointer syntax once the edition team decides it | A wrap inserts exactly one start and one end tag, also across line breaks, punctuation, anchors and whole inline elements, and its removal restores the original bytes. A wrap that would cut an element is refused with the element's name and leaves the source unchanged. A duplicate ID is refused. The reference list shows both forms. | F8, F37 to F40, F55 |
| Flow view | A CodeMirror 6 view hosted by the legacy app that adopts package 1 from the spike (flow model, replace decorations whose gaps are atomic ranges, word snapping, typing limited to the visible text of one word with mirrored attributes, wrap and unwrap plans) and adds packages 2 to 6 of the [fork plan](https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter/blob/main/knowledge/plan.md#phase-5-notes), namely a flow model built for the visible folio window, the wrap command rules, the word commands (a space splits a word, Backspace or Delete at a word boundary joins, Delete removes a selected word, a new word receives an `xml:id`), the vendored bundle with the session handover, and the validation of flow edits. Line numbers stand in the margin, manuscript lines break softly, and chips, punctuation, milestones and line numbers are islands the caret passes over. A refused keystroke emits a reason key at most once per second. | Mark tables (`hi/@rend` values to a class and a non-colour cue), the header selector `fw[@ana='header']` and its marker, chip types, the word and punctuation element names, the identifier pattern for new words, the page label | Byte-identical no-op save for LF and CRLF on a synthetic word-level document of the codex's size. Typing changes only the text of one word and an attribute that equalled it. Each word command is one undo step and refuses with the element it would cut. The keystroke path runs no whole-document parse, scan, index rebuild or checkpoint write, measured as long tasks per keystroke on that document in Chromium and Firefox against the threshold the fork sets for N5. | F5, F14 to F18, F53 to F55, N5 |
| XML view | A CodeMirror XML view of the complete source in the same bundle, replacing the overlay of `source-view.js` in the new shell, because a transparent textarea cannot hide attribute text while its value stays the source. The selection maps to the element on the switch, and the cursor maps back. A project-named list of attributes folds into a small marker on its element as a display decoration, a toolbar switch shows them, and the selected element and the target of a selected pointer show them regardless. The view offers search, Ctrl+E and a well-formedness check after each pause in editing. | The folded attribute names `xml:id` and `facs`, the label of the switch | Folding leaves the source byte-identical, the selection survives both directions of the switch, a deleted end tag is reported with its place after a pause | F6, F19, F20, F21, F45, F57 |
| XML formatieren | A deterministic formatter of the whole document as one revision and one undo step that sets the unsaved marker, built on `src/core/format.js`, under the decisions on whitespace and `xml:space` in [Open decisions](#xmlspace-and-whitespace-in-xml-formatieren) | The block element set, the indentation | Formatting twice equals formatting once, every text-bearing element stays byte-identical, one undo restores the exact bytes | F56, W2 |
| Search | A search field directly above the text area, opened with Ctrl+F, that searches word text in the flow view and the source in the XML view and selects a hit through the selection model | Labels | A hit becomes the selection in the active view, and Escape closes the field and returns focus | F6 |
| Notice bar and findings list | A live region below the toolbar that is present only when something needs action, namely a broken well-formedness with its reason and a jump, a running check with a cancel action, a check result with findings (check, number of findings, first message, an action that opens the findings list), a refused save, or the reason of a refused keystroke or action as a short flash. A clean run confirms briefly, dismisses itself and is announced. The findings list in the side panel groups results by check, names document, place, rule and message per finding, selects the location on choice and marks results that an edit has made outdated. | German framing, check labels, the locator that turns a source offset into folio, column and line | No bar while nothing needs action, a clean run confirmed and announced, a finding's jump selects its location in the text or XML view, results marked outdated after an edit | F44 to F48, F51 |
| Check runs and the schema set | Each check runs on request on its own (well-formedness, each schema-set entry, each Schematron phase), outside the main thread and cancellable. Schematron is included, which today runs synchronously in the page with its abort signal reaching only the schema fetch. A schema-set entry carries `phase` and `gate`, the save gate runs only gating entries, and a reporting entry never blocks saving. Results follow the [findings contract](#findings-contract). | The schema set, TEI All and `wenzelsbibel.sch` with phase `editing` as gate and phase `review` as report | Typing stays responsive during a review run on the synthetic codex-size document, cancel ends the run, review findings never block Save, and the workspace no longer rewrites `defaultPhase` | F9, F46, F49, N5 |
| Facsimile zone layer | Zones drawn from their `@points` polygons as one SVG layer in image coordinates that scales with the zoom, classed by zone `@type` and `@subtype`, styled through tokens and visible while Zonen is on. A click on a line zone selects the line, a line or word selection outlines its zone and brings it into the visible image, and a click on a zone of another subtype calls a handler the project registers. An image that cannot be loaded leaves its reason in the pane, and text and popover stay usable. | The zone style aliases per type and subtype, the subtype handlers (a miniature zone opens its image annotation), the IIIF template already held by the workspace profile | Polygon outlines follow zoom and pan, zone click and text selection map onto each other in both directions, a failed image load shows its reason | F22 to F26 |
| Page address | The active document, its navigation unit and sub-unit and an optional record id kept in the page address, so that reload and the browser history restore them. A switch that would displace unapplied input is refused, and the address returns to what is shown. | The address segments (codex folio and column, image-annotation item) | Reload, back and forward restore document, folio and column, and unapplied input holds the document | F12, F36 |
| Message table | Every new mechanism takes its user-facing text from a project-supplied table with English defaults. Reasons and outcomes travel as a key with parameters, and text from Schematron, RelaxNG and the XML parser passes through unchanged as a parameter. | The German strings ([Message table](#message-table)) | A check that every user-visible string of the new mechanisms resolves through the table | N2, F18, F44 to F51 |
| Token contrast | `--color-review` and `--color-orgName` darkened or given text variants | None | 4.5:1 against white for their use as text colour | N3 |

Adopting package 1 means taking `flow-model.ts`, `flow-state.ts`, `d-flow.ts`, `d-flow.css`, `index.html`, `check.mjs` and `browser-check.mjs` into the base as prototype D, with `HI_CLASS` and the page label of `buildFlow` turned into parameters, while `WRAP_ALLOWED` and `WRAPPERS` stay base defaults under package 3. The public excerpt `fixture/fol1r.xml` stays in the fork, so the base checks run on a synthetic word-level fixture with `w/@orig`, `pc`, `lb`, `hi` and `rs` (F14, F38, F53, F54).

## Field table schema

A field table is data without functions, so it can live in the project folder or later in a manifest (I6). The popover and the side panel render forms from it, and the fork's composition supplies the operations and queries a table names by id, as functions over its models `wenzels-text-model.js`, `wenzels-register-model.js` and `wenzels-image-model.js`.

### Shape

The tables below are the fork's tables for the word states of the wireframe, written in the schema the base renders.

```json
{
  "tables": {
    "word": {
      "state": "word",
      "titleKey": "popover.state.word",
      "form": {
        "stepKey": "step.form",
        "fields": [
          {
            "key": "diplomatic",
            "labelKey": "field.diplomatic",
            "kind": "text",
            "source": { "text": true, "mirror": ["orig"] },
            "validate": { "required": "field.refused.emptyWord", "noWhitespace": "field.refused.space" },
            "routeKey": "field.route.innerMarkup"
          },
          {
            "key": "normalised",
            "labelKey": "field.normalised",
            "kind": "text",
            "source": { "attribute": "norm" },
            "absentKey": "field.absent.norm"
          }
        ]
      },
      "sections": ["register", "apparatus", "images"]
    },
    "sequence": {
      "state": "sequence",
      "titleKey": "popover.state.sequence",
      "sections": ["register", "apparatus", "images"]
    },
    "line": {
      "state": "line",
      "titleKey": "popover.state.line",
      "fields": [
        { "key": "zone", "labelKey": "line.zone", "kind": "readonly", "source": { "of": "line", "attribute": "facs" } }
      ],
      "rows": {
        "each": "word",
        "activate": "word",
        "fields": [
          { "key": "diplomatic", "kind": "readonly", "source": { "text": true } },
          { "key": "normalised", "kind": "readonly", "source": { "attribute": "norm" }, "absentKey": "line.noNorm" }
        ]
      }
    },
    "element": [
      { "match": ["w"], "use": "word" },
      { "match": ["rs", "ref"], "use": "sequence", "select": "words" },
      { "match": ["app"], "form": "comment" },
      { "match": ["item"], "panel": "image" },
      {
        "match": "*",
        "fields": [
          { "key": "attributes", "kind": "readonly", "source": { "attributes": "*" } },
          { "key": "source", "kind": "route", "labelKey": "field.route.action" }
        ]
      }
    ]
  },
  "sections": {
    "register": {
      "field": {
        "key": "register",
        "labelKey": "field.register",
        "kind": "autocomplete",
        "register": ["person", "place", "folk"],
        "source": { "wrapper": { "rs": "ref", "ref": "target" } },
        "commit": "pick",
        "operation": "register.link",
        "actions": ["register.unlink", "register.refs"],
        "create": "register-entry"
      }
    },
    "apparatus": {
      "titleKey": "section.apparatus",
      "records": "apparatus.covering",
      "form": "comment",
      "create": "comment-new",
      "createKey": "apparatus.add",
      "emptyKey": "apparatus.none"
    },
    "images": {
      "titleKey": "section.images",
      "records": "images.covering",
      "panel": "image"
    }
  },
  "forms": {
    "comment": {
      "operation": "apparatus.update",
      "stepKey": "step.comment.edit",
      "fields": [
        { "key": "type", "labelKey": "field.commentType", "kind": "readonly", "source": { "attribute": "type" } },
        { "key": "de", "labelKey": "field.noteDe", "kind": "text", "multiline": true, "source": { "child": "note", "where": { "xml:lang": "de" } }, "validate": { "required": "apparatus.noteEmpty" } },
        { "key": "en", "labelKey": "field.noteEn", "kind": "text", "multiline": true, "source": { "child": "note", "where": { "xml:lang": "en" } } }
      ]
    },
    "comment-new": {
      "operation": "apparatus.create",
      "stepKey": "step.comment.create",
      "fields": [
        { "key": "type", "labelKey": "field.commentType", "kind": "select", "vocabulary": "apparatus-type", "offered": true },
        { "key": "de", "labelKey": "field.noteDe", "kind": "text", "multiline": true, "validate": { "required": "apparatus.missing.de" } },
        { "key": "en", "labelKey": "field.noteEn", "kind": "text", "multiline": true, "validate": { "required": "apparatus.missing.en" } },
        { "key": "sigle", "labelKey": "field.sigle", "kind": "text", "helpKey": "field.sigle.help", "validate": { "required": "apparatus.missing.sigle" } }
      ]
    },
    "register-entry": {
      "operation": "register.create",
      "stepKey": "step.register.create",
      "fields": [
        { "key": "type", "labelKey": "field.registerType", "kind": "select", "vocabulary": "register-type" },
        { "key": "id", "labelKey": "field.id", "kind": "text", "prefill": "selection", "validate": { "required": "register.create.refused.emptyId", "unique": "register-id" } },
        { "key": "name", "labelKey": "field.preferredName", "kind": "text", "prefill": "selection" }
      ]
    }
  }
}
```

### Field properties

| Property | Kinds | Meaning |
| --- | --- | --- |
| `key` | all | Stable name of the field, the key of its value for an operation and for staged recovery |
| `labelKey`, `helpKey` | all | Message keys of the visible label and of the description tied to the control by `aria-describedby` |
| `kind` | all | `text`, `select`, `autocomplete`, `readonly` or `route` |
| `source` | all | What the field reads and, in a form without `operation`, writes. `{ "text": true }` is the element's text content, and `mirror` names attributes that follow the text where they equalled it before the edit. `{ "attribute": "norm" }` is one attribute. `{ "child": "note", "where": { "xml:lang": "de" } }` is the text of one child element. `{ "wrapper": { "rs": "ref", "ref": "target" } }` is the pointer of the enclosing wrapper, read from either element. `{ "attributes": "*" }` lists every attribute, for `readonly` only. `"of": "line"` reads from the element that opens the selected line in place of the selected element. |
| `multiline`, `rows`, `inputType` | `text` | A textarea, its height, an input type such as number |
| `vocabulary`, `offered`, `options`, `multiple` | `select` | The key of a list in the project vocabulary, a filter to values marked offered, inline value and label-key pairs where no list exists, several values stored as space-separated tokens |
| `register`, `commit`, `operation`, `actions`, `create` | `autocomplete` | The register types searched, `pick` to run the operation on choosing a hit as its own revision or `apply` to stage the chosen ID until Anwenden, the operation, the actions on the current value, the form that "+ neu anlegen" opens |
| `validate` | `text`, `select`, `autocomplete` | `required`, `noWhitespace`, `pattern`, `integer` and `unique` (a named index the project supplies). A string value names the message key of the refusal, and `true` uses the base default. |
| `routeKey`, `absentKey` | `text`, `readonly` | The reason shown when the binding has no lossless inverse, the note shown when the bound attribute is absent |
| `prefill` | `text` | `selection` fills the field with the selected text |

| Kind | Renders | Writes |
| --- | --- | --- |
| `text` | A single-line input, or a textarea with `multiline` | The bound text or attribute on Anwenden, or the value passed to the form's operation |
| `select` | A select over a vocabulary list or inline options, with multiple choice under `multiple` | The chosen value, several as space-separated tokens |
| `autocomplete` | A combobox over the register lists named in `register` | Under `commit: "pick"` the operation on choosing a hit, under `commit: "apply"` the chosen ID staged until Anwenden |
| `readonly` | The bound value as text | Nothing |
| `route` | The reason and an action that opens the XML view at the bound element | Nothing |

### Apply rules

- A form has one Anwenden and one Abbrechen, and Enter in a single-line field applies the form. Anwenden writes every changed field as one session revision named by `stepKey`, with the labels of the changed fields as parameter `fields` (F5, F28).
- Abbrechen restores the values of the current revision and keeps the popover open.
- A form without changed values writes nothing and says so with `form.noChange`.
- A refused value states its reason at the field that triggered it, with `aria-invalid` and `aria-describedby`, and changes nothing (F33, F55).
- A `text` binding whose element or child has element children has no lossless inverse and renders as `route` with `routeKey` or the default reason. A word with inline markup therefore keeps an editable normalised field while its diplomatic field routes (I7, F29).
- Entering a value for an absent attribute adds it and changes nothing else, and emptying a field without `required` removes the attribute (F29, US1.2).
- A `mirror` attribute follows the text only where it equalled the text before the edit, as the spike's `planUserEdit` does (F18, F29).
- Literal escaping and the refusal of XML-illegal characters apply to every field through the base (D.8) and are not configured per table.
- A form without `operation` is written by the base's generic writer over `tei-document.js` (`editTextAndAttrs`, `addAttr`, `removeAttr`). A form with `operation` passes the changed values to the project function, which returns the next document or a refusal key with the field it concerns.
- A record section renders one form per record with its own Anwenden, and the form that creates a record opens inside the section (F30, F41, F42, F43).
- A form's unapplied values are staged input under the workspace's `stagedMode` and survive the switch between Text and XML (F36).

The fork's design document and F28 still describe Anwenden and Abbrechen per field, which the wireframe renders as two pairs in the word state, and the fork plan lists that as an open observation. One pair per form settles it, and the fork aligns its documents.

### States from the wireframe

| State | Opened by | Content in the wireframe |
| --- | --- | --- |
| Wort | A click on a word or the caret in a word | Diplomatisch and Normalisiert, the register field with the current chip, Verknüpfung lösen and Verweise, the apparatus section with the covering comments and "+ Kommentar", the images whose text range covers the word |
| Wortfolge | A drag or Shift+Arrow, snapped to whole words | The register field, the apparatus section with the comment form inside it, the images section |
| Zeile | A click on the line number or on a line zone | The line's zone and its words as rows with diplomatic and normalised reading, each row opening Wort |
| Element | The cursor in the XML view | Name and attributes with the route to the source, or the table of `w`, of `rs` and `ref`, of `app` and of `item` |

### Compatibility with wenzels-form.js

| `mountWenzelsForm` field spec | Field table |
| --- | --- |
| `key` | `key` |
| `label` | `labelKey` |
| `options` | `vocabulary`, or `options` as value and label-key pairs |
| `multiple` | `multiple` on `select` |
| `multiline`, `rows` | `multiline`, `rows` on `text` |
| `type` | `inputType` on `text` |
| `required` | `validate.required` |
| `readOnly` | kind `readonly`, or `route` where the reason is inner markup |
| `help` | `helpKey` |
| `list` (datalist) | kind `autocomplete` |
| `placeholder` | Dropped, because a placeholder reads as a filled value |
| One Apply per form calling `onApply(values)` | One Anwenden per form calling `operation` |
| `stagedInput.mount` with the literal mode `"wenzels"` | The same staged contract, with the mode taken from the workspace object's `stagedMode` |

The renderer replaces the three staged-form copies the base carries (`wenzels-form.js`, `formField` with `mountForm` in `entry-workspace.js`, the witness form in `witness-workspace.js`), so 5a adds no fourth copy.

## Interfaces

### Composition

The fork composes its `editor.html` from factories that take their host element and context as arguments and touch no element by id, so the same factories can serve the base shell in `editor-app.js`. `validation-view.js` renders into the fixed ids `ed-val-chip` and `ed-val-pop` today, and its run and result interface is therefore separated from that rendering ([findings contract](#findings-contract)). The composition holds one selection channel and one message table and passes both to every factory (F1, F27, N2).

### Selection model

```js
/**
 * @typedef {object} Selection
 * @property {string} doc        Member id in the project collection (codex, image annotations)
 * @property {number} sessionId
 * @property {number} revision   Session revision the offsets belong to
 * @property {"text"|"xml"} view
 * @property {"word"|"sequence"|"line"|"element"} state
 * @property {{ id: string|null, start: number, end: number }[]} words
 *           Whole word elements in document order, raw outer offsets
 * @property {{ id: string|null, start: number, facs: string|null }|null} line
 *           The lb that opens the selected line, state "line" only
 * @property {{ name: string, start: number, end: number }|null} element
 *           Innermost element at the XML cursor, state "element" only
 * @property {{ folio: string, column: string|null, line: string }|null} place
 *           From the project locator, for titles and findings (F48)
 */
const selection = createSelectionChannel();
selection.current();                         // Selection | null
selection.set(next, { changed });            // the flow and XML views only
selection.on("change", ({ selection, changed }) => {});
```

The flow and XML views publish the selection, and toolbar, popover, side panel, facsimile and search read it. A change between word, sequence and line counts as `changed` even when the words stay the same, and a caret move inside the same word publishes with `changed: false`, so the popover only moves (F16). While the mouse button is held in the flow only the highlight follows, and the channel publishes on release (wireframe `flow.js`).

### View events

```js
flowView.on("refused", ({ key, params }) => {});        // at most once per second (F18)
flowView.on("edit", ({ revision }) => {});
flowView.on("column", ({ column }) => {});
xmlView.on("wellformed", ({ ok, reason, start }) => {}); // after a pause in editing (F45)
```

### Toolbar

```js
const toolbar = createToolbar(host, {
  rows,      // [ToolbarItem[], ToolbarItem[]], rendered in this order (F1)
  messages,  // the message table
  context,   // () => ToolbarContext
  reason,    // (actionId, ToolbarContext) => null | { key, params }, the disabled-with-reason callback
  run,       // (actionId, ToolbarContext, value?) => void
});
toolbar.sync();       // re-evaluates reasons and pressed states, at most once per frame
toolbar.closeMenus();
toolbar.isMenuOpen();

/** @typedef {{ id: string, kind: "button"|"toggle"|"segmented"|"menu"|"select"|"status",
 *   labelKey: string, titleKey?: string, shortcut?: string, capability?: "fileSystemAccess",
 *   entries?: (ctx: ToolbarContext) => MenuEntry[], options?: { value: string, labelKey: string }[] }} ToolbarItem */
/** @typedef {{ id: string, value?: string, labelKey?: string, label?: string,
 *   checked?: boolean, captionKey?: string, separator?: boolean }} MenuEntry */
/** @typedef {{ selection: Selection|null, view: "text"|"xml", doc: string, dirty: boolean,
 *   undoLabel: string|null, redoLabel: string|null, panel: string|null, zones: boolean }} ToolbarContext */
```

The base supplies default reasons for its own actions (undo, redo, save, download, zones, format, findings), and the project's `reason` callback adds the reasons of project actions and may refine a base reason. A control in a disabled state stays focusable, carries `aria-disabled="true"` and the reason as `title`, and its activation sends the reason to the notice bar. A menu whose action is disabled does not open. `sync` runs on selection, view, history, panel and document changes (F1, F13).

### Popover

```js
const popover = createPopover(textPane, {
  tables,      // field tables
  vocabulary,  // lists of the project vocabulary by key
  registers,   // () => RegisterList[] over the register documents of the collection
  operations,  // { [id]: (doc, selection, values, collection) => { doc } | { refused: { key, params, field? } } }
  queries,     // { [id]: (doc, selection, collection) => RecordRef[] } for record sections
  messages, session, stagedInput, selection,
  anchor,      // (Selection) => DOMRect | null, from the active view
  locate,      // (offset) => { folio, column, line } | null, the project locator
  narrow,      // MediaQueryList of the narrow layout
  onRoute,     // ({ start, end }) => void, opens the XML view at the target
  onPanel,     // (tabId, payload) => void, opens a side panel tab
});
popover.show(selection);          // also the reaction to a changed selection
popover.refresh();                // after undo or redo, focus kept at the same control position
popover.close({ returnFocus: true });
popover.isOpen();
popover.note(key, params);        // short message under the head
popover.chooseElement(elements);  // the Ctrl+E list at the selection (F21)
popover.on("applied", ({ form, revision }) => {});
popover.on("closed", () => {});
```

A click outside the popover, the text, the toolbar, the notice bar and an open autocomplete list closes the popover and keeps the selection. In the XML view the popover follows the element at the cursor, and a selection without a visible anchor detaches it until an anchor exists again (F20, F27, F35).

### Side panel

```js
const panel = createSidePanel(column, {
  tabs,      // [{ id, labelKey, render: (body, payload) => void, fresh?: boolean }]
  messages, narrow, textPane,
});
panel.show(tabId, payload);  // opens the column on a tab and renders it when fresh or still empty
panel.close();               // returns focus to the control that opened the column
panel.current();             // tab id or null
panel.refresh();             // after undo or redo
panel.note(key, params);     // short message under the tab row
panel.on("tab", ({ id }) => {});
```

### Notice bar

```js
const notice = createNoticeBar(host, { messages, live });
notice.flash(key, params);        // short message, then back to the standing content
notice.standing(content | null);  // { key, params, detailKey?, detailParams?, actions: [{ labelKey, run }] }
notice.announce(key, params);     // live region only, for a clean run without a visible bar
bindValidation({ validation, notice, panel, locate, messages });  // base adapter over check results
```

A message about the selection goes to the popover note while the popover is open and to the notice bar otherwise. The bar takes its colours from the state tokens and states check and result in words (F44, F45, F46).

### Escape order

The base installs one Escape handler in the capture phase, so that the facsimile viewer cannot swallow the key. Each press closes one layer in the order open autocomplete list, open toolbar menu, side panel holding the focus, popover, side panel, selection, and returns focus to the control that opened the closed layer. Each factory exposes `isOpen` and `close` for it (F27, N3).

## Message table

```js
// One table per language, supplied by the project. A value is a string with {name}
// placeholders or, where a count decides the form, an object with one and other.
export const messages = {
  "history.undone": "Rückgängig: {label}.",
  "finding.count": { one: "{count} Befund", other: "{count} Befunde" },
};
```

- The base resolves a key against the project table and falls back to its English default, so a missing German string shows English and never a key (N2).
- Refusals, disabled states and outcomes travel as `{ key, params }` and never as finished sentences (F18, F33, F55).
- Text from an engine, a Schematron message, a RelaxNG diagnostic or a parser error, is a parameter and passes unchanged. The project Schematron already writes German messages.
- The session stores an undo step's name as key and parameters and resolves it when shown (F5).
- Control labels and titles are message keys named in the item lists and field tables. Messages of the fork's project operations, such as the image-annotation form or model errors, are keys the fork names in its tables and stay outside the lists below.
- The wireframe's stub answer "Noch ohne Funktion." and its badge are not carried, because the product renders no control without a function.

The strings are the wireframe's today. "none yet" marks a base message for which the fork has no German string yet.

### Flow view and word commands (F18, F33, F54, F55)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `flow.refused.crossWord` | | `Tippen ändert nur das Wort unter dem Caret. Wörter teilen, verbinden oder löschen geht in der XML-Ansicht.` |
| `flow.refused.space` | | `Ein Leerzeichen würde das Wort teilen; Wörter teilen geht in der XML-Ansicht.` |
| `flow.refused.lineBreak` | | `Zeilen und Absätze sind Struktur und werden im XML bearbeitet.` |
| `flow.refused.emptyWord` | | `Das ganze Wort zu löschen ist eine Strukturänderung; sie geht in der XML-Ansicht.` |
| `flow.refused.markupCharacter` | `character` | none yet, the spike refuses `<` and `&` in English |
| `flow.refused.tag` | | none yet, the spike refuses an edit that touches a tag in English |
| `flow.refused.drag` | | none yet, the wireframe drops a drag silently |
| `word.split.refused`, `word.join.refused`, `word.delete.refused` | `element` | none yet |

F18 turns a space inside a word, Backspace or Delete at a word boundary and Delete on a selected word into word commands, so the fork rewrites `flow.refused.crossWord`, `flow.refused.space` and `flow.refused.emptyWord` for the cases that stay refused.

### Wrap and markup actions (F32, F33, F38, F55)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `wrap.refused.noSelection` | | `Zum Verknüpfen zuerst Wörter im Text auswählen.` |
| `wrap.refused.cuts` | `element`, `attribute`, `value` | `Nicht verknüpft: Die Auswahl würde das Element {element} ({attribute}="{value}") teilen. Das ganze Element oder nur Wörter darin wählen.` |
| `wrap.refused.cutsLink` | `element`, `type`, `id`, `text` | `Nicht verknüpft: Die Auswahl würde das Element {element} des Verweises {type}: {id} („{text}“) teilen. Den ganzen Verweis oder kein Wort daraus wählen.` |
| `wrap.refused.containsLink` | `element`, `type`, `id`, `text` | `Nicht verknüpft: Die Auswahl enthält bereits das Element {element} des Verweises {type}: {id} („{text}“). Zuerst die Verknüpfung lösen.` |
| `wrap.refused.notAllowed` | `element` | none yet, the spike names an element an `rs` may not enclose |
| `markup.refused.noSelection` | | `Erst Wörter im Text auswählen.` |
| `markup.refused.nested` | `word`, `element` | `„{word}“ steht bereits in <{element}>. Verschachteltes Markup wird in der XML-Ansicht angelegt.` |
| `markup.refused.partial` | `element`, `count` | `Die Auswahl umfasst nur einen Teil des Elements <{element}> ({count} Wörter). Ein Teilwechsel würde es teilen. Das ganze Element auswählen.` |
| `markup.refused.crossesLink` | `id` | `Die Auswahl schneidet den Registerverweis <ref> „{id}“ an seiner Grenze. Das Element würde geteilt.` |
| `markup.alreadySet` | `element`, `attribute`, `value` | `<{element} {attribute}="{value}"> ist bereits gesetzt.` |
| `markup.applied` | `element`, `attribute`, `value`, `scope` | `<{element} {attribute}="{value}"> um {scope} gelegt.` |
| `markup.applied.attribute` | `path`, `value`, `scope` | `hi/@rend="{value}" auf {scope} angewendet.` |
| `markup.replaced` | `old`, `value` | ` {old} durch {value} ersetzt.` |
| `markup.scope` | `count` | one `das Wort`, other `{count} Wörter` |

The wireframe phrases the cut of a marginal `seg` separately as `Nicht verknüpft: Die Auswahl würde das Element seg der Marginalie teilen. Die Auswahl ganz innerhalb oder ganz außerhalb der Marginalie legen.`, which `wrap.refused.cuts` covers once the fork words it from the element's parameters.

### Register (F37 to F40)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `register.linked` | `type`, `id` | `Verknüpft mit {type}: {id}.` |
| `register.unlinked` | `type`, `id` | `Verknüpfung mit {type}: {id} gelöst.` |
| `register.state.none` | | `Nicht verknüpft` |
| `register.state.partial` | | `Teilweise verknüpft` |
| `register.unlink` | | `Verknüpfung lösen` |
| `register.refs` | | `Verweise` |
| `register.query` | | `Eintrag suchen oder anlegen …` |
| `register.typeFilter`, `register.typeAll` | | `Registertyp`, `Alle` |
| `register.hits` | | `Registertreffer` |
| `register.hit.count` | `count` | one `{count} Verweis im Codex`, other `{count} Verweise im Codex` |
| `register.create`, `register.create.hint` | | `+ neu anlegen`, `aus der Auswahl` |
| `register.create.refused.emptyId` | | `Nicht angelegt: Die ID darf nicht leer sein.` |
| `register.create.refused.duplicate` | `id`, `type` | `Nicht angelegt: Die ID „{id}“ besteht bereits ({type}).` |
| `register.create.searched` | `query` | `Gesucht war „{query}“.` |
| `refs.title` | `type`, `id` | `Verweise auf {type}: {id}` |
| `refs.none` | `folio` | `Kein Verweis auf fol. {folio}.` |
| `refs.entryGone` | `type`, `id` | `Der Eintrag {type}: {id} besteht nicht mehr.` |
| `refs.search` | | `Anderen Eintrag suchen` |
| `refs.notLinked` | | `Die Auswahl ist nicht verknüpft. Eintrag suchen:` |
| `refs.noHit` | | `Kein Eintrag gefunden.` |

### Disabled reasons of the toolbar (F1, F5, F7, F47, F50)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `action.disabled.noSelection` | | `Erst ein Wort, eine Wortfolge oder eine Zeile im Text auswählen.` |
| `action.disabled.otherDocument` | `document` | `Gilt für den Codex. Erst im Dokumentwähler Codex 2759 wählen.` |
| `history.disabled.undo` | `document` | `Nichts rückgängig zu machen in {document}.` |
| `history.disabled.redo` | `document` | `Nichts zu wiederholen in {document}.` |
| `zones.disabled.noFacsimile` | | `Erst das Faksimile einblenden.` |
| `format.disabled.noSource` | `document` | `XML formatieren gilt für den Codex; die Bildannotationen haben hier kein XML.` |
| `findings.disabled.noRun` | | `Noch keine Prüfung gelaufen.` |
| `download.disabled.notValidated` | | `Erst Speichern; heruntergeladen werden nur Bytes, die den Schemasatz bestanden haben.` |

### Undo and redo (F5)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `history.undone` | `label` | `Rückgängig: {label}.` |
| `history.redone` | `label` | `Wiederholt: {label}.` |
| `step.form` | `fields` | `Diplomatisch`, `Normalisiert` (one step per field today) |
| `step.typing` | `word` | `Diplomatisch` |
| `step.word.split`, `step.word.join`, `step.word.delete` | `word` | none yet |
| `step.register.link` | `type`, `id` | `Verknüpfen` |
| `step.register.create` | `type`, `id` | `Eintrag anlegen` |
| `step.register.unlink` | `type`, `id` | `Verknüpfung lösen` |
| `step.comment.create` | | `Apparatkommentar` |
| `step.comment.edit` | | `Apparatkommentar bearbeiten` |
| `step.markup` | `element`, `attribute`, `value` | `Hervorhebung {value}` for `hi`, `{element} {value}` otherwise |
| `step.format` | | `XML formatieren` |
| `step.imageAnnotation` | `id`, `fields` | `Bildannotation {id}: {fields}` |

### Popover and forms (F16, F27 to F31, F36)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `popover.state.word`, `popover.state.sequence` | | `Wort`, `Wortfolge` |
| `popover.state.line` | `line` | `Zeile {line}` |
| `popover.state.header` | | `Kopfzeile` |
| `popover.place` | `folio`, `column` | `fol. {folio} {column}` |
| `popover.line` | `line` | `Z. {line}` |
| `popover.lineRange` | `from`, `to` | `{from} bis {to}` |
| `popover.words` | `count` | `{count} Wörter` |
| `popover.toXml`, `popover.toText`, `popover.close` | | `XML-Stelle`, `Im Text zeigen`, `Zum Text` |
| `form.apply`, `form.cancel` | | `Anwenden`, `Abbrechen` |
| `form.noChange` | | `Keine Änderung.` (per field today, `Keine Änderung an der diplomatischen Lesung.`) |
| `form.applied` | `fields` | `Übernommen: {fields}.` (per field today, `Diplomatische Lesung „{value}“ übernommen.`) |
| `form.cancelled` | | `Eingaben verworfen, die gespeicherten Werte sind wiederhergestellt.` |
| `field.route.innerMarkup` | | `Enthält Binnen-Markup, Bearbeitung in der XML-Ansicht` |
| `field.route.action` | | `In der XML-Ansicht bearbeiten` |
| `field.route.missing` | | `Das Wort steht nicht im XML.` |
| `field.refused.emptyWord` | | `Ein Wort braucht Text. Wörter löschen geht über die XML-Ansicht.` |
| `field.refused.space` | | `Ein Leerzeichen würde das Wort teilen. Wörter teilen geht über die XML-Ansicht.` |
| `field.absent.norm` | | `Kein @norm im Bestand` |
| `line.zone` | `zone` | `Zone {zone}`, `keine` without a zone |
| `line.words`, `line.noNorm` | | `Wörter der Zeile`, `ohne @norm` |
| `line.word` | `diplomatic`, `normalised` | `{diplomatic}, normalisiert {normalised}` |
| `element.choice` | | `Element für Auswahl` |
| `element.noRegisterField` | | `Kein Registerfeld für diese Auswahl.` |
| `staged.blocked` | `action` | `Die Eingabe ist weder angewendet noch abgebrochen. Erst Anwenden oder Abbrechen, dann das Dokument wechseln.` |
| `staged.stale` | | none yet, the base says in English that the document changed since the input was opened |

### Checks, notice bar and findings (F44 to F48)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `check.label.wellformed` | | `Wohlgeformtheit` |
| `check.label.schema` | `name` | `{name}`, as in `TEI All` |
| `check.label.phase` | `name`, `phase` | `Schematron {phase}` |
| `check.running` | `check` | `{check} läuft …` |
| `check.running.detail` | | `Der Text bleibt bearbeitbar.` |
| `check.cancel` | | `Abbrechen` |
| `check.busy` | `check` | `{check} läuft noch. Erst abwarten oder abbrechen.` |
| `check.cancelled` | `check` | `{check} abgebrochen. Kein Ergebnis.` |
| `check.clean.wellformed` | `check` | `{check}: wohlgeformt.` |
| `check.clean` | `check` | `{check}: keine Befunde.` |
| `check.findings` | `check`, `count` | `{check}: {count}`, with `count` from `finding.count` |
| `check.findings.split` | `check`, `count`, `errors`, `warnings` | `{check}: {count} ({errors} Fehler, {warnings} Warnungen)` |
| `check.firstFinding` | `message`, `place` | `{message} {place}` |
| `check.unavailable` | `check`, `reason` | none yet |
| `check.stale` | | `Ergebnis veraltet, Prüfung erneut ausführen.` |
| `wellformed.broken`, `wellformed.jump` | `reason`, `place` | none yet, the wireframe checks well-formedness only on request |
| `findings.show` | | `Befunde anzeigen` |
| `finding.count` | `count` | one `{count} Befund`, other `{count} Befunde` |
| `findings.title` | | `Befunde` |
| `findings.none` | | `Noch keine Prüfung gelaufen. Prüfen in der Arbeitsleiste startet eine.` |
| `findings.group` | `count`, `errors` | `{count}, {errors} Fehler`, `keine Befunde` without findings, `, veraltet` appended when outdated |
| `finding.role.error`, `finding.role.warning` | | `Fehler`, `Warnung` |
| `findings.jump.outdated` | `what` | `Ergebnis veraltet: {what}. Prüfung erneut ausführen.` |
| `findings.jump.gone` | `id` | `das Wort {id} besteht nicht mehr` |
| `findings.jump.moved` | `before`, `now` | `an der Stelle stand „{before}“, jetzt steht dort „{now}“` |
| `findings.jump.noWord` | `line` | `Die Zeile {line} enthält kein Wort, an dem der Befund gezeigt werden kann.` |
| `format.applied` | | `Formatierung ist eine Änderung am ganzen Dokument und wird erst beim Speichern wirksam.` |

### Save (F49 to F51)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `save.running` | `check` | `Speichern: {check}` |
| `save.cancelled` | | `Speichern abgebrochen. Nichts geschrieben.` |
| `save.refused` | `checks` | `Nicht gespeichert: {checks}.` |
| `save.refused.part` | `check`, `count` | `{check} mit {count}` |
| `save.refused.detail` | | `Nichts geschrieben, die Änderungen bleiben ungesichert.` |
| `save.written` | `name` | `Gespeichert.` |
| `save.externalChange`, `save.stale`, `save.inPlaceFailed`, `download.requested` | `name`, `reason` | none yet, `output-controller.js` reports these in English |
| `unsaved`, `unsaved.title` | | `ungesichert`, `Ungesicherte Änderungen` |

### Facsimile and page address (F12, F22, F26)

| Key | Parameters | String in the wireframe |
| --- | --- | --- |
| `facsimile.loading` | | `Faksimile wird geladen …` |
| `facsimile.failed` | `service` | `Das Faksimile konnte vom Bildserver der ÖNB nicht geladen werden. Text und Bearbeitung bleiben nutzbar.` |
| `address.unknown` | `address` | `Die Adresse {address} bezeichnet keine Stelle in dieser Datei.` |
| `address.missingUnit` | `unit`, `available` | `Fol. {unit} liegt nicht in dieser Datei, sie enthält nur fol. {available}.` |
| `address.missingRecord` | `id`, `unit` | `Die Bildannotation {id} gibt es auf fol. {unit} nicht.` |

## Findings contract

The fork's findings list and notice bar render check results without parsing engine output, so every result and diagnostic carries the fields below (F46, F47, F48, F49, F51).

```js
/** One record per check run, bound to the revision it validated. */
const CheckResult = {
  check: { id, kind, name, phase, gate },  // kind: "wellformed" | "relaxng" | "xsd" | "schematron" | "schematron-xsl"
  document: { id, name, role },            // member of the project collection
  sessionId, revision, schemaKey,
  status,                                  // "valid" | "invalid" | "unavailable" | "cancelled"
  reason,                                  // engine text when unavailable, otherwise null
  diagnostics: [Diagnostic],
};
const Diagnostic = {
  ruleId,     // @id of the failed assert or matched report, raw runtime and SVRL alike, null for RelaxNG and the parser
  role,       // @role as written in the Schematron, "error" where the engine has none
  message,    // engine or Schematron text, unchanged
  location: {
    path,     // XPath of the context node (Schematron nodePath, SVRL @location), or null
    start,    // raw offset range of the located node in the validated string, or null
    end,
    line,     // line and column where the engine reports them (libxml2, the XML parser), or null
    column,
  },
  document,   // document id, repeated so that a merged list stays self-describing
};
```

- Both Schematron paths carry `ruleId` and `role`. Today the raw path in `schema-validation.js` keeps `role` but reads no `@id` of an assert or report, and the compiled SVRL path keeps only `@location` (F47).
- The base resolves `start` and `end` from `path` through the offset tree of the validated revision, or from `line` and `column`, so that choosing a finding selects its location. The findings list asks the project locator for folio, column and line (F47, F48).
- `run(checkId, { phase })` starts one check, `cancel()` ends it, and the validation controller emits `running`, `result`, `stale` and `cancelled`. Today `validation-view.js` runs the whole schema set in one call and renders into its own elements (F9, F46).
- An edit marks earlier results `stale` and keeps them readable, so the findings list can say that they are outdated. A stale result still never authorizes output (F47, I4).
- The save gate evaluates only entries with `gate: true`, and a refused save returns the failing `CheckResult` records so the notice bar names them (F49, F51).
- The phase comes from the schema-set entry or the run, replacing the rewrite of `defaultPhase` that the workspace's review action performs today (F9).
- Whether a result whose diagnostics all carry `role="warning"` counts as `invalid` is the base's choice. The fork needs only that a reporting entry never gates saving, and the notice bar counts errors and warnings separately.

## Open decisions for the base

### `src/` and the vendored bundle

The base plan states that the source-first rebuild under `src/` writes nothing into `docs/`. The flow view and the XML view need CodeMirror in the legacy app, and the spike imports `src/core/tei-document.js`, `src/core/well-formed.ts` and `src/editor/offsets.ts`. `docs/js/editor/tei-document.js` and `src/core/tei-document.js` are byte-identical in the base and in the fork, so the parser seam reduces to module identity, meaning whether the bundle imports the legacy module URL or carries its own copy, and to the build step that writes the bundle into `docs/vendor/`. One reading limits the plan sentence to the rebuild phase, so a prebuilt bundle vendored for the legacy app does not contradict it. The other keeps every `src/` module out of `docs/`, and the views then use only the vendored CodeMirror packages over the legacy modules. The fork needs the decision before package 5 and prefers the first reading, because package 1 already runs on `src/core` and `src/editor` and the offset translation for CRLF files lives in `offsets.ts` (F14, F53, I3). The fork's specification still says that the fork does not use `src/`, and the fork amends that sentence to the bundle once the base has decided.

### `xml:space` and whitespace in XML formatieren

F56 asks for formatting of the whole document in which empty elements become self-closing, indentation is two spaces with one element per line, text-bearing elements stay on one line and whitespace-only text nodes are dropped. `src/core/format.js` formats the innermost block element at the cursor, treats two inline siblings on one line as content because the whitespace between them separates words, never rewrites an empty element and has no `xml:space` handling. The base specification S.8 for the source-first core limits formatting to whitespace and puts a before and after comparison first. Three points need the base's decision. The first is whether elements under `xml:space="preserve"` stay byte-identical, which the fork recommends, or whether the formatting is refused for such a document. The second is whether rewriting `<pb></pb>` as `<pb/>` is allowed under a whitespace-only rule, since the public excerpt writes every empty element with an end tag. The third is whether the whole-document action runs without the comparison and announces its scope in the notice bar instead, as the fork's design has it. The fork needs these before its phase 8 formats the edition files once (F56, W2).

### The EditorSession seam and its cost

Each flow transaction has to become one `EditorSession` revision with undo owned by the session, so that Rückgängig restores exact earlier strings and the unsaved dot is correct (F5, F13), while the codex stays responsive under typing (N5). A critic in the fork's audit claimed that this seam forces a full parse and a full diff of the codex on every keystroke. Reading `editor-session.js`, `editor-app.js`, `tei-document.js` and the spike confirms the claim for the legacy commit path, in a narrower form.

`EditorSession.replace(nextState, label)` parses nothing itself. It requires a state whose `doc.raw` is a string and computes `minimalPatch(before, after)`, a common-prefix and common-suffix scan over both strings, which is linear in the document length and no structural diff. The whole-document parse comes from the callers. Every mutation of the legacy `tei-document.js` (`editTextNode`, `editAttrValue`, `spliceDocument`, `addAttr`, `editTextAndAttrs`) returns `parseDocument` over the complete new string, and `editor-app.js` builds the edition state over all folios from it (`editionFromDocument`) and passes that through `profileEditionState`, which resolves the source profile for the new document, before `replace` runs. After the revision, `adoptSessionState` rebuilds the stand-off note indexes over the whole document, and through `setDirty` the call `persistDraftIfNeeded` clones the whole source into a recovery checkpoint and queues its write for every revision, without a debounce. Undo and redo call the session's parse callback, `parseEdition` over the full string. The spike adds a cost of its own, because its state field rebuilds the flow model with `parseDocument` over the body range on every document change, which the folio window of package 2 is meant to bound. The spike carries no notes beyond a typing-latency check on fol. 1r, so the measurement that ruled out a per-keystroke reparse of the whole codex survives only as a sentence in the fork's journal. The base contract D.7 adds a constraint, since it requires Apply of staged input to reparse the full result before replacing canonical state.

The base can meet the requirement in three ways. The flow view can keep keystrokes in CodeMirror and commit one session revision at word exit, at a pause in typing and before any command, with CodeMirror's own history emptied at each commit so that Ctrl+Z always reaches the session, and the unsaved dot set on the first uncommitted keystroke. The session can accept the transaction's change set as its patch, which removes the prefix and suffix scan, together with a state whose tree is parsed lazily or for the visible window only and with the per-revision side effects coalesced to a pause. The legacy offset tree can gain an incremental splice. The fork prefers the first way, because it keeps the session interface and D.7 unchanged and needs no incremental parser, provided the parse at each commit stays below the N5 threshold on the synthetic codex-size document. Where it does not, the second way follows. Either way the keystroke path holds no whole-document parse, scan, index rebuild or checkpoint write (F5, F13, N5).

### Facsimile zone layer and page address

`readSurfaces` in `tei-document.js` reads no `@type` or `@subtype` of a zone and reduces a Transkribus `@points` polygon to its bounding box, and `facsimile.js` places one `div` per bounding box, hidden until hover or the zones toggle reveals it. It has no handler for a failed image load. The base reads the page address only for `#generate`, `#example=` and `#szd-import=`. The fork needs typed polygons as one SVG layer with selection in both directions, a stated load failure (F22 to F26) and navigation state in the address (F12), none of which the base has. The base decides whether the polygon layer replaces the bounding-box overlay for every workspace or is an option a workspace selects, and where the address grammar lives. The fork proposes a workspace field that declares the address segments, read and written by a generic address module, because the segments differ per project while history handling and the hold for unapplied input do not.

### Register entry and link in one step

F39 creates a register entry in the register file and links the selection in the codex in the same step. `project-documents.js` keeps one session per document, and the inherited panel edits register entries only while the register document is the active document. The base decides whether an operation may write a companion document without activating it, as a revision pair that undo reverts together, or whether creation and link remain two steps in which the link runs only after the entry was written. The fork prefers the pair, which is what F39 states, and accepts two steps if the base names the undo order (F5, F39).

## Removed in the fork after the merge

- `docs/js/projects/wenzelsbibel/wenzels-form.js`, once the field-table renderer with staged ownership is merged. The base decides about its own identical copy.
- The inherited panel, namely `wenzels-workspace.js` with its English forms, the Bible verse form outside the fork's scope and the review action that rewrites `defaultPhase`, together with `wenzels-workspace.css` and the `panel` and `createPanel` fields of the workspace object in `index.js`. The models and `wenzels-project-checks.js` stay and become the operations and queries of the field tables, with their English errors routed through the message table.
- The code of `prototypes/d-flow/` and its step in `npm run check:fork`, once the base has adopted package 1. `fixture/fol1r.xml` and its NOTICE stay as the fixture of a project check that runs the merged flow module on fol. 1r.
- `wireframe/`, once the demo workflow tests of phase 5b pass.

`docs/index.html` and `docs/editor.html` are replaced by the fork's start page and shell rather than removed. Each removal conflicts with base edits only inside the project folder, where the fork resolves the conflict locally.
