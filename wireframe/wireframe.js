// Static wireframe of the Wenzelsbibel editor on real fol. 1r data.
// The text area is an editable flow with a real caret; edits change the visible
// word only and are never persisted. Data: ../data/wireframe/fol-1r.json
// (ignored by Git, extracted from the public ONB TEI).

const DATA_URL = "../data/wireframe/fol-1r.json";
const OSD_IMAGES = "../docs/vendor/openseadragon/images/";
const IIIF_WIDTH = 900;
const SVG_NS = "http://www.w3.org/2000/svg";

const MENUS = [
  { label: "Datei", items: ["Öffnen …", "Projektordner öffnen …", "-", ["Speichern", "Strg+S"], "Arbeitskopie sichern", "-", "Zuletzt geöffnet"] },
  { label: "Bearbeiten", items: [["Rückgängig", "Strg+Z"], ["Wiederholen", "Strg+Y"], "-", ["Suchen", "Strg+F"], "-", "Apparatkommentar zur Auswahl", ["Element für Auswahl …", "Strg+E"], "-", "XML formatieren"] },
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

const state = {
  data: null, column: 0, view: "text", facs: false, running: false,
  words: [],          // rendered words of the current column: { tok, line, lineNo, node }
  sel: null,          // { from, to } indices into state.words
  quiet: false,       // inspector closed by the user; caret moves do not reopen it until the next click or key
  appsByWord: new Map(), xmlSource: "", findings: null, viewer: null, diplo: null,
};

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
const island = (cls, text, attrs = {}) => el("span", { class: cls, contenteditable: "false", text, ...attrs });
const columns = () => state.data.columns.filter((c) => c.lines.length);
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const graphemes = new Intl.Segmenter("de", { granularity: "grapheme" });

async function main() {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    $("#flow").replaceWith(el("p", { class: "empty-note", text: "Die Datei data/wireframe/fol-1r.json fehlt. Sie wird aus dem öffentlichen TEI des Codex erzeugt und liegt außerhalb des Repositories." }));
    return;
  }
  state.data = await res.json();
  state.xmlSource = state.data.xmlExcerpt;
  buildMenus();
  indexApparatus();
  renderFlow();
  renderXml();
  wireFlow();
  wireControls();
}

// Menus and Escape

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
  // Capture phase, so the facsimile viewer's own key handling cannot swallow Escape.
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") onEscape(e); }, true);
}

function closeMenus() {
  for (const b of document.querySelectorAll('.menus [aria-expanded="true"], .act > [aria-expanded="true"]')) { b.setAttribute("aria-expanded", "false"); b.nextElementSibling.hidden = true; }
}

function menuAction(menu, label) {
  if (menu === "Ansicht") {
    if (label === "Text" || label === "XML") setView(label.toLowerCase());
    if (label === "Faksimile") setFacs(!state.facs);
    if (label === "Zonen") { const t = $("#zones-toggle"); t.checked = !t.checked; toggleZones(t.checked); }
    if (label === "Auswahl") $("#inspector").hidden ? (state.sel && openInspector()) : closeInspector();
    if (label === "Zeilenweise" || label === "Fließtext") { state.running = label === "Fließtext"; $("#flow").classList.toggle("is-running", state.running); }
  }
  if (menu === "Bearbeiten" && label === "XML formatieren") formatXml();
  if (menu === "Prüfen") runCheck(label);
}

// Agreed order: autocomplete, menus, inspector, selection. Each step closes one layer.
function onEscape(e) {
  const ac = document.querySelector(".ac-list:not([hidden])");
  if (ac) { ac.hidden = true; e.preventDefault(); return; }
  if (document.querySelector('.menus [aria-expanded="true"], .act > [aria-expanded="true"]')) {
    const origin = document.querySelector('.menus [aria-expanded="true"], .act > [aria-expanded="true"]');
    closeMenus(); origin.focus(); return;
  }
  if (!$("#inspector").hidden) { closeInspector(); return; }
  if (state.sel) {
    const s = getSelection();
    if (s.rangeCount && $("#flow").contains(s.anchorNode)) s.collapseToStart();
    state.sel = null; state.quiet = true; highlightSelection();
  }
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
        } else if (tok.type === "w" && open.size) {
          state.appsByWord.set(tok, [...open.values()]);
        }
      }
    }
  }
}

// Text flow: one editable run per column, manuscript lines as soft breaks,
// structure (line numbers, punctuation, milestones, chips) as non-editable islands.

function renderFlow() {
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

const refKey = (tok) => (tok && tok.ref ? `${tok.ref.type}|${tok.ref.target}` : null);

function chipFor(key) {
  const [type, target] = key.split("|");
  return island(`chip type-${type.toLowerCase()}`, `${TYPE_LABEL[type.toLowerCase()] || type}: ${target.trim()}`);
}

function wordNode(tok, k) {
  const classes = ["w"];
  for (const r of tok.rend || []) classes.push(`rend-${r}`);
  if (tok.supplied) classes.push("is-supplied");
  if (tok.unclear) classes.push("is-unclear");
  if (tok.damage) classes.push("is-damage");
  if (state.appsByWord.has(tok)) classes.push("in-app");
  return el("span", { class: classes.join(" "), "data-k": String(k), "data-id": tok.id || "", text: tok.text || tok.orig || "" });
}

// Caret and selection mapping

function wireFlow() {
  const flow = $("#flow");
  let timer = 0;
  document.addEventListener("selectionchange", () => { clearTimeout(timer); timer = setTimeout(readSelection, 90); });
  flow.addEventListener("mousedown", (e) => {
    state.quiet = false;
    const ln = e.target.closest(".ln");
    if (ln) { e.preventDefault(); selectLine(ln.dataset.line); return; }
    // A press inside a selection would start a native text drag; start a new selection instead.
    const sel = getSelection();
    if (!e.shiftKey && !sel.isCollapsed && inFlow(sel)) sel.collapseToStart();
  });
  flow.addEventListener("mouseup", () => snapSelection(false));
  flow.addEventListener("keydown", (e) => { if (!["Escape", "Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) state.quiet = false; });
  flow.addEventListener("keyup", (e) => {
    if ((e.shiftKey && e.key.startsWith("Arrow")) || e.key === "Shift") snapSelection(true);
  });
  flow.addEventListener("beforeinput", onBeforeInput);
  flow.addEventListener("dragstart", (e) => e.preventDefault()); // moving text is a structural edit
}

// A point maps to the word it lies in, or to the word it touches from a gap.
function wordAt(node, offset) {
  const host = (node.nodeType === 3 ? node.parentElement : node).closest(".w");
  if (host) return { w: host, off: node.nodeType === 3 ? offset : (offset ? host.textContent.length : 0) };
  const before = node.nodeType === 3 ? (offset === 0 ? node.previousSibling : null) : node.childNodes[offset - 1];
  const after = node.nodeType === 3 ? (offset === node.length ? node.nextSibling : null) : node.childNodes[offset];
  if (before && before.classList && before.classList.contains("w")) return { w: before, off: before.textContent.length };
  if (after && after.classList && after.classList.contains("w")) return { w: after, off: 0 };
  return null;
}

function inFlow(sel) {
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
  const same = state.sel && state.sel.from === ks[0] && state.sel.to === ks[1];
  state.sel = { from: ks[0], to: ks[1] };
  highlightSelection();
  if (!same || $("#inspector").hidden) openInspector(); else refreshTitle();
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

function setWordRange(from, to, forward = true) {
  const a = state.words[from].node.firstChild;
  const b = state.words[to].node.firstChild;
  if (forward) getSelection().setBaseAndExtent(a, 0, b, b.length);
  else getSelection().setBaseAndExtent(b, b.length, a, 0);
}

function placeCaret(k) {
  const flow = $("#flow");
  state.quiet = false;
  flow.focus({ preventScroll: true });
  const t = state.words[k].node.firstChild;
  getSelection().setBaseAndExtent(t, 0, t, 0);
  state.words[k].node.scrollIntoView({ block: "center" });
}

function selectLine(lineId) {
  const ks = state.words.filter((w) => w.line.id === lineId).map((w) => Number(w.node.dataset.k));
  if (!ks.length) return;
  $("#flow").focus({ preventScroll: true });
  setWordRange(ks[0], ks[ks.length - 1]);
}

// Editing stays inside one word: every input is handled here, so the browser
// never splits spans, deletes islands or inserts line breaks. Structural edits
// (new words, deletions across words) belong to the inspector and the XML view.
// IME composition cannot be cancelled and is not covered by the wireframe.
function onBeforeInput(e) {
  e.preventDefault();
  const sel = getSelection();
  if (!inFlow(sel)) return;
  const r = sel.getRangeAt(0);
  const a = wordAt(r.startContainer, r.startOffset);
  const b = wordAt(r.endContainer, r.endOffset);
  if (!a || !b || a.w !== b.w) return;
  const node = a.w.firstChild;
  const text = node.data;
  let [s, t] = [a.off, b.off];
  let insert = "";
  if (e.inputType === "insertText" || e.inputType === "insertReplacementText" || e.inputType === "insertFromPaste") {
    insert = (e.data ?? (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "")).replace(/\s+/g, "");
    if (!insert) return;
  } else if (e.inputType === "deleteContentBackward" || e.inputType === "deleteContentForward") {
    if (s === t && e.inputType === "deleteContentBackward") s = [...graphemes.segment(text)].map((g) => g.index).filter((i) => i < s).pop() ?? s;
    if (s === t && e.inputType === "deleteContentForward") { const g = [...graphemes.segment(text)].find((x) => x.index >= t); if (g) t = g.index + g.segment.length; }
    if (s === t) return;
  } else return;
  const next = text.slice(0, s) + insert + text.slice(t);
  if (!next) return; // deleting a whole word is a structural edit
  node.data = next;
  sel.setBaseAndExtent(node, s + insert.length, node, s + insert.length);
  state.words[Number(a.w.dataset.k)].tok.text = next;
  if (state.diplo && state.sel && state.sel.from === state.sel.to && state.words[state.sel.from].node === a.w) state.diplo.value = next;
  markUnsaved();
  refreshTitle();
}

// Highlighting across text, facsimile and XML

function selectedWords() { return state.sel ? state.words.slice(state.sel.from, state.sel.to + 1) : []; }

function highlightSelection() {
  for (const n of document.querySelectorAll(".w.is-current, .ln.is-current, .zone.is-current, .xml .is-selected")) n.classList.remove(n.closest(".xml") ? "is-selected" : "is-current");
  const words = selectedWords();
  const lines = new Set(words.map((w) => w.line));
  for (const w of words) w.node.classList.add("is-current");
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

// XML view: one tokenising pass over the raw source, so markup is never re-highlighted.

const XML_TOKEN = /<!--[\s\S]*?-->|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>|[^<]+/g;

function renderXml() {
  let html = "";
  for (const m of state.xmlSource.matchAll(XML_TOKEN)) {
    const [raw, close, name, attrs, selfClose] = m;
    if (!name) { html += raw.startsWith("<!--") ? `<span class="com">${escapeHtml(raw)}</span>` : escapeHtml(raw); continue; }
    const id = name === "w" && !close ? (/xml:id="([^"]*)"/.exec(attrs) || [])[1] : null;
    if (id) html += `<span class="xw" data-id="${escapeHtml(id)}">`;
    html += `&lt;${close}<span class="tag">${name}</span>`;
    for (const a of attrs.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) html += ` <span class="attr">${a[1]}</span>=<span class="val">"${escapeHtml(a[2])}"</span>`;
    html += `${selfClose}&gt;`;
    if (name === "w" && (close || selfClose)) html += "</span>";
  }
  $("#xml").innerHTML = html;
}

// Deterministic formatter for the excerpt: empty elements self-close, two-space
// indentation, one element per line. Elements with text content stay on one line,
// because breaking mixed content would change the transcription. Whitespace-only
// text nodes are dropped; the real tool needs xml:space awareness here.
function formatXml() {
  const root = { children: [] };
  const stack = [root];
  for (const m of state.xmlSource.matchAll(XML_TOKEN)) {
    const [raw, close, name, attrs, selfClose] = m;
    const top = stack[stack.length - 1];
    if (!name) { if (raw.trim()) top.children.push(raw.startsWith("<!--") ? { comment: raw } : { text: raw }); continue; }
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    const node = { name, attrs: attrs.trim().replace(/\s+(?=[\w:.-]+=")/g, " "), children: [] };
    top.children.push(node);
    if (!selfClose) stack.push(node);
  }
  const open = (n) => `<${n.name}${n.attrs ? ` ${n.attrs}` : ""}`;
  const inline = (n) => n.text ?? n.comment ?? (n.children.length ? `${open(n)}>${n.children.map(inline).join("")}</${n.name}>` : `${open(n)}/>`);
  const block = (n, depth) => {
    const pad = "  ".repeat(depth);
    if (n.text !== undefined || n.comment !== undefined || !n.children.length || n.children.some((c) => c.text !== undefined)) return `${pad}${inline(n)}`;
    return [`${pad}${open(n)}>`, ...n.children.map((c) => block(c, depth + 1)), `${pad}</${n.name}>`].join("\n");
  };
  state.xmlSource = root.children.map((c) => block(c, 0)).join("\n");
  renderXml();
  highlightSelection();
  $("#xml-note").hidden = false;
  markUnsaved();
  if (state.view !== "xml") setView("xml");
}

// Facsimile: OpenSeadragon on the IIIF info.json, zones as one SVG overlay in
// image pixels so they scale with zoom. Without the library the static image stays.

function initFacsimile() {
  const { image } = state.data;
  const frame = $("#facs-frame");
  const svg = zoneLayer();
  if (!window.OpenSeadragon) {
    frame.classList.add("is-static");
    frame.append(el("img", { src: `${image.iiif}/full/${IIIF_WIDTH},/0/default.jpg`, alt: "" }), svg);
    return;
  }
  const viewer = window.OpenSeadragon({
    element: frame, prefixUrl: OSD_IMAGES, tileSources: `${image.iiif}/info.json`,
    showNavigationControl: true, gestureSettingsMouse: { clickToZoom: false }, crossOriginPolicy: "Anonymous",
  });
  viewer.addHandler("open", () => {
    viewer.addOverlay({ element: svg, location: viewer.viewport.imageToViewportRectangle(0, 0, image.width, image.height) });
    highlightSelection();
  });
  // The viewer captures the pointer, so polygons never receive the click; hit-test instead.
  viewer.addHandler("canvas-click", (e) => {
    if (!e.quick) return;
    const z = document.elementsFromPoint(e.originalEvent.clientX, e.originalEvent.clientY).find((n) => n.classList && n.classList.contains("zone"));
    if (z) zoneClick(z);
  });
  viewer.addHandler("open-failed", () => frame.replaceChildren(el("p", { class: "empty-note", text: "Das Faksimile konnte vom Bildserver der ÖNB nicht geladen werden. Text und Inspector bleiben nutzbar." })));
  state.viewer = viewer;
}

function zoneLayer() {
  const { image, zones } = state.data;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.id = "zones";
  svg.setAttribute("viewBox", `0 0 ${image.width} ${image.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.toggleAttribute("hidden", !$("#zones-toggle").checked);
  for (const z of zones) {
    if (!z.points) continue;
    const p = document.createElementNS(SVG_NS, "polygon");
    p.setAttribute("points", z.points);
    p.setAttribute("class", `zone type-${z.type}${z.subtype ? ` sub-${z.subtype}` : ""}`);
    p.dataset.id = z.id;
    p.addEventListener("click", () => zoneClick(p)); // static fallback only
    svg.append(p);
  }
  return svg;
}

function zoneClick(p) {
  if (p.classList.contains("type-Line")) jumpToLine(p.dataset.id);
  else if (p.classList.contains("sub-img_miniature")) selectMiniature(p.dataset.id);
}

function toggleZones(on) { const svg = $("#zones"); if (svg) svg.toggleAttribute("hidden", !on); }

function jumpToLine(zoneId) {
  const ci = columns().findIndex((c) => c.lines.some((l) => (l.facs || "").replace("#", "") === zoneId));
  if (ci < 0) return;
  if (state.view !== "text") setView("text");
  if (ci !== state.column) setColumn(ci);
  const k = state.words.findIndex((w) => (w.line.facs || "").replace("#", "") === zoneId);
  if (k >= 0) placeCaret(k);
}

// Controls

function wireControls() {
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => setView(b.dataset.view));
  for (const b of document.querySelectorAll("[data-column]")) b.addEventListener("click", () => setColumn(Number(b.dataset.column)));
  $("#toggle-facs").addEventListener("click", () => setFacs(!state.facs));
  $("#zones-toggle").addEventListener("change", (e) => toggleZones(e.target.checked));
  $("#inspector-close").addEventListener("click", closeInspector);
  $("#inspector-xml").addEventListener("click", () => setView(state.view === "xml" ? "text" : "xml"));
  $("#xml-format").addEventListener("click", formatXml);
  $("#doc-select").addEventListener("change", (e) => switchDocument(e.target.value));
  $("#prev-folio").disabled = true;
  $("#next-folio").disabled = true;
}

function setColumn(i) {
  state.column = i;
  for (const x of document.querySelectorAll("[data-column]")) x.classList.toggle("is-active", Number(x.dataset.column) === i);
  closeInspector();
  renderFlow();
  highlightSelection();
}

function setView(view) {
  const keep = state.sel;
  state.view = view;
  for (const b of document.querySelectorAll("[data-view]")) b.classList.toggle("is-active", b.dataset.view === view);
  $("#flow").hidden = view !== "text";
  $("#xml-view").hidden = view !== "xml";
  $("#column-switch").hidden = view === "xml"; // the excerpt is the whole page
  $("#inspector-xml").textContent = view === "xml" ? "Im Text zeigen" : "XML-Stelle";
  state.sel = keep;
  highlightSelection();
  if (view === "text" && keep) setWordRange(keep.from, keep.to);
}

function setFacs(on) {
  state.facs = on;
  $("#facs-pane").hidden = !on;
  $("#work").classList.toggle("has-facs", on);
  $("#toggle-facs").setAttribute("aria-pressed", String(on));
  if (on && !$("#zones")) initFacsimile();
  highlightSelection();
}

// Inspector

function openInspector() {
  const words = selectedWords();
  if (!words.length) return;
  const wasHidden = $("#inspector").hidden;
  $("#inspector").hidden = false;
  if (wasHidden && state.view === "text") words[0].node.scrollIntoView({ block: "nearest" }); // the pane just got shorter
  refreshTitle();
  const body = $("#inspector-body");
  body.replaceChildren();
  state.diplo = null;
  if (words.length === 1) {
    const tok = words[0].tok;
    const mixed = (tok.rend || []).includes("ligature") || /\n/.test(tok.text || "");
    const fields = el("div", { class: "fields" }, [
      field("Diplomatisch", tok.orig ?? tok.text ?? "", mixed ? "Enthält Binnen-Markup, Bearbeitung in der XML-Ansicht" : ""),
      field("Normalisiert", tok.norm ?? "", tok.norm === undefined ? "Kein @norm im Bestand" : ""),
    ]);
    state.diplo = fields.querySelector("input");
    body.append(fields);
  }
  const actions = el("div", { class: "actions" }, [el("span", { text: "Markup" })]);
  for (const m of MARKUP) actions.append(markupAction(m));
  body.append(actions);
  const refs = new Set(words.map((w) => refKey(w.tok)));
  body.append(registerSection(refs.size === 1 ? words[0].tok.ref : null));
  body.append(apparatusSection([...new Set(words.flatMap((w) => state.appsByWord.get(w.tok) || []))]));
}

function refreshTitle() {
  const words = selectedWords();
  if (!words.length) return;
  const first = words[0];
  const last = words[words.length - 1];
  const at = (w) => (w.lineNo === "Kopfzeile" ? "Kopfzeile" : `Z. ${w.lineNo}`);
  const text = (w) => w.node.textContent;
  const title = $("#inspector-title");
  if (words.length === 1) {
    title.replaceChildren("Wort ", el("q", { text: text(first) }), el("span", { class: "context", text: `fol. ${state.data.folio} ${"ab"[state.column]} ${at(first)}` }));
  } else {
    const span = first.lineNo === last.lineNo ? at(first) : `${at(first)} bis ${at(last)}`;
    title.replaceChildren("Wortfolge ", el("q", { text: `${text(first)} … ${text(last)}` }), el("span", { class: "context", text: `${words.length} Wörter, fol. ${state.data.folio} ${"ab"[state.column]} ${span}` }));
  }
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

function registerSection(ref) {
  const sec = el("div", { class: "register" });
  sec.append(el("div", { class: "group-title", text: "Register" }));
  const linked = el("div", { class: "linked" });
  if (ref) linked.append(chipFor(`${ref.type}|${ref.target}`), el("button", { class: "link-btn", type: "button", text: "Verknüpfung lösen", onclick: markUnsaved }));
  else linked.append(el("span", { class: "empty-note", text: "Nicht verknüpft" }));
  sec.append(linked);
  const typeSel = el("select", { "aria-label": "Registertyp" }, [el("option", { value: "", text: "Alle" }), ...Object.entries(TYPE_LABEL).map(([v, t]) => el("option", { value: v, text: t }))]);
  const input = el("input", { type: "text", placeholder: "Eintrag suchen oder anlegen …", "aria-label": "Registereintrag", autocomplete: "off" });
  const list = el("ul", { class: "ac-list", role: "listbox", hidden: "" });
  sec.append(el("div", { class: "combo" }, [typeSel, input]), list);
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
  return sec;
}

function apparatusSection(apps) {
  const sec = el("div", { class: "apparatus" });
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
  state.sel = null;
  highlightSelection();
  $("#inspector").hidden = false;
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
  body.append(el("div", {}, [el("div", { class: "group-title", text: "Personen" }), el("div", { class: "tags" }, m.persons.map((p) => el("span", { class: "tag", text: p })))]));
  const ic = el("div", {}, [el("div", { class: "group-title", text: "ICONCLASS" })]);
  const grid = el("div", { class: "iconclass" });
  for (const [uri, de, en] of m.iconclass) {
    grid.append(el("code", { text: uri.replace("https://iconclass.org/", "") }), el("span", {}, [el("span", { class: "lang", text: "de " }), de, el("br"), el("span", { class: "lang", text: "en " }), en]));
  }
  ic.append(grid, el("button", { class: "link-btn", type: "button", text: "ICONCLASS suchen …" }));
  body.append(ic);
  body.append(el("div", {}, [el("div", { class: "group-title", text: "Textbezug" }), el("p", { text: m.statistic || "" }), el("button", { class: "link-btn", type: "button", text: "Im Text zeigen", onclick: showMiniatureText })]));
}

function showMiniatureText() {
  if ($("#doc-select").value !== "codex") { $("#doc-select").value = "codex"; switchDocument("codex"); }
  if (state.view !== "text") setView("text");
  if (state.column !== 0) setColumn(0);
  const k = state.words.findIndex((w) => w.lineNo === "1");
  if (k >= 0) placeCaret(k);
}

function switchDocument(which) {
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

function closeInspector() {
  const insp = $("#inspector");
  if (insp.hidden) return;
  const hadFocus = insp.contains(document.activeElement);
  insp.hidden = true;
  state.quiet = true;
  if (hadFocus && state.view === "text" && !$("#flow").hidden) $("#flow").focus({ preventScroll: true });
}

function markUnsaved() { $("#status-unsaved").hidden = false; }

// Checks: no permanent status line. A notice appears only when there is something
// to act on; a clean run is announced to assistive technology and leaves no bar.
// Simulated: "Schematron review" reports the real words without @xml:id on this
// page as findings; the rule itself is a stand-in for the project schema.

function runCheck(label) {
  if (label === "Befundliste") { if (state.findings) showFindings(); else announce("Noch keine Prüfung gelaufen."); return; }
  if (label !== "Schematron review") { state.findings = null; $("#notice").hidden = true; announce(`${label}: keine Befunde.`); return; }
  state.findings = [];
  columns().forEach((col, ci) => {
    let n = 0;
    for (const line of col.lines) {
      const header = line.tokens.some((t) => t.fw === "header");
      if (!header) n++;
      for (const tok of line.tokens) if (tok.type === "w" && !tok.id) state.findings.push({ ci, line, tok, where: `fol. ${state.data.folio} ${"ab"[ci]} ${header ? "Kopfzeile" : `Z. ${n}`}`, message: `Wort „${tok.text}“ ohne @xml:id` });
    }
  });
  const f = state.findings;
  const bar = $("#notice");
  if (!f.length) { bar.hidden = true; announce("Schematron review: keine Befunde."); return; }
  bar.replaceChildren(
    el("strong", { text: `Schematron review: ${f.length} ${f.length === 1 ? "Befund" : "Befunde"}` }),
    el("span", { text: `${f[0].message}, ${f[0].where}` }),
    el("button", { type: "button", class: "act-btn", text: "Befunde anzeigen", onclick: showFindings }),
  );
  bar.hidden = false;
}

function showFindings() {
  $("#inspector").hidden = false;
  $("#inspector-title").replaceChildren("Befunde ", el("span", { class: "context", text: "Schematron review" }));
  const list = el("ul", { class: "findings" });
  for (const f of state.findings) {
    list.append(el("li", {}, [
      el("span", { text: f.message }),
      el("button", { type: "button", class: "link-btn", text: f.where, onclick: () => jumpToFinding(f) }),
    ]));
  }
  $("#inspector-body").replaceChildren(list);
  list.querySelector("button")?.focus();
}

function jumpToFinding(f) {
  if (state.view !== "text") setView("text");
  if (f.ci !== state.column) setColumn(f.ci);
  const k = state.words.findIndex((w) => w.tok === f.tok);
  if (k >= 0) placeCaret(k);
}

function announce(text) { const a = $("#announce"); a.textContent = ""; requestAnimationFrame(() => { a.textContent = text; }); }

main();
