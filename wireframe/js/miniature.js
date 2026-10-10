// Miniature form and the document Bildannotationen (phase 2 owner: miniature).
import { $, el, state, STUB } from "./state.js";
import { highlightSelection, placeCaret, renderFlow, setColumn } from "./flow.js";
import { setView } from "./xml.js";
import { zoneActions } from "./facsimile.js";
import { closeInspector, field, openPanel } from "./inspector.js";
import { notify } from "./notice.js";

export function selectMiniature(zoneId) {
  const m = state.data.miniature;
  if (m.zone !== zoneId) return;
  state.sel = null;
  highlightSelection();
  const artists = Object.fromEntries(state.data.registers.artists);
  const ic = el("div", {}, [el("div", { class: "group-title", text: "ICONCLASS" })]);
  const grid = el("div", { class: "iconclass" });
  for (const [uri, de, en] of m.iconclass) {
    grid.append(el("code", { text: uri.replace("https://iconclass.org/", "") }), el("span", {}, [el("span", { class: "lang", text: "de " }), de, el("br"), el("span", { class: "lang", text: "en " }), en]));
  }
  ic.append(grid, el("button", { class: "link-btn", type: "button", text: "ICONCLASS suchen …", onclick: () => notify(STUB, true) }));
  openPanel(
    ["Miniatur ", el("span", { class: "context", text: `${m.id}, fol. ${m.folio[1]} Z. ${m.folio[0]}` })],
    [
      el("div", { class: "fields" }, [
        field("Titel", m.title || ""),
        field("Bildtyp", m.objectType || ""),
        field("Höhe in Zeilen", m.height || ""),
        field("Künstler", m.artists.map((a) => `${a} ${artists[a] || ""}`).join(", ")),
      ]),
      el("label", { class: "field" }, [el("span", { text: "Kurzbeschreibung" }), el("textarea", { text: m.short || "" })]),
      el("label", { class: "field" }, [el("span", { text: "Beschreibung" }), el("textarea", { text: m.long || "" })]),
      el("div", {}, [el("div", { class: "group-title", text: "Personen" }), el("div", { class: "tags" }, m.persons.map((p) => el("span", { class: "tag", text: p })))]),
      ic,
      el("div", {}, [el("div", { class: "group-title", text: "Textbezug" }), el("p", { text: m.statistic || "" }), el("button", { class: "link-btn", type: "button", text: "Im Text zeigen", onclick: showMiniatureText })]),
    ],
    () => selectMiniature(zoneId),
  );
}

export function showMiniatureText() {
  if ($("#doc-select").value !== "codex") { $("#doc-select").value = "codex"; switchDocument("codex"); }
  if (state.view !== "text") setView("text");
  if (state.column !== 0) setColumn(0);
  const k = state.words.findIndex((w) => w.lineNo === "1");
  if (k >= 0) placeCaret(k);
}

// The second document of the document bar holds the miniatures of the folio.
export function switchDocument(which) {
  const isImages = which === "images";
  $("#status-file").textContent = isImages ? "Bildannotationen.xml" : "codex-2759.xml";
  $("#pager").hidden = isImages;
  closeInspector();
  if (isImages) {
    setView("text");
    $("#flow").hidden = true;
    const m = state.data.miniature;
    $("#minis").replaceChildren(el("h2", { class: "minis-title", text: "Miniaturen auf fol. 1r" }), el("button", { class: "link-btn", type: "button", text: `${m.id}  ${m.title}`, onclick: () => selectMiniature(m.zone) }));
    $("#minis").hidden = false;
  } else {
    $("#minis").hidden = true;
    $("#flow").hidden = false;
    renderFlow();
  }
}

zoneActions.set("img_miniature", selectMiniature);
