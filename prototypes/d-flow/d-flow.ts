/// <reference types="vite/client" />
import { Compartment, type Extension } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { xml } from "@codemirror/lang-xml";
import { createXmlState, rawOf } from "../../src/editor/offsets";
import { checkWellFormed } from "../../src/core/well-formed";
import { flowExtensions, flowField, flowStatus, removeWrapper, settleCaret, wrapAsRs } from "./flow-state";
import fixture from "./fixture/fol1r.xml?raw";
// Imported rather than linked: the tokens lie outside the prototype root, and Vite resolves imports, not HTML links.
import "../../src/ui/tokens.css";
import "./d-flow.css";

const FILE_NAME = "fol1r.xml";

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}
const ui = {
  host: byId<HTMLElement>("editor"),
  source: byId<HTMLButtonElement>("source"),
  check: byId<HTMLButtonElement>("check"),
  save: byId<HTMLButtonElement>("save"),
  undo: byId<HTMLButtonElement>("undo"),
  redo: byId<HTMLButtonElement>("redo"),
  wrap: byId<HTMLButtonElement>("wrap"),
  unwrap: byId<HTMLButtonElement>("unwrap"),
  type: byId<HTMLInputElement>("rs-type"),
  id: byId<HTMLInputElement>("rs-id"),
  wellformed: byId<HTMLSpanElement>("wellformed"),
  dirty: byId<HTMLSpanElement>("dirty"),
  timing: byId<HTMLSpanElement>("timing"),
  message: byId<HTMLOutputElement>("message"),
};

const mode = new Compartment();
const flowMode = (): Extension => [flowExtensions(), EditorView.editorAttributes.of({ class: "flow" })];
const sourceMode = (): Extension => [lineNumbers(), highlightActiveLine(), syntaxHighlighting(defaultHighlightStyle, { fallback: true })];
let showingSource = false;
let savedRaw = fixture;
let keyAt = 0;

const say = (text: string) => { ui.message.textContent = text; };

const view = new EditorView({
  parent: ui.host,
  state: createXmlState(fixture, [
    history(),
    drawSelection(),
    xml(),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ "aria-label": "Text of fol. 1r", spellcheck: "false" }),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    mode.of(flowMode()),
    EditorView.updateListener.of((u) => {
      for (const tr of u.transactions) for (const e of tr.effects) if (e.is(flowStatus)) say(e.value);
      if (!u.docChanged) return;
      ui.dirty.hidden = rawOf(u.state) === savedRaw;
      const field = u.state.field(flowField, false);
      const started = keyAt;
      keyAt = 0;
      // Input to next frame, measured from the keydown that caused the change.
      requestAnimationFrame(() => {
        const rebuild = field ? `rebuild ${field.buildMs.toFixed(1)} ms` : "";
        const frame = started ? `key to frame ${(performance.now() - started).toFixed(1)} ms` : "";
        ui.timing.textContent = [frame, rebuild].filter(Boolean).join(", ");
      });
    }),
  ]),
});
view.contentDOM.addEventListener("keydown", () => { keyAt = performance.now(); }, true);
// A key that changed nothing must not leave its time for a later edit by pointer or button.
view.contentDOM.addEventListener("keyup", () => { keyAt = 0; });
// Exposed for the browser check, which drives the same view the reader sees.
(window as unknown as { dflow: unknown }).dflow = {
  view,
  scrollTo: (pos: number) => view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: "center" }) }),
};

ui.source.addEventListener("click", () => {
  showingSource = !showingSource;
  ui.source.setAttribute("aria-pressed", String(showingSource));
  ui.host.classList.toggle("source", showingSource);
  view.dispatch({ effects: mode.reconfigure(showingSource ? sourceMode() : flowMode()), scrollIntoView: true });
  if (!showingSource) settleCaret(view);
  view.focus();
});
ui.check.addEventListener("click", () => {
  const result = checkWellFormed(rawOf(view.state));
  ui.wellformed.textContent = result.ok ? "well-formed" : "not well-formed";
  ui.wellformed.classList.toggle("bad", !result.ok);
  say(result.ok ? "The document is well-formed." : (result.message ?? "The document is not well-formed."));
});
ui.save.addEventListener("click", () => {
  const raw = rawOf(view.state);
  const url = URL.createObjectURL(new Blob([raw], { type: "application/xml" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: FILE_NAME });
  a.click();
  URL.revokeObjectURL(url);
  savedRaw = raw;
  ui.dirty.hidden = true;
  say(`Download of ${FILE_NAME} requested.`);
});
ui.undo.addEventListener("click", () => { undo(view); view.focus(); });
ui.redo.addEventListener("click", () => { redo(view); view.focus(); });
ui.wrap.addEventListener("click", () => {
  if (showingSource) return say("Wrapping works in the flowing view. Turn off Show source.");
  say(wrapAsRs(view, ui.type.value.trim(), ui.id.value.trim().replace(/^#/, "")));
  view.focus();
});
ui.unwrap.addEventListener("click", () => {
  if (showingSource) return say("Removing a wrapper works in the flowing view. Turn off Show source.");
  say(removeWrapper(view));
  view.focus();
});

view.focus();
settleCaret(view);
