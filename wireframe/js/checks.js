// Checks, findings bar and list, and the save flow (US5.1, US5.2, F44 to F51).
// No permanent status line: the bar shows a running check, a result with findings or
// a failed save; a clean result and a save are announced and, by CONFIRM_CLEAN,
// confirmed briefly. The findings list is the tab Befunde of the Seitenleiste.
//
// What is simulated: the XML view renders the excerpt read-only, so well-formedness
// parses that excerpt once on request. TEI All is a timed stand-in for the worker run
// against the vendored RelaxNG. Schematron evaluates those rules of
// docs/schemas/wenzelsbibel.sch that can be stated on the in-memory model of this page,
// with the rule ids, phases, severities and message texts of the .sch.
import { $, columns, el, refKey, state } from "./state.js";
import { activeDoc, markSaved, onChange, revision } from "./history.js";
import { placeCaret, setColumn } from "./flow.js";
import { setView } from "./xml.js";
import { closePanel, narrow, openPanel, panelBody, tabs } from "./panel.js";
import { switchDocument } from "./miniature.js";
import { command } from "./toolbar.js";
import { announce, notify, setStanding } from "./notice.js";

const DOWNLOAD_NAME = "codex-2759-fol-1r-auszug.xml";

// The document as the document chooser names it, the one name the interface uses for it.
const docLabel = (doc) => $(`#doc-select option[value="${doc}"]`).textContent;

// Operator decision (F46): a clean run and a save show a short visible confirmation that
// disappears on its own; false would leave the announcement only.
const CONFIRM_CLEAN = true;
const TEI_ALL_MS = 2000;

const CHECKS = ["Wohlgeformtheit", "TEI All", "Schematron editing", "Schematron review"];
// Wohlgeformtheit parses the excerpt as loaded (or formatted), not the model edits, and
// only on request. The header badge states that the wireframe works in memory.
const SAVE_SET = ["Wohlgeformtheit", "TEI All", "Schematron editing"];

// check => { findings, stale }. Findings hold positions and ids, never token objects,
// so they stay valid across undo and redo.
const results = new Map();
let running = null;   // { label, cancel }
let barState = null;  // what the standing bar shows: { kind: "check" | "save-failed", checks }
let savedRevision = null; // codex revision of the last save that passed, the gate of Herunterladen

const errors = (fs) => fs.filter((f) => f.role === "error");
const plural = (n) => `${n} ${n === 1 ? "Befund" : "Befunde"}`;

// Model walk: every word with its place in folio, column and line.

function walk() {
  const words = [];
  let prevId = null;
  columns().forEach((col, ci) => {
    let n = 0;
    col.lines.forEach((line, li) => {
      const header = line.tokens.some((t) => t.type === "w" && t.fw === "header");
      if (!header) n++;
      line.tokens.forEach((tok, ti) => {
        if (tok.type !== "w" && tok.type !== "pc") return;
        words.push({ tok, at: { ci, li, ti, id: tok.id || null, type: tok.type, text: tok.text, lineNo: header ? "Kopfzeile" : `Z. ${n}` }, prevId });
        if (tok.type === "w" && tok.id) prevId = tok.id;
      });
    });
  });
  return words;
}

const where = (at) => (at ? `fol. ${state.data.folio} ${"ab"[at.ci]} ${at.lineNo}` : `fol. ${state.data.folio}`);
const wordPath = (at) => (at && at.id ? `//w[@xml:id='${at.id}']` : `//w[normalize-space(.)='${at ? at.text : ""}']`);

// Schematron on the model. Each rule names its .sch id; the messages are the .sch texts
// with the value-of parts filled in.

const HI_KNOWN = ["rubrication", "inkRed", "gold", "initial", "initial_historisiert", "border_decoration"];
const HI_DATA = ["ligature", "textStyle", "decoration", "full_page", "marginalia", "italic"];
const FW_ANA = ["header", "instruction_note", "marginalia", "text_in_image", "borderdecoration", "scroll", "painter_instruction"];
const APP_TYPES = ["comment_edition", "comment_understanding", "comment_translation", "comment_translation_ses", "comment_translation_vev", "comment_manuscript", "comment_variant"];

function schematron(phase) {
  const out = [];
  const add = (role, rule, message, at, path) => out.push({ check: `Schematron ${phase}`, phase, role, rule, message, where: where(at), at, path });
  const words = walk();
  const review = phase === "review";

  // Register links: one ref per run of consecutive words with the same reference.
  const runs = [];
  let prevKey = null;
  for (const { tok, at } of words) {
    if (tok.type !== "w") continue;
    const key = refKey(tok);
    if (key && key !== prevKey) runs.push({ ref: tok.ref, at });
    prevKey = key;
  }
  const known = registerIds();
  for (const r of runs) {
    const { type, target } = r.ref;
    const path = `${wordPath(r.at)}/ancestor::ref`;
    if (!["person", "place", "folk"].includes(String(type).toLowerCase())) {
      add("error", "register-type", `Ein Registerverweis braucht @type mit einem Wert aus dem Handbuch: person, place oder folk. Gefunden: "${type}".`, r.at, path);
    }
    if (!review) continue;
    if (!String(target ?? "").trim()) add("error", "register-pointer", "Ein Registerverweis braucht einen nicht leeren Zeiger auf den Registereintrag: @ref bei rs, @target bei ref.", r.at, path);
    else if (/\s/.test(target)) add("error", "register-pointer-syntax", `Der Registerzeiger "${target}" darf keine Leerzeichen enthalten, weder am Anfang oder Ende noch im Inneren; eine Register-ID ist ein einzelnes Token.`, r.at, path);
    if (type && !["person", "place", "folk"].includes(type)) add("warning", "register-type-case", `Der Registertyp "${type}" weicht in der Schreibung vom Handbuch ab; erwartet wird person, place oder folk in Kleinbuchstaben.`, r.at, path);
    // Not in the project Schematron: the codex carries no register lists, so the .sch
    // cannot resolve a pointer. The wireframe resolves against its derived register.
    if (String(target ?? "").trim() && !known.has(`${String(type).toLowerCase()}|${target.trim()}`)) {
      add("error", "register-target-known", `Der Registerzeiger "${target.trim()}" (${type}) zeigt auf keinen Eintrag im Register.`, r.at, path);
    }
  }

  // Apparatus entries of this page.
  for (const app of state.data.apparatus) {
    const at = appLocation(app, words);
    const path = `//standOff//app[@from='#${app.from}']`;
    if (!app.sameAs && !(String(app.from ?? "").trim() && String(app.to ?? "").trim())) {
      add("error", "app-from-to", "Ein Apparateintrag braucht @from und @to, die auf seinen Anfangs- und Endanker im Text zeigen (außer er verweist mit @sameAs auf einen anderen Eintrag).", at, path);
    }
    if (review && !APP_TYPES.includes(String(app.type ?? "").trim())) {
      add("error", "app-type-known", `Unbekannter Kommentartyp app/@type="${app.type ?? ""}". Zulässig: ${APP_TYPES.join(", ")}.`, at, path);
    }
  }
  if (!review) return byRole(out);

  const markups = new Set();
  for (const { tok, at, prevId } of words) {
    if (tok.type === "pc") {
      if (tok.supplied) supplied(tok.supplied, at, prevId ? `//w[@xml:id='${prevId}']/following::pc[1]/ancestor::supplied` : "//pc/ancestor::supplied");
      continue;
    }
    if (tok.orig != null || tok.norm != null) {
      if (!String(tok.id ?? "").trim()) add("error", "w-id", `Ein Wort mit diplomatischer oder normalisierter Lesung (@orig, @norm) braucht eine xml:id, damit Apparat, Register und Bildbezüge darauf verweisen können. Wort: "${tok.text}".`, at, wordPath(at));
    }
    for (const r of tok.rend || []) {
      if (!HI_KNOWN.includes(r) && !HI_DATA.includes(r)) add("error", "hi-rend-known", `Unbekannter Hervorhebungswert hi/@rend="${r}". Zulässig nach Handbuch: ${HI_KNOWN.join(", ")}.`, at, `${wordPath(at)}//hi`);
      if (HI_DATA.includes(r)) add("warning", "hi-rend-data-only", `Der Wert hi/@rend="${r}" kommt in den Daten vor, steht aber nicht im Transkriptionshandbuch. Er wartet auf die Entscheidung des Editionsteams.`, at, `${wordPath(at)}//hi`);
    }
    if (tok.fw && !FW_ANA.includes(tok.fw)) add("error", "fw-ana-known", `Unbekannter Regionstyp fw/@ana="${tok.fw}". Zulässig nach Handbuch: ${FW_ANA.join(", ")}.`, at, `${wordPath(at)}/ancestor::fw`);
    if (typeof tok.supplied === "string") supplied(tok.supplied, at, `${wordPath(at)}//supplied`);
    // One finding per element: a run of words shares one markup object (markup.js).
    const mk = tok.markup;
    if (!mk || markups.has(mk)) continue;
    markups.add(mk);
    const path = `${wordPath(at)}/ancestor::${mk.element}`;
    if (mk.element === "supplied") supplied(mk.value, at, path);
    if (mk.element === "surplus" && !["Diplography", "decor", "text_erasure", "switch", "instruction_note"].includes(mk.value)) add("error", "surplus-reason-known", `Unbekannter Grund surplus/@reason="${mk.value}". Zulässig nach Handbuch: ohne @reason, Diplography, decor, text_erasure, switch, instruction_note.`, at, path);
    if (mk.element === "del") {
      if (!["erasure", "redemption_point", "erasure_point"].includes(mk.value)) add("error", "del-type-known", `Unbekannte Tilgungsart del/@type="${mk.value}". Zulässig nach Handbuch: ohne @type, erasure, redemption_point.`, at, path);
      if (mk.value === "erasure_point") add("warning", "del-type-data-only", 'Der Wert del/@type="erasure_point" kommt in den Daten vor; das Handbuch nennt für den Tilgungspunkt redemption_point.', at, path);
    }
    if (mk.element === "foreign" && !["lat", "cze"].includes(mk.value)) add("error", "foreign-lang-known", `Fremdsprachiger Text (foreign) braucht xml:lang aus dem Handbuch: lat oder cze. Gefunden: "${mk.value}".`, at, path);
    if (mk.element === "num" && mk.value !== "chapter") add("error", "num-type-known", `Eine Zahl (num) braucht nach Handbuch @type="chapter". Gefunden: "${mk.value}".`, at, path);
  }
  return byRole(out);

  function supplied(reason, at, path) {
    if (!["text_intervention", "switch", "damage", "additionalPunctuation"].includes(reason)) add("error", "supplied-reason-known", `Ergänzter Text (supplied) braucht @reason aus dem Handbuch: text_intervention, switch oder damage. Gefunden: "${reason}".`, at, path);
    if (reason === "additionalPunctuation") add("warning", "supplied-reason-data-only", 'Der Wert supplied/@reason="additionalPunctuation" kommt in den Daten vor, steht aber nicht im Transkriptionshandbuch.', at, path);
  }
}

// Errors before warnings, each in document order.
const byRole = (fs) => [...fs.filter((f) => f.role === "error"), ...fs.filter((f) => f.role !== "error")];

function registerIds() {
  const reg = state.data.registers || {};
  const ids = new Set();
  for (const [type, list] of Object.entries(reg.codex || {})) for (const e of list) ids.add(`${type}|${String(e.id).trim()}`);
  for (const id of reg.persons || []) ids.add(`person|${String(id).trim()}`);
  for (const id of reg.places || []) ids.add(`place|${String(id).trim()}`);
  return ids;
}

// The word that carries an entry's start anchor, if it lies on this page.
function appLocation(app, words) {
  let inWord = null;
  for (const col of state.data.columns) for (const line of col.lines) for (const t of line.tokens) if (t.type === "anchor" && t.id === app.from) inWord = t.inWord;
  return (inWord && words.find((w) => w.tok.id === inWord)?.at) || null;
}

// Well-formedness of the excerpt. The excerpt is a page cut from the codex: it closes
// elements opened before the page (p, div) and leaves others open after it. Those
// boundary tags are balanced by a synthetic context, so the parser judges only what
// lies inside the page; a mismatch inside it still fails. xml:id needs no declaration.
function wellFormed() {
  const src = state.data.xmlExcerpt;
  const open = [];
  const before = [];
  for (const m of src.matchAll(/<(\/?)([\w:.-]+)(?:\s[^>]*?)?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (!close) open.push(name);
    else if (open.length && open[open.length - 1] === name) open.pop();
    else if (!open.length) before.unshift(name);
    else break; // a real mismatch; the parser reports it
  }
  const head = before.map((n) => `<${n}>`).join("");
  const tail = open.slice().reverse().map((n) => `</${n}>`).join("");
  const doc = new DOMParser().parseFromString(`<excerpt>${head}${src}${tail}</excerpt>`, "application/xml");
  const err = doc.querySelector("parsererror");
  if (!err) return [];
  return [{ check: "Wohlgeformtheit", phase: null, role: "error", rule: "XML", message: (err.querySelector("div") || err).textContent.trim().split("\n")[0], where: "XML", at: null, path: "/" }];
}

// Runs. TEI All and the save set are asynchronous and cancellable; the interface stays usable.

function delay(ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { running = null; resolve(); }, ms);
    running = { label, cancel: () => { clearTimeout(timer); running = null; reject(new Error("cancelled")); } };
    renderBar();
  });
}

async function evaluate(check, label = check) {
  if (check === "Wohlgeformtheit") return wellFormed();
  // Stand-in for the worker run; the real build validates the exact bytes.
  if (check === "TEI All") { await delay(TEI_ALL_MS, label); return []; }
  return schematron(check === "Schematron editing" ? "editing" : "review");
}

export async function runCheck(check) {
  if (running) { notify(`${running.label} läuft noch. Erst abwarten oder abbrechen.`); return; }
  let findings;
  try { findings = await evaluate(check); } catch { barState = null; renderBar(); notify(`${check} abgebrochen. Kein Ergebnis.`); return; }
  results.set(check, { findings, stale: false });
  barState = { kind: "check", checks: [check] };
  if (findings.length) { renderBar(); return; }
  barState = null;
  renderBar();
  const msg = `${check}: ${check === "Wohlgeformtheit" ? "wohlgeformt" : "keine Befunde"}.`;
  if (CONFIRM_CLEAN) notify(msg); else announce(msg);
}

// Datei, Speichern (F49 to F51) for the active document: runs every check of its save
// set without a current result, and marks that document's revision saved only when all
// pass. Deliberate shortcut: the image annotations have no source in the wireframe, so
// of their set only the timed TEI All stand-in runs, and its result is not kept, because
// the findings list holds the codex results. The product runs the full set on
// Bildannotationen.xml.
export async function save() {
  if (running) { notify(`${running.label} läuft noch. Erst abwarten oder abbrechen.`); return; }
  const doc = activeDoc();
  if (doc === "images") {
    try { await evaluate("TEI All", "Speichern: TEI All"); } catch { renderBar(); notify("Speichern abgebrochen."); return; }
  } else {
    for (const check of SAVE_SET) {
      const r = results.get(check);
      if (r && !r.stale) continue;
      try { results.set(check, { findings: await evaluate(check, `Speichern: ${check}`), stale: false }); } catch {
        barState = null; renderBar(); notify("Speichern abgebrochen."); return;
      }
    }
    const failed = SAVE_SET.filter((c) => errors(results.get(c).findings).length);
    if (failed.length) { barState = { kind: "save-failed", checks: failed }; renderBar(); return; }
    barState = null;
  }
  markSaved(doc);
  if (doc === "codex") savedRevision = revision("codex");
  renderBar();
  const msg = `${docLabel(doc)} gespeichert.`;
  if (CONFIRM_CLEAN) notify(msg); else announce(msg);
}

// The wireframe does not serialise the model edits to XML, so the download carries the
// excerpt as loaded (or as formatted), not the edited words. The real build writes the
// edited bytes, in place with a native handle or as this download in Firefox (F50).
// Only bytes that passed the save set are offered, so the toolbar gates it on the revision.
// The image annotations have no source here, so Herunterladen is disabled for them.
function download() {
  const url = URL.createObjectURL(new Blob([state.data.xmlExcerpt], { type: "application/xml" }));
  const a = el("a", { href: url, download: DOWNLOAD_NAME, hidden: "" });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Notice bar

function renderBar() {
  setStanding(barState || running ? barContent : null);
}

function barContent() {
  if (running) {
    return [
      el("strong", { text: `${running.label} läuft …` }),
      el("button", { type: "button", class: "act-btn", text: "Abbrechen", onclick: () => running && running.cancel() }),
    ];
  }
  const show = el("button", { type: "button", class: "act-btn", text: "Befunde anzeigen", onclick: showFindings });
  const stale = barState.checks.some((c) => results.get(c)?.stale);
  const nodes = stale ? [el("strong", { class: "is-stale", text: "Ergebnis veraltet, Prüfung erneut ausführen." })] : [];
  if (barState.kind === "save-failed") {
    const parts = barState.checks.map((c) => `${c} mit ${plural(errors(results.get(c).findings).length)}`);
    return [...nodes, el("strong", { text: `Nicht gespeichert: ${parts.join(", ")}.` }), show];
  }
  const check = barState.checks[0];
  const fs = results.get(check).findings;
  const first = errors(fs)[0] || fs[0];
  const counts = errors(fs).length === fs.length ? plural(fs.length) : `${plural(fs.length)} (${errors(fs).length} Fehler, ${fs.length - errors(fs).length} Warnungen)`;
  return [...nodes, el("strong", { text: `${check}: ${counts}` }), el("span", { text: `${first.message} ${first.where}` }), show];
}

// Findings list (F47): the checked document named once in the title as the document
// chooser names it, findings grouped per check, each with location, rule, XML path and
// message; choosing its location selects it in the text.

export function showFindings() {
  if (!results.size) {
    openPanel("findings", ["Befunde"], [el("p", { class: "empty-note", text: "Noch keine Prüfung gelaufen." })]);
    return;
  }
  const body = [];
  if ([...results.values()].some((r) => r.stale)) body.push(el("p", { class: "findings-stale", role: "status", text: "Ergebnis veraltet, Prüfung erneut ausführen." }));
  for (const check of CHECKS) {
    const r = results.get(check);
    if (!r) continue;
    const fs = r.findings;
    const head = el("h3", { class: "findings-check" }, [check, el("span", { class: "context", text: fs.length ? `${plural(fs.length)}, ${errors(fs).length} Fehler${r.stale ? ", veraltet" : ""}` : `keine Befunde${r.stale ? ", veraltet" : ""}` })]);
    const group = el("section", { class: "findings-group" }, [head]);
    if (fs.length) {
      const list = el("ul", { class: "findings" });
      for (const f of fs) {
        list.append(el("li", { class: `finding is-${f.role}` }, [
          el("span", { class: "finding-role", text: f.role === "error" ? "Fehler" : "Warnung" }),
          el("span", { class: "finding-msg", text: f.message }),
          f.at ? el("button", { type: "button", class: "link-btn", text: f.where, onclick: () => jumpToFinding(f) }) : el("span", { text: f.where }),
          el("span", { class: "finding-meta" }, [el("code", { text: f.rule }), " · ", el("code", { text: f.path })]),
        ]));
      }
      group.append(list);
    }
    body.push(group);
  }
  openPanel("findings", ["Befunde ", el("span", { class: "context", text: docLabel("codex") })], body, showFindings);
  panelBody("findings").querySelector("button")?.focus();
}

// Selects the finding's word. A word with an xml:id is found by it wherever it moved; a
// token without one by column, line and token position, and only while that position
// still holds a token of the same kind and text. Punctuation has no node of its own in
// the flow (an island), so its finding selects the word it follows in its line, or the
// next one when it opens the line.
export function jumpToFinding(f) {
  if (shownDocIsImages() && !switchDocument("codex")) return;
  if (state.view !== "text") setView("text");
  if (f.at.ci !== state.column) setColumn(f.at.ci);
  const outdated = (what) => notify(`Ergebnis veraltet: ${what}. Prüfung erneut ausführen.`);
  let k = -1;
  if (f.at.id) {
    k = state.words.findIndex((w) => w.tok.id === f.at.id);
    if (k < 0) { outdated(`das Wort ${f.at.id} besteht nicht mehr`); return; }
  } else {
    const line = columns()[f.at.ci]?.lines[f.at.li];
    const tok = line?.tokens[f.at.ti];
    if (!tok || tok.type !== f.at.type || tok.text !== f.at.text) { outdated(`an der Stelle stand „${f.at.text}“, jetzt steht dort ${tok?.text ? `„${tok.text}“` : "nichts"}`); return; }
    const inLine = state.words.filter((w) => w.line === line);
    const pos = (w) => line.tokens.indexOf(w.tok);
    const word = tok.type === "w" ? inLine.find((w) => w.tok === tok)
      : inLine.findLast((w) => pos(w) < f.at.ti) || inLine.find((w) => pos(w) > f.at.ti);
    k = word ? state.words.indexOf(word) : -1;
    if (k < 0) { notify(`Die Zeile ${f.at.lineNo} enthält kein Wort, an dem der Befund gezeigt werden kann.`); return; }
  }
  if (narrow.matches) closePanel(); // the findings sheet covers the text it jumps to
  placeCaret(k);
}

const shownDocIsImages = () => $("#doc-select").value === "images";

// Any edit after a run makes every result outdated (F47, US5.1 criterion 5).
onChange((kind) => {
  if (kind === "saved" || kind === "document" || !results.size) return;
  let changed = false;
  for (const r of results.values()) if (!r.stale) { r.stale = true; changed = true; }
  if (!changed) return;
  renderBar();
  if (panelBody("findings").querySelector(".findings-group")) showFindings();
});

command("check:wf", () => runCheck("Wohlgeformtheit"));
command("check:tei", () => runCheck("TEI All"));
command("check:sch-editing", () => runCheck("Schematron editing"));
command("check:sch-review", () => runCheck("Schematron review"));
command("findings", showFindings, () => (results.size ? null : "Noch keine Prüfung gelaufen."));
command("save", save);
command("download", download, () => {
  if (activeDoc() === "images") return "Kein XML geladen.";
  return savedRevision !== null && savedRevision === revision("codex") ? null : "Erst Speichern.";
});
tabs.set("findings", { show: showFindings });
