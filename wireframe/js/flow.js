// Text flow: one editable run per column, manuscript lines as soft breaks,
// structure (line numbers, punctuation, milestones, chips) as non-editable islands.
// The popover, the toolbar and the facsimile listen on flowEvents instead of being imported,
// so this module stays below them:
//   "select" (detail.changed: the selected range or state differs from before),
//   "refused" (detail: the reason a keystroke was refused),
//   "edit" (a word changed in the flow), "column" (the column switched),
//   "structure" (detail { k, off }: a word command changed the words; app.js rebuilds
//   the flow and puts the caret at offset `off` of word k).
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
  // A line whose lb lies inside the last word of the line before (data.md, the line rule)
  // starts at that word's soft break, so it takes no break of its own.
  const opensInWord = (line) => { const t = line.tokens[line.tokens.length - 1]; return Boolean(t && t.type === "w" && /\n/.test(t.text || "")); };
  const closeGroup = () => { if (group) { group.append(chipFor(group.dataset.ref)); flow.append(group, " "); group = null; } };
  flat.forEach((item, idx) => {
    const tok = item.tok;
    if (!tok || tok.type !== "w") {
      const next = flat.slice(idx + 1).find((x) => x.tok && x.tok.type === "w");
      if (group && refKey(next && next.tok) !== group.dataset.ref) closeGroup();
    }
    if (item.ln) {
      lineNo = item.ln;
      if (item.i && !opensInWord(col.lines[item.i - 1])) target().append(el("br"));
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
  const text = tok.text || tok.orig || "";
  if (text.includes("\n")) classes.push("has-lb"); // the inner lb renders as a soft break
  const node = el("span", { class: classes.join(" "), "data-k": String(k), "data-id": tok.id || "", text });
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

// Editing stays inside the word model: every input is handled here, so the browser
// never splits spans, deletes islands or inserts line breaks. Typing changes the text
// of one word; a space, a boundary deletion and the deletion of a selected word are the
// word commands of F18 below. Its XML view is read-only, so no refusal points there.
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
  const k = Number(a.w.dataset.k);
  const node = a.w.firstChild;
  const text = node.data;
  let [s, t] = [a.off, b.off];
  let insert = "";
  const kind = e.inputType;
  if (kind === "insertText" || kind === "insertReplacementText" || kind === "insertFromPaste") {
    const raw = e.data ?? (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "");
    // The source would need them escaped, and the spike refuses them the same way.
    if (/[<&]/.test(raw)) return refuse("Die Zeichen < und & gehören zum Markup und lassen sich nicht in ein Wort tippen.");
    if (raw && !raw.trim()) return splitWord(k, s, t);
    insert = raw.replace(/\s+/g, "");
    if (!insert) return refuse(STRUCTURE);
  } else if (kind === "deleteContentBackward" || kind === "deleteContentForward") {
    if (s === 0 && t === text.length) return deleteWord(k);
    if (s === t && s === 0 && kind === "deleteContentBackward") return joinWords(k - 1);
    if (s === t && t === text.length && kind === "deleteContentForward") return joinWords(k);
    if (s === t && kind === "deleteContentBackward") s = [...graphemes.segment(text)].map((g) => g.index).filter((i) => i < s).pop() ?? s;
    if (s === t && kind === "deleteContentForward") { const g = [...graphemes.segment(text)].find((x) => x.index >= t); if (g) t = g.index + g.segment.length; }
    if (s === t) return refuse(STRUCTURE);
    if (text.slice(s, t).includes("\n")) return refuse(`Der Zeilenumbruch in ${quote(state.words[k])} ist ein Element <lb> und bleibt stehen.`);
  } else return refuse(STRUCTURE);
  const next = text.slice(0, s) + insert + text.slice(t);
  if (!next) return refuse("Ein Wort braucht Text.");
  const tok = state.words[k].tok;
  // F29: the diplomatic reading is the text and @orig together; a word without @orig keeps
  // none. @orig carries no soft break, because the lb is an element of the source.
  commit("Diplomatisch", () => { tok.text = next; if (tok.orig != null) tok.orig = next.replace(/\n/g, ""); });
  node.data = next;
  sel.setBaseAndExtent(node, s + insert.length, node, s + insert.length);
  // The open Diplomatisch field shows what it showed before: @orig, else the text.
  if (state.diplo && state.sel && state.sel.from === state.sel.to && state.words[state.sel.from].node === a.w) {
    state.diplo.value = tok.orig ?? next;
    state.diplo.defaultValue = state.diplo.value;
  }
  flowEvents.dispatchEvent(new Event("edit"));
}

// Word commands (F18). Each is one commit, so Rückgängig names and reverts it as one
// step. The in-memory model carries the result; the read-only XML view does not.

// Names of the elements inside a word (hi, lb, choice, anchor), which a split would cut.
// markup.js sets `of`, because it reads the word's content from the excerpt.
export const innerElements = { of: () => [] };

const quote = (w) => `„${w.node.textContent.replace(/\n/g, "")}“`;
const rebuild = (k, off) => flowEvents.dispatchEvent(new CustomEvent("structure", { detail: { k, off } }));

// The xml:id of a new word in `line`, formed like the word ids of the data: the line's zone
// id and the next token index above every one in use with that stem.
function newWordId(line) {
  const stem = (line.facs || "").replace("#", "") || line.id;
  let max = -1;
  for (const c of state.data.columns) for (const l of c.lines) for (const t of l.tokens) {
    if (!t.id || !t.id.startsWith(`${stem}_`)) continue;
    const m = /^\d+/.exec(t.id.slice(stem.length + 1));
    if (m) max = Math.max(max, Number(m[0]));
  }
  return `${stem}_${max + 1}`;
}

// A space inside a word splits it at the caret (replacing a selection inside the word).
// The first part keeps the id, and its @orig and @norm follow its text where they
// equalled the whole word; the new word takes the rest with @orig and @norm equal to it.
function splitWord(k, s, t) {
  const w = state.words[k];
  const tok = w.tok;
  const text = w.node.firstChild.data;
  const before = text.slice(0, s);
  const after = text.slice(t);
  if (!before || !after) return refuse("Ein Leerzeichen am Wortrand würde ein leeres Wort anlegen.");
  const inner = innerElements.of(tok);
  if (inner.length) return refuse(`Ein Leerzeichen würde das Element <${inner[0]}> in ${quote(w)} teilen.`);
  const id = newWordId(w.line);
  commit("Wort teilen", () => {
    const added = { ...tok, rend: [...(tok.rend || [])], id, text: after, orig: after, norm: after };
    if (tok.orig === text) tok.orig = before;
    if (tok.norm === text) tok.norm = before;
    tok.text = before;
    w.line.tokens.splice(w.line.tokens.indexOf(tok) + 1, 0, added);
  });
  rebuild(k + 1, 0);
}

const BETWEEN = { pc: "ein Satzzeichen", anchor: "ein Apparatanker", milestone: "ein Absatzzeichen" };
// What two words must share to become one: every element that encloses either of them.
const ENCLOSING = [
  ["ref", (t) => refKey(t)], ["hi", (t) => (t.rend || []).join(" ")], ["Markup", (t) => t.markup],
  ["supplied", (t) => t.supplied], ["unclear", (t) => t.unclear], ["damage", (t) => t.damage],
  ["fw", (t) => t.fw], ["del", (t) => t.del], ["choice", (t) => `${t.abbr}${t.expan}`],
];

// The reason words a and b cannot be joined, or null. Nothing may lie between them but
// one line break, which the joined word keeps as its inner lb (data.md, the line rule).
function joinRefusal(a, b) {
  const pair = `${quote(a)} und ${quote(b)}`;
  for (const w of [a, b]) {
    const inner = innerElements.of(w.tok);
    if (inner.length) return `${quote(w)} enthält das Element <${inner[0]}>.`;
  }
  const lines = columns()[state.column].lines;
  if (a.line !== b.line && lines.indexOf(b.line) !== lines.indexOf(a.line) + 1) return `Zwischen ${pair} liegt mehr als ein Zeilenumbruch.`;
  const between = a.line === b.line
    ? a.line.tokens.slice(a.line.tokens.indexOf(a.tok) + 1, a.line.tokens.indexOf(b.tok))
    : [...a.line.tokens.slice(a.line.tokens.indexOf(a.tok) + 1), ...b.line.tokens.slice(0, b.line.tokens.indexOf(b.tok))];
  if (between.length) return `Zwischen ${pair} steht ${BETWEEN[between[0].type] || "ein Element"}.`;
  for (const [name, key] of ENCLOSING) {
    if (key(a.tok) === key(b.tok)) continue;
    const element = name === "Markup" ? (a.tok.markup || b.tok.markup).element : name;
    return `${pair} liegen in verschiedenen Elementen <${element}>.`;
  }
  return null;
}

// Backspace at the start of word i + 1 or Delete at the end of word i joins the two; the
// first keeps its id, and the caret stands at the join.
function joinWords(i) {
  const a = state.words[i];
  const b = state.words[i + 1];
  if (!a) return refuse("Vor dem Wort steht in dieser Spalte kein Wort.");
  if (!b) return refuse("Nach dem Wort steht in dieser Spalte kein Wort.");
  const reason = joinRefusal(a, b);
  if (reason) return refuse(`Verbinden nicht möglich: ${reason}`);
  const lb = a.line === b.line ? "" : "\n";
  const at = a.node.firstChild.length + lb.length;
  commit("Wörter verbinden", () => {
    const [x, y] = [a.tok, b.tok];
    const flat = (tok) => (tok.text || "").replace(/\n/g, "");
    if (x.orig != null || y.orig != null) x.orig = (x.orig ?? flat(x)) + (y.orig ?? flat(y));
    if (x.norm != null || y.norm != null) x.norm = (x.norm ?? flat(x)) + (y.norm ?? flat(y));
    x.text = `${x.text}${lb}${y.text}`;
    b.line.tokens.splice(b.line.tokens.indexOf(y), 1);
  });
  rebuild(i, at);
}

// Delete or Backspace on a selected whole word removes it. An inner lb or anchor would
// go with it, so such a word stays. The caret goes to the end of the word before it.
function deleteWord(k) {
  const w = state.words[k];
  const inner = innerElements.of(w.tok).find((n) => n === "lb" || n === "anchor");
  if (inner) return refuse(`Löschen nicht möglich: ${quote(w)} enthält das Element <${inner}>.`);
  commit("Wort löschen", () => { w.line.tokens.splice(w.line.tokens.indexOf(w.tok), 1); });
  if (k > 0) rebuild(k - 1, state.words[k - 1].node.firstChild.length);
  else rebuild(0, 0);
}

// Highlighting across text, facsimile and XML

export function selectedWords() { return state.sel ? state.words.slice(state.sel.from, state.sel.to + 1) : []; }

export function highlightSelection() {
  for (const n of document.querySelectorAll(".w.is-current, .ln.is-current, .zone.is-current, .xml .is-selected, .xml .is-target")) n.classList.remove("is-current", "is-selected", "is-target");
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
  if (state.view !== "xml") return;
  if (words.length && words[0].tok.id) {
    const x = document.querySelector(`.xml .xw[data-id="${CSS.escape(words[0].tok.id)}"]`);
    if (x) { x.classList.add("is-selected"); x.scrollIntoView({ block: "center" }); }
  }
  // The anchors that the comments on the selection point to unfold their xml:id (F57).
  for (const app of new Set(words.flatMap((w) => state.appsByWord.get(w.tok) || []))) {
    for (const id of [app.from, app.to]) if (id) document.querySelector(`.xml .xa[data-id="${CSS.escape(id)}"]`)?.classList.add("is-target");
  }
}
