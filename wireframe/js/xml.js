// XML view over state.data.xmlExcerpt, and the switch between Text and XML.
import { $, escapeHtml, shell, state } from "./state.js";
import { commit } from "./history.js";
import { highlightSelection, setWordRange } from "./flow.js";
import { notify } from "./notice.js";

// One tokenising pass over the raw source, so markup is never re-highlighted.
const XML_TOKEN = /<!--[\s\S]*?-->|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>|[^<]+/g;

// The view is a pure function of the source string, and word edits do not change it,
// so the DOM is rebuilt only when the string differs (load, formatting, its undo).
let renderedSource = null;

// xml:id and facs fold into a marker at the end of their start tag (F57), whose title
// holds them. "IDs anzeigen" (#xml.show-ids) unfolds them all; the selected word (its own
// attributes, class "own") and the anchors its comments point to (.xa.is-target, set by
// flow.js) unfold regardless. Display only: the source string stays as it is.
const FOLDED = new Set(["xml:id", "facs"]);

export function renderXml() {
  const source = state.data.xmlExcerpt;
  if (source === renderedSource) return;
  renderedSource = source;
  let html = "";
  for (const m of source.matchAll(XML_TOKEN)) {
    const [raw, close, name, attrs, selfClose] = m;
    if (!name) { html += raw.startsWith("<!--") ? `<span class="com">${escapeHtml(raw)}</span>` : escapeHtml(raw); continue; }
    const id = close ? null : (/xml:id="([^"]*)"/.exec(attrs) || [])[1];
    const word = name === "w" && id;
    const anchor = name === "anchor" && id;
    if (word) html += `<span class="xw" data-id="${escapeHtml(id)}">`;
    if (anchor) html += `<span class="xa" data-id="${escapeHtml(id)}">`;
    html += `&lt;${close}<span class="tag">${name}</span>`;
    const own = word ? " own" : "";
    let folded = "";
    for (const a of attrs.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
      const attr = ` <span class="attr">${a[1]}</span>=<span class="val">"${escapeHtml(a[2])}"</span>`;
      if (!FOLDED.has(a[1])) { html += attr; continue; }
      html += `<span class="fold${own}">${attr}</span>`;
      folded += ` ${a[1]}="${a[2]}"`;
    }
    if (folded) html += `<span class="fold-mark${own}" title="${escapeHtml(folded.trim())}"> …</span>`;
    html += `${selfClose}&gt;`;
    if (anchor) html += "</span>";
    if (name === "w" && (close || selfClose)) html += "</span>";
  }
  $("#xml").innerHTML = html;
}

// The toolbar switch "IDs anzeigen", shown in the XML view only.
export function toggleIds() {
  state.ids = !state.ids;
  $("#xml").classList.toggle("show-ids", state.ids);
}

// Deterministic formatter for the excerpt: empty elements self-close, two-space
// indentation, one element per line. Elements with text content stay on one line,
// because breaking mixed content would change the transcription. Whitespace-only
// text nodes are dropped; the real tool needs xml:space awareness here.
function formatted(source) {
  const root = { children: [] };
  const stack = [root];
  for (const m of source.matchAll(XML_TOKEN)) {
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
  return root.children.map((c) => block(c, 0)).join("\n");
}

export function formatXml() {
  commit("XML formatieren", (data) => { data.xmlExcerpt = formatted(data.xmlExcerpt); }); // rerender in app.js redraws the view
  highlightSelection();
  notify("Formatierung ist eine Änderung am ganzen Dokument und wird erst beim Speichern wirksam.");
  if (state.view !== "xml") setView("xml");
}

// Both documents share the view switch. The codex shows its flow or the excerpt; the
// image annotations show their item list, and in XML the empty state, because their
// source file is not part of the wireframe's extraction.
export function setView(view) {
  const keep = state.sel;
  const images = $("#doc-select").value === "images";
  state.view = view;
  for (const b of document.querySelectorAll("[data-view]")) b.classList.toggle("is-active", b.dataset.view === view);
  $("#flow").hidden = view !== "text" || images;
  $("#minis").hidden = view !== "text" || !images;
  $("#xml-view").hidden = view !== "xml";
  for (const n of document.querySelectorAll("#xml-view [data-doc]")) n.hidden = n.dataset.doc !== (images ? "images" : "codex");
  $("#column-switch").hidden = view === "xml"; // the excerpt is the whole page
  $("#toggle-ids").hidden = view !== "xml" || images;
  for (const b of document.querySelectorAll("[data-view]")) b.setAttribute("aria-pressed", String(b.dataset.view === view));
  $("#popover-xml").textContent = view === "xml" ? "Im Text zeigen" : "XML-Stelle";
  state.sel = keep;
  highlightSelection();
  if (view === "text" && keep && !images) setWordRange(keep.from, keep.to);
  shell.dispatchEvent(new Event("view"));
}
