// Shared state and DOM helpers. Every other module imports from here; this module imports nothing.

// Answer of every control the wireframe does not implement, so no label promises more than it does.
export const STUB = "Im Entwurf noch ohne Funktion.";

export const TYPE_LABEL = { person: "Person", place: "Ort", folk: "Volk" };

// state.data is replaced wholesale by undo and redo (history.js), so modules read it
// through state.data on every use and never keep a reference to it or its tokens.
export const state = {
  data: null, column: 0, view: "text", facs: false,
  words: [],          // rendered words of the current column: { tok, line, lineNo, node }
  sel: null,          // { from, to, line } indices into state.words; line is set in the state "Zeile"
  pendingLine: null,  // line chosen by line number or zone, confirmed once the selection arrives
  quiet: false,       // inspector closed by the user; caret moves do not reopen it until the next click or key
  appsByWord: new Map(), findings: null, viewer: null, diplo: null,
};

export const $ = (sel) => document.querySelector(sel);

export const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
};

export const island = (cls, text, attrs = {}) => el("span", { class: cls, contenteditable: "false", text, ...attrs });

export const columns = () => state.data.columns.filter((c) => c.lines.length);

export const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const refKey = (tok) => (tok && tok.ref ? `${tok.ref.type}|${tok.ref.target}` : null);

export function chipFor(key) {
  const [type, target] = key.split("|");
  return island(`chip type-${type.toLowerCase()}`, `${TYPE_LABEL[type.toLowerCase()] || type}: ${target.trim()}`);
}
