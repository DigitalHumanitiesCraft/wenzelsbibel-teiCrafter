// Static wireframe of the Wenzelsbibel editor on real fol. 1r data. Edits live in
// memory with undo and are never persisted. Data: ../data/wireframe/fol-1r.json
// (ignored by Git, extracted from the public ONB TEI by wireframe/extract_data.py).
// Shell: the Arbeitsleiste (toolbar.js), the popover at the selection (popover.js), the
// Seitenleiste (panel.js) and the notice bar (notice.js).
import { $, el, state } from "./state.js";
import { activeDoc, onChange } from "./history.js";
import { flowEvents, highlightSelection, placeCaret, renderFlow, setColumn, setWordRange, wireFlow } from "./flow.js";
import { formatXml, renderXml, setView, toggleIds } from "./xml.js";
import { setFacs, toggleZones } from "./facsimile.js";
import { closePopover, refreshPopover } from "./popover.js";
import { initPanel, refreshPanel } from "./panel.js";
import { command, initToolbar } from "./toolbar.js";
import { notify } from "./notice.js";
// Feature modules register their popover sections and commands on import, so this order
// is the visible order in the word states: markup, register, apparatus.
import "./markup.js";
import "./register.js";
import { indexApparatus } from "./apparatus.js";
import { initMiniatures, switchDocument } from "./miniature.js";
import "./checks.js";

const DATA_URL = "../data/wireframe/fol-1r.json";

async function main() {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    $("#flow").replaceWith(el("p", { class: "empty-note", text: "Die Datei data/wireframe/fol-1r.json fehlt. Sie wird aus dem öffentlichen TEI des Codex erzeugt und liegt außerhalb des Repositories." }));
    return;
  }
  state.data = await res.json();
  indexApparatus();
  renderFlow();
  renderXml();
  wireFlow();
  flowEvents.addEventListener("refused", (e) => notify(e.detail));
  flowEvents.addEventListener("structure", (e) => afterWordCommand(e.detail));
  wireControls();
  initPanel();
  initToolbar();
  onChange(rerender);
  initMiniatures();
}

function wireControls() {
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => setView(b.dataset.view));
  for (const b of document.querySelectorAll("[data-column]")) b.addEventListener("click", () => setColumn(Number(b.dataset.column)));
  $("#popover-close").addEventListener("click", closePopover);
  $("#popover-xml").addEventListener("click", () => setView(state.view === "xml" ? "text" : "xml"));
  $("#doc-select").addEventListener("change", (e) => switchDocument(e.target.value));

  command("facs", () => setFacs(state.side !== "facs"));
  command("zones", () => toggleZones(!state.zones), () => (state.side === "facs" ? null : "Erst das Faksimile einblenden."));
  command("format", formatXml, () => (activeDoc() === "images" ? "XML formatieren gilt für den Codex." : null));
  command("ids", toggleIds);
}

// After a word command (flow.js) the apparatus index and the flow are rebuilt from the
// model, and the caret returns to where the command left it; the popover follows it.
function afterWordCommand({ k, off }) {
  indexApparatus();
  renderFlow();
  if (state.words[k]) placeCaret(k, off, false);
  highlightSelection();
}

// After undo or redo every view is rebuilt from state.data, whose tokens are new
// objects. The selection survives where its words still exist, and a caret in the
// flow returns to the same word and offset. The XML view follows every change to its
// source, a commit included; renderXml is a no-op while the source is unchanged.
function rerender(kind) {
  renderXml();
  if (kind === "commit" || kind === "saved" || kind === "document") return;
  const sel = state.sel;
  const s = getSelection();
  const flowFocused = document.activeElement === $("#flow");
  const caret = flowFocused && s.rangeCount && s.isCollapsed ? s.anchorNode.parentElement?.closest(".w") : null;
  const caretAt = caret ? { k: Number(caret.dataset.k), off: s.anchorOffset } : null;
  indexApparatus();
  renderFlow();
  if (sel && sel.to < state.words.length) {
    state.sel = sel;
    if (flowFocused && state.view === "text") {
      if (caretAt) placeCaret(caretAt.k, caretAt.off, false); else setWordRange(sel.from, sel.to);
    }
  }
  highlightSelection();
  refreshPopover();
  refreshPanel();
}

main();
