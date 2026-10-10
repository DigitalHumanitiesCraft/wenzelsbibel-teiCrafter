// Inspector: the word states (Wort, Wortfolge, Zeile) built from the selection, and
// openPanel for every other content (Miniatur, Befunde, Verweise).
import { $, el, state } from "./state.js";
import { commit } from "./history.js";
import { flowEvents, selectedWords, setWordRange } from "./flow.js";

// Feature sections of the word states, appended in array order after the word fields.
// Each is (words) => Node | null; features push theirs when their module loads.
export const sections = [];

// What the inspector shows: null for a word state, otherwise the open panel, whose
// reopen function rebuilds it from state.data after undo or redo (null closes it).
let panel = null;

flowEvents.addEventListener("select", (e) => {
  if (e.detail.changed || $("#inspector").hidden) openInspector(); else refreshTitle();
});
flowEvents.addEventListener("edit", () => refreshTitle());
flowEvents.addEventListener("column", () => closeInspector());

export function openInspector() {
  const words = selectedWords();
  if (!words.length) return;
  panel = null;
  const wasHidden = $("#inspector").hidden;
  $("#inspector").hidden = false;
  if (wasHidden && state.view === "text") words[0].node.scrollIntoView({ block: "nearest" }); // the pane just got shorter
  refreshTitle();
  const body = $("#inspector-body");
  body.replaceChildren();
  hideNote();
  state.diplo = null;
  if (state.sel.line) { body.append(lineSection(words)); return; }
  if (words.length === 1) {
    const tok = words[0].tok;
    const mixed = (tok.rend || []).includes("ligature") || /\n/.test(tok.text || "");
    const fields = el("div", { class: "fields" }, [
      field("Diplomatisch", tok.orig ?? tok.text ?? "", mixed ? "Enthält Binnen-Markup, Bearbeitung in der XML-Ansicht" : ""),
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

// Shows the inspector with any title and body. `reopen` rebuilds the panel after
// undo or redo; without it the panel closes then, because its content may be stale.
export function openPanel(titleNodes, bodyNodes, reopen = null) {
  panel = { reopen };
  $("#inspector").hidden = false;
  hideNote();
  state.diplo = null;
  $("#inspector-title").replaceChildren(...titleNodes);
  $("#inspector-body").replaceChildren(...bodyNodes);
}

// Rebuild after undo or redo: the same selection or panel where it still exists,
// otherwise close. Focus returns to the control at the same position in the body.
export function refreshInspector() {
  if ($("#inspector").hidden) return;
  const body = $("#inspector-body");
  const focusables = () => [...body.querySelectorAll("input, textarea, select, button")];
  const focusIndex = focusables().indexOf(document.activeElement);
  if (panel) {
    if (panel.reopen) panel.reopen(); else closeInspector();
  } else if (selectedWords().length) {
    openInspector();
  } else {
    closeInspector();
  }
  if (focusIndex >= 0 && !$("#inspector").hidden) focusables()[focusIndex]?.focus();
}

export function refreshTitle() {
  const words = selectedWords();
  if (!words.length) return;
  const first = words[0];
  const last = words[words.length - 1];
  const at = (w) => (w.lineNo === "Kopfzeile" ? "Kopfzeile" : `Z. ${w.lineNo}`);
  const text = (w) => w.node.textContent;
  const title = $("#inspector-title");
  if (state.sel.line) {
    title.replaceChildren(`${first.lineNo === "Kopfzeile" ? "Kopfzeile" : `Zeile ${first.lineNo}`}, fol. ${state.data.folio} ${"ab"[state.column]}`);
  } else if (words.length === 1) {
    title.replaceChildren("Wort ", el("q", { text: text(first) }), el("span", { class: "context", text: `fol. ${state.data.folio} ${"ab"[state.column]} ${at(first)}` }));
  } else {
    const span = first.lineNo === last.lineNo ? at(first) : `${at(first)} bis ${at(last)}`;
    title.replaceChildren("Wortfolge ", el("q", { text: `${text(first)} … ${text(last)}` }), el("span", { class: "context", text: `${words.length} Wörter, fol. ${state.data.folio} ${"ab"[state.column]} ${span}` }));
  }
}

export function field(label, value, note) {
  const f = el("label", { class: "field" }, [el("span", { text: label }), el("input", { type: "text", value })]);
  if (note) f.append(el("span", { class: "mixed", text: note }));
  return f;
}

// Normalisiert is applied explicitly; Diplomatisch mirrors the flow live instead.
// After a commit the field's defaultValue follows, so Ctrl+Z in an unchanged field
// reaches the document history rather than the field's own text undo (menu.js).
export function normField(tok) {
  const f = field("Normalisiert", tok.norm ?? "", tok.norm === undefined ? "Kein @norm im Bestand" : "");
  const input = f.querySelector("input");
  const apply = () => {
    const value = input.value.trim();
    if (value === (tok.norm ?? "")) { inspectorNote("Keine Änderung an der normalisierten Lesung."); return; }
    commit("Normalisiert", () => { tok.norm = value; });
    input.value = value;
    input.defaultValue = value;
    inspectorNote(`Normalisierte Lesung „${value}“ übernommen.`);
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } });
  const buttons = el("div", { class: "field-actions" }, [
    el("button", { type: "button", class: "act-btn", text: "Abbrechen", onclick: () => { input.value = tok.norm ?? ""; hideNote(); } }),
    el("button", { type: "button", class: "act-btn is-primary", text: "Anwenden", onclick: apply }),
  ]);
  // The buttons sit outside the label, so a click on them does not refocus the input.
  return el("div", { class: "field-group" }, [f, buttons]);
}

// State "Zeile" (F31, US1.2): the line's words with their normalised readings; a chip opens "Wort".
export function lineSection(words) {
  const zone = (words[0].line.facs || "").replace("#", "");
  const sec = el("div", { class: "line-state" }, [
    el("p", { class: "line-zone" }, [el("span", { text: "Zone " }), el("code", { text: zone || "keine" })]),
  ]);
  const list = el("ul", { class: "line-words", "aria-label": "Wörter der Zeile" });
  for (const w of words) {
    const k = Number(w.node.dataset.k);
    const norm = w.tok.norm;
    list.append(el("li", {}, [el("button", {
      type: "button", class: "word-chip", "aria-label": `${w.node.textContent}, normalisiert ${norm ?? "ohne @norm"}`,
      onclick: () => { $("#flow").focus({ preventScroll: true }); setWordRange(k, k); },
    }, [el("span", { class: "dip", text: w.node.textContent }), el("span", { class: norm === undefined ? "norm is-missing" : "norm", text: norm ?? "ohne @norm" })])]));
  }
  sec.append(list);
  return sec;
}

export function closeInspector() {
  const insp = $("#inspector");
  if (insp.hidden) return;
  const hadFocus = insp.contains(document.activeElement);
  insp.hidden = true;
  panel = null;
  hideNote();
  state.quiet = true;
  if (hadFocus && state.view === "text" && !$("#flow").hidden) $("#flow").focus({ preventScroll: true });
}

// Short-lived message under the inspector head, for controls inside the inspector.
let noteTimer = 0;

export function inspectorNote(text) {
  const note = $("#inspector-note");
  note.textContent = text;
  note.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(hideNote, 5000);
}

export function hideNote() { clearTimeout(noteTimer); $("#inspector-note").hidden = true; }
