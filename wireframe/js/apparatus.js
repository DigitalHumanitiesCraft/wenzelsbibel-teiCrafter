// Apparatus (phase 2 owner: apparatus): the index of anchored ranges, the comments
// covering a selection with editable notes (US2.2, F42) and the comment form (US2.1, F41).
import { $, el, state } from "./state.js";
import { commit } from "./history.js";
import { selectedWords, wordDecorators } from "./flow.js";
import { hideNote, inspectorNote, openInspector, sections } from "./inspector.js";
import { actions } from "./menu.js";
import { notify } from "./notice.js";

// The two types the form offers (specification US2.1); other types in the data are shown as they are.
const TYPES = [["comment_edition", "Editionskommentar"], ["comment_understanding", "Verständniskommentar"]];
const TYPE_NAME = Object.fromEntries(TYPES);
const LANGS = [["de", "Deutsch"], ["en", "Englisch"]];

// Word ranges of the apps on this page, by app object, in page-wide word order.
let ranges = new Map();
let rangeEnds = new Set(); // last word of every range
let wordOrder = new Map(); // token => page-wide word ordinal
// Apps with one anchor missing from the page, by app object: "from" or "to".
export const unresolved = new Map();

// Rebuilt from state.data after every commit, undo and redo, because the maps are
// keyed by token and app objects, which undo and redo replace.
// An anchor with inWord precedes its word in the token list but sits inside it in
// the source, so an end anchor with inWord closes its range only after that word.
// An app with one anchor missing from the page is bound to the word next to the
// anchor that is present, rather than to the page edge: start_9748 of the app
// ending at end_42705 occurs nowhere in codex.xml, so the page edge would claim a
// range the source does not have. The real tool resolves anchors document-wide.
export function indexApparatus() {
  const data = state.data;
  state.appsByWord = new Map();
  ranges = new Map();
  rangeEnds = new Set();
  wordOrder = new Map();
  unresolved.clear();
  const byStart = new Map();
  const byEnd = new Map();
  for (const a of data.apparatus) {
    if (a.from) byStart.set(a.from, a);
    if (a.to) byEnd.set(a.to, a);
  }
  const tokens = data.columns.flatMap((c) => c.lines.flatMap((l) => l.tokens));
  const words = tokens.filter((t) => t.type === "w");
  const present = new Set(tokens.filter((t) => t.type === "anchor").map((t) => t.id));
  const open = new Set();
  let deferred = [];
  let n = 0;
  const cover = (app, k) => {
    const list = state.appsByWord.get(words[k]) || [];
    if (!list.includes(app)) state.appsByWord.set(words[k], [...list, app]);
  };
  for (const tok of tokens) {
    if (tok.type === "anchor") {
      const start = byStart.get(tok.id);
      if (start) {
        open.add(start);
        ranges.set(start, { first: n, last: n - 1 });
        if (!present.has(start.to)) { unresolved.set(start, "to"); deferred.push(start); }
      }
      const end = byEnd.get(tok.id);
      if (end && !present.has(end.from)) {
        unresolved.set(end, "from");
        if (tok.inWord) { open.add(end); ranges.set(end, { first: n, last: n - 1 }); deferred.push(end); }
        else if (n > 0) { ranges.set(end, { first: n - 1, last: n - 1 }); cover(end, n - 1); rangeEnds.add(words[n - 1]); }
      } else if (end && tok.inWord) deferred.push(end);
      else if (end) close(end);
      continue;
    }
    if (tok.type !== "w") continue;
    wordOrder.set(tok, n);
    for (const a of open) { cover(a, n); ranges.get(a).last = n; }
    for (const a of deferred) close(a);
    deferred = [];
    n++;
  }

  function close(app) {
    if (!open.delete(app)) return;
    const r = ranges.get(app);
    if (r.last >= r.first) rangeEnds.add(words[r.last]);
  }
}

// Marks words inside a range in the flow: class in-app (dotted underline), app-end
// (marker after the range's last word) and a title naming the comments.
function markWord(tok, node) {
  const apps = state.appsByWord.get(tok);
  node.classList.toggle("in-app", Boolean(apps));
  node.classList.toggle("app-end", rangeEnds.has(tok));
  if (apps) node.title = `Apparat: ${apps.map(typeName).join("; ")}`;
  else node.removeAttribute("title");
}
wordDecorators.push(markWord);

// After a commit app.js does not re-render the flow, so the marks are refreshed in place.
function refreshMarks() { for (const w of state.words) markWord(w.tok, w.node); }

const typeName = (a) => (a.type ? TYPE_NAME[a.type] || a.type : "ohne Typ");

// Why the selection cannot take anchors, or null. Anchors go before the first and
// after the last selected word, outside the w elements, so the inner markup of a
// boundary word (ligature hi, lb, choice, as in NB with end_43591 after it) is never
// split, and ranges of other comments may overlap, since anchors are empty milestones.
// A whole-word selection therefore always takes anchors; AC4 of US2.1 has no case in
// this model. Deliberate shortcut: an anchor inside a word, as the codex sets around
// "got", cannot be placed here and goes through the XML view; the real tool decides
// where an anchor may stand on the source XML.
function refusal(words) {
  if (!words.length) return "Für einen Apparatkommentar zuerst ein Wort oder eine Wortfolge im Text auswählen.";
  return null;
}

// Next free pair in the data's start_N/end_N pattern, above every N in use.
function nextIds(data) {
  const ids = new Set();
  for (const c of data.columns) for (const l of c.lines) for (const t of l.tokens) if (t.id) ids.add(t.id);
  for (const ap of data.apparatus) { if (ap.from) ids.add(ap.from); if (ap.to) ids.add(ap.to); }
  let max = 0;
  for (const id of ids) { const m = /^(?:start|end)_(\d+)$/.exec(id); if (m) max = Math.max(max, Number(m[1])); }
  let n = max + 1;
  while (ids.has(`start_${n}`) || ids.has(`end_${n + 1}`)) n++;
  return [`start_${n}`, `end_${n + 1}`];
}

// Inserts the anchors around the words. Anchors already at the same gap are kept
// in nesting order: a range nested in the new one stays inside it, as do the
// in-word anchors of the first word.
function insertAnchors(words, startId, endId) {
  const firstTok = words[0].tok;
  const lastTok = words[words.length - 1].tok;
  const a = wordOrder.get(firstTok);
  const b = wordOrder.get(lastTok);
  const appOf = (id, key) => state.data.apparatus.find((ap) => ap[key] === id);
  const endTokens = words[words.length - 1].line.tokens;
  let j = endTokens.indexOf(lastTok) + 1;
  while (j < endTokens.length && endTokens[j].type === "anchor" && !endTokens[j].inWord) {
    const r = ranges.get(appOf(endTokens[j].id, "to"));
    if (!r || r.first < a) break;
    j++;
  }
  endTokens.splice(j, 0, { type: "anchor", id: endId, inWord: null });
  const startTokens = words[0].line.tokens;
  let i = startTokens.indexOf(firstTok);
  while (i > 0 && startTokens[i - 1].type === "anchor") {
    const prev = startTokens[i - 1];
    const r = ranges.get(appOf(prev.id, "from"));
    if (!(prev.inWord && prev.inWord === firstTok.id) && !(r && r.last <= b)) break;
    i--;
  }
  startTokens.splice(i, 0, { type: "anchor", id: startId, inWord: null });
}

// Comment form state: the open form belongs to one selection and keeps its draft
// across inspector rebuilds (undo, redo, view switch) while that selection holds.
let form = null;
let lastSigle = "";
const selKey = () => (state.sel ? `${state.column}:${state.sel.from}-${state.sel.to}` : null);

export function openCommentForm() {
  if (!state.sel || !selectedWords().length) { notify(refusal([])); return; }
  // The state "Zeile" has no sections; the same words continue as a word sequence.
  if (state.sel.line) state.sel = { ...state.sel, line: null };
  if (!form || form.key !== selKey()) form = { key: selKey(), type: TYPES[0][0], de: "", en: "", sigle: lastSigle };
  showSection();
  $("#inspector-body .app-form select")?.focus();
}

function closeForm() {
  form = null;
  showSection();
  $("#inspector-body .app-add")?.focus();
}

// Replaces only the apparatus section, so unapplied input in other sections survives.
function showSection() {
  const current = $("#inspector").hidden ? null : $("#inspector-body .apparatus");
  if (current) current.replaceWith(apparatusSection(selectedWords()));
  else openInspector();
}

function applyForm(words, fields) {
  const reason = refusal(words);
  if (reason) { inspectorNote(reason); return; }
  const sigle = form.sigle.trim().replace(/^\(|\)$/g, "").trim();
  const missing = [["de", "Die deutsche Anmerkung fehlt."], ["en", "Die englische Anmerkung fehlt."]].find(([k]) => !form[k].trim());
  if (missing) { inspectorNote(missing[1]); fields[missing[0]].focus(); return; }
  if (!sigle || /[()]/.test(sigle)) { inspectorNote("Die Sigle fehlt, etwa MK."); fields.sigle.focus(); return; }
  const signed = (text) => { const t = text.trim(); return t.endsWith(`(${sigle})`) ? t : `${t} (${sigle})`; };
  let ids = null;
  const done = commit("Apparatkommentar", (data) => {
    if (refusal(words)) return false;
    ids = nextIds(data);
    insertAnchors(words, ids[0], ids[1]);
    data.apparatus.push({ from: ids[0], to: ids[1], type: form.type, notes: { de: signed(form.de), en: signed(form.en) }, id: null });
    return true;
  });
  if (!done) return;
  lastSigle = sigle;
  form = null;
  indexApparatus();
  refreshMarks();
  openInspector();
  inspectorNote(`Apparatkommentar ${ids[0]} bis ${ids[1]} angelegt.`);
  $(`#inspector-body .app-entry[data-from="${ids[0]}"] textarea`)?.focus();
}

function commentForm(words) {
  const reason = refusal(words);
  const f = el("form", { class: "app-form", "aria-label": "Neuer Apparatkommentar", novalidate: "" });
  if (reason) f.append(el("p", { class: "app-refusal", role: "alert", text: reason }));
  const type = el("select", {}, TYPES.map(([v, label]) => el("option", { value: v, text: `${label} (${v})` })));
  type.value = form.type;
  type.addEventListener("change", () => { form.type = type.value; });
  const used = (state.data.apparatusTypes || []).map((t) => t.type).filter(Boolean);
  f.append(el("label", { class: "field" }, [el("span", { text: "Typ" }), type]));
  if (used.length) {
    f.append(el("details", { class: "app-types" }, [el("summary", { text: "Im Codex verwendete Typen" }), el("p", { text: used.join(", ") })]));
  }
  const fields = { type };
  for (const [lang, label] of LANGS) {
    const ta = el("textarea", { lang, text: form[lang] });
    ta.addEventListener("input", () => { form[lang] = ta.value; });
    fields[lang] = ta;
    f.append(el("label", { class: "field" }, [el("span", { text: `Anmerkung ${label}` }), ta]));
  }
  // No placeholder, which reads as a filled value; the example stands beside the field
  // and the sigle of the last comment in this session is prefilled as a real value.
  const sigle = el("input", { type: "text", value: form.sigle, autocomplete: "off", "aria-describedby": "app-sigle-hint" });
  sigle.addEventListener("input", () => { form.sigle = sigle.value; });
  fields.sigle = sigle;
  f.append(el("label", { class: "field app-sigle" }, [
    el("span", { text: "Sigle" }),
    el("span", { class: "sigle-row" }, [sigle, el("span", { class: "sigle-example", text: "z. B. MK" })]),
    el("span", { class: "mixed", id: "app-sigle-hint", text: "Wird beiden Anmerkungen in Klammern angehängt." }),
  ]));
  f.append(el("div", { class: "field-actions" }, [
    el("button", { type: "button", class: "act-btn", text: "Abbrechen", onclick: () => { hideNote(); closeForm(); } }),
    el("button", { type: "submit", class: "act-btn is-primary", text: "Anwenden" }),
  ]));
  f.addEventListener("submit", (e) => { e.preventDefault(); applyForm(words, fields); });
  return f;
}

// One existing comment: type, anchors and both notes as textareas, applied per comment.
function commentEntry(app) {
  const entry = el("article", { class: "app-entry", "data-from": app.from ?? "", "aria-label": `Kommentar ${app.from ?? "?"} bis ${app.to}` });
  entry.append(el("div", { class: "type" }, [
    el("strong", { text: typeName(app) }),
    el("span", { text: `${app.type ? `${app.type}, ` : ""}${app.from ?? "?"} bis ${app.to}` }),
  ]));
  const missing = unresolved.get(app);
  if (missing) entry.append(el("p", { class: "app-unresolved", text: `${missing === "from" ? "Startanker" : "Endanker"} ${app[missing]} steht nicht auf dieser Seite; der Kommentar ist dem Wort am vorhandenen Anker zugeordnet.` }));
  const notes = app.notes || {};
  const areas = {};
  for (const [lang, label] of LANGS) {
    const ta = el("textarea", { lang, text: notes[lang] ?? "" });
    areas[lang] = ta;
    entry.append(el("label", { class: "field" }, [el("span", { text: label }), ta]));
  }
  const apply = () => {
    const next = { de: areas.de.value.trim(), en: areas.en.value.trim() };
    if (!next.de) { inspectorNote("Die deutsche Anmerkung darf nicht leer sein."); areas.de.focus(); return; }
    if (next.de === (notes.de ?? "") && next.en === (notes.en ?? "")) { inspectorNote("Keine Änderung am Kommentar."); return; }
    commit("Apparatkommentar bearbeiten", () => { app.notes = { ...app.notes, ...next }; });
    for (const [lang, ta] of Object.entries(areas)) { ta.value = next[lang]; ta.defaultValue = next[lang]; }
    inspectorNote("Kommentar übernommen, die Anker bleiben unverändert.");
  };
  entry.append(el("div", { class: "field-actions" }, [
    el("button", { type: "button", class: "act-btn", text: "Abbrechen", onclick: () => { for (const [lang, ta] of Object.entries(areas)) ta.value = app.notes?.[lang] ?? ""; hideNote(); } }),
    el("button", { type: "button", class: "act-btn is-primary", text: "Anwenden", onclick: apply }),
  ]));
  return entry;
}

export function apparatusSection(words) {
  const apps = [...new Set(words.flatMap((w) => state.appsByWord.get(w.tok) || []))];
  const sec = el("div", { class: "apparatus" });
  sec.append(el("div", { class: "group-title", text: apps.length ? `Apparat (${apps.length})` : "Apparat" }));
  if (apps.length) sec.append(el("div", { class: "app-list" }, apps.map(commentEntry)));
  else sec.append(el("p", { class: "empty-note", text: "Kein Kommentar zu dieser Stelle." }));
  if (form && form.key === selKey()) sec.append(commentForm(words));
  else sec.append(el("button", { class: "link-btn app-add", type: "button", text: "+ Kommentar zur Auswahl", onclick: openCommentForm }));
  return sec;
}

sections.push((words) => apparatusSection(words));
actions.set("Bearbeiten/Apparatkommentar zur Auswahl", openCommentForm);
