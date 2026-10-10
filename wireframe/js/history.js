// In-memory undo and redo over state.data, one history per document (F5). Nothing is
// persisted; the unsaved marker shows whenever the active document's current revision
// differs from its last saved one.
import { $, state } from "./state.js";

// Each document owns its part of state.data: the image annotations own `miniatures`,
// the codex owns everything else. An entry snapshots only its document's part, so
// undoing in one document never rolls back the other. A mutate function changes only
// the part of the document it is committed for.
const DOCS = ["codex", "images"];
const part = (doc, data) => (doc === "images"
  ? { miniatures: data.miniatures }
  : Object.fromEntries(Object.entries(data).filter(([k]) => k !== "miniatures")));

const histories = Object.fromEntries(DOCS.map((d) => [d, { undo: [], redo: [], revision: 0, saved: 0 }]));
const listeners = [];
let nextRevision = 1;

// The active document is the one chosen in the document chooser of the Arbeitsleiste.
export const activeDoc = () => ($("#doc-select").value === "images" ? "images" : "codex");
const active = () => histories[activeDoc()];

export const canUndo = () => active().undo.length > 0;
export const canRedo = () => active().redo.length > 0;

export function onChange(fn) { listeners.push(fn); }

// Kinds: commit, restore, undo, redo, saved, and document (the active document changed,
// so the marker and the toolbar follow; nothing in the data changed).
// The dot keeps its place while hidden (visibility), so its coming and going moves no
// control of the Arbeitsleiste.
function emit(kind, label) {
  const h = active();
  $("#status-unsaved").classList.toggle("is-clean", h.revision === h.saved);
  for (const fn of listeners) fn(kind, label);
}

// mutate(data) changes state.data in place. It validates before it changes anything
// and returns false to refuse, which leaves no history entry. If it throws halfway,
// the snapshot is restored and listeners re-render from it. `doc` names the document
// the edit belongs to when the caller knows it better than the document bar.
export function commit(label, mutate, doc = activeDoc()) {
  const h = histories[doc];
  // One structuredClone of the whole part keeps references shared inside it (markup runs).
  const snapshot = { label, part: structuredClone(part(doc, state.data)), revision: h.revision };
  let result;
  try {
    result = mutate(state.data);
  } catch (err) {
    state.data = { ...state.data, ...snapshot.part };
    emit("restore", label);
    throw err;
  }
  if (result === false) return false;
  h.undo.push(snapshot);
  h.redo.length = 0;
  h.revision = nextRevision++;
  emit("commit", label);
  return true;
}

// state.data is replaced by a new object, so every module re-reads it (state.js).
function swap(from, to, kind) {
  const doc = activeDoc();
  const h = histories[doc];
  const entry = h[from].pop();
  if (!entry) return null;
  h[to].push({ label: entry.label, part: part(doc, state.data), revision: h.revision });
  state.data = { ...state.data, ...entry.part };
  h.revision = entry.revision;
  emit(kind, entry.label);
  return entry.label;
}

// Each returns the label of the step it reverted or repeated, or null when there is none.
export const undo = () => swap("undo", "redo", "undo");
export const redo = () => swap("redo", "undo", "redo");

// The revision a document is at now, for the save flow's download gate (checks.js).
export const revision = (doc = activeDoc()) => histories[doc].revision;

// For the save flow: the current revision of the document becomes the saved one.
export function markSaved(doc = activeDoc()) {
  const h = histories[doc];
  h.saved = h.revision;
  emit("saved", "");
}

// Called after the document chooser switched documents.
export const documentChanged = () => emit("document", "");
