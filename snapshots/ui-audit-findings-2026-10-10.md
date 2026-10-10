# Interface inconsistencies of the wireframe, audit of 2026-10-10

This snapshot holds the findings of a read-only audit of the wireframe at commit 48d27e4, the state after the correction package of the first audit, judged against the interaction rules of the knowledge base and the decisions of the third feedback round (one-row toolbar, popover rows, right column without tabs, facsimile on by default, draggable width, viewer without library chrome, folio turning). The audit was stopped when the session ended: three of five lenses finished (structure and semantics, visual consistency, interface text), the lenses interaction and first-time user did not. Ten findings were checked by a second agent, each confirmed with an adjusted location, severity or proposal; the others are unverified. Every finding names the state, the code location at that commit, the rule it breaks and a proposal, and belongs to the third wireframe round together with the decisions in [design](../knowledge/design.md) and the [specification](../knowledge/specification.md). Screenshots lie in the session scratchpad and are not tracked.

## structure and semantics

### 1.1 No keyboard gesture reaches the Zeile state.

- Severity: core-interaction
- State: Text view, column a. Click the word "ſich" (Z. 1), press Home, then Shift+End. Compare with a click on line number 4.
- Location: wireframe/js/flow.js:42 (line number island aria-hidden, tabindex -1), flow.js:101-102 (only mousedown on .ln calls selectLine), flow.js:155 (Zeile only from pendingLine, which only selectLine sets), flow.js:182-183 (a keyboard extension that crossed a gap takes the next word)
- Finding: No keyboard gesture reaches the Zeile state. Home plus Shift+End over line 1 ends on "der" of Z. 2, so the popover says "Wortfolge „Hie … der“ 9 Wörter, fol. 1r a Z. 1 bis Z. 2". Line numbers are aria-hidden with tabindex -1, and line zones are aria-hidden too, so the line state, the reference unit of the whole design, is pointer-only.
- Rule: design.md Accessibility minima 4 (text selection word, sequence and line fully operable by keyboard); design position: the manuscript line is the reference unit; the Popover table names only pointer openers for Zeile.
- Proposal: Snap Shift+Home and Shift+End to the edges of the manuscript line (lb to lb), not the visual line and not one word beyond. A selection that then covers exactly the words of one manuscript line enters Zeile by the same test pendingLine uses. Record this keyboard route in design.md next to the line-number click. Line numbers can stay aria-hidden, because the popover title carries "Zeile N".

### 1.2 Escape treats unapplied input in three ways.

- Severity: core-interaction
- State: Wort popover on "ſich": (a) type "sichX" in Normalisiert, press Escape, click the word again; (b) Register, "+ neu anlegen", type an ID, press Escape, reopen; (c) "+ Kommentar", type a German note, press Escape, reopen; (d) Bildannotationen, miniatures_01, edit Titel, press Escape, choose Codex 2759 in the document chooser, then reopen miniatures_01.
- Location: wireframe/js/toolbar.js:201-217 (onEscape closes the popover or panel whatever input it holds), popover.js:69-79 (closePopover), popover.js:225-233 (pendingInput searches only the visible popover and #side:not([hidden])), register.js:187-191 (every rebuild shows the combobox), apparatus.js:158-166 (the comment draft is kept per selection), miniature.js:193-198 (the draft is re-cloned on reopen)
- Finding: Escape treats unapplied input in three ways. Normalisiert typing and the register-entry form are discarded silently. The comment draft survives. The image-annotation draft is lost, and because the panel is hidden after Escape, F36 no longer holds the document switch. R1 adds a further Escape meaning ("Escape reverts" in Normalisiert), which the Escape order in design.md does not contain.
- Rule: design.md Interaction rules (fixed Escape order; unfinished input stays in the popover); F36 (unapplied input holds the document); R1.
- Proposal: Make this the first step of the Escape order: a focused field whose value differs from its applied value reverts. Only a field without a change lets the next Escape close the layer. Multi-field forms (comment, register entry, image annotation) keep their draft per selection or item, as the comment form already does, and pendingInput checks those drafts, not visible DOM, so F36 holds after the layer is closed. Record the step in design.md.

### 1.3 Every live region the wireframe actually uses starts as display:none and gets its text in the same task that reveals it.

- Severity: core-interaction
- State: Any refusal (activate the disabled Apparatkommentar with nothing selected), any check result (Prüfen, Schematron review), any note under the popover head (Anwenden on Normalisiert) or under the panel head.
- Location: wireframe/index.html:86 (section#notice aria-live=polite hidden), index.html:99 and :120 (p role=status hidden), notice.js:140-154 (hidden removed and content set in the same task), popover.js:249-256, panel.js:340-346, checks.js:229 and :259 (the persistent #announce region is used only when CONFIRM_CLEAN is false)
- Finding: Every live region the wireframe actually uses starts as display:none and gets its text in the same task that reveals it. Screen readers commonly drop updates to a live region that was not in the accessibility tree before the change. This is an inference from the DOM pattern and was not verified with a screen reader. The only persistent region (#announce) is dead code under the current CONFIRM_CLEAN. The bar's buttons ("Befunde anzeigen", "Abbrechen") also sit inside the live node and would be read as part of the message.
- Rule: design.md Accessibility minima 6 (status changes announced through the notice bar's live region); Notice bar: "is a live region for assistive technology".
- Proposal: Keep #notice, #popover-note and #panel-note in the tree at all times: empty and visually collapsed, never hidden. R9's overlaying bar allows this without layout cost. Give #notice role=status, write the message into a child text node after the region exists, and place the action buttons outside the live node. Alternatively, mirror every message into the persistent #announce.

### 1.4 The Zeile state opens with the zone xml:id and lists the words as chip buttons without fields, while design.md specifies the line's words as rows with their fie

- Severity: consistency
- State: Click line number 4 (Zeile state).
- Location: wireframe/js/popover.js:204-221 (lineSection: "Zone line_1641903719739_2081" in code, then one chip button per word that opens Wort); register.js:466-470 and apparatus.js:163-165 (today the toolbar's Register and Apparatkommentar turn a line into a Wortfolge)
- Finding: The Zeile state opens with the zone xml:id and lists the words as chip buttons without fields, while design.md specifies the line's words as rows with their fields. After R3 moves Register and Apparatkommentar from the toolbar into the popover, a whole line can no longer be linked or commented, because the Zeile state has no Register or Apparat rows and the toolbar route that converted it is gone.
- Rule: design.md Popover table (Zeile: "The line's words as rows with Diplomatisch and Normalisiert"); R1 row grammar; R3; snapshot rule that technical identifiers the step does not read are folded.
- Proposal: Build Zeile in R1's grammar. Use one row per word, with the word in the label column and its Normalisiert field (Enter applies, Escape reverts), including a word that continues on the next line. Follow with the shared rows Register, Apparat and Bild for the line as a word sequence. Drop the zone id: the facsimile outline shows the zone, and the XML view with IDs anzeigen shows the id. Update the design.md table, since Diplomatisch leaves per R1.

### 1.5 (a) In the XML view the head holds two controls a screen reader announces as "Im Text zeigen" and "Zum Text".

- Severity: consistency
- State: (a) 1400 px: select "ſich", switch to XML; the popover head shows "Im Text zeigen" and the close icon; activate the close icon. (b) 390 px: run Prüfen, Schematron review and open the Befunde sheet.
- Location: wireframe/index.html:97 (popover-close aria-label "Zum Text"), index.html:118 (side-close aria-label "Seitenleiste schließen" with the sheet-only visible text "Zum Text"), xml.js:457 (XML-Stelle becomes "Im Text zeigen"), popover.js:78 (focus is returned only in the text view)
- Finding: (a) In the XML view the head holds two controls a screen reader announces as "Im Text zeigen" and "Zum Text". The second only closes the popover, leaves the XML view open and drops focus to body (measured: activeElement BODY). (b) On the narrow sheet the side close shows "✕ Zum Text", but its computed name is "Seitenleiste schließen". So the same kind of control is named three ways across popover and side panel.
- Rule: WCAG 2.5.3 (label in name); design.md Interaction rules (each Escape or close step returns focus to the element that opened the layer); one control per action ("Im Text zeigen" and "Zum Text" read as the same action).
- Proposal: Use one naming rule for layer close controls: the visible text is the accessible name. An icon-only ✕ is named "Schließen". A sheet shows and is named "Zum Text" only where closing actually returns to the text. In the XML view, closing returns focus to the element's position in the source (the CodeMirror view in the product) and is never named "Zum Text". R7's lower list pane gets its close control under the same rule.

### 1.6 Lists that lead somewhere follow four keyboard models.

- Severity: consistency
- State: Prüfen, Schematron review, Befunde anzeigen; Register, Personen; Bildannotationen item list; Zeile chips.
- Location: wireframe/js/checks.js:320-329 (each finding is an li whose only control is a link-btn location; no arrow keys), register.js:359-376 (roving lists: one Tab stop, arrow keys), miniature.js:146-155 (arrow keys, but every item is also a Tab stop), register.js:435-438 with css/register.css:29 (Personen rows inert apart from a "Zu Spalte a, Z. n" link; the list scrolls on its own), popover.js:210-219 (line chips: one Tab stop each)
- Finding: Lists that lead somewhere follow four keyboard models. The findings list has 89 Tab stops. Its 89 location buttons carry only 46 distinct names (up to 4 times "fol. 1r a Z. 2"), so a keyboard or screen-reader user hears the location without the finding. Verweise rows are whole-row buttons with roving focus, register list rows are mostly inert text, and the Bildannotationen list takes both Tab and arrow keys. axe reports scrollable-region-focusable (serious) on .reg-list, whose inert rows leave the scrolled list unreachable by keyboard.
- Rule: design.md Accessibility minima 4 (side panel fully keyboard operable); one name per object per surface; axe scrollable-region-focusable (WCAG 2.1.1), real for .reg-list.
- Proposal: Use one pattern for every navigable list (Befunde, Verweise, register lists, Bildannotationen). The whole row is the one button, focus roves with Up, Down, Home and End, and there is one Tab stop per list. The name is the message plus location for a finding, or the entry name plus count for a register row. Register list rows open the entry's Verweise like the search rows do, instead of a separate "Zu …" link. Remove the inner scroll of .reg-list so the pane scrolls.

### 1.7 Computed names (Chrome AX tree) carry notes and metadata: "Normalisiert Kein @norm im Bestand", "ID Gesucht war „Zzzneu“.", "Sigle z.

- Severity: consistency
- State: Wort "Got" (no @norm): Normalisiert field. Register "+ neu anlegen" with the duplicate ID "Aaron". "+ Kommentar": Sigle. Bildannotationen, miniatures_01: form fields.
- Location: wireframe/js/popover.js:175-178 (field() appends the note inside the label), register.js:306-307 (the "Gesucht war" hint inside the ID label), apparatus.js:234-238 (example and hint inside the label, plus aria-describedby on the same hint), miniature.js:281-284 and :322-323 (resp and rend metadata inside the field label)
- Finding: Computed names (Chrome AX tree) carry notes and metadata: "Normalisiert Kein @norm im Bestand", "ID Gesucht war „Zzzneu“.", "Sigle z. B. MK Wird beiden Anmerkungen in Klammern angehängt." (the hint is announced a second time as description), "Titel resp #JT #KS", "Objekttyp rend initial_historisiert", "Kurzbeschreibung resp #JT #KS, verankert true". The eye reads a short label with a secondary note; the screen reader hears one long name.
- Rule: CLAUDE.md design principles (label controls by their function); snapshot lesson 8 (information that does not change the interpretation gets less weight, here it becomes part of the name).
- Proposal: The label element holds only the field name. Notes, examples, hints, resp values and errors sit outside it and attach through aria-describedby. Extend popover.js field() with a describe parameter and route every form (popover, register entry, comment, image annotation) through it, so the fix lands once.

### 1.8 The popover is a flat run in the AX tree ("text: Register Nicht verknüpft, combobox Registertyp, combobox Registereintrag, text: Apparat, …").

- Severity: consistency
- State: Wort popover on "ſich"; Bildannotationen, miniatures_01 form; comment form; register-entry form.
- Location: wireframe/js/register.js:174, :304, :388, apparatus.js:281, miniature.js:483, :626, markup.js:243 (div or span .group-title without grouping semantics) versus miniature.js:334 (fieldset and legend for Künstler), register.js:273 (role=group with aria-label), apparatus.js:212 (form with aria-label)
- Finding: The popover is a flat run in the AX tree ("text: Register Nicht verknüpft, combobox Registertyp, combobox Registereintrag, text: Apparat, …"). The section label is not associated with its controls, so tabbing into "Registereintrag" or "+ Kommentar" does not announce the row. The same construct, a labelled group of controls, is built four ways. R1's label column will repeat the gap if it is built on .group-title.
- Rule: R1 (head plus rows with a label column) needs one structure; design.md Accessibility minima 4; the lens's "heading where a row label belongs, sections for one-liners".
- Proposal: Make each row a div with role=group and aria-labelledby pointing to its label cell, or a fieldset with legend. Use it identically for the popover rows (Normalisiert, Markup, Register, Apparat, Bild), the Bild form groups (Künstler, Personen, Orte, ICONCLASS, Textbezug) and the comment and register-entry forms. Keep no headings inside the popover besides its title.

### 1.9 R3 takes the Register menu out of the toolbar and R7 removes the tab row.

- Severity: consistency
- State: Register menu: Personen. Prüfen menu: Befundliste. Notice bar: Befunde anzeigen. Popover register chip: Verweise.
- Location: wireframe/index.html:57-68 (the Register menu holds Verweise auf Eintrag, Personen, Orte, Völker), index.html:80 ("Befundliste"), checks.js:289 ("Befunde anzeigen"), register.js:179 ("Verweise"), register.js:450 (pane heading "Register Personen" or "Verweise auf Eintrag" under the tab "Verweise")
- Finding: R3 takes the Register menu out of the toolbar and R7 removes the tab row. After that, the register lists Personen, Orte and Völker, and the entry search without a selected word, have no opening action, although R7 says a list opens "from its action". The same lists are also named four ways: "Befundliste", "Befunde anzeigen" and the tab "Befunde"; "Verweise auf Eintrag", "Verweise", and the heading "Register Personen" inside "Verweise".
- Rule: R7 (a list opens from its action into the lower pane); design.md Arbeitsleiste (every action is visible); snapshot: action labels name verb and object; one name per object per surface.
- Proposal: Merge the three list commands into one pane "Register" with the search and the type filter Alle, Person, Ort, Volk that listPanel's search mode already has. Its entries are the popover Register row ("Verweise anzeigen" on a chip, "Register durchsuchen" without one). The route without a selection needs an operator decision: either one action "Register" joins R3's right-hand group, or the register is reachable only from the popover. I recommend the former, because checking an entry is a task without a selected word. Use the labels "Befunde anzeigen" in Prüfen and in the bar, and the pane titles "Befunde", "Verweise auf Person: X" and "Register".

### 1.10 The AX tree exposes button "Zonen" [disabled] [pressed], while the eye sees a dashed, unpressed control.

- Severity: consistency
- State: Initial state, facsimile off (also the narrow default after R5).
- Location: wireframe/js/toolbar.js:76-77 (aria-pressed from state.zones whatever the disabled reason), wireframe.css:106 (pressed look only on :not([aria-disabled="true"])), app.js:52 (blocked reason "Erst das Faksimile einblenden.")
- Finding: The AX tree exposes button "Zonen" [disabled] [pressed], while the eye sees a dashed, unpressed control. A screen-reader user hears "pressed" for a switch that shows nothing. R4 renders Zonen in the text view, but with the facsimile off the control has no object.
- Rule: R4 (only controls with an object in the current view are rendered); DOM state must match the visual state.
- Proposal: Apply R4 to Zonen's object, not to the view: render Zonen only while the facsimile is shown, with its remembered state when it reappears. The disabled-with-reason case then disappears, and with it the pressed and disabled mismatch.

### 1.11 The same field is "Deutsch" on an existing comment and "Anmerkung Deutsch" in the new-comment form.

- Severity: consistency
- State: Wortfolge over "Got , got" (comment start_42597): the existing comment entry; "+ Kommentar" form; Bildannotationen list; Bild form of miniatures_01.
- Location: wireframe/js/apparatus.js:249-261 (article named "Kommentar start_42597 bis end_42599", textareas labelled "Deutsch" and "Englisch", type line "comment_edition, start_42597 bis end_42599") versus apparatus.js:214 and :223-227 (form: "Editionskommentar (comment_edition)", "Anmerkung Deutsch" and "Anmerkung Englisch"); miniature.js:141-144 (list rows lead with the id in code), miniature.js:206 (panel heading "Miniatur miniatures_01, fol. 1ra Z. 4-17"), miniature.js:257-263 and :305 (the line "Eintrag #Image_…, Liste miniatures, resp nicht gesetzt" heads the form)
- Finding: The same field is "Deutsch" on an existing comment and "Anmerkung Deutsch" in the new-comment form. A comment is named for assistive technology by its anchor ids. An image annotation is named by its id in the list and in the panel heading, while R1 names it by title without the id in the popover. The Bild form opens with record metadata before the title.
- Rule: design.md Interaction rules (one visible name per object per surface); Miniature form first-decision information is the title; R1 (Bild row shows the title without the id); snapshot lesson 8.
- Proposal: Comment: use the same labels in entry and form ("Anmerkung Deutsch", "Anmerkung Englisch") and name the entry by type and covered words ("Editionskommentar zu „O Got got“"); anchors appear only in the XML view with IDs anzeigen. Image annotation: the title is its name in the list, the panel heading and the popover; fold the id like other ids; move the record metadata line to the end of the form.

### 1.12 The same label "Im Text zeigen" is a link-styled view switch in the popover head and a bordered button that jumps to a text range in the Bild form.

- Severity: consistency
- State: Wort popover on "ſich" in text and XML view; Bildannotationen, miniatures_01 form.
- Location: wireframe/wireframe.css:250 (.link-btn); index.html:96 and xml.js:457 ("XML-Stelle" and "Im Text zeigen" as links) versus miniature.js:562 ("Im Text zeigen" as a bordered act-btn); apparatus.js:285 ("+ Kommentar" link) and miniature.js:354 ("+ Künstler" link) versus miniature.js:398 ("Hinzufügen" button); register.js:178 ("Verknüpfung lösen" link) and miniature.js:464 ("Entfernen" link) versus miniature.js:348-349 and :377-378 (✕ icon buttons for removal)
- Finding: The same label "Im Text zeigen" is a link-styled view switch in the popover head and a bordered button that jumps to a text range in the Bild form. Adding an item is a link twice and a button once. Removing is an underlined link ("Entfernen", "Verknüpfung lösen") or a ✕. Underlined text reads as navigation, yet "Verknüpfung lösen" and "Entfernen" change data.
- Rule: Snapshot lesson 11 (switches look different from actions), extended to navigation versus action; one control per action and consistent styling across surfaces.
- Proposal: Use link style only for navigation that moves the view or the selection (XML-Stelle, Im Text zeigen, finding locations, Verweise, the image title in the Bild row). Use a bordered button for actions that change data or open a form (+ Kommentar, + Künstler, Hinzufügen, Verknüpfung lösen). Removing a chip or tag is always the ✕ named "<Name> entfernen". Give the two "Im Text zeigen" controls distinct labels, for example "Textbereich zeigen" for the range jump.

### 1.13 axe color-contrast (serious): attribute values of the selected XML element reach 3.94:1 (#b45309 on #f9e1b8, 13 px), and the caret word on red ink reaches 4.49:

- Severity: polish
- State: XML view with the word "ſich" selected; caret in an inkRed word ("ſich", Z. 1).
- Location: wireframe/wireframe.css:226 and :228 (.xml .val in --color-link on .is-selected in --color-selection), wireframe.css:186 and :188 (.w.is-current --color-blue-light under .rend-inkRed --color-problem)
- Finding: axe color-contrast (serious): attribute values of the selected XML element reach 3.94:1 (#b45309 on #f9e1b8, 13 px), and the caret word on red ink reaches 4.49:1 (#c0392b on #e0ebf5). Both pairs come from a selection or caret tint that was not checked against coloured text.
- Rule: design.md Accessibility minima 1 (4.5:1, measured on the rendered views).
- Proposal: Inside .xml .is-selected, set .val and .attr to --color-text. For the caret word, use a tint that keeps 4.5:1 under --color-problem, or mark the caret word by an underline instead of a fill. Add both pairs to the contrast check named in testing.md.

### 1.14 The popover's region and heading names run object and location together: "Wort „ſich“fol.

- Severity: polish
- State: Wort or Wortfolge popover; XML view; Bildannotationen list; any state (axe).
- Location: wireframe/js/popover.js:93 and :96 (q and span.context without a separator), index.html:90 (section #text-pane aria-label "Text" in every view), index.html:86 (notice bar as an unnamed section), miniature.js:137 and :156 (h2 and list label both "Bildannotationen auf fol. 1r"); no h1 anywhere
- Finding: The popover's region and heading names run object and location together: "Wort „ſich“fol. 1r a Z. 1" and "Wortfolge „die … liebes“23 Wörter". The work region is announced as "Text" while it shows the XML source or the Bildannotationen list. The page has no h1 (axe page-has-heading-one in every state), so no heading names the open document and page.
- Rule: Lens (the DOM matches what the eye sees); one name per surface; axe best practice page-has-heading-one.
- Proposal: Put a separator (", ", visually hidden if needed) between object and location in the popover title. Name the work region after the view ("Text", "XML", "Bildannotationen") or drop its label. Add one visually hidden h1 with document and page address ("Codex 2759, fol. 1r a"), updated on document, column and view switches. Give the notice bar role=status, together with the live-region finding.

Clean: I audited a read-only copy of HEAD e302bcd in C:/Users/chris/AppData/Local/Temp/claude/c--Users-chris-Documents-GitHub-DHCraft-wenzelsbibel-teiCrafter/2320f4be-f777-4dae-b0ff-de7f783a6c54/scratchpad/ui-audit/structure/. data/wireframe/fol-1r.json was present and copied. I served the copy on 127.0.0.1:8770 and stopped the server afterwards; I wrote nothing into the repository. The modified files that git status lists there are another agent's live edits. Screenshots are in shots/ ("..." in the findings stands for that folder), the axe and ARIA log is in structure-scripts/audit.log, and the probes are structure-scripts/probe*.mjs. I covered 24 states at 1400x900 and at 390 px, with axe on each state, accessible names computed through the Chrome DevTools Protocol, and keyboard and Escape probes. There were no console or page errors.

These parts are clean:
- The implemented Escape order (autocomplete, menu, side panel holding focus, popover, side panel, selection) matches design.md, including the ICONCLASS hit list.
- Focus returns from a closed side panel to its origin ("Befunde anzeigen").
- Disabled toolbar controls stay focusable and state their reason in the notice bar.
- The toolbar uses roving focus with arrow keys; menus use menu/menuitem roles with a focus return to the opening button.
- There are no duplicate ids, the popover's DOM order follows the flow, and the narrow sheet makes the covered text pane inert.
- The register combobox follows the ARIA 1.2 combobox pattern (aria-activedescendant, aria-expanded, listbox).

Excluded or deferred:
- axe scrollable-region-focusable on #text-pane in the text view is a false positive: the contenteditable flow is focusable, but axe does not count it. The same rule on .reg-list is real and is part of the lists finding.
- The OpenSeadragon images "Zoom in" and "Go home", the tab row, the markup menus, the Diplomatisch field and duplicated Abbrechen/Anwenden are left out because R2, R3, R7 and R8 already decide them.

Outside this lens:
- data/wireframe/fol-1r.json holds 11 register IDs with mojibake, for example \"AbiÃ«ser\" and a broken \"Ägypten\". The extraction parses the source as UTF-8 with lxml, so the corruption likely comes from the source TEI. This is data for the edition team, not an interface defect.
- A clean TEI All run replaces the standing review-findings notice although those findings still exist. This is notice-bar behaviour that F44 may want to settle.

## visual consistency

### 2.1 Hovering Speichern paints --color-secondary behind its white label (measured background rgb(242,244,248), text rgb(255,255,255), about 1.1:1).

- Severity: core-interaction
- State: 1400x900, Codex 2759, Speichern enabled: pointer over Speichern, also right after clicking it while 'Codex 2759 gespeichert.' shows. For comparison, hover over a|b, Text|XML, the document chooser, popover Abbrechen/Anwenden, popover close and XML-Stelle.
- Location: wireframe/wireframe.css:91-92. The hover rule :is(.tb-btn, .toggle, .act > button):hover:not(...) takes specificity (0,3,1) from '.act > button' and beats '.tb-btn.is-primary:not(...)' at (0,3,0). Also wireframe/wireframe.css:86-89, 215-218 and 250-251: .seg-btn, select, .act-btn, .icon-btn and .link-btn have no hover rule, and no :active rule exists anywhere.
- Finding: Hovering Speichern paints --color-secondary behind its white label (measured background rgb(242,244,248), text rgb(255,255,255), about 1.1:1). The label disappears under the pointer, including right after the click while the save confirmation shows. Elsewhere hover is missing altogether. The segmented a|b and Text|XML, the document chooser, every .act-btn (Abbrechen, Anwenden, Befunde anzeigen, Hinzufügen), the close control and the link buttons measured identical before and during hover, while the neighbouring Faksimile and XML formatieren do change. No control has a pressed style.
- Rule: Accessibility minimum 1 (4.5:1 on rendered views). The audit lens requires consistent default, hover and pressed states across toolbar, popover, lower pane and notice bar. Design tokens: header and gold carry the primary action.
- Proposal: Write one state block for all button families (.tb-btn, .toggle, .seg-btn, .act > button, .act-btn, .icon-btn, select): hover background --color-secondary, pressed --color-border. Exclude primaries from it with :not(.is-primary). Give .is-primary its own token-based hover that keeps the white label, for example --color-header plus box-shadow: inset 0 -3px 0 var(--color-gold). On .link-btn, hover thickens the underline. Add a walkthrough check that compares the hover background with the label colour of every control.

### 2.2 The unsaved dot enters and leaves the toolbar row.

- Severity: core-interaction
- State: 1400x900, Codex 2759. (a) Make any edit, for example set Normalisiert of 'vnd' to a new value with Enter, then press Speichern. (b) Switch Faksimile on, Text to XML, a to b.
- Location: wireframe/index.html:28 (the dot is toggled with the hidden attribute, so it leaves the flex row), wireframe/wireframe.css:278; wireframe/wireframe.css:106-108 (a pressed toggle and an active segment get font-weight 600)
- Finding: The unsaved dot enters and leaves the toolbar row. After the first edit everything right of the document chooser moves 8.5 px right (folio from x 191.0 to 199.5, Speichern from 804.0 to 812.5), and after a successful save it moves back, so Speichern slides away under the pointer that just pressed it. Pressed switches turn bold: Faksimile widens from 73.9 to 76.1 px when switched on and pushes Zonen, Rückgängig and Speichern 2 to 3 px right. Text|XML and a|b shift their neighbours on every switch in the same way.
- Rule: UI practice delta 2026-10-10, antipattern 'Direkte Manipulation': 'Weder eine sich öffnende Ebene noch eine Zustandsmarke noch eine Meldung verschiebt das Layout.' R3 and design.md fix the dot's position after the chooser, not a moving row.
- Proposal: Reserve the dot's slot: render the span permanently with a fixed inline-size and toggle visibility instead of hidden, keeping the hidden text 'ungesichert' in the live region. Carry the pressed state in fill, border and aria-pressed only, with one font weight for both states. Add a walkthrough check that compares toolbar x-positions before and after an edit, a save and each switch.

### 2.3 Every confirmation, no-change note or refusal in the popover inserts a grid row between head and fields.

- Severity: core-interaction
- State: 1400x900. Open Wort on 'vnd', then press Enter or Anwenden in Normalisiert (note 'Keine Änderung an der normalisierten Lesung.' or '... übernommen.'), or link a register entry ('Verknüpft mit Person: Aaron.'). In the lower pane, press Anwenden in the Bild form ('Keine Änderung.').
- Location: wireframe/js/popover.js:249-256 with wireframe/wireframe.css:152-153 and 156-159 and wireframe/index.html:99; wireframe/js/panel.js:123-129 with wireframe/wireframe.css:51 and wireframe/index.html:120
- Finding: Every confirmation, no-change note or refusal in the popover inserts a grid row between head and fields. All fields and buttons move down about 29 px (the Diplomatisch label from y 231 to 260) and move back when the note hides 5 s later, so the button just pressed jumps away from the pointer twice. The note in the lower pane does the same to the pane title and the form. R9 makes only the notice bar an overlay, so these two message surfaces keep shifting their content.
- Rule: UI practice delta 2026-10-10, antipattern 'Direkte Manipulation': no layer, state marker or message shifts the layout. design.md Popover: opens 'without shifting the layout'.
- Proposal: Draw both notes as overlays, like the notice bar: absolutely positioned over the lower edge of the popover head and of the pane title, with their live region unchanged. For refusals, which design.md places at their row, reserve one message line per row so that showing the reason adds no height.

### 2.4 With the facsimile on, the narrow layout puts the text in the upper half and the image in the lower half.

- Severity: core-interaction
- State: 390x844 with touch: switch Faksimile on, then tap a word.
- Location: wireframe/wireframe.css:66-68 (comment 'The facsimile stacks below the text', grid-template-rows 1fr 1fr with the text pane first); wireframe/wireframe.css:161-165 (popover sheet fixed at the bottom, max 50dvh)
- Finding: With the facsimile on, the narrow layout puts the text in the upper half and the image in the lower half. Tapping a word opens the bottom sheet over exactly the lower half (sheet top 422 px of 844), so the facsimile vanishes the moment a line is worked on. Comparing a line with the image, the team's main workflow, is impossible on a phone.
- Rule: design.md Responsive behaviour (current working tree): the narrow layout 'stacks it above the text at reduced height when it is switched on'. UI practice delta: coupled views follow a selection spatially. Lesson 13: the default follows the main workflow.
- Proposal: Put the facsimile first in the narrow grid (side column in row 1 with about 35dvh, text in row 2), so the sheet covers the end of the text, not the image. While the facsimile is on, cap the sheet at the text area's height. place(reveal) already keeps the selected line above the sheet.

### 2.5 The notice bar, the popover note and the pane note give every class of message one look: --color-review-tint with a --color-review edge (measured rgb(254,245,23

- Severity: consistency
- State: 1400x900. Press Speichern (save confirmation), run Prüfen, TEI All (clean result), activate the disabled Apparatkommentar (refusal), run Prüfen, Schematron review (findings), and link a register entry (popover note).
- Location: wireframe/wireframe.css:55-59 (.notice-bar) and 156-159 (.surface-note); wireframe/js/notice.js:17-24 (notify takes no kind); wireframe/js/checks.js:229, 259; wireframe/css/checks.css:13-15 (finding edge)
- Finding: The notice bar, the popover note and the pane note give every class of message one look: --color-review-tint with a --color-review edge (measured rgb(254,245,231) and rgb(204,138,30)). 'Codex 2759 gespeichert.', 'TEI All: keine Befunde.', 'Verknüpft mit Person: Aaron.', a refusal and 89 warnings look alike, so a success reads as a warning, and an error result would look like a confirmation. The findings list colours the same warning differently: a grey edge there, amber in the bar, while errors get a red edge.
- Rule: design.md Notice bar: 'It takes its colours from the state tokens above, states check and result in words as the second channel.' Token table, State row: confident, review and problem with their tints.
- Proposal: Give notify() a kind and map it to tokens: done and clean to --color-confident-tint with a --color-confident edge; warnings, refusals and a running check to review; errors and a failed save to problem. Keep the words as the second channel, with each message starting with its result word. Use the same mapping for the popover and pane notes and for the edges in the findings list (warning to review, error to problem).

### 2.6 Red ink is drawn by colour alone, in the error token #C0392B (measured on 'Hie', 'hebt', 'ſich'), with no second cue.

- Severity: consistency
- State: 1400x900, Codex column a, lines 1 to 3 (hi rend inkRed), and column b, line 16 'Rotlebín ... mer teín' (rend rubrication). Compare an error finding and a refusal.
- Location: wireframe/wireframe.css:188 (.w.rend-inkRed: colour --color-problem only), 189 (.w.rend-rubrication: 2px solid --color-problem underline), 197 (.milestone in --color-problem)
- Finding: Red ink is drawn by colour alone, in the error token #C0392B (measured on 'Hie', 'hebt', 'ſich'), with no second cue. Rubrication is a solid 2 px red underline, which reads like a spell-check or error mark under correct words. The paragraph sign uses the same red. The state token that marks errors, refusals and failed saves thus also marks a property of the manuscript in the reading text.
- Rule: design.md Text area: renditions 'in a form that adds a non-colour cue'. Accessibility minimum 6: no state relies on colour alone. Token table: the State family serves the notice bar and the findings list, and new colours enter only as alias tokens.
- Proposal: Add rendition aliases like the zone aliases (for example --rend-red pointing to an existing token, provisional, with an upstream point for a dedicated base token). Give each rendition a cue no state uses: inkRed as coloured text plus a thin overline, rubrication as a double underline or a tinted band via the alias. Reserve the solid red underline and --color-problem for findings and refusals.

### 2.7 The four apparatus textareas (Anmerkung Deutsch and Englisch in the form, Deutsch and Englisch in each existing comment) render at 14 px.

- Severity: consistency
- State: 1400x900 or 390x844: open the comment form with '+ Kommentar', or select 'got' (Z. 5), which carries an existing comment.
- Location: wireframe/css/apparatus.css:10 ('.apparatus textarea { font: inherit; }' overrides wireframe/wireframe.css:255-258 '.field textarea { font-size: 1rem }': same layer, later file, equal specificity)
- Finding: The four apparatus textareas (Anmerkung Deutsch and Englisch in the form, Deutsch and Englisch in each existing comment) render at 14 px. Every other input, select and textarea measured 16 px. iOS Safari zooms the page when a field under 16 px takes focus, which is what the minimum exists to prevent, and here it would hit the bottom sheet.
- Rule: design.md Accessibility minimum 9: input fields use a font size of at least 16 CSS pixels.
- Proposal: Replace the shorthand with 'font-family: inherit;', as wireframe/css/miniature.css:28 already does. Add the computed font size of all inputs, selects and textareas to a walkthrough check.

### 2.8 The option the keyboard is on looks different in each list.

- Severity: consistency
- State: 1400x900. (a) Select a word, focus Tilgung, press ArrowDown twice. (b) Type 'Ab' in the register field, press ArrowDown twice. (c) Bildannotationen, miniatures_01, 'ICONCLASS suchen ...', type '11C', press ArrowDown twice. (d) The current entry in Verweise after a jump, and the current entry in the Bildannotationen item list.
- Location: wireframe/wireframe.css:26 with 115-126 (global 2px outline at offset 2px, clipped by .menu-list overflow:auto); wireframe/css/register.css:18-19 (ac-item: --color-link inset outline); wireframe/css/miniature.css:71 (ic-hit: --color-secondary fill only); wireframe/css/register.css:38 (current reference: 4px --color-link edge); wireframe/css/miniature.css:12 (current item: --color-header border and 3px inset). Left-edge bars also at wireframe/css/apparatus.css:15, 25; wireframe/css/miniature.css:58, 62; wireframe/css/checks.css:4-5, 13-15.
- Finding: The option the keyboard is on looks different in each list. In a toolbar menu it gets the blue focus outline, which the menu's scroll box clips to two horizontal lines that look like separators. In the register list it gets an orange 2 px inset outline in the link colour. In the ICONCLASS hits it gets only a #F2F4F8 fill on white (about 1.08:1): colour alone, practically invisible. The chosen entry of a list has two styles: an orange 4 px edge with bold in Verweise, and a blue border with a 3 px inset and bold in the item list. The left-edge bar carries seven unrelated meanings in five colours: apparatus entry blue, ICONCLASS entry pink, finding grey or red, current reference orange, current item blue, refusal red, stale and variant notes amber with a red edge.
- Rule: Accessibility minima 2 (visible focus indicator) and 6 (no state relies on colour alone). Token table: --color-link is the text-link colour, and --color-workName is a zone alias. R2's grouped markup list will be one more list of this kind.
- Proposal: Define one option state for menus, the register combobox, the R2 markup list and the ICONCLASS hits, e.g. '[aria-selected=true], .menu-item:focus-visible { outline: 2px solid var(--color-header); outline-offset: -2px; background: var(--color-blue-light); }'. Define one current-entry state (3 px --color-header inset bar plus weight). Reserve the left-edge bar for state (current, error, warning), and group apparatus and ICONCLASS entries by spacing or a hairline box.

### 2.9 Outside the popover rows that R1 cleans up, technical identifiers still stand at first-decision level.

- Severity: consistency
- State: 1400x900. Prüfen, Schematron review, Befunde anzeigen. Bildannotationen, miniatures_01, scrolled to the end. Wort 'got' (Z. 5) with its comment. The Bildannotationen item list.
- Location: wireframe/js/checks.js:327 (rule id and XPath on every finding); wireframe/js/miniature.js:257-262 (item meta line), 281-283 and 323 (resp and rend values beside each label), 558-561 (text range as word ids), 136-144 and 219-220 (lists lead with the mono id); wireframe/js/apparatus.js:250-253 (comment head with type value and anchor ids), 214 (type options 'Editionskommentar (comment_edition)')
- Finding: Outside the popover rows that R1 cleans up, technical identifiers still stand at first-decision level. Every finding carries its rule id and a full XPath, two mono lines that make up about half of each row. The Bild form opens with 'Eintrag #Image_1676476154286_76, Liste miniatures, resp nicht gesetzt, verankert nicht gesetzt', sets 'resp #JT #KS' or 'rend initial_historisiert' beside each label, and states the text range as 'region_1639399488602_10l3_0' to 'region_1639577288773_22l29_4'. Each existing comment is headed 'comment_edition, start_42597 bis end_42599'. Both item lists lead with the bold mono id before the title.
- Rule: UI practice delta: 'Technische Kennungen, die der Arbeitsschritt nicht liest, werden ... eingeklappt und erscheinen am ausgewählten Element oder auf Anforderung.' Lesson 8: what does not change the interpretation gets less weight. design.md Findings list: point 3 is message and location, point 4 (optional depth) the XML path and rule id. Miniature form: point 3 the text range in folio and line terms, point 4 the responsibility values.
- Proposal: Apply R1's rule to these surfaces. Findings show message and location, with rule id and XPath in a closed disclosure. The Bild form leads with the title, folds item meta and resp values into one closed group, and states the range as 'fol. 1r a Z. 3 bis fol. 2r Z. 6' with the word ids as tooltip. A comment head shows the type label only. Item lists show the title first and the id as tooltip.

### 2.10 After the count, the standing findings notice prints the first finding's full message.

- Severity: consistency
- State: 390x844 and 1400x900: run Prüfen, Schematron review, then open the findings list.
- Location: wireframe/js/checks.js:296-300 (barContent: count, the first finding's full message with its place, route button); wireframe/js/checks.js:318 (different count wording in the list head)
- Finding: After the count, the standing findings notice prints the first finding's full message. At 390 px it wraps to five lines plus the button, about 172 px or a fifth of the screen, and with the list open it repeats the list's first entry right above it. The count is worded two ways: '89 Befunde (0 Fehler, 89 Warnungen)' in the bar, '89 Befunde, 0 Fehler' in the list head. Under R9 the bar overlays the text, so the long form would hide several lines of it.
- Rule: design.md Interaction rules: the standing notice is 'the findings of a requested check ... with the route to the findings list'. Rule 'An object carries one visible name per surface'.
- Proposal: Reduce the bar to one line: check label, counts in one wording ('89 Warnungen' or '3 Fehler, 2 Warnungen') and 'Befunde anzeigen'. Leave the message to the list. Hide the route button while the list is open. Use the same count wording in the list head.

### 2.11 On a phone each toolbar row scrolls sideways (measured scrollWidth 1071 px for row 1 and 998 px for row 2 in a 390 px viewport).

- Severity: consistency
- State: 390x844, any state.
- Location: wireframe/wireframe.css:60-64 (each toolbar becomes one nowrap row with overflow-x: auto)
- Finding: On a phone each toolbar row scrolls sideways (measured scrollWidth 1071 px for row 1 and 998 px for row 2 in a 390 px viewport). The visible edge cuts a control in half ('Text X') with no fade or other cue, and Speichern, Herunterladen and Prüfen sit about two screen widths to the right. Under R3's single row it would still be roughly 1100 px.
- Rule: design.md Responsive behaviour (current working tree): 'The toolbar row wraps at group boundaries on narrow screens and keeps every control reachable.' The stylesheet scrolls instead of wrapping. UI practice delta, hidden actions: every action is visible as a control.
- Proposal: Implement the recorded behaviour: flex-wrap: wrap, with each group (document and place, view, history, check and output) in a nowrap wrapper so groups break whole, and the right-aligned group ending its line. Remove the overflow-x scroller.

### 2.12 One place in the manuscript is written in four forms.

- Severity: consistency
- State: 1400x900: Wort popover head, Zeile popover head, Verweise rows, Bild pane title and range, notice bar and findings.
- Location: wireframe/js/popover.js:86-97; wireframe/js/register.js:65-70; wireframe/js/miniature.js:202-206, 572-575; wireframe/js/checks.js:65
- Finding: One place in the manuscript is written in four forms. 'fol. 1r a Z. 1' appears in the Wort head (place in the grey context span) and in the findings. 'Zeile 5, fol. 1r a' heads the Zeile state: all bold, comma, the long word. 'Spalte a, Z. 5' labels the Verweise rows, without a folio. 'fol. 1ra Z. 4-17' titles the Bild pane, with folio and column fused and a hyphen range, and its range end reads 'endet auf fol. 2r Z. 6-6'. The two popover states of the same surface also style the place differently.
- Rule: design.md Popover: the head names the state, the object and its place, as in 'fol. 1r b Z. 16'. Interaction rule: 'An object carries one visible name per surface'.
- Proposal: Add one formatter in state.js, place(folio, column, line, toLine), returning 'fol. 1r a Z. 5' and 'fol. 1r a Z. 4 bis 17'. Use it for both popover heads (Zeile in the same two-part form as Wort, place in the context span), the Verweise rows, the Bild pane, findings and the notice bar, and normalise the data's '1ra' and 'Z.6-6' through it.

### 2.13 Within one form, removing takes three looks: a bordered square close control (Künstler), a borderless round one inside a grey pill (Personen, Orte) and an orang

- Severity: consistency
- State: 1400x900: Bildannotationen, miniatures_01 (Künstler, Personen, Orte, ICONCLASS); Wort 'pꝛologus' after linking Aaron.
- Location: wireframe/js/miniature.js:348-361 (Künstler: bordered .icon-btn remove, '+ Künstler' link), 377-380 and 398 (Personen/Orte: borderless remove inside a grey pill, bordered 'Hinzufügen' button), 464 and 471 (ICONCLASS: 'Entfernen' link, 'ICONCLASS suchen ...' link); wireframe/css/miniature.css:46-51 against wireframe/wireframe.css:201-210; wireframe/js/register.js:177-179
- Finding: Within one form, removing takes three looks: a bordered square close control (Künstler), a borderless round one inside a grey pill (Personen, Orte) and an orange text link 'Entfernen' (ICONCLASS). Adding takes two: the links '+ Künstler' and 'ICONCLASS suchen ...' and the bordered button 'Hinzufügen'. A person reference appears as two different chips: the entity chip 'Person: Aaron' (12 px, persName edge and tint) in the flow and the popover, and a neutral grey pill 'Gott' (13 px) in the Bild form. R2 adds markup chips with a remove control, a third chip unless the styles are unified.
- Rule: design.md Interaction rules: 'an action one control'. Token table: the --chip-person, --chip-place and --chip-folk aliases are the register chips.
- Proposal: Build one chip component: entity alias colours with the type word, and a 24 px remove control labelled '... entfernen'. Use it for register links in the flow, the popover and Bild Personen/Orte, and in a neutral colour for the R2 markup chips. Use one add pattern ('+ Künstler', '+ Person', '+ ICONCLASS' as link buttons that open a field) and one remove pattern (the chip's control, or the same icon button for row entries).

### 2.14 The document chooser is the only native control in the toolbar row: the OS chevron where the menus show ▾, a 16 px label where every other control uses 14 px, a

- Severity: polish
- State: 1400x900: the document chooser in the toolbar next to the Prüfen menu; Typ in the comment form; Typ in the register entry form; Künstler in the Bild form; the 'Alle' filter in the Verweise search.
- Location: wireframe/index.html:24-27; wireframe/wireframe.css:86-90 (select at 1rem); wireframe/js/apparatus.js:214; wireframe/js/register.js:274, 417; wireframe/js/miniature.js:342
- Finding: The document chooser is the only native control in the toolbar row: the OS chevron where the menus show ▾, a 16 px label where every other control uses 14 px, a height of 33 px against 32 px, and no hover. The native selects in the forms show the same OS chevron, so 'opens a list' has two glyphs and two type sizes side by side (the 16 px Typ select above 14 px buttons).
- Rule: Audit lens: platform chrome that differs from the custom menus. design.md Arbeitsleiste draws the document and folio choosers as choosers ('[Codex 2759 v]', '[fol. 1r v]') of one house style.
- Proposal: Render the toolbar choosers (document, folio, miniature chooser) as house menu buttons: label plus ▾, 14 px, 32 px high, menuitemradio entries, file name as tooltip. This also removes the 16 px exception, which only fields need. Keep form selects native for behaviour, but set appearance: none with the ▾ glyph from a wrapper and the 32 px height, so both families show one chevron.

Clean: Copy under test: committed HEAD e302bcd (wireframe, src/ui/tokens.css, docs/vendor/openseadragon), extracted by git archive into ui-audit/visual/. data/wireframe/fol-1r.json was present and copied. Port: 8769 was already held by an unrelated python http.server from a session this morning (PID 7700, serving C:/Users/chris/AppData/Local/Temp/codex-skill-audit-20261010/engineering/web), so requests hung. I left that process alone, stopped my own server on 8769 and served on 8779 instead (not 8765 or 8766). That server is stopped. The repository was not written to, and its working-tree changes belong to the parallel agent. Rules: design.md was read in the current working tree, which another agent updated during the audit with R1 to R9. Findings 4 and 11 cite its new narrow-layout sentences, which HEAD's stylesheet contradicts. Drivers: Playwright scripts in scratchpad/ui-audit-scripts/ (wide.mjs, narrow.mjs, measure.mjs, measure2.mjs, measure3.mjs), 47 screenshots in ui-audit/visual/shots/, each judged by eye.

Checked and clean:
- No raw colour in any wireframe stylesheet or inline style; all colours come from tokens.css, plus color-mix of tokens with transparent.
- No horizontal page scroll at 390 px in any measured state (initial, word sheet, comment form, facsimile, findings sheet, Bild form): scrollWidth 390 throughout.
- No console or page errors.
- Disabled controls are consistent between toolbar buttons and dropdowns: dashed edge, secondary colour, not-allowed cursor. Disabled text #5A6270 on white passes 4.5:1.
- The focus ring (2px --color-header, offset 2) is visible on the select, toolbar buttons, popover inputs, buttons and link buttons. The only clipping found is in the menus (finding 8).
- Chips in the flow are 24 px high. The range selection is continuous, without stacked tints. Line numbers carry the 'Kopfzeile' marker.

Not reported because R1 to R9 decide them: popover structure and buttons, the markup menus, the toolbar rows and dividers, the side tabs and column close control, the OpenSeadragon buttons and unfitted page, the notice bar layout shift, the Prüfen labels.

Noticed outside the visual lens:
- Running a clean TEI All after Schematron review removes the review's standing findings notice although its 89 findings remain (checks.js:224-229), against the rule that a standing notice stays until its cause is gone.
- The register shows double-encoded names such as 'AbiÃ«ser', 'Ãgypten' and 'GalilÃ¤a' (11 occurrences in fol-1r.json, from ref/@target). Whether the ONB source or extract_data.py introduces them is unverified.
- Line 4 (the enlarged initial O) sets its line number about 8 px above the baseline of the other lines.

## interface text

### 3.1 The findings list states something false after a save: it calls results outdated that the save has just produced fresh, next to a save confirmation.

- Severity: core-interaction
- State: Run Prüfen, Schematron review, open Befunde anzeigen, edit any word (e.g. Normalisiert of 'hebit' to 'hebet', Enter), then Speichern. Bar says 'Codex 2759 gespeichert.' while the open findings list still reads 'Ergebnis veraltet, Prüfung erneut ausführen.' and 'Wohlgeformtheit keine Befunde, veraltet', 'TEI All keine Befunde, veraltet', 'Schematron editing keine Befunde, veraltet', although the save has just re-run exactly these three.
- Location: wireframe/js/checks.js:244-249 (save stores fresh results), checks.js:370-377 (onChange returns early on kind 'saved', so showFindings is never re-run), checks.js:291, 313, 347 (stale text)
- Finding: The findings list states something false after a save: it calls results outdated that the save has just produced fresh, next to a save confirmation. The stale text also prescribes 'Prüfung erneut ausführen', but no control of that name exists in bar or list; the route is the Prüfen menu.
- Rule: F47 (the list states when an edit after the run has made its results outdated, i.e. only then); delta 'Fehlermeldung nennt, was geschah und was jetzt möglich ist' and the lens rule on messages naming a route that does not exist
- Proposal: After save() re-render the list when it is shown (call showFindings from save, or handle kind 'saved' in the onChange at checks.js:370). Replace the sentence by a per-check state word 'veraltet' plus one action button 'Erneut prüfen' in bar and list that re-runs the stale checks; drop the imperative sentence.

### 3.2 The manuscript place, the design's reference unit, is written in at least six forms by six private formatters: order folio-line vs line-folio, 'Z.' vs 'Zeile', 

- Severity: consistency
- State: Compare the place of the same kind of object across surfaces: click a word (head 'Wort „Got“ fol. 1r a Z. 5'), click a line number (head 'Zeile 6, fol. 1r a', location bold in the title, reversed order, 'Zeile' instead of 'Z.'), open Verweise for Rotlebín (row 'Spalte b, Z. 16', list button 'Zu Spalte a, Z. 3'), open miniatures_01 (head 'fol. 1ra Z. 4-17', no space, hyphen range), its text relation ('(nicht auf dieser Seite)' for the first word, '(nicht auf fol. 1r, endet auf fol. 2r Z. 6-6)' for the last), the findings list ('fol. 1r a Z. 2'), an address notice ('Fol. 2r liegt nicht in dieser Datei'). In code also 'Die Zeile Z. 3 enthält kein Wort …' (lineNo already carries 'Z.'; not reached in the run).
- Location: wireframe/js/popover.js:86-96; register.js:65-70, 437; miniature.js:96, 203, 559-560, 574; checks.js:65, 361; apparatus.js:255
- Finding: The manuscript place, the design's reference unit, is written in at least six forms by six private formatters: order folio-line vs line-folio, 'Z.' vs 'Zeile', with or without folio, '1r a' vs '1ra', 'bis' vs '-', 'dieser Seite' vs 'fol. 1r', and one doubled 'Zeile Z.'.
- Rule: design.md popover head example 'Wort "Rotlebín", fol. 1r b Z. 16' and the lower-pane frame 'fol. 1r b Z. 16'; F48 (location in folio, column and line); one visible name per object
- Proposal: One formatter in state.js, e.g. place({folio, col, from, to}) → 'fol. 1r b Z. 16' and 'fol. 1r b Z. 16 bis Z. 17' ('Kopfzeile' in place of 'Z. n'), used by popover heads of all states (Zeile: state word 'Zeile' in the title, place in the muted context like Wort), Verweise rows and jump buttons, findings, miniature head and text relation, address notices (rephrase so no sentence starts with 'Fol.'). Fix checks.js:361 to 'fol. 1r a Z. 3 enthält kein Wort …'.

### 3.3 Step names mix a field name ('Normalisiert'), a verb ('Verknüpfen'), a German action with a raw value ('Hervorhebung gold'), a TEI element with a raw value ('su

- Severity: consistency
- State: Apply Normalisiert, a Hervorhebung, an Ergänzung, a comment, an image-form change, then press Rückgängig and Wiederholen each time. Notices read 'Rückgängig: Normalisiert.', 'Wiederholt: Normalisiert.', 'Rückgängig: Hervorhebung gold.', 'Rückgängig: supplied damage.', 'Rückgängig: Apparatkommentar.', 'Rückgängig: XML formatieren.', 'Rückgängig: Bildannotation margins_01: Titel.'
- Location: wireframe/js/toolbar.js:28-31 (notice), commit labels at flow.js:260, markup.js:87, 170, 188, popover.js:190, register.js:146, 161, apparatus.js:193, 267, xml.js:59, miniature.js:661
- Finding: Step names mix a field name ('Normalisiert'), a verb ('Verknüpfen'), a German action with a raw value ('Hervorhebung gold'), a TEI element with a raw value ('supplied damage'), an id with a double colon ('Bildannotation margins_01: Titel') and never name the object the step touched. The two prefixes are asymmetric ('Rückgängig:' label vs 'Wiederholt:' participle).
- Rule: F44 item 6 (the name of the step Rückgängig or Wiederholen restored); N2 German labels; R2 (values carry German labels from the vocabulary); delta 'Eine Handlung, die einen vorhandenen Wert ersetzt, nennt die Ersetzung'
- Proposal: Give every commit a label of the form action plus object, built from the German labels: 'Normalisierung „hebet“ an „hebit“', 'Ergänzung „Beschädigung“ an „Dem“', 'Verknüpfung „Dem“ mit Ort: Mara', 'Kommentar an „mut“', 'Titel von „Drache“'. Notice prefixes 'Rückgängig gemacht: …' and 'Wiederholt: …'.

### 3.4 Markup confirmations and refusals speak TEI syntax in three notations for the same element: '<supplied reason="…">' and '<supplied>' (markup.js), 'hi/@rend="…"'

- Severity: consistency
- State: Select 'Dem' (column b, Z. 16), choose an Ergänzung value, then a Tilgung value; select 'herren' and choose a Hervorhebung. Notes read '<supplied reason="text_intervention"> um das Wort gelegt.', '<supplied reason="switch"> um das Wort gelegt. text_intervention durch switch ersetzt.', 'hi/@rend="gold" für das Wort übernommen.', and the refusal '„Dem“ steht bereits in <supplied>.'
- Location: wireframe/js/markup.js:130, 133, 138, 154-157, 167, 173, 181, 190; register.js:95, 109, 115-118
- Finding: Markup confirmations and refusals speak TEI syntax in three notations for the same element: '<supplied reason="…">' and '<supplied>' (markup.js), 'hi/@rend="…"' (markup.js), 'Element supplied (reason="damage")' and 'Element seg der Marginalie' (register.js). Raw values ('text_intervention', 'gold') stand where R2 puts German labels. Two refusals give no way forward: '„Dem“ steht bereits in <supplied>.' and 'Die Auswahl schneidet den Registerverweis <ref> „…“ an seiner Grenze. Das Element würde geteilt.'
- Rule: N2 German interface labels; R2 (grouped values with German labels); one visible name per object; delta 'Weist die Anwendung … zurück, nennt sie Grund und gangbaren Weg'
- Proposal: One naming function shared by markup.js and register.js, markupName(mk) → German action label plus value label from the vocabulary ('Ergänzung „Beschädigung“', 'Hervorhebung „Gold“', 'Registerverweis Person: Martin', 'Marginalie'). Confirmations 'Ergänzung „Beschädigung“ an „Dem“ gesetzt, ersetzt „Texteingriff“.' Refusals in one form 'Nicht gesetzt: „Dem“ trägt schon Ergänzung „Texteingriff“. Erst den Chip entfernen.' and 'Nicht gesetzt: Die Auswahl schneidet Registerverweis Person: Martin. Den ganzen Verweis oder kein Wort daraus wählen.'

### 3.5 The three multi-field forms that R1 keeps refuse an entry in three formats (prefix 'Nicht angelegt:', suffix 'Nichts geändert.', bare sentence) and at three pla

- Severity: consistency
- State: Comment form: Anwenden with empty fields → note under the popover head 'Die deutsche Anmerkung fehlt.' / 'Die Sigle fehlt, etwa MK.'. Image form: Höhe in Zeilen 'x', Anwenden → note under the tab row 'Höhe in Zeilen muss eine ganze Zahl sein. Nichts geändert.'. Register entry form: duplicate ID → at the ID field 'Nicht angelegt: Die ID „Martin“ besteht bereits (Person).'
- Location: wireframe/js/apparatus.js:186-190, 265-266 (popoverNote); miniature.js:386-387, 473, 657-659, 670-673 (panelNote); register.js:278-293 (field-error at the field)
- Finding: The three multi-field forms that R1 keeps refuse an entry in three formats (prefix 'Nicht angelegt:', suffix 'Nichts geändert.', bare sentence) and at three places (at the field with aria-invalid, under the popover head, under the side panel's tab row far from the field). Only the register form follows the rule.
- Rule: design.md interaction rules: 'A refused entry in a popover field … states its reason at that field'; F44 closing sentence; consistency of the same message class
- Proposal: Use the register form's pattern in all three forms: an error line directly under the offending field, aria-invalid and aria-describedby on the field, focus on the field, one wording 'Nicht übernommen: <Feld> fehlt.' / '… muss eine ganze Zahl sein.'. Drop the trailing 'Nichts geändert.'.

### 3.6 One action carries two verbs: the control says 'Anwenden', every confirmation says 'übernommen'.

- Severity: consistency
- State: Apply a comment ('Apparatkommentar start_43592 bis end_43593 übernommen.'), edit an existing comment ('Kommentar übernommen, die Anker bleiben unverändert.'), apply the image form ('Übernommen: Titel.'), cancel it ('Nicht übernommene Eingaben verworfen.'), switch document with pending input ('Die Eingabe ist weder übernommen noch abgebrochen. Erst Anwenden oder Abbrechen, dann das Dokument wechseln.'). The button in all these forms reads 'Anwenden'.
- Location: wireframe/js/apparatus.js:206, 241, 269; miniature.js:309, 645, 667; register.js:311; popover.js:193, 241; markup.js:93, 173
- Finding: One action carries two verbs: the control says 'Anwenden', every confirmation says 'übernommen'. The confirmation word order also varies ('X übernommen.' vs 'Übernommen: X.').
- Rule: design.md 'an action one control' and the delta rule 'Beschriftungen von Handlungen nennen Verb und Objekt'; the message names the action by the control's verb
- Proposal: Pick one verb. Recommendation: label the button 'Übernehmen' (the conventional German label for Apply, and the verb all messages already use), keep 'Abbrechen', and write every confirmation as '<Objekt> übernommen.' ('Kommentar an „mut“ übernommen.', 'Titel übernommen.'). Update design.md's token table, which names 'Anwenden'.

### 3.7 Bar and list count the same result differently (bar counts warnings, list does not; both print a zero class '0 Fehler').

- Severity: consistency
- State: Prüfen, Schematron review. Bar: 'Schematron review: 89 Befunde (0 Fehler, 89 Warnungen) Der Wert … des Editionsteams. fol. 1r a Z. 2 [Befunde anzeigen]'. List head: '89 Befunde, 0 Fehler'. Then switch the document chooser to Bildannotationen: the bar stays, naming no document.
- Location: wireframe/js/checks.js:43, 299-300, 318, 326
- Finding: Bar and list count the same result differently (bar counts warnings, list does not; both print a zero class '0 Fehler'). checks.js:299 hard-codes 'Warnungen', so one warning reads '1 Warnungen' (code-level, not reached with this data). The bar glues the first finding's place after the message's full stop as plain text, while the list shows it as a jump link. On Bildannotationen the standing bar does not say that its findings belong to Codex 2759.
- Rule: F46 (check, number of findings, first message, route to the list); F47 (the document named as the chooser names it); one name per object across surfaces
- Proposal: One count function for bar and list that omits zero classes and inflects: '89 Warnungen', '2 Fehler, 1 Warnung'. Bar: '<Prüfung> in Codex 2759: 89 Warnungen. fol. 1r a Z. 2: <Meldung>' with the place as the same jump link as in the list.

### 3.8 Anchor ids, zone ids, attribute names (@norm, @sameAs) and XPath-like forms (ref/@target) appear as visible text in the editing surfaces, where the editor reads

- Severity: consistency
- State: Click the second 'got' (Z. 5): the comment head reads 'Editionskommentar comment_edition, start_42597 bis end_42599'. Click a line number: first line 'Zone region_1639399497290_13l2'. Line 5 shows 'Got ohne @norm', the Wort state of 'Got' shows 'Kein @norm im Bestand'. Verweise rows end in 'ref/@target' or 'rs/@ref'. Applying a comment confirms 'Apparatkommentar start_43592 bis end_43593 übernommen.'
- Location: wireframe/js/apparatus.js:206, 214, 249, 252, 255; popover.js:185, 208, 215-217; register.js:177, 396
- Finding: Anchor ids, zone ids, attribute names (@norm, @sameAs) and XPath-like forms (ref/@target) appear as visible text in the editing surfaces, where the editor reads none of them. The comment type is shown twice, German and raw. The XML view, reachable through XML-Stelle, already carries all of them.
- Rule: delta 'Technische Kennungen, die der Arbeitsschritt nicht liest, werden … eingeklappt und erscheinen am ausgewählten Element oder auf Anforderung'; operator lesson 8 (less weight for what does not change the interpretation); N2
- Proposal: Comment head: type label only ('Editionskommentar'), the form's select without '(comment_edition)'; confirmation 'Kommentar an „mut“ übernommen.'; unresolved anchor as 'Beginn liegt vor fol. 1r'. Drop the Zone line from the Zeile state (the facsimile outlines the zone). Missing normalisation as an empty field with the placeholder 'keine Normalisierung' instead of '@norm'. Drop 'ref/@target'/'rs/@ref' from popover and Verweise rows.

### 3.9 The image form labels its fields with English TEI attribute names and prints a raw boolean 'true' and 'nicht gesetzt' for every empty attribute.

- Severity: consistency
- State: Bildannotationen, open miniatures_01 and margins_02. Head 'Miniatur miniatures_01, fol. 1ra Z. 4-17'; meta line 'Eintrag #Image_1676476154286_76, Liste miniatures, resp nicht gesetzt, verankert nicht gesetzt'; field labels 'Titel resp #JT #KS', 'Kurzbeschreibung resp #JT #KS, verankert true', 'Objekttyp rend initial_historisiert', 'resp #ICONCLASS, neu, noch nicht übernommen', 'Erstes Wort region_1639399488602_10l3_0'. The item without description reads 'ohne Beschreibung, verweist auf margins_01' (list), 'verweist auf margins_01' (Bild tab list) and 'Ohne eigene Beschreibung. Das Bild verweist mit @sameAs auf margins_01.' (form).
- Location: wireframe/js/miniature.js:137-144, 140, 206, 220, 241, 247-263, 323, 463, 559-560
- Finding: The image form labels its fields with English TEI attribute names and prints a raw boolean 'true' and 'nicht gesetzt' for every empty attribute. Headings and lists lead with the monospace item id before the title, which the operator named as a lesson for the popover. One state (no own description) has three wordings, one with '@sameAs'.
- Rule: N2 German labels; delta rule on technical identifiers; operator lesson 8 ('Die Miniatur-ID in Monospace … standen über dem Titel'); one name per object
- Proposal: Responsibility in German and only when set: 'erfasst von JT, KS', 'verankert' as a word without value when true, nothing when unset; drop the meta line or reduce it to 'Miniatur' / 'Randbild'. Lists and head lead with the title, the id only as tooltip. One wording for sameAs: 'wie margins_01' with the link 'margins_01 öffnen'.

### 3.10 The same comment fields and the same comment object carry different names in the list and the form, and the same refusal is phrased two ways.

- Severity: consistency
- State: Click 'got' (existing comment) and 'mut' (+ Kommentar). The existing comment labels its fields 'Deutsch' and 'Englisch'; the new-comment form labels the same fields 'Anmerkung Deutsch' and 'Anmerkung Englisch'. The object is 'Apparatkommentar' in the toolbar, the form's name and the creation note, but 'Kommentar' in '+ Kommentar', the entry's name and the edit note. Required-field messages: 'Die deutsche Anmerkung fehlt.' (new) vs 'Die deutsche Anmerkung darf nicht leer sein.' (edit); 'Die Sigle fehlt, etwa MK.' vs the hint 'z. B. MK'.
- Location: wireframe/js/apparatus.js:188, 190, 206, 212, 227, 236, 249, 261, 265, 269
- Finding: The same comment fields and the same comment object carry different names in the list and the form, and the same refusal is phrased two ways.
- Rule: design.md 'An object carries one visible name per surface'; consistency of field labels
- Proposal: Name the object 'Kommentar' inside the Apparat row everywhere (R3 removes the toolbar's Apparatkommentar). Use one label pair in form and list, 'Anmerkung deutsch' and 'Anmerkung englisch', one message '<Feld> fehlt.', and 'z. B.' in both places.

### 3.11 One list is reached by two differently named actions, the references pane names its entry twice on one surface, and one toggle switches between a noun label and

- Severity: consistency
- State: Prüfen menu: 'Befundliste'; notice bar: 'Befunde anzeigen'; pane title: 'Befunde Codex 2759'. Register menu: 'Verweise auf Eintrag'; popover: 'Verweise'; pane title 'Verweise auf „Person: Martin“' with the chip 'Person: Martin' and '1 Verweis im Codex' repeated directly below. The control to the XML reads 'XML-Stelle' (a noun) and toggles to 'Im Text zeigen' (a verb phrase); a third route reads 'In der XML-Ansicht bearbeiten'. Close controls are named 'Zum Text' (popover, also on wide screens) and 'Seitenleiste schließen'.
- Location: wireframe/index.html:80, 96-97, 118; checks.js:289, 334; register.js:179, 386, 406, 450; xml.js:79; markup.js:76
- Finding: One list is reached by two differently named actions, the references pane names its entry twice on one surface, and one toggle switches between a noun label and a verb label.
- Rule: design.md 'An object carries one visible name per surface and an action one control'; R7 (the lower pane has its own title naming its content once); delta 'Beschriftungen von Handlungen nennen Verb und Objekt'; the Befundliste conflict recorded in the delta snapshot
- Proposal: Name the action 'Befunde anzeigen' both in Prüfen and in the bar. Pane titles name the object once ('Verweise Person: Martin', as design.md's frame shows) without the repeated chip line. Label the toggle 'Im XML zeigen' / 'Im Text zeigen'. Close controls: 'Schließen' as accessible name on wide screens, 'Zum Text' only on the sheet.

### 3.12 The document is named 'Codex' (with a missing article: 'in Codex'), 'den Codex', 'Codex 2759' and 'Datei' in different messages, although checks.js declares doc

- Severity: consistency
- State: Initial load: hover Rückgängig ('Nichts rückgängig zu machen in Codex.') and Herunterladen ('Erst Speichern.', enabled: 'Die zuletzt gespeicherten Bytes herunterladen'). Switch to Bildannotationen: 'Gilt für den Codex. Erst im Dokumentwähler Codex 2759 wählen.', 'XML formatieren gilt für den Codex.', 'Nichts rückgängig zu machen in Bildannotationen.' Address #codex/2r/a: 'Fol. 2r liegt nicht in dieser Datei, sie enthält nur fol. 1r.'
- Location: wireframe/js/toolbar.js:18, 22, 29, 31; app.js:53; checks.js:22-23 (docLabel), 387; index.html:49; miniature.js:95-96
- Finding: The document is named 'Codex' (with a missing article: 'in Codex'), 'den Codex', 'Codex 2759' and 'Datei' in different messages, although checks.js declares docLabel the one name; toolbar.js keeps its own DOC_NAME map. A route names a 'Dokumentwähler' that has no visible label. 'Erst Speichern.' capitalises the verb unlike the other reasons ('Erst … auswählen', '… einblenden'). Herunterladen alone has a sentence tooltip with the jargon 'Bytes'.
- Rule: F11 and F47 (the document named as the chooser names it); one visible name per object; consistency of disabled reasons
- Proposal: Route every document name through docLabel and remove DOC_NAME: 'Codex 2759: kein Schritt rückgängig zu machen.' Name the route by what the user sees: 'Gilt für Codex 2759.' Use 'Dokument' instead of 'Datei' in address notices. 'Erst speichern.' in lower case. Herunterladen tooltip 'Herunterladen (zuletzt gespeicherter Stand)' or none.

### 3.13 A limitation of the wireframe (the Bildannotationen source is not extracted) appears as an interface sentence in two places, and the XML switch and Herunterlade

- Severity: consistency
- State: Switch the document chooser to Bildannotationen, then XML: the view shows only 'Kein XML geladen.'; Herunterladen is disabled with the same sentence as reason.
- Location: wireframe/index.html:105; checks.js:386; xml.js:68-76
- Finding: A limitation of the wireframe (the Bildannotationen source is not extracted) appears as an interface sentence in two places, and the XML switch and Herunterladen are rendered for a document whose XML the wireframe does not have.
- Rule: design.md 'The interface explains no limits of itself in sentences. A limitation of the wireframe is one badge "Wireframe" with a tooltip'; delta prototype clause 'ein Bedienelement, das im Prototyp noch nichts tun kann, wird nicht gerendert'; R4 (controls follow the view)
- Proposal: For Bildannotationen do not render the XML segment and Herunterladen in the wireframe, and add the fact to the badge tooltip ('Entwurf im Speicher auf fol. 1r; Bildannotationen ohne XML; schreibt keine Datei.'). Remove the empty-note paragraph.

### 3.14 Several sentences explain the tool rather than answer a question, and one is misleading: formatting takes effect at once and is undoable, it is not deferred to 

- Severity: polish
- State: XML formatieren: 'Formatierung ist eine Änderung am ganzen Dokument und wird erst beim Speichern wirksam.' Comment form hint 'Wird beiden Anmerkungen in Klammern angehängt.'; comment edit 'Kommentar übernommen, die Anker bleiben unverändert.'; Register Personen pane 'Gezeigt sind die ersten 50 Einträge; die Suche grenzt weiter ein.' Search outcomes: 'Kein Eintrag gefunden.' (register pane) vs 'Kein Treffer.' / '25 Treffer, die ersten 20 angezeigt' (ICONCLASS). Separators: 'Person · 1 Verweis im Codex' (register hits) vs commas elsewhere; ICONCLASS hits tag languages 'de'/'en' beside fields 'Deutsch'/'Englisch'.
- Location: wireframe/js/xml.js:61; apparatus.js:237, 269; register.js:237, 433, 441, 443; miniature.js:441, 515-516, 521
- Finding: Several sentences explain the tool rather than answer a question, and one is misleading: formatting takes effect at once and is undoable, it is not deferred to saving. The design asks for the consequence 'a change to every line of the document'. The two searches report the same outcomes in different words, and the middle dot appears only in register hits.
- Rule: design.md (XML view, F56: the consequence, a change to every line, at the moment it runs); delta 'ein Text steht nur dort, wo er eine Frage der Nutzenden beantwortet'; consistency
- Proposal: Format notice: 'XML formatiert: jede Zeile des Dokuments geändert.' Drop the sigle hint (the example 'z. B. MK' stays) and the anchor clause. One search wording for both: 'N Treffer', 'erste 50 von N Treffern', 'Kein Treffer.'. One separator (comma) in hit metadata, and 'Deutsch'/'Englisch' or 'de'/'en' consistently in the ICONCLASS block.

Clean: I judged the committed wireframe (git archive HEAD) on real fol. 1r data. The data file was present and copied. I drove it with Playwright 1.62.1 at 1400x900 and 390x844 and read the screenshots. The scripts and the per-state string dumps (strings-wide.json, strings-narrow.json, strings-extra.json) are in C:/Users/chris/AppData/Local/Temp/claude/c--Users-chris-Documents-GitHub-DHCraft-wenzelsbibel-teiCrafter/2320f4be-f777-4dae-b0ff-de7f783a6c54/scratchpad/ui-audit/text/shots/ and ../../ui-audit-scripts/text/. I stopped the server on port 8767 at the end. The rule set is knowledge/design.md, which another session rewrote during the run. That rewrite already carries R1 to R8 (one-row toolbar, popover rows, lower pane, Seite einpassen). I read that working-tree diff and used it, so nothing above restates a decided point.

I left these out because R1 to R9 settle them:
- the popover's Diplomatisch field and its per-field Anwenden/Abbrechen
- 'Nicht verknüpft' and the type select
- 'Kein Kommentar zu dieser Stelle.'
- the Bild row with its id and its 'Umfang' sentence
- raw markup values in the toolbar menus and the Ctrl+E element list
- 'Schematron editing/review'
- the space-split refusal
- the OpenSeadragon English tooltips 'Zoom in', 'Go home' and 'Toggle full page'
- the tab row
- the layout shift of the notice bar

These are consistent throughout:
- German labels on all controls
- 'Strg+' in tooltips
- German typographic quotes „…“ in the interface's own messages. The straight quotes inside Schematron messages are the .sch texts, which design.md allows as stand-ins.
- the type words Person/Ort/Volk in chips and hits
- the unsaved dot with 'ungesichert'
- the badge with a single tooltip
- Kopfzeile handling

Two defects are in the code but not in the run: 'Die Zeile Z. 3 …' at checks.js:361 and '1 Warnungen' at checks.js:299. This data set never reaches either state.

Out of lens, for whoever owns the data: register IDs in the extracted data are double-encoded UTF-8 ('AbiÃ«ser', 'AsriÃ«l', 'GalilÃ¤a', 'Ã\x84gypten', eleven in total) and show up in 'Register Personen'. The extractor decodes as UTF-8, which points to the source @target values. That makes it a data and Schematron matter, not interface text. 'Ägypten' is also listed under Personen.

## Verified findings

Ten findings were reproduced by a second agent. Each held with an adjustment, recorded here as the finding should stand.

- consistency: The popover close is named "Zum Text" (index.html:97) in every view. In the XML view it only hides the popover: the XML view stays open and focus drops to BODY, for both click and Escape. The cause is popover.js:78, which returns focus only in the text view. This breaks the design.md interaction rule that each closing step returns focus to the element that opened the layer, accessibility minimum 5, and the promise in design.md Popover point 6 that the close control "returns to the text". On the narrow XML sheet, "Im Text zeigen" (xml.js:79) and "✕ Zum Text" stand side by side and do different things. Separately, the narrow side close at index.html:118 shows "Zum Text" but is named "Seitenleiste schließen", which breaks WCAG 2.5.3. R7 already removes that control, so only the name of its successor, the lower-pane close, remains open.
  Proposal: Popover:
- Call the popover close "Schließen" in every view and layout: the accessible name of the icon-only ✕ on wide screens, and the visible sheet text on narrow screens. Drop "Zum Text", so it no longer collides with the "Im Text zeigen" view switch.
- In popover.js closePopover, return focus in the XML view to the source at the selected element: #xml with tabindex="-1" in the wireframe, the CodeMirror view in the product. Do this for both the close control and Escape, never leaving focus on body.
- Add a check to the round-3 walkthrough: close and Escape in the XML view leave activeElement inside #xml-view.

R7 lower pane:
- Give the close control the same rule: an icon-only ✕ named "Schließen", whose visible text on the narrow sheet equals its name. Do not create another "Seitenleiste schließen"/"Zum Text" pair.

design.md:
- Add one line to the interaction rules: a close control is named "Schließen", and where it shows text that text is its accessible name.
- Change Popover point 6 from "a close control that returns to the text" to "a close control that returns focus to the selection in the current view".
- consistency: Whenever the facsimile is off, the Zonen switch tells assistive technology one thing and the eye another. The accessibility tree reports `button "Zonen" [disabled] [pressed]` because `aria-pressed` follows the remembered preference `state.zones` (toolbar.js:77). The eye sees a dashed, unfilled control because the pressed fill is suppressed while disabled (wireframe.css:106). A screen-reader user hears "pressed" for an overlay that is not shown. Whether it says pressed depends on a preference the user cannot see. This is the initial state at HEAD, and it will be the narrow-screen default once R5 is built. It breaks the rule in design.md that a switch's filled segment and its pressed state go together. The disabled-with-reason state exists only because Zonen is rendered without its object, the facsimile's zone overlay.
  Proposal: Make Zonen follow its object, not the view.

Build:
- Render `#toggle-zones` only while the facsimile is shown (`state.side === "facs"` in the text view). Keep `state.zones` as the remembered preference and restore it when the facsimile returns.
- Delete the blocked reason in app.js:52, since there is then nothing to block.
- Write `aria-pressed` in the same function that decides the drawn state, so a toggle can never be exposed as pressed when it is not filled. If any switch is ever drawn disabled, set `aria-pressed` to false for it or draw a muted fill.

Knowledge, in the same change:
- F7: "Zonen in the text view while the facsimile is shown".
- design.md:73, :80 and :231: add the same condition.
- design.md:73: keep the disabled example on Rückgängig or Befundliste, not on Zonen.

Walkthrough:
- Replace core.mjs:46 and :50 with a check that Zonen is absent with the facsimile off, present with its remembered pressed state with the facsimile on, and that `aria-pressed` equals the drawn fill.

Fallback if the operator wants Zonen to stay visible: keep it disabled and set `aria-pressed = state.zones && state.side === "facs"` in toolbar.js:77, so the tree matches the unfilled dashed control.
- consistency: After R3 and R7, the register lists Personen, Orte and Völker have no way to open. The entry search can then be reached only from a references pane, which needs a linked word selected first. R7 says a list opens from its action, and here none is left. The register entry list is also built twice in listPanel under the tab "Verweise": as "Register Personen", with no type filter and plain-text rows with a "Zu Z. n" jump, and as "Verweise auf Eintrag", with a type filter and rows that open the references. The second title promises references but shows register entries. The references are also labelled differently on each surface: "Verweise" on the chip, "Verweise auf Eintrag" in the menu, "Verweise auf „X“" as the pane title. The findings list has three labels: "Befundliste" in Prüfen, "Befunde anzeigen" in the bar and "Befunde" on the tab. The specification writes these labels in (F9, F47), so the rename has to change it.
  Proposal: 1. Merge the two listPanel modes into one pane titled "Register". It keeps the search and the Alle/Person/Ort/Volk type filter. Each row is one button with ID, type and codex count that opens "Verweise auf Person: X". Drop the separate commands Personen, Orte and Völker and the "Zu Z. n" jump, because the references pane already jumps to each occurrence.
2. Make the chip's references control explicit in R1 and label it "Verweise anzeigen", because R1 as worded leaves it out. Add no second search link to the popover, since R1's combobox is already the search.
3. The no-selection route is an operator decision (yes/no): should a "Register" action join the right-hand group of R3 next to Prüfen and open the Register pane in R7's lower pane? I recommend yes, because checking an entry or a type list is a task without a selected word, and R7 requires an action for each list. If the answer is no, the Register pane exists only behind "Verweise anzeigen".
4. Rename the Prüfen entry "Befundliste" to "Befunde anzeigen", the same label as the notice bar. Keep the pane title "Befunde" with the document label, as F47 requires. Change F9, F47 and design.md (lines 76 and 203) in the same step. Hand the remaining hidden-action conflict to the vault session, which the snapshot already does.
- consistency: The same construct, a label naming a group of controls, is built five ways in the popover and its forms:
- a label-wrapped field (popover.js:176);
- a bare .group-title div or span (register.js:174, apparatus.js:281, markup.js:243, miniature.js:483, :626);
- a .field-label beside controls that carry their own names (miniature.js:396, :554);
- fieldset with legend (miniature.js:334);
- role=group or form with an aria-label that differs from the visible title (register.js:273 with :304, apparatus.js:212).

The result is a flat accessibility tree for the Register, Apparat, Bild and Markup rows. Some controls lose their row context: "+ Kommentar", the image link, "Im Text zeigen" and "Notation 1". The register-entry form has two names, "Neuer Eintrag" visible and "Registereintrag anlegen" accessible. The visual treatment varies too: the comment form is framed and untitled while the register form has a bold title and no frame, and ICONCLASS uses the bold group style while Künstler, Personen and Orte use the grey field-label style.

This is not a violation of Accessibility minima 4: keyboard operation works, and Tab reaches every control. It is a gap the rules do not cover. R1's label column would carry the inconsistency forward if it is built on .group-title.
  Proposal: Use one helper for every labelled row and form group, and choose the construct by row shape rather than by module:
- **Single-field rows** (Normalisiert in R1; Titel and similar in the image form): the label cell is a label element tied to its input, as popover.js:176 already does, with no extra group around it.
- **Multi-control rows in the popover** (Markup with chips and field, Register with combobox or chip, Verknüpfung lösen and Verweise, Apparat with comment list and "+ Kommentar", Bild with its links): a div with role=group and aria-labelledby pointing to the visible label cell. This replaces .group-title at register.js:174, apparatus.js:281, markup.js:243 and miniature.js:626.
- **Multi-field forms** (comment form, register-entry form, image form groups Künstler, Personen, Orte, ICONCLASS, Textbezug): fieldset with a visible legend, which miniature.js:334 already does, styled once. The legend text is the accessible name. Drop the separate aria-label at register.js:273 so that "Neuer Eintrag" (or whichever single name the operator picks) is the only name. Give the comment form at apparatus.js:212 the same legend and the same frame treatment as the register form, or frame neither. Restyle ICONCLASS (miniature.js:483) as a legend like the other image-form groups.

Leave register.js:388 out of this change: it is a list caption in the lower pane, which an aria-labelledby on its ul would cover.

The Wireframe walkthroughs can check the result: each popover row and form group exposes a role=group or fieldset whose accessible name equals its visible label.
- consistency: The same objects carry different or doubled names across the comment and image-annotation surfaces. In the Wortfolge popover, the existing comment's note fields are labelled "Deutsch" and "Englisch", while the "+ Kommentar" form directly below labels them "Anmerkung Deutsch" and "Anmerkung Englisch". The comment type is shown under two names in both places ("Editionskommentar" plus "comment_edition" in the entry, "Editionskommentar (comment_edition)" in the select). The entry also shows its anchor ids visibly and uses them as its accessible name ("Kommentar start_42597 bis end_42599").

An image annotation is named by its monospace id first in the item list (#minis and panel list) and in the panel heading "Miniatur miniatures_01, fol. 1ra Z. 4-17". That heading also repeats the Folio and Zeilen values that stand as fields below. The form (and the sameAs variant) opens with the record-metadata line "Eintrag #Image_…, Liste miniatures, resp nicht gesetzt, verankert nicht gesetzt" above Titel, the first-decision field. The popover Bild row (id plus title plus Umfang sentence) is the same defect, but R1 already decides it.
  Proposal: Comment, apparatus.js:
- Use one label pair in both entry and form, "Anmerkung Deutsch" and "Anmerkung Englisch". Make LANGS carry the full label and drop the template at :227.
- Show the type once, by its German label: the strong text in the entry, and the option text "Editionskommentar" in the select. Put the code in a title attribute at most.
- Remove "start_… bis end_…" from the visible type line. The anchors stay reachable through XML-Stelle and IDs anzeigen in the XML view (R4/R9).
- Name the entry for assistive technology by type and covered words, taken from the range index (ranges map) and not from the note text. In this state that gives "Editionskommentar zu „got“". When the range equals the selection, the type alone is enough.

Image annotation, miniature.js:
- In both list renderers (:141-144 and :219-221), make the title the row's name. Move the id into a title attribute or drop it. The sameAs row keeps its "verweist auf" wording, naming the target by its title.
- Panel heading (:206): Miniatur or Randbild plus the item title, matching the working-tree design.md "titled with the item's title". Drop the id and the folio and lines context, which the Folio and Zeilen fields already show.
- Move itemMeta (:305, also :240) behind the fields, or into a collapsed details element at the end of the form, as optional depth.

Lowest-risk order: labels and the type name first (pure text), then the list and heading, then the metadata position.
- core-interaction: Keyboard users cannot reach the Zeile state, so the line is pointer-only even though the design calls it the reference unit.

Only a click on a line number (flow.js:101-102) or on a line zone (facsimile.js:113) sets state.pendingLine. readSelection (flow.js:155) derives Zeile from pendingLine alone. As a result, a keyboard selection covering exactly the words of one line stays Wortfolge: Z. 1 with Shift+Right ×8 gives "Wortfolge … 8 Wörter, Z. 1", and Z. 6 at 390 px gives the same with Home plus Shift+End.

Home plus Shift+End also overshoots by one word on lines that end in a punctuation island. On Z. 1 the result is "Wortfolge „Hie … der“ 9 Wörter, Z. 1 bis Z. 2", because the forward keyboard snap at flow.js:182-183 takes the next word after the gap behind "•".

Line numbers (flow.js:42, aria-hidden, no tabindex) and the zone layer (facsimile.js:85, aria-hidden) give no other route.

The rules contradict each other here. The Zeile row of the popover table and F16 name only pointer openers. Accessibility minimum 4 requires line selection by keyboard.
  Proposal: Bind the line state to a keyboard gesture, not to how far a selection reaches. Use only browser-default keys, so the shortcut exclusion in specification.md (line 36) holds.

1. In the flow keydown handler, intercept Shift+End and Shift+Home. Native Home and End act on the visual line, which differs from the manuscript line in the narrow layout, where the flow wraps. Extend instead to the last or first word of the caret word's manuscript line, the line of its w entry, so a word containing an lb counts on the line where it begins (R9).
2. When the selection then spans the whole line, call selectLine(line.id) so the existing pendingLine test yields Zeile. This also covers Home then Shift+End, and End then Shift+Home.
3. Leave Shift+Arrow and drag as word-based Wortfolge even when they happen to cover a full line. Otherwise a deliberate sequence would lose its Markup, Register, Apparat and Bild rows.
4. In snapSelection, keep a forward keyboard extension that ends in the gap after a trailing pc or milestone island on the same manuscript line. Treat the caret as still on that line instead of taking the next word. This removes the "… der", Z. 1 bis Z. 2 overshoot.
5. Line numbers and zones can stay aria-hidden, because the popover title announces "Zeile N".
6. Record the keyboard route in three places: the Zeile row of the design.md popover table ("Click on the line number or a line zone, or Shift+Home/Shift+End in the text"), F16 in specification.md, and a check in the round-3 walkthrough. The check: from "ſich" in Z. 1, Home then Shift+End gives "Zeile 1, fol. 1r a" with the 8 words.
- core-interaction: The notice bar (#notice) and the popover and panel notes (#popover-note, #panel-note) start as hidden, so they are not in the accessibility tree. Each gets its text in the same task that shows it, which many screen readers ignore. The persistent region #announce is never used because CONFIRM_CLEAN is true. The bar's buttons ("Befunde anzeigen", "Abbrechen") sit inside the live node. The first edit after a check also rebuilds the whole visible bar, which would re-read the finding text and the button label at the same moment as the popover note. This breaks design.md Accessibility minima 6 and the notice-bar rule ("is a live region for assistive technology").

Correct locations:
- index.html:86, :99, :120
- notice.js:10-13 and :17-24
- popover.js:249-256
- panel.js:123-131
- checks.js:27, :229, :259, :283-299, :370-375
- also checks.js:313 and facsimile.js:29, which create role=status nodes with their text already in them

Not affected:
- index.html:28, the unsaved dot, which is built correctly
- the role=alert nodes
  Proposal: Use one announcer that is always in the tree, which is the shortest change. #announce at index.html:87 already exists and is built correctly (it clears the text, then sets it in the next frame).

1. In notice.js, notify() and restore(), and in popoverNote and panelNote, pass the message text to announce(text). For standing content, pass only the text of the strong and span nodes, never the button labels.
2. Remove aria-live from #notice and role=status from #popover-note, #panel-note, checks.js:313 and facsimile.js:29, so nothing is read twice. All of these stay visible as they are now.
3. In restore(), call announce() only when the message text has changed. A rebuild caused by an edit (checks.js:370-375) then announces only the new line "Ergebnis veraltet, Prüfung erneut ausführen.".
4. Remove the CONFIRM_CLEAN branches at checks.js:229 and :259, because notify() then always announces.

This keeps the buttons out of the spoken message and needs no change to the layout of the bar. The bar overlays the work area under R9 either way. Record in design.md Accessibility minima 6 that all status messages, including the notes under the popover and panel heads, are announced through one region that is always present. Add a walkthrough check that #announce receives the text for a refusal, a check result and an Anwenden.
- consistency: In the forms the wireframe keeps, the label element wraps secondary notes, examples and metadata as well as the field name. The computed accessible name therefore carries that text: ID "Gesucht war …", Sigle "z. B. MK" plus the hint, which is also announced a second time as the description, and the resp, verankert and rend values on Titel, Objekttyp, Kurzbeschreibung, Beschreibung and Textbezug. Two ways of attaching a note coexist. Sigle and the register error use aria-describedby, and every other note sits inside the label. A screen reader hears one long name where the eye reads a short label with a quieter note.
  Proposal: Fix it in place at each site, without merging the form builders.
- register.js:306-307: move the "Gesucht war" span and the error span out of the label into a wrapper beside it. Give the hint an id and set the ID input's aria-describedby to "reg-id-error reg-id-searched".
- apparatus.js:234-238: keep only "Sigle" inside the label. Move "z. B. MK" and the hint out, and attach both through aria-describedby. This also ends the double announcement.
- miniature.js:281-284 and 322-323: render the resp, verankert and rend span as a sibling after the label, not inside it. Give it an id, set aria-describedby on the control, and keep its quieter visual style.
- popover.js:175-177: apply the same change to field() only if it survives R1. Under lesson 6, drop the "Kein @norm im Bestand" note in the rebuilt Normalisiert row instead of moving it.

Record the rule as a new accessibility minimum in design.md so the real build inherits it: "A field's accessible name is its label text only; notes, examples, responsibility values and errors attach by aria-describedby." Add a walkthrough check that reads the AX tree via CDP and asserts the names of these fields.
- consistency: The same kind of action is styled differently across surfaces, and one label names two different actions.
- **"Im Text zeigen".** In the XML view's popover head it is an underlined link that switches back to the text view (xml.js:79, index.html:96). In the Bild form it is a bordered button that switches document and column and marks a word range (miniature.js:562).
- **Adding.** "+ Kommentar" and "+ Künstler" are links, "Hinzufügen" is a bordered button.
- **Removing.** Four styles: "Verknüpfung lösen" and ICONCLASS "Entfernen" are underlined links, the Künstler ✕ is a bordered 32 px icon button, and the Personen/Orte ✕ is a borderless round 24 px control. Both ✕ variants appear in the same form.
- **Searching.** Opening a search ("ICONCLASS suchen …", "Anderen Eintrag suchen") is also link-styled.

Underlined, link-coloured controls here create, change or remove data, while the same style elsewhere navigates. No rule in design.md states which control style belongs to which kind of action.
  Proposal: 1. **Record the rule in design.md (Interaction rules), next to the toggle-versus-action rule.**
   - Link style only for moving to an existing object or place: XML-Stelle and its counterpart, finding locations, "Zu fol. …", Verweise, the image title in the Bild row.
   - A bordered button for every action that creates, changes or removes data, or that opens an input or search: + Kommentar, + Künstler, Hinzufügen, Verknüpfung lösen, ICONCLASS suchen, Anderen Eintrag suchen.
   - Removing one item from a chip, tag or row set is a ✕ with the accessible name "<Name> entfernen".
2. **Wireframe.**
   - Give both ✕ variants one class, either .tag-remove or .icon-btn, at one size of at least 24 px.
   - Turn ICONCLASS "Entfernen" (miniature.js:464) into that ✕.
   - Keep "Verknüpfung lösen" as text, since R1 fixes the label, but make it a bordered button.
   - Make "+ Kommentar" (apparatus.js:285), "+ Künstler" (miniature.js:354), "ICONCLASS suchen …" (miniature.js:471) and "Anderen Eintrag suchen" (register.js:405) bordered buttons.
   - Align the height of .tag-add .act-btn with the 32 px act-btns.
3. **Separate the two labels.** In the XML view, name the popover head control "Textstelle", so it pairs with "XML-Stelle". Name the range jump in the Bild form (miniature.js:562) "Bereich im Text zeigen". Labels stay working labels until the edition team confirms them.
- core-interaction: The Zeile popover (line-number click or line zone) shows a monospace zone xml:id and the words as chip buttons without fields, and it skips every shared section. Selecting the same words by drag instead gives a Wortfolge with Register, Apparat and Bild. So one selection yields two different popovers, and the line state does not meet design.md:102, F31 or US1.2 (Normalisiert editable per word of the line).

Today the toolbar's Register, Apparatkommentar and markup menus hide this gap by turning a line selection into a word sequence (register.js:466-470, apparatus.js:163-164, markup.js:273-274). Once R2 and R3 move these actions into the popover, a line selected by its number has no route to Markup, Register, Apparat or Bild. Only a re-selection by drag or Shift+Arrow reaches them.

The zone id is a second, unreadable identifier for the line (line_… on one line, region_… on another), which breaks the one-name-per-surface rule.
  Proposal: Build Zeile in R1's row grammar from the same builders as Wortfolge, so the two states cannot drift.

1. Head: keep "Zeile 9, fol. 1r a".
2. One row per word of the line: the word as it stands in the label column, including a word that continues on the next line (e.g. "begín nen"), and its Normalisiert field beside it. Enter applies, Escape reverts, no buttons. Clicking the label selects that word (state Wort).
3. Then the shared rows Markup, Register, Apparat and Bild, acting on the line's words as a word sequence. In code, render the `sections` array in the line branch of openPopover (popover.js:39) as well, after the word rows.
4. Drop the zone paragraph (popover.js:208). The facsimile outline shows the zone, and the XML view with IDs anzeigen shows the id.
5. Delete the line-to-word-sequence conversions in register.js:466-470, apparatus.js:163-164 and markup.js:273-274, because the sections now act on the line directly.
6. Rule text:
   - design.md Popover table, Zeile row: add the shared rows (the working tree already has the Normalisiert rows).
   - specification.md F31: "its words with their Normalisiert fields, followed by the rows of the Wortfolge state".
   - US1.2: adjust criterion 1, and move criterion 4 (diplomatic edit) to typing in the flow per R1.
   - Close the open question in snapshots/wireframe-review-2026-10-10.md:79 through a journal entry.
