// XML view over state.data.xmlExcerpt, and the switch between Text and XML.
import { $, escapeHtml, state } from "./state.js";
import { commit } from "./history.js";
import { highlightSelection, setWordRange } from "./flow.js";

// One tokenising pass over the raw source, so markup is never re-highlighted.
const XML_TOKEN = /<!--[\s\S]*?-->|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>|[^<]+/g;

export function renderXml() {
  let html = "";
  for (const m of state.data.xmlExcerpt.matchAll(XML_TOKEN)) {
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
  commit("XML formatieren", (data) => { data.xmlExcerpt = formatted(data.xmlExcerpt); });
  renderXml();
  highlightSelection();
  $("#xml-note").hidden = false;
  if (state.view !== "xml") setView("xml");
}

export function setView(view) {
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
