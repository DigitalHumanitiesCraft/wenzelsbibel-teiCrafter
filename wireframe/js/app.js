// Static wireframe of the Wenzelsbibel editor on real fol. 1r data. Edits live in
// memory with undo and are never persisted. Data: ../data/wireframe/fol-1r.json
// (ignored by Git, extracted from the public ONB TEI by wireframe/extract_data.py).
import { $, el, state } from "./state.js";
import { onChange } from "./history.js";
import { highlightSelection, placeCaret, renderFlow, setColumn, setWordRange, wireFlow } from "./flow.js";
import { formatXml, renderXml, setView } from "./xml.js";
import { setFacs, toggleZones } from "./facsimile.js";
import { closeInspector, openInspector, refreshInspector } from "./inspector.js";
import { actions, buildMenus } from "./menu.js";
// Feature modules register their inspector sections on import, so this order is the
// visible order in the word states: markup, register, apparatus.
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
  buildMenus();
  indexApparatus();
  renderFlow();
  renderXml();
  wireFlow();
  wireControls();
  onChange(rerender);
  initMiniatures();
}

function wireControls() {
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => setView(b.dataset.view));
  for (const b of document.querySelectorAll("[data-column]")) b.addEventListener("click", () => setColumn(Number(b.dataset.column)));
  $("#toggle-facs").addEventListener("click", () => setFacs(!state.facs));
  $("#zones-toggle").addEventListener("change", (e) => toggleZones(e.target.checked));
  $("#inspector-close").addEventListener("click", closeInspector);
  $("#inspector-xml").addEventListener("click", () => setView(state.view === "xml" ? "text" : "xml"));
  $("#xml-format").addEventListener("click", formatXml);
  $("#doc-select").addEventListener("change", (e) => switchDocument(e.target.value));

  actions.set("Ansicht/Text", () => setView("text"));
  actions.set("Ansicht/XML", () => setView("xml"));
  actions.set("Ansicht/Faksimile", () => setFacs(!state.facs));
  actions.set("Ansicht/Zonen", () => { const t = $("#zones-toggle"); t.checked = !t.checked; toggleZones(t.checked); });
  actions.set("Ansicht/Auswahl", () => { if ($("#inspector").hidden) { if (state.sel) openInspector(); } else closeInspector(); });
  actions.set("Bearbeiten/XML formatieren", formatXml);
}

// After undo or redo every view is rebuilt from state.data, whose tokens are new
// objects. The selection survives where its words still exist, and a caret in the
// flow returns to the same word and offset.
function rerender(kind) {
  if (kind === "commit" || kind === "saved" || kind === "document") return;
  const sel = state.sel;
  const s = getSelection();
  const flowFocused = document.activeElement === $("#flow");
  const caret = flowFocused && s.rangeCount && s.isCollapsed ? s.anchorNode.parentElement?.closest(".w") : null;
  const caretAt = caret ? { k: Number(caret.dataset.k), off: s.anchorOffset } : null;
  indexApparatus();
  renderFlow();
  renderXml();
  if (sel && sel.to < state.words.length) {
    state.sel = sel;
    if (flowFocused && state.view === "text") {
      if (caretAt) placeCaret(caretAt.k, caretAt.off, false); else setWordRange(sel.from, sel.to);
    }
  }
  highlightSelection();
  refreshInspector();
}

main();
