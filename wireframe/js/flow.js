// Text flow: one editable run per column, manuscript lines as soft breaks,
// structure (line numbers, punctuation, milestones, chips) as non-editable islands.
// The popover, the toolbar and the facsimile listen on flowEvents instead of being imported,
// so this module stays below them:
//   "select" (detail.changed: the selected range or state differs from before),
//   "refused" (detail: the reason a keystroke was refused),
//   "edit" (a word changed in the flow), "column" (the column switched).
import { $, chipFor, columns, el, island, refKey, state } from "./state.js";
import { commit } from "./history.js";

export const flowEvents = new EventTarget();
const graphemes = new Intl.Segmenter("de", { granularity: "grapheme" });

export function renderFlow() {
  const flow = $("#flow");
  flow.replaceChildren();
  state.words = [];
  state.sel = null;
  const col = columns()[state.column];
  flow.setAttribute("aria-label", `Text fol. ${state.data.folio}, Spalte ${"ab"[state.column]}`);
  if (!col) return;
  // Flatten lines so a register run can look ahead: it stays open across a line
  // break or punctuation only when the next word continues the same reference.
  let n = 0;
  const flat = col.lines.flatMap((line, i) => {
    const header = line.tokens.some((t) => t.type === "w" && t.fw === "header");
    return [{ ln: header ? "Kopfzeile" : String(++n), line, i }, ...line.tokens.filter((t) => t.type !== "anchor").map((tok) => ({ tok, line }))];
  });
  let group = null;
  let lineNo = "";
  const target = () => group || flow;
  const closeGroup = () => { if (group) { group.append(chipFor(group.dataset.ref)); flow.append(group, " "); group = null; } };
  flat.forEach((item, idx) => {
    const tok = item.tok;
    if (!tok || tok.type !== "w") {
      const next = flat.slice(idx + 1).find((x) => x.tok && x.tok.type === "w");
      if (group && refKey(next && next.tok) !== group.dataset.ref) closeGroup();
    }
    if (item.ln) {
      lineNo = item.ln;
      if (item.i) target().append(el("br"));
      target().append(island("ln", lineNo, { "aria-hidden": "true", "data-line": item.line.id }));
      return;
    }
    if (tok.type === "milestone") { if (tok.unit) target().append(island("milestone", "¶", { title: "Absatzbeginn", "aria-label": "Absatzbeginn" }), " "); return; }
    if (tok.type === "pc") { target().append(island(`pc${tok.supplied ? " is-supplied" : ""}`, tok.text, tok.supplied ? { title: "Ergänzte Interpunktion" } : {}), " "); return; }
    const key = refKey(tok);
    if (key !== (group ? group.dataset.ref : null)) {
      closeGroup();
      if (key) group = el("span", { class: `ref-group type-${tok.ref.type.toLowerCase()}`, "data-ref": key });
    }
    const node = wordNode(tok, state.words.length);
    state.words.push({ tok, line: item.line, lineNo, node });
    target().append(node, " ");
  });
  closeGroup();
}

// Features that mark words in the flow (markup.js) push (tok, node, k) => void here;
// they run on every render, so a mark follows undo and redo.
export const wordDecorators = [];

export function wordNode(tok, k) {
  const classes = ["w"];
  for (const r of tok.rend || []) classes.push(`rend-${r}`);
  if (tok.supplied) classes.push("is-supplied");
  if (tok.unclear) classes.push("is-unclear");
  if (tok.damage) classes.push("is-damage");
  if (state.appsByWord.has(tok)) classes.push("in-app");
  const node = el("span", { class: classes.join(" "), "data-k": String(k), "data-id": tok.id || "", text: tok.text || tok.orig || "" });
  for (const decorate of wordDecorators) decorate(tok, node, k);
  return node;
}

export function setColumn(i) {
  state.column = i;
  for (const x of document.querySelectorAll("[data-column]")) {
    x.classList.toggle("is-active", Number(x.dataset.column) === i);
    x.setAttribute("aria-pressed", String(Number(x.dataset.column) === i));
  }
  renderFlow();
  highlightSelection();
  flowEvents.dispatchEvent(new Event("column"));
}

// Caret and selection mapping

// Selection reads are coalesced to one per frame, so the highlight follows the next paint.
// While the mouse button is held in the flow only the highlight follows; the "select"
// event, which rebuilds the popover, waits for the release.
let frame = 0;
let dragging = false;
let dragBase; // state.sel before the drag's first read, undefined outside a drag
const scheduleRead = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; readSelection(); }); };

export function wireFlow() {
  const flow = $("#flow");
  document.addEventListener("selectionchange", scheduleRead);
  flow.addEventListener("mousedown", (e) => {
    state.quiet = false;
    const ln = e.target.closest(".ln");
    if (ln) { e.preventDefault(); selectLine(ln.dataset.line); return; }
    if (e.button === 0) { dragging = true; dragBase = undefined; }
    // A press inside a selection would start a native text drag; start a new selection instead.
    const sel = getSelection();
    if (!e.shiftKey && !sel.isCollapsed && inFlow(sel)) sel.collapseToStart();
  });
  flow.addEventListener("mouseup", () => snapSelection(false));
  // On the document, because a drag may end outside the flow; runs after the snap above.
  document.addEventListener("mouseup", () => { if (dragging) { dragging = false; scheduleRead(); } });
  flow.addEventListener("keydown", (e) => { dragging = false; if (!["Escape", "Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) state.quiet = false; });
  flow.addEventListener("keyup", (e) => {
    if ((e.shiftKey && e.key.startsWith("Arrow")) || e.key === "Shift") snapSelection(true);
  });
  flow.addEventListener("beforeinput", onBeforeInput);
  flow.addEventListener("dragstart", (e) => e.preventDefault()); // moving text is a structural edit
}

// A point maps to the word it lies in, or to the word it touches from a gap.
export function wordAt(node, offset) {
  const host = (node.nodeType === 3 ? node.parentElement : node).closest(".w");
  if (host) return { w: host, off: node.nodeType === 3 ? offset : (offset ? host.textContent.length : 0) };
  const before = node.nodeType === 3 ? (offset === 0 ? node.previousSibling : null) : node.childNodes[offset - 1];
  const after = node.nodeType === 3 ? (offset === node.length ? node.nextSibling : null) : node.childNodes[offset];
  if (before && before.classList && before.classList.contains("w")) return { w: before, off: before.textContent.length };
  if (after && after.classList && after.classList.contains("w")) return { w: after, off: 0 };
  return null;
}

export function inFlow(sel) {
  const flow = $("#flow");
  return sel.rangeCount && flow.contains(sel.anchorNode) && flow.contains(sel.focusNode);
}

// Indices of the first and last word a range touches.
function rangeWords(r) {
  if (r.collapsed) {
    const hit = wordAt(r.startContainer, r.startOffset);
    return hit ? [Number(hit.w.dataset.k), Number(hit.w.dataset.k)] : null;
  }
  const ks = state.words.filter((w) => r.intersectsNode(w.node)).map((w) => Number(w.node.dataset.k));
  return ks.length ? [ks[0], ks[ks.length - 1]] : null;
}

function readSelection() {
  const sel = getSelection();
  if (state.view !== "text" || !inFlow(sel) || state.quiet) return;
  const ks = rangeWords(sel.getRangeAt(0));
  if (!ks) return;
  const prev = dragBase !== undefined ? dragBase : state.sel;
  const sameRange = prev && prev.from === ks[0] && prev.to === ks[1];
  const pending = state.pendingLine;
  state.pendingLine = null;
  // The state "Zeile" holds while the selection still covers exactly that line.
  const line = pending && pending.from === ks[0] && pending.to === ks[1] ? pending.id : (sameRange && prev.line) || null;
  const same = sameRange && (prev.line || null) === line;
  state.sel = { from: ks[0], to: ks[1], line };
  highlightSelection();
  if (dragging) { if (dragBase === undefined) dragBase = prev; return; }
  dragBase = undefined;
  flowEvents.dispatchEvent(new CustomEvent("select", { detail: { changed: !same } }));
}

// Expand a free selection to whole words. A boundary inside a word or touching
// a word from the inside keeps that word. A keyboard extension that crossed a gap
// takes the next word in its direction, so each Shift+Arrow step adds one word;
// a mouse boundary in a gap falls back to the words actually covered.
function snapSelection(keyboard) {
  const sel = getSelection();
  if (!inFlow(sel) || sel.isCollapsed) return;
  const forward = sel.anchorNode === sel.focusNode ? sel.anchorOffset <= sel.focusOffset
    : Boolean(sel.anchorNode.compareDocumentPosition(sel.focusNode) & Node.DOCUMENT_POSITION_FOLLOWING);
  const r = sel.getRangeAt(0);
  const point = (node, off) => { const p = document.createRange(); p.setStart(node, off); return p; };
  const firstAfter = (p) => state.words.find((w) => p.comparePoint(w.node.firstChild, 0) >= 0)?.node;
  const lastBefore = (p) => state.words.findLast((w) => p.comparePoint(w.node.firstChild, w.node.firstChild.length) <= 0)?.node;
  const sp = point(r.startContainer, r.startOffset);
  const ep = point(r.endContainer, r.endOffset);
  const hs = wordAt(r.startContainer, r.startOffset);
  const he = wordAt(r.endContainer, r.endOffset);
  const len = (h) => h.w.textContent.length;
  let a = hs && (hs.off < len(hs) || (keyboard && !forward)) ? hs.w : (keyboard && !forward ? lastBefore(sp) : firstAfter(sp));
  let b = he && (he.off > 0 || (keyboard && forward)) ? he.w : (keyboard && forward ? firstAfter(ep) : lastBefore(ep));
  if (!a || !b) return;
  if (Number(a.dataset.k) > Number(b.dataset.k)) [a, b] = forward ? [a, a] : [b, b];
  setWordRange(Number(a.dataset.k), Number(b.dataset.k), forward);
}

export function setWordRange(from, to, forward = true) {
  const a = state.words[from].node.firstChild;
  const b = state.words[to].node.firstChild;
  if (forward) getSelection().setBaseAndExtent(a, 0, b, b.length);
  else getSelection().setBaseAndExtent(b, b.length, a, 0);
}

// Caret at character offset `off` of word k, clamped to the word's length.
export function placeCaret(k, off = 0, scroll = true) {
  const flow = $("#flow");
  state.quiet = false;
  flow.focus({ preventScroll: true });
  const t = state.words[k].node.firstChild;
  const at = Math.min(off, t.length);
  getSelection().setBaseAndExtent(t, at, t, at);
  if (scroll) state.words[k].node.scrollIntoView({ block: "center" });
}

export function selectLine(lineId) {
  const ks = state.words.filter((w) => w.line.id === lineId).map((w) => Number(w.node.dataset.k));
  if (!ks.length) return;
  state.quiet = false;
  state.pendingLine = { id: lineId, from: ks[0], to: ks[ks.length - 1] };
  $("#flow").focus({ preventScroll: true });
  setWordRange(ks[0], ks[ks.length - 1]);
  state.words[ks[0]].node.scrollIntoView({ block: "nearest" });
}

// Editing stays inside one word: every input is handled here, so the browser
// never splits spans, deletes islands or inserts line breaks. Structural edits
// (splitting, joining or deleting words) are the word commands of F18, which the
// wireframe does not have yet, so they are refused here. Its XML view is read-only,
// so no refusal points there.
// IME composition cannot be cancelled and is not covered by the wireframe.
// Native history inputs are refused as well; Ctrl+Z reaches history.js through toolbar.js.
// A refused keystroke says why (design: a refused action states its reason), at most
// once per second so that held keys do not flood the notice bar. The reason travels as
// a "refused" event, because importing notice.js here would close a module cycle.
let lastRefusal = 0;
function refuse(reason) {
  const now = performance.now();
  if (now - lastRefusal > 1000) flowEvents.dispatchEvent(new CustomEvent("refused", { detail: reason }));
  lastRefusal = now;
}
const STRUCTURE = "Tippen ändert nur das Wort unter der Schreibmarke.";

function onBeforeInput(e) {
  e.preventDefault();
  const sel = getSelection();
  if (!inFlow(sel)) return;
  const r = sel.getRangeAt(0);
  const a = wordAt(r.startContainer, r.startOffset);
  const b = wordAt(r.endContainer, r.endOffset);
  if (!a || !b || a.w !== b.w) return refuse(STRUCTURE);
  const node = a.w.firstChild;
  const text = node.data;
  let [s, t] = [a.off, b.off];
  let insert = "";
  if (e.inputType === "insertText" || e.inputType === "insertReplacementText" || e.inputType === "insertFromPaste") {
    const raw = e.data ?? (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "");
    insert = raw.replace(/\s+/g, "");
    if (!insert) return refuse(raw ? "Ein Leerzeichen würde das Wort teilen." : STRUCTURE);
  } else if (e.inputType === "deleteContentBackward" || e.inputType === "deleteContentForward") {
    if (s === t && e.inputType === "deleteContentBackward") s = [...graphemes.segment(text)].map((g) => g.index).filter((i) => i < s).pop() ?? s;
    if (s === t && e.inputType === "deleteContentForward") { const g = [...graphemes.segment(text)].find((x) => x.index >= t); if (g) t = g.index + g.segment.length; }
    if (s === t) return refuse(STRUCTURE);
  } else return refuse(STRUCTURE);
  const next = text.slice(0, s) + insert + text.slice(t);
  if (!next) return refuse("Ein Wort braucht Text."); // deleting a whole word is a structural edit
  const tok = state.words[Number(a.w.dataset.k)].tok;
  // F29: the diplomatic reading is the text and @orig together; a word without @orig keeps none.
  commit("Diplomatisch", () => { tok.text = next; if (tok.orig != null) tok.orig = next; });
  node.data = next;
  sel.setBaseAndExtent(node, s + insert.length, node, s + insert.length);
  if (state.diplo && state.sel && state.sel.from === state.sel.to && state.words[state.sel.from].node === a.w) {
    state.diplo.value = next;
    state.diplo.defaultValue = next;
  }
  flowEvents.dispatchEvent(new Event("edit"));
}

// Highlighting across text, facsimile and XML

export function selectedWords() { return state.sel ? state.words.slice(state.sel.from, state.sel.to + 1) : []; }

export function highlightSelection() {
  for (const n of document.querySelectorAll(".w.is-current, .ln.is-current, .zone.is-current, .xml .is-selected")) n.classList.remove(n.closest(".xml") ? "is-selected" : "is-current");
  const words = selectedWords();
  const lines = new Set(words.map((w) => w.line));
  for (const w of words) w.node.classList.add("is-current");
  // A range is shown by the native selection alone; a second, opaque tint per word
  // would leave the gaps between words as dark bars. The word tint marks the caret word.
  const native = getSelection();
  $("#flow").classList.toggle("has-range", words.length > 1 || (!native.isCollapsed && inFlow(native)));
  for (const line of lines) {
    const ln = document.querySelector(`.ln[data-line="${line.id}"]`);
    if (ln) ln.classList.add("is-current");
    const z = line.facs && document.querySelector(`.zone[data-id="${line.facs.replace("#", "")}"]`);
    if (z) z.classList.add("is-current");
  }
  if (state.view === "xml" && words.length && words[0].tok.id) {
    const x = document.querySelector(`.xml .xw[data-id="${CSS.escape(words[0].tok.id)}"]`);
    if (x) { x.classList.add("is-selected"); x.scrollIntoView({ block: "center" }); }
  }
}
