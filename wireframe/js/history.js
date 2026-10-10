// In-memory undo and redo over state.data. Nothing is persisted; the unsaved marker
// shows whenever the current revision differs from the last saved one.
import { $, state } from "./state.js";

const undoStack = [];
const redoStack = [];
const listeners = [];
let revision = 0;
let nextRevision = 1;
let savedRevision = 0;

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;

export function onChange(fn) { listeners.push(fn); }

function emit(kind, label) {
  $("#status-unsaved").hidden = revision === savedRevision;
  for (const fn of listeners) fn(kind, label);
}

// mutate(data) changes state.data in place. It validates before it changes anything
// and returns false to refuse, which leaves no history entry. If it throws halfway,
// the snapshot is restored and listeners re-render from it.
export function commit(label, mutate) {
  const snapshot = { label, data: structuredClone(state.data), revision };
  let result;
  try {
    result = mutate(state.data);
  } catch (err) {
    state.data = snapshot.data;
    emit("restore", label);
    throw err;
  }
  if (result === false) return false;
  undoStack.push(snapshot);
  redoStack.length = 0;
  revision = nextRevision++;
  emit("commit", label);
  return true;
}

function swap(from, to, kind) {
  const entry = from.pop();
  if (!entry) return false;
  to.push({ label: entry.label, data: state.data, revision });
  state.data = entry.data;
  revision = entry.revision;
  emit(kind, entry.label);
  return true;
}

export const undo = () => swap(undoStack, redoStack, "undo");
export const redo = () => swap(redoStack, undoStack, "redo");

// For the save flow: the current revision becomes the saved one and the marker clears.
export function markSaved() {
  savedRevision = revision;
  emit("saved", "");
}
