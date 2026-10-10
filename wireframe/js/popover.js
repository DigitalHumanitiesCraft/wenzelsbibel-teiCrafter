// Popover at the selection: the word states Wort, Wortfolge and Zeile. It opens on a
// click or caret move in the flow, sits below the selection (above it when there is
// more room there) inside the text pane without covering it or moving the text, and is
// a bottom sheet on narrow screens. Feature modules append their sections and register
// their editable fields, which the popover's one Anwenden and Abbrechen act on (F28).
import { $, el, shell, state } from "./state.js";
import { commit } from "./history.js";
import { flowEvents, highlightSelection, renderFlow, selectedWords, setWordRange } from "./flow.js";
import { narrow, panelNote } from "./panel.js";

// Feature sections of the word states, appended in array order after the word fields.
// Each is (words) => Node | null; features push theirs when their module loads.
export const sections = [];

// Builder of the Diplomatisch field, set by markup.js; without it the field is a plain input.
export const wordFields = { diplomatic: null };

// Editable fields of the open popover. A section registers each field while it builds
// it: { node, name, changed(), check() (false after stating its reason at the field),
// apply(data), after() (optional, once the commit holds), reset() }. A field whose node
// left the popover, because its section was rebuilt alone, no longer counts.
let editable = [];
export function addField(f) { editable.push(f); }
const liveFields = () => editable.filter((f) => f.node.isConnected);

// The foot with the one Anwenden and Abbrechen shows while the popover has a field.
export function syncFoot() { $("#popover-foot").hidden = !liveFields().length; }

// "Diplomatisch und Normalisiert": the step name Rückgängig announces.
const joined = (names) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}` : names[0]);

// Anwenden: every changed field in one commit, named after the fields it changed. The
// first refused field stops it with its reason at the field, and nothing is applied.
export function applyPopover() {
  const changed = liveFields().filter((f) => f.changed());
  if (!changed.length) { popoverNote("Keine Änderung."); return; }
  if (!changed.every((f) => f.check())) return;
  const label = joined([...new Set(changed.map((f) => f.name))]);
  if (!commit(label, (data) => { for (const f of changed) f.apply(data); })) return;
  for (const f of changed) f.after?.();
  // Text, chips and marks of the flow come from the model, so it is rebuilt with the same
  // words selected; app.js rebuilds it only after undo and redo.
  const sel = state.sel;
  renderFlow();
  state.sel = sel;
  if (sel && state.view === "text") setWordRange(sel.from, sel.to);
  highlightSelection();
  openPopover();
  popoverNote(`${label} übernommen.`);
  $("#popover-apply").focus();
}

// Abbrechen: every field returns to its value in the document, open forms close.
export function cancelPopover() {
  for (const f of liveFields()) f.reset();
  for (const n of content().querySelectorAll(".field-error.is-refusal")) n.remove();
  for (const n of content().querySelectorAll("[aria-invalid]")) n.removeAttribute("aria-invalid");
  hideNote();
  syncFoot();
}

// A refused value states its reason at its field until the next input there.
export function refuseAt(input, reason) {
  const host = input.closest(".field") || input.parentElement;
  let msg = host.querySelector(":scope > .field-error.is-refusal");
  if (!msg) {
    msg = el("span", { class: "field-error is-refusal", role: "alert" });
    host.append(msg);
    input.addEventListener("input", () => { msg.remove(); input.removeAttribute("aria-invalid"); }, { once: true });
  }
  msg.textContent = reason;
  input.setAttribute("aria-invalid", "true");
  input.focus();
}

const pop = () => $("#popover");
const content = () => $("#popover-content");
// Open and attached to a visible anchor (in the XML view a word without xml:id has none).
export const isPopoverOpen = () => !pop().hidden && !pop().classList.contains("is-detached");

flowEvents.addEventListener("select", (e) => {
  if (e.detail.changed || pop().hidden) openPopover();
  else { refreshTitle(); place(true); }
});
flowEvents.addEventListener("edit", () => { refreshTitle(); place(); });
flowEvents.addEventListener("column", () => closePopover());
shell.addEventListener("view", () => place(true));

export function openPopover() {
  const words = selectedWords();
  if (!words.length) return;
  pop().hidden = false;
  refreshTitle();
  const body = content();
  body.replaceChildren();
  editable = [];
  hideNote();
  state.diplo = null;
  if (state.sel.line) body.append(lineSection(words));
  else {
    if (words.length === 1) {
      const tok = words[0].tok;
      const mixed = (tok.rend || []).includes("ligature") || /\n/.test(tok.text || "");
      const fields = el("div", { class: "fields" }, [
        wordFields.diplomatic ? wordFields.diplomatic(tok) : field("Diplomatisch", tok.orig ?? tok.text ?? "", mixed ? "Enthält Binnen-Markup, Bearbeitung in der XML-Ansicht" : ""),
        normField(tok),
      ]);
      state.diplo = fields.querySelector("input");
      body.append(fields);
    }
    for (const section of sections) {
      const node = section(words);
      if (node) body.append(node);
    }
  }
  syncFoot();
  place(true);
}

// Rebuild after undo or redo: the same selection where it still exists, otherwise close.
// Focus returns to the control at the same position in the body.
export function refreshPopover() {
  if (pop().hidden) return;
  const focusables = () => [...content().querySelectorAll("input, textarea, select, button")];
  const i = focusables().indexOf(document.activeElement);
  if (selectedWords().length) openPopover(); else closePopover();
  if (i >= 0 && !pop().hidden) focusables()[i]?.focus();
}

export function closePopover() {
  const p = pop();
  if (p.hidden) return;
  const hadFocus = p.contains(document.activeElement);
  p.hidden = true;
  p.removeAttribute("style");
  $("#text-pane").classList.remove("has-sheet");
  hideNote();
  state.quiet = true;
  if (hadFocus && state.view === "text" && !$("#flow").hidden) $("#flow").focus({ preventScroll: true });
}

export function refreshTitle() {
  const words = selectedWords();
  if (!words.length) return;
  const first = words[0];
  const last = words[words.length - 1];
  const at = (w) => (w.lineNo === "Kopfzeile" ? "Kopfzeile" : `Z. ${w.lineNo}`);
  const text = (w) => w.node.textContent.replace(/\n/g, ""); // without the soft break of an inner lb
  const title = $("#popover-title");
  const where = `fol. ${state.data.folio} ${"ab"[state.column]}`;
  if (state.sel.line) {
    title.replaceChildren(`${first.lineNo === "Kopfzeile" ? "Kopfzeile" : `Zeile ${first.lineNo}`}, ${where}`);
  } else if (words.length === 1) {
    title.replaceChildren("Wort ", el("q", { text: text(first) }), el("span", { class: "context", text: `${where} ${at(first)}` }));
  } else {
    const span = first.lineNo === last.lineNo ? at(first) : `${at(first)} bis ${at(last)}`;
    title.replaceChildren("Wortfolge ", el("q", { text: `${text(first)} … ${text(last)}` }), el("span", { class: "context", text: `${words.length} Wörter, ${where} ${span}` }));
  }
}

// Placement

// The selection's box in viewport pixels: left edge of the first word (the line number
// in the state "Zeile"), top of the first and bottom of the last word. In the XML view
// the marked element. null when nothing visible carries the selection.
function anchorBox() {
  if (state.view === "xml") {
    const x = document.querySelector(".xml .xw.is-selected");
    return x && x.getClientRects().length ? x.getBoundingClientRect() : null;
  }
  const words = selectedWords();
  if (!words.length || $("#flow").hidden) return null;
  const first = state.sel.line ? document.querySelector(`.ln[data-line="${state.sel.line}"]`) || words[0].node : words[0].node;
  const a = first.getBoundingClientRect();
  const b = words[words.length - 1].node.getBoundingClientRect();
  return { left: a.left, top: Math.min(a.top, words[0].node.getBoundingClientRect().top), bottom: Math.max(a.bottom, b.bottom) };
}

const GAP = 6;
const GUTTER = 8;

// Positions the popover in the pane's content coordinates, so it scrolls with the text.
// `reveal` (a new selection or view) also scrolls the selection clear of the bottom sheet.
export function place(reveal = false) {
  const p = pop();
  if (p.hidden) return;
  const box = anchorBox();
  p.classList.toggle("is-detached", !box);
  if (!box) return;
  const pane = $("#text-pane");
  if (narrow.matches) {
    p.removeAttribute("style");
    pane.classList.add("has-sheet");
    if (reveal) {
      const sheetTop = p.getBoundingClientRect().top;
      const paneTop = pane.getBoundingClientRect().top;
      if (box.bottom > sheetTop - GUTTER) pane.scrollTop += box.bottom - sheetTop + 3 * GUTTER;
      else if (box.top < paneTop) pane.scrollTop -= paneTop - box.top + 3 * GUTTER;
    }
    return;
  }
  pane.classList.remove("has-sheet");
  const pr = pane.getBoundingClientRect();
  const head = p.querySelector(".popover-head").offsetHeight;
  const note = $("#popover-note").hidden ? 0 : $("#popover-note").offsetHeight;
  const foot = $("#popover-foot").hidden ? 0 : $("#popover-foot").offsetHeight;
  const natural = head + note + content().offsetHeight + foot + 2; // 2: the borders
  const selTop = box.top - pr.top + pane.scrollTop;
  const selBottom = box.bottom - pr.top + pane.scrollTop;
  const below = pane.scrollTop + pane.clientHeight - GUTTER - (selBottom + GAP);
  const above = selTop - GAP - (pane.scrollTop + GUTTER);
  const down = below >= Math.min(natural, 240) || below >= above;
  const room = Math.max(down ? below : above, 160);
  const height = Math.min(natural, room);
  const width = p.offsetWidth;
  const left = Math.min(Math.max(box.left - pr.left + pane.scrollLeft, GUTTER), pane.clientWidth - width - GUTTER);
  p.style.left = `${Math.max(left, GUTTER)}px`;
  p.style.top = `${down ? selBottom + GAP : selTop - GAP - height}px`;
  p.style.maxHeight = `${room}px`;
}

// The content grows with forms and lists; the placement follows.
new ResizeObserver(() => place()).observe($("#popover-content"));
$("#popover-apply").addEventListener("click", applyPopover);
$("#popover-cancel").addEventListener("click", cancelPopover);
addEventListener("resize", () => place());
narrow.addEventListener("change", () => place(true));

// A click outside the popover, the text and the Arbeitsleiste closes it; the selection stays.
document.addEventListener("pointerdown", (e) => {
  if (pop().hidden) return;
  const t = e.target;
  if (!(t instanceof Element) || t.closest("#popover, #flow, .arbeitsleiste, #notice, .ac-list, .xml")) return;
  closePopover();
});

// Word fields

// A labelled text field. In a row of the state "Zeile" (`row` names the word) the column
// head carries the visible label, and the field keeps label and word as its name.
export function field(label, value, note, row = null) {
  const name = row ? el("span", { class: "visually-hidden", text: `${label} ${row}` }) : el("span", { text: label });
  const f = el("label", { class: "field" }, [name, el("input", { type: "text", value })]);
  if (note) f.append(el("span", { class: "mixed", text: note }));
  return f;
}

// Normalisiert, applied by the popover's Anwenden with the other fields. After the
// commit the popover is rebuilt, so the field's defaultValue is the applied value and
// Ctrl+Z in an unchanged field reaches the document history (toolbar.js).
export function normField(tok, row = null) {
  const f = field("Normalisiert", tok.norm ?? "", tok.norm == null ? "Kein @norm im Bestand" : "", row);
  const input = f.querySelector("input");
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyPopover(); } });
  addField({
    node: input,
    name: "Normalisiert",
    changed: () => input.value.trim() !== input.defaultValue,
    check: () => true,
    apply: () => { tok.norm = input.value.trim(); },
    reset: () => { input.value = input.defaultValue; },
  });
  return f;
}

// State "Zeile" (F31, US1.2): one row per word of the line with Diplomatisch and
// Normalisiert, editable as in the state "Wort", including a word that begins on the
// line and continues on the next.
export function lineSection(words) {
  const zone = (words[0].line.facs || "").replace("#", "");
  const rows = el("div", { class: "line-rows", role: "group", "aria-label": "Wörter der Zeile" }, [
    el("div", { class: "line-row line-head", "aria-hidden": "true" }, [el("span", { text: "Diplomatisch" }), el("span", { text: "Normalisiert" })]),
  ]);
  for (const w of words) {
    const name = w.node.textContent.replace(/\n/g, "");
    const dip = wordFields.diplomatic ? wordFields.diplomatic(w.tok, name) : field("Diplomatisch", w.tok.orig ?? w.tok.text ?? "", "", name);
    rows.append(el("div", { class: "line-row" }, [dip, normField(w.tok, name)]));
  }
  return el("div", { class: "line-state" }, [
    el("p", { class: "line-zone" }, [el("span", { text: "Zone " }), el("code", { text: zone || "keine" })]),
    rows,
  ]);
}

// F36: typing in a field of the popover or a side panel that is neither applied nor
// cancelled. Search fields (ICONCLASS, register lookup) hold a query, not a value of the document.
export function pendingInput() {
  const scopes = [...document.querySelectorAll("#popover:not([hidden]) .popover-body, #side:not([hidden]) .panel")];
  for (const s of scopes) {
    const hit = [...s.querySelectorAll("input, textarea")].find((x) =>
      x.type !== "search" && x.getAttribute("role") !== "combobox" && x.value !== x.defaultValue);
    if (hit) return hit;
  }
  return null;
}

// Refuses to leave the document while such input exists: the field gets focus back and
// the note at its surface says what to do. Returns true when the caller must stay.
export function holdForPendingInput() {
  const input = pendingInput();
  if (!input) return false;
  input.focus();
  const msg = "Die Eingabe ist weder übernommen noch abgebrochen. Erst Anwenden oder Abbrechen, dann das Dokument wechseln.";
  if (pop().contains(input)) popoverNote(msg); else panelNote(msg);
  return true;
}

// Short-lived message under the popover head, for controls that act on the selection.
let noteTimer = 0;

export function popoverNote(text) {
  const note = $("#popover-note");
  note.textContent = text;
  note.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(hideNote, 5000);
  place();
}

export function hideNote() { clearTimeout(noteTimer); $("#popover-note").hidden = true; }
