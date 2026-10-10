// Static wireframe of the Wenzelsbibel editor on real fol. 1r data.
// It renders and lets the reviewer switch states; it edits and saves nothing.
// Data: ../data/wireframe/fol-1r.json (ignored by Git, extracted from the public ONB TEI).

const DATA_URL = "../data/wireframe/fol-1r.json";
const IIIF_WIDTH = 900;

const MENUS = [
  { label: "Datei", items: ["Öffnen …", "Projektordner öffnen …", "-", ["Speichern", "Strg+S"], "Arbeitskopie sichern", "-", "Zuletzt geöffnet"] },
  { label: "Bearbeiten", items: [["Rückgängig", "Strg+Z"], ["Wiederholen", "Strg+Y"], "-", ["Suchen", "Strg+F"], "-", "Apparatkommentar zur Auswahl", ["Element für Auswahl …", "Strg+E"]] },
  { label: "Ansicht", items: [["Text", ""], ["XML", ""], "-", "Faksimile", "Zonen", "Auswahl", "-", "Zeilenweise", "Fließtext"] },
  { label: "Register", items: ["Personen", "Orte", "Völker", "-", "Eintrag anlegen …", "Verweise auf Eintrag anzeigen"] },
  { label: "Prüfen", items: ["Wohlgeformtheit", "TEI All", "Schematron editing", "Schematron review", "-", "Befundliste"] },
  { label: "Hilfe", items: ["Transkriptionsrichtlinie", "Über"] },
];

// Handbook vocabularies (editorial-guidelines.md); the real tool reads them from the manifest.
const MARKUP = [
  { label: "Hervorhebung", values: ["rubrication", "inkRed", "gold", "initial", "initial_historisiert"] },
  { label: "Ergänzung", values: ["text_intervention", "switch", "damage"] },
  { label: "Überschuss", values: ["diplography", "decor", "text_erasure", "switch", "instruction_note"] },
  { label: "Tilgung", values: ["del", "erasure", "erasure_point"] },
  { label: "Fremdsprache", values: ["lat", "cze"] },
  { label: "Zahl", values: ["chapter"] },
];

const TYPE_LABEL = { person: "Person", place: "Ort", folk: "Volk" };

const state = { data: null, column: 0, view: "text", facs: false, selected: null, ids: new Map(), appsByWord: new Map() };

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, children = []) => {
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
const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    $("#lines").append(el("p", { class: "empty-note", text: "Die Datei data/wireframe/fol-1r.json fehlt. Sie wird aus dem öffentlichen TEI des Codex erzeugt und liegt außerhalb des Repositories." }));
    return;
  }
  state.data = await res.json();
  buildMenus();
  indexApparatus();
  renderLines();
  renderXml();
  renderFacsimile();
  wireControls();
}

function buildMenus() {
  const ul = $("#menus");
  for (const menu of MENUS) {
    const li = el("li", { role: "none" });
    const btn = el("button", { class: "menu-btn", type: "button", "aria-haspopup": "true", "aria-expanded": "false", text: menu.label });
    const list = el("ul", { class: "menu-list", role: "menu", hidden: "" });
    for (const item of menu.items) {
      if (item === "-") { list.append(el("li", { class: "menu-sep", role: "separator" })); continue; }
      const [label, key] = Array.isArray(item) ? item : [item, ""];
      const b = el("button", { class: "menu-item", type: "button", role: "menuitem", onclick: () => { closeMenus(); menuAction(menu.label, label); } }, [el("span", { text: label })]);
      if (key) b.append(el("kbd", { text: key }));
      list.append(el("li", { role: "none" }, [b]));
    }
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      closeMenus();
      if (!open) { btn.setAttribute("aria-expanded", "true"); list.hidden = false; }
    });
    li.append(btn, list);
    ul.append(li);
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".menus") && !e.target.closest(".act")) closeMenus(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") onEscape(); });
}

function closeMenus() {
  for (const b of document.querySelectorAll('[aria-expanded="true"]')) { b.setAttribute("aria-expanded", "false"); b.nextElementSibling.hidden = true; }
}

function menuAction(menu, label) {
  if (menu === "Ansicht") {
    if (label === "Text" || label === "XML") setView(label.toLowerCase());
    if (label === "Faksimile") setFacs(!state.facs);
    if (label === "Zonen") { const t = $("#zones-toggle"); t.checked = !t.checked; $("#zones").hidden = !t.checked; }
    if (label === "Auswahl") $("#inspector").hidden ? openInspector() : closeInspector();
  }
}

function onEscape() {
  const ac = document.querySelector(".ac-list:not([hidden])");
  if (ac) { ac.hidden = true; return; }
  if (document.querySelector('.menu-btn[aria-expanded="true"], .act > button[aria-expanded="true"]')) { closeMenus(); return; }
  if (!$("#inspector").hidden) { closeInspector(); return; }
  select(null);
}

// Apparatus: words between start_N and end_N anchors belong to the app with those anchors.
function indexApparatus() {
  const open = new Map();
  const apps = state.data.apparatus;
  for (const col of state.data.columns) {
    for (const line of col.lines) {
      for (const tok of line.tokens) {
        if (tok.type === "anchor") {
          const app = apps.find((a) => a.from === tok.id || a.to === tok.id);
          if (!app) continue;
          if (tok.id === app.from) open.set(app.from, app);
          if (tok.id === app.to) open.delete(app.from);
        } else if (tok.type === "w" && tok.id && open.size) {
          state.appsByWord.set(tok.id, [...open.values()]);
        }
      }
    }
  }
}

function renderLines() {
  const host = $("#lines");
  host.replaceChildren();
  const col = state.data.columns.filter((c) => c.lines.length)[state.column];
  if (!col) { host.append(el("p", { class: "empty-note", text: "Keine Zeilen in dieser Spalte." })); return; }
  col.lines.forEach((line, i) => {
    const row = el("div", { class: "line", "data-line": line.id, "data-facs": (line.facs || "").replace("#", "") });
    const isHeader = line.tokens.some((t) => t.type === "w" && t.fw === "header");
    row.append(el("span", { class: `line-no${isHeader ? " is-header" : ""}`, text: String(i + 1) }));
    const body = el("span", { class: "line-body" });
    let group = null;
    for (const tok of line.tokens) {
      if (tok.type === "milestone") { body.append(el("span", { class: "milestone", text: "¶", title: tok.unit })); continue; }
      if (tok.type === "anchor") continue;
      if (tok.type === "pc") { body.append(el("span", { class: `pc${tok.supplied ? " is-supplied" : ""}`, text: tok.text })); body.append(" "); continue; }
      const refKey = tok.ref ? `${tok.ref.type}|${tok.ref.target}` : null;
      if (refKey !== (group && group.dataset.ref)) {
        if (group) { group.append(chipFor(group.dataset.ref)); body.append(group, " "); }
        group = refKey ? el("span", { class: `ref-group type-${tok.ref.type.toLowerCase()}`, "data-ref": refKey }) : null;
      }
      const w = wordNode(tok);
      (group || body).append(w, " ");
    }
    if (group) { group.append(chipFor(group.dataset.ref)); body.append(group); }
    row.append(body);
    host.append(row);
  });
}

function chipFor(refKey) {
  const [type, target] = refKey.split("|");
  return el("span", { class: `chip type-${type.toLowerCase()}`, text: `${TYPE_LABEL[type.toLowerCase()] || type}: ${target.trim()}` });
}

function wordNode(tok) {
  const classes = ["w"];
  for (const r of tok.rend || []) classes.push(`rend-${r}`);
  if (tok.supplied) classes.push("is-supplied");
  if (tok.unclear) classes.push("is-unclear");
  if (tok.damage) classes.push("is-damage");
  if (tok.id && state.appsByWord.has(tok.id)) classes.push("in-app");
  const node = el("span", { class: classes.join(" "), tabindex: "0", role: "button", "data-id": tok.id || "", text: tok.text || tok.orig || "" });
  node.addEventListener("click", () => select(tok));
  node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(tok); } });
  state.ids.set(tok.id, node);
  return node;
}

function renderXml() {
  const pre = $("#xml");
  const src = state.data.xmlExcerpt;
  let html = escapeXml(src)
    .replace(/(&lt;\/?)([\w:]+)/g, '$1<span class="tag">$2</span>')
    .replace(/([\w:]+)=(&quot;|")([^"&]*)(&quot;|")/g, '<span class="attr">$1</span>=<span class="val">"$3"</span>');
  pre.innerHTML = html;
}

function renderFacsimile() {
  const { image, zones } = state.data;
  $("#facs-img").src = `${image.iiif}/full/${IIIF_WIDTH},/0/default.jpg`;
  const svg = $("#zones");
  svg.setAttribute("viewBox", `0 0 ${image.width} ${image.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  for (const z of zones) {
    if (!z.points) continue;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    p.setAttribute("points", z.points);
    p.setAttribute("class", `zone type-${z.type}${z.subtype ? ` sub-${z.subtype}` : ""}`);
    p.dataset.id = z.id;
    if (z.type === "Line") p.addEventListener("click", () => jumpToLine(z.id));
    if (z.subtype === "img_miniature") p.addEventListener("click", () => selectMiniature(z.id));
    svg.append(p);
  }
}

function jumpToLine(zoneId) {
  const line = findLineByFacs(zoneId);
  if (!line) return;
  const first = line.tokens.find((t) => t.type === "w");
  if (first) select(first);
}

function findLineByFacs(zoneId) {
  for (const col of state.data.columns) for (const line of col.lines) if ((line.facs || "").replace("#", "") === zoneId) return line;
  return null;
}

function lineOfWord(id) {
  for (const col of state.data.columns) for (const line of col.lines) if (line.tokens.some((t) => t.id === id)) return line;
  return null;
}

function wireControls() {
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => setView(b.dataset.view));
  for (const b of document.querySelectorAll("[data-column]")) b.addEventListener("click", () => { state.column = Number(b.dataset.column); for (const x of document.querySelectorAll("[data-column]")) x.classList.toggle("is-active", x === b); select(null); renderLines(); });
  $("#toggle-facs").addEventListener("click", () => setFacs(!state.facs));
  $("#zones-toggle").addEventListener("change", (e) => { $("#zones").hidden = !e.target.checked; });
  $("#inspector-close").addEventListener("click", closeInspector);
  $("#inspector-xml").addEventListener("click", () => setView(state.view === "xml" ? "text" : "xml"));
  $("#doc-select").addEventListener("change", (e) => switchDocument(e.target.value));
  $("#prev-folio").disabled = true;
  $("#next-folio").disabled = true;
}

function setView(view) {
  state.view = view;
  for (const b of document.querySelectorAll("[data-view]")) b.classList.toggle("is-active", b.dataset.view === view);
  $("#lines").hidden = view !== "text";
  $("#xml").hidden = view !== "xml";
  $("#inspector-xml").textContent = view === "xml" ? "Im Text zeigen" : "XML-Stelle";
  highlightSelection();
}

function setFacs(on) {
  state.facs = on;
  $("#facs-pane").hidden = !on;
  $("#work").classList.toggle("has-facs", on);
  $("#toggle-facs").setAttribute("aria-pressed", String(on));
  highlightSelection();
}

function select(tok) {
  state.selected = tok;
  highlightSelection();
  if (tok) openInspector(); else closeInspector();
}

function highlightSelection() {
  const id = state.selected && state.selected.id;
  for (const n of document.querySelectorAll(".w.is-selected")) n.classList.remove("is-selected");
  for (const n of document.querySelectorAll(".line.is-current, .zone.is-current")) n.classList.remove("is-current");
  for (const n of document.querySelectorAll(".xml .is-selected")) n.replaceWith(...n.childNodes);
  if (!id) return;
  const node = state.ids.get(id);
  if (node) { node.classList.add("is-selected"); node.closest(".line").classList.add("is-current"); }
  const line = lineOfWord(id);
  if (line && line.facs) {
    const z = document.querySelector(`.zone[data-id="${line.facs.replace("#", "")}"]`);
    if (z) z.classList.add("is-current");
  }
  if (state.view === "xml") {
    const pre = $("#xml");
    const marker = `xml:id</span>=<span class="val">"${id}"</span>`;
    const i = pre.innerHTML.indexOf(marker);
    if (i >= 0) {
      const start = pre.innerHTML.lastIndexOf("&lt;", i);
      const end = pre.innerHTML.indexOf("&lt;/<span class=\"tag\">w</span>&gt;", i);
      if (start >= 0 && end > start) {
        const close = end + "&lt;/<span class=\"tag\">w</span>&gt;".length;
        pre.innerHTML = `${pre.innerHTML.slice(0, start)}<span class="is-selected">${pre.innerHTML.slice(start, close)}</span>${pre.innerHTML.slice(close)}`;
        pre.querySelector(".is-selected").scrollIntoView({ block: "center" });
      }
    }
  } else if (node) {
    node.scrollIntoView({ block: "nearest" });
  }
}

function openInspector() {
  const tok = state.selected;
  const insp = $("#inspector");
  insp.hidden = false;
  const line = lineOfWord(tok.id);
  const lineNo = line ? state.data.columns.filter((c) => c.lines.length)[state.column].lines.indexOf(line) + 1 : "";
  $("#inspector-title").replaceChildren("Wort ", el("q", { text: tok.text || tok.orig || "" }), el("span", { class: "context", text: `fol. ${state.data.folio} Z. ${lineNo}` }));
  const body = $("#inspector-body");
  body.replaceChildren();

  const mixed = (tok.rend || []).includes("ligature") || /\n/.test(tok.text || "");
  const fields = el("div", { class: "fields" }, [
    field("Diplomatisch", tok.orig ?? tok.text ?? "", mixed ? "Enthält Binnen-Markup, Bearbeitung in der XML-Ansicht" : ""),
    field("Normalisiert", tok.norm ?? "", tok.norm === undefined ? "Kein @norm im Bestand" : ""),
  ]);
  body.append(fields);

  const actions = el("div", { class: "actions" }, [el("span", { text: "Markup" })]);
  for (const m of MARKUP) actions.append(markupAction(m));
  body.append(actions);

  body.append(registerSection(tok));
  body.append(apparatusSection(tok));
}

function field(label, value, note) {
  const f = el("label", { class: "field" }, [el("span", { text: label }), el("input", { type: "text", value })]);
  if (note) f.append(el("span", { class: "mixed", text: note }));
  return f;
}

function markupAction(m) {
  const wrap = el("div", { class: "act" });
  const btn = el("button", { type: "button", "aria-haspopup": "true", "aria-expanded": "false", text: `${m.label} ▾` });
  const list = el("ul", { class: "menu-list", role: "menu", hidden: "" });
  for (const v of m.values) list.append(el("li", { role: "none" }, [el("button", { class: "menu-item", type: "button", role: "menuitem", text: v, onclick: () => { closeMenus(); markUnsaved(); } })]));
  btn.addEventListener("click", () => { const open = btn.getAttribute("aria-expanded") === "true"; closeMenus(); if (!open) { btn.setAttribute("aria-expanded", "true"); list.hidden = false; } });
  wrap.append(btn, list);
  return wrap;
}

function registerEntries() {
  const reg = state.data.registers;
  const entries = [];
  const seen = new Set();
  const add = (type, id) => { const k = `${type}|${id.trim()}`; if (!seen.has(k) && id.trim()) { seen.add(k); entries.push({ type, id: id.trim() }); } };
  for (const [type, ids] of Object.entries(reg.codex || {})) for (const id of ids) add(type, id);
  for (const id of reg.places || []) add("place", id);
  for (const id of reg.persons || []) add("person", id);
  return entries.sort((a, b) => a.id.localeCompare(b.id, "de"));
}

function registerSection(tok) {
  const sec = el("div", { class: "register" });
  sec.append(el("div", { class: "group-title", text: "Register" }));
  const linked = el("div", { class: "linked" });
  if (tok.ref) linked.append(chipFor(`${tok.ref.type}|${tok.ref.target}`), el("button", { class: "link-btn", type: "button", text: "Verknüpfung lösen", onclick: markUnsaved }));
  else linked.append(el("span", { class: "empty-note", text: "Nicht verknüpft" }));
  sec.append(linked);
  const typeSel = el("select", { "aria-label": "Registertyp" }, [el("option", { value: "", text: "Alle" }), ...Object.entries(TYPE_LABEL).map(([v, t]) => el("option", { value: v, text: t }))]);
  const input = el("input", { type: "text", placeholder: "Eintrag suchen oder anlegen …", "aria-label": "Registereintrag", autocomplete: "off" });
  const list = el("ul", { class: "ac-list", role: "listbox", hidden: "" });
  const combo = el("div", { class: "combo" }, [typeSel, input]);
  sec.append(combo, list);
  const entries = registerEntries();
  const update = () => {
    const q = input.value.trim().toLowerCase();
    const type = typeSel.value;
    list.replaceChildren();
    if (!q) { list.hidden = true; return; }
    const hits = entries.filter((e) => (!type || e.type === type) && e.id.toLowerCase().includes(q)).slice(0, 8);
    for (const h of hits) list.append(el("li", { class: "ac-item", role: "option", onclick: () => { input.value = h.id; list.hidden = true; markUnsaved(); } }, [el("span", { text: h.id }), el("span", { class: "type", text: TYPE_LABEL[h.type] })]));
    if (!hits.some((h) => h.id.toLowerCase() === q)) list.append(el("li", { class: "ac-item is-new", role: "option", onclick: () => { list.hidden = true; markUnsaved(); } }, [el("span", { text: `„${input.value.trim()}“ als ${type ? TYPE_LABEL[type] : "Eintrag"} anlegen …` })]));
    list.hidden = false;
  };
  input.addEventListener("input", update);
  typeSel.addEventListener("change", update);
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") { list.hidden = true; e.stopPropagation(); } });
  return sec;
}

function apparatusSection(tok) {
  const sec = el("div", { class: "apparatus" });
  const apps = state.appsByWord.get(tok.id) || [];
  sec.append(el("div", { class: "group-title", text: apps.length ? `Apparat (${apps.length})` : "Apparat" }));
  const list = el("div", { class: "app-list" });
  for (const a of apps) {
    const entry = el("div", { class: "app-entry" }, [el("div", { class: "type", text: `${a.type}  ${a.from} → ${a.to}` })]);
    for (const [lang, text] of Object.entries(a.notes)) entry.append(el("p", {}, [el("span", { class: "lang", text: lang }), text]));
    list.append(entry);
  }
  sec.append(list, el("button", { class: "link-btn", type: "button", text: "+ Kommentar zur Auswahl", onclick: markUnsaved }));
  return sec;
}

function selectMiniature(zoneId) {
  const m = state.data.miniature;
  if (m.zone !== zoneId) return;
  state.selected = null;
  highlightSelection();
  const insp = $("#inspector");
  insp.hidden = false;
  $("#inspector-title").replaceChildren("Miniatur ", el("span", { class: "context", text: `${m.id}, fol. ${m.folio[1]} Z. ${m.folio[0]}` }));
  const body = $("#inspector-body");
  body.replaceChildren();
  const artists = Object.fromEntries(state.data.registers.artists);
  body.append(el("div", { class: "fields" }, [
    field("Titel", m.title || ""),
    field("Bildtyp", m.objectType || ""),
    field("Höhe in Zeilen", m.height || ""),
    field("Künstler", m.artists.map((a) => `${a} ${artists[a] || ""}`).join(", ")),
  ]));
  body.append(el("label", { class: "field" }, [el("span", { text: "Kurzbeschreibung" }), el("textarea", { text: m.short || "" })]));
  body.append(el("label", { class: "field" }, [el("span", { text: "Beschreibung" }), el("textarea", { text: m.long || "" })]));
  const persons = el("div", {}, [el("div", { class: "group-title", text: "Personen" }), el("div", { class: "tags" }, m.persons.map((p) => el("span", { class: "tag", text: p })))]);
  body.append(persons);
  const ic = el("div", {}, [el("div", { class: "group-title", text: "ICONCLASS" })]);
  const grid = el("div", { class: "iconclass" });
  for (const [uri, de, en] of m.iconclass) {
    grid.append(el("code", { text: uri.replace("https://iconclass.org/", "") }), el("span", {}, [el("span", { class: "lang", text: "de " }), de, el("br"), el("span", { class: "lang", text: "en " }), en]));
  }
  ic.append(grid, el("button", { class: "link-btn", type: "button", text: "ICONCLASS suchen …" }));
  body.append(ic);
  body.append(el("div", {}, [el("div", { class: "group-title", text: "Textbezug" }), el("p", { text: m.statistic || "" }), el("button", { class: "link-btn", type: "button", text: "Im Text zeigen", onclick: () => { const first = state.data.columns.find((c) => c.lines.length).lines[1].tokens.find((t) => t.type === "w"); if (first) select(first); } })]));
}

function switchDocument(which) {
  const isImages = which === "images";
  $("#status-file").textContent = isImages ? "Bildannotationen.xml" : "codex-2759.xml";
  $("#pager").hidden = isImages;
  if (isImages) {
    select(null);
    const host = $("#lines");
    host.replaceChildren(el("p", { class: "empty-note", text: "Miniaturen dieser Seite" }));
    const m = state.data.miniature;
    host.append(el("button", { class: "link-btn", type: "button", text: `${m.id}  ${m.title}`, onclick: () => selectMiniature(m.zone) }));
    setView("text");
  } else {
    renderLines();
  }
}

function closeInspector() {
  $("#inspector").hidden = true;
  if (state.selected) { state.selected = null; highlightSelection(); }
}

function markUnsaved() { $("#status-unsaved").hidden = false; }

main();
