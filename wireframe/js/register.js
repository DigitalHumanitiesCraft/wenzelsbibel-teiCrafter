// Register linking, entry creation and the references panels (US3.1, US3.2, F37 to F40, F55).
// Everything lives in state.data, so history.commit covers links and created entries alike.
import { $, chipFor, columns, el, refKey, state, TYPE_LABEL } from "./state.js";
import { commit } from "./history.js";
import { flowEvents, highlightSelection, renderFlow, selectedWords, setColumn, setWordRange } from "./flow.js";
import { isPopoverOpen, openPopover, popoverNote, sections } from "./popover.js";
import { closePanel, narrow, openPanel, tabs } from "./panel.js";
import { command, selectionReason } from "./toolbar.js";
import { setView } from "./xml.js";

const TYPES = Object.keys(TYPE_LABEL);
const PLURAL = { person: "Personen", place: "Orte", folk: "Völker" };

// Counter for links written in this session; see link() for why a run carries an id.
let runSeq = 0;
// Set by the command "Neu anlegen …" so the next register section opens as the form.
let pendingCreate = false;

const fold = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const countText = (n) => `${n} ${n === 1 ? "Verweis" : "Verweise"} im Codex`;
const label = (e) => `${TYPE_LABEL[e.type]}: ${e.id}`;

// The codex has no register lists; its entries are the distinct ref/@target values.
// Entries created in this session are appended to the same lists.
export function registerEntries() {
  const entries = [];
  for (const type of TYPES) for (const e of state.data.registers.codex[type] || []) entries.push(e);
  return entries.sort((a, b) => a.id.localeCompare(b.id, "de"));
}

const findEntry = (data, type, id) => (data.registers.codex[type] || []).find((e) => e.id === id);

// Every word of the page in reading order with its column and displayed line number,
// numbered the way renderFlow numbers them.
function pageWords() {
  const out = [];
  columns().forEach((col, c) => {
    let n = 0;
    for (const line of col.lines) {
      const header = line.tokens.some((t) => t.type === "w" && t.fw === "header");
      const lineNo = header ? "Kopfzeile" : String(++n);
      for (const tok of line.tokens) if (tok.type === "w") out.push({ tok, c, line, lineNo });
    }
  });
  return out;
}

// A run is one register element: the maximal sequence of adjacent words in one column
// with the same refKey. Punctuation and line breaks between them do not end it.
function runs(words = pageWords()) {
  const out = [];
  words.forEach((w, i) => {
    const key = refKey(w.tok);
    if (!key) return;
    const last = out[out.length - 1];
    if (last && last.key === key && last.words[last.words.length - 1] === words[i - 1] && words[i - 1].c === w.c) last.words.push(w);
    else out.push({ key, ref: w.tok.ref, words: [w] });
  });
  return out;
}

// Links written here are the proposed rs[@ref]; links read from the codex are ref[@target].
const elementOf = (ref) => (ref.run ? "rs" : "ref");
const runText = (run) => run.words.map((w) => w.tok.text || w.tok.orig || "").join(" ");
const where = (ws) => {
  const at = (w) => (w.lineNo === "Kopfzeile" ? "Kopfzeile" : `Z. ${w.lineNo}`);
  const a = ws[0];
  const b = ws[ws.length - 1];
  return `Spalte ${"ab"[a.c]}, ${at(a)}${a.lineNo === b.lineNo ? "" : ` bis ${at(b)}`}`;
};

// The run that holds every selected word, or null when the selection is not one link.
function selectedRun(words) {
  if (!words.length || words.some((w) => !w.tok.ref)) return null;
  const set = new Set(words.map((w) => w.tok));
  const hits = runs().filter((r) => r.words.some((w) => set.has(w.tok)));
  return hits.length === 1 ? hits[0] : null;
}

// F55: the reason a wrap around the selected words would split an element, or null.
// F38 allows anchors, milestones, line breaks and punctuation between the words: they
// are empty or whole nodes, so one rs around them stays well-formed. What a wrap can
// cut is an enclosing element the selection covers only in part. The token model shows
// three of them: an existing register element, a markup run from markup.js and the
// marginal seg (rend "marginalia"). Inner markup of a word (ligature hi, lb, choice) is
// never cut, because the wrapper goes around whole w elements. Deliberate shortcut: a
// hi, supplied or seg of the source that spans words without a token property here is
// not seen; the real tool decides on the source XML.
function wrapRefusal(toks) {
  const set = new Set(toks);
  const words = pageWords();
  const span = words.filter((w) => set.has(w.tok));
  const marginal = (w) => (w.tok.rend || []).includes("marginalia");
  if (span.some(marginal) && !span.every(marginal)) {
    return "Nicht verknüpft: Die Auswahl würde das Element seg der Marginalie teilen. Die Auswahl ganz innerhalb oder ganz außerhalb der Marginalie legen.";
  }
  // A markup run is the sequence of words sharing one markup object; a selection inside
  // it or around it is well-formed, one across its edge is not.
  const first = words.indexOf(span[0]);
  const last = words.indexOf(span[span.length - 1]);
  for (let k = first; k <= last; k++) {
    const mk = words[k].tok.markup;
    if (!mk) continue;
    let a = k;
    let b = k;
    while (a > 0 && words[a - 1].tok.markup === mk) a--;
    while (b < words.length - 1 && words[b + 1].tok.markup === mk) b++;
    if ((a < first || b > last) && (first < a || last > b)) {
      return `Nicht verknüpft: Die Auswahl würde das Element ${mk.element} (${mk.attr}="${mk.value}") teilen. Das ganze Element oder nur Wörter darin wählen.`;
    }
  }
  for (const run of runs(words)) {
    const inside = run.words.filter((w) => set.has(w.tok)).length;
    if (!inside) continue;
    const name = `${elementOf(run.ref)} des Verweises ${TYPE_LABEL[run.ref.type]}: ${run.ref.target} („${runText(run)}“)`;
    if (inside < run.words.length) return `Nicht verknüpft: Die Auswahl würde das Element ${name} teilen. Den ganzen Verweis oder kein Wort daraus wählen.`;
    // A contained whole run would need a nested wrapper, which the token model cannot hold.
    return `Nicht verknüpft: Die Auswahl enthält bereits das Element ${name}. Zuerst die Verknüpfung lösen.`;
  }
  return null;
}

// After a commit app.js does not re-render (it does so only on undo and redo), so the
// flow is rebuilt here and the same words stay selected.
function redraw(from, to) {
  renderFlow();
  state.sel = { from, to, line: null };
  setWordRange(from, to);
  state.words[from].node.scrollIntoView({ block: "nearest" });
  highlightSelection();
  openPopover();
}

// US3.1: one wrapper around the selected whole words in one commit. The wireframe has no
// element tree, so setting the same ref on every selected word token stands in for one
// rs[@type][@ref] start and end tag around them; `run` keeps two adjacent links to the
// same entry apart, as two rs elements would be. `refuse` shows a refusal at the field
// that triggered the link (design.md, interaction rules).
function link(entry, refuse, extra = null) {
  const words = selectedWords();
  if (!words.length) { refuse("Zum Verknüpfen zuerst Wörter im Text auswählen."); return false; }
  const reason = wrapRefusal(words.map((w) => w.tok));
  if (reason) { refuse(reason); return false; }
  const { from, to } = state.sel;
  const run = `s${++runSeq}`;
  commit(extra ? "Eintrag anlegen" : "Verknüpfen", (data) => {
    if (extra) extra(data);
    for (const w of words) w.tok.ref = { type: entry.type, target: entry.id, run };
    const e = findEntry(data, entry.type, entry.id);
    if (e) e.count += 1;
  });
  redraw(from, to);
  popoverNote(`Verknüpft mit ${label(entry)}.`);
  $("#popover-content .register .link-btn")?.focus();
  return true;
}

// "Verknüpfung lösen" removes the whole run the selection lies in, in one commit.
function unlink(run) {
  const { from, to } = state.sel;
  commit("Verknüpfung lösen", (data) => {
    for (const w of run.words) w.tok.ref = null;
    const e = findEntry(data, run.ref.type, run.ref.target);
    if (e) e.count = Math.max(0, e.count - 1);
  });
  redraw(from, to);
  popoverNote(`Verknüpfung mit ${TYPE_LABEL[run.ref.type]}: ${run.ref.target} gelöst.`);
  $("#popover-content .register input")?.focus();
}

export function registerSection(words) {
  const sec = el("div", { class: "register" });
  const run = selectedRun(words);
  sec.append(el("div", { class: "group-title", text: "Register" }));
  const linked = el("div", { class: "linked" });
  if (run) {
    linked.append(chipFor(run.key), el("span", { class: "ref-form", text: elementOf(run.ref) === "rs" ? "rs/@ref" : "ref/@target" }),
      el("button", { class: "link-btn", type: "button", text: "Verknüpfung lösen", onclick: () => unlink(run) }),
      el("button", { class: "link-btn reg-show-refs", type: "button", text: "Verweise", onclick: () => refsPanel(run.ref.type, run.ref.target) }));
  } else {
    linked.append(el("span", { class: "empty-note", text: words.some((w) => w.tok.ref) ? "Teilweise verknüpft" : "Nicht verknüpft" }));
  }
  sec.append(linked);
  const body = el("div", { class: "register-body" });
  sec.append(body);
  const text = words.map((w) => w.node.textContent).join(" ");
  const showCombo = () => body.replaceChildren(...combo(showForm));
  // US3.2: ID and preferred name come from the selected text; the search text that led
  // to "+ neu anlegen" is shown as a hint only.
  const showForm = (type, searched = "") => body.replaceChildren(createForm({ type, id: text, name: text, searched }, showCombo));
  if (pendingCreate) { pendingCreate = false; showForm("person"); } else showCombo();
  return sec;
}

// The autocomplete (F37): codex persons, places and peoples together, type filter, Enter links.
function combo(showForm) {
  const typeSel = el("select", { "aria-label": "Registertyp" }, [el("option", { value: "", text: "Alle" }), ...TYPES.map((v) => el("option", { value: v, text: TYPE_LABEL[v] }))]);
  const input = el("input", {
    type: "text", role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": "ac-list",
    placeholder: "Eintrag suchen oder anlegen …", "aria-label": "Registereintrag", autocomplete: "off",
  });
  const list = el("ul", { class: "ac-list", id: "ac-list", role: "listbox", "aria-label": "Registertreffer", hidden: "" });
  // A refused link stands here until the next input in the field.
  const error = el("p", { class: "field-error", id: "reg-link-error", role: "alert", hidden: "" });
  const refuse = (msg) => {
    error.textContent = msg;
    error.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", error.id);
    input.focus();
  };
  const clearError = () => { error.hidden = true; input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); };
  let active = -1;
  const options = () => [...list.children];
  const setActive = (i) => {
    const opts = options();
    active = opts.length ? (i + opts.length) % opts.length : -1;
    opts.forEach((o, j) => { o.classList.toggle("is-active", j === active); o.setAttribute("aria-selected", String(j === active)); });
    if (active < 0) { input.removeAttribute("aria-activedescendant"); return; }
    input.setAttribute("aria-activedescendant", opts[active].id);
    opts[active].scrollIntoView({ block: "nearest" });
  };
  // toolbar.js calls closeList on Escape; it is the first layer of the Escape order.
  list.closeList = () => { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
  list.anchor = input;
  const option = (i, onPick, children) => el("li", { class: "ac-item", id: `ac-opt-${i}`, role: "option", "aria-selected": "false", onclick: onPick }, children);
  const update = () => {
    const raw = input.value.trim();
    const q = fold(raw);
    const type = typeSel.value;
    list.replaceChildren();
    if (!q) { list.closeList(); return; }
    const hits = registerEntries().filter((e) => (!type || e.type === type) && fold(e.id).includes(q));
    hits.sort((a, b) => Number(!fold(a.id).startsWith(q)) - Number(!fold(b.id).startsWith(q)));
    hits.slice(0, 8).forEach((h, i) => list.append(option(i, () => { list.closeList(); link(h, refuse); }, [
      el("span", { class: "id", text: h.id }),
      el("span", { class: "type", text: `${TYPE_LABEL[h.type]} · ${countText(h.count)}` }),
    ])));
    if (!hits.some((h) => h.id === raw)) {
      const create = option(list.children.length, () => { list.closeList(); showForm(type || "person", raw); }, [
        el("span", { text: "+ neu anlegen" }), el("span", { class: "type", text: "aus der Auswahl" }),
      ]);
      create.classList.add("is-new");
      list.append(create);
    }
    active = -1;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");
    placeList(list);
  };
  input.addEventListener("input", () => { clearError(); update(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) update();
      if (list.hidden) return;
      setActive(active < 0 && e.key === "ArrowUp" ? -1 : active + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" && !list.hidden && active >= 0) {
      e.preventDefault();
      options()[active].click();
    }
  });
  list.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus in the field
  typeSel.addEventListener("change", update);
  return [el("div", { class: "combo" }, [typeSel, input]), error, list];
}

// US3.2 / F39: type, ID and preferred name; Anwenden creates the entry and links the
// selection in one commit. IDs are unique across all three types, compared trimmed
// and case-sensitively, as xml:id values in one register file would be.
function createForm(prefill, back) {
  const form = el("div", { class: "reg-form", role: "group", "aria-label": "Registereintrag anlegen" });
  const typeSel = el("select", {}, TYPES.map((v) => el("option", { value: v, text: TYPE_LABEL[v] })));
  typeSel.value = prefill.type;
  const idInput = el("input", { type: "text", value: prefill.id, "aria-describedby": "reg-id-error", autocomplete: "off" });
  const nameInput = el("input", { type: "text", value: prefill.name, autocomplete: "off" });
  const error = el("span", { class: "field-error", id: "reg-id-error", role: "alert", hidden: "" });
  // The reason stands at the ID field only; a second copy in the popover note would repeat it.
  // A wrap refusal concerns the selection, not the ID, so it leaves aria-invalid off.
  const fail = (msg, invalid = true) => {
    error.textContent = msg;
    error.hidden = false;
    if (invalid) idInput.setAttribute("aria-invalid", "true");
    idInput.focus();
  };
  const apply = () => {
    const id = idInput.value.trim();
    const name = nameInput.value.trim() || id;
    const type = typeSel.value;
    if (!id) { fail("Nicht angelegt: Die ID darf nicht leer sein."); return; }
    const clash = registerEntries().find((e) => e.id === id);
    if (clash) { fail(`Nicht angelegt: Die ID „${id}“ besteht bereits (${TYPE_LABEL[clash.type]}).`); return; }
    error.hidden = true;
    idInput.removeAttribute("aria-invalid");
    // count starts at 0; link() adds the one reference it writes.
    link({ type, id }, (msg) => fail(msg, false), (data) => { data.registers.codex[type].push({ type, id, count: 0, name, created: true }); });
  };
  const onEnter = (e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } };
  idInput.addEventListener("keydown", onEnter);
  nameInput.addEventListener("keydown", onEnter);
  idInput.addEventListener("input", () => { error.hidden = true; idInput.removeAttribute("aria-invalid"); });
  form.append(
    el("div", { class: "group-title", text: "Neuer Eintrag" }),
    el("label", { class: "field" }, [el("span", { text: "Typ" }), typeSel]),
    el("label", { class: "field" }, [el("span", { text: "ID" }), idInput, error,
      ...(prefill.searched && prefill.searched !== prefill.id ? [el("span", { class: "mixed", text: `Gesucht war „${prefill.searched}“.` })] : [])]),
    el("label", { class: "field" }, [el("span", { text: "Vorzugsname" }), nameInput]),
    el("div", { class: "field-actions" }, [
      el("button", { type: "button", class: "act-btn", text: "Abbrechen", onclick: () => { back(); $("#popover-content .register input")?.focus(); } }),
      el("button", { type: "button", class: "act-btn is-primary", text: "Anwenden", onclick: apply }),
    ]),
  );
  queueMicrotask(() => idInput.focus());
  return form;
}

// The list is fixed to the viewport so the popover's scroll edge cannot clip it.
// It opens below the field and flips above when there is more room there.
function placeList(list) {
  const r = list.anchor.getBoundingClientRect();
  const gap = 4;
  const margin = 8;
  const width = Math.min(Math.max(Math.min(r.width, 480), 320), innerWidth - 2 * margin);
  const below = innerHeight - r.bottom - margin;
  const above = r.top - margin;
  const wanted = Math.min(list.scrollHeight, 224);
  const up = below < wanted && above > below;
  Object.assign(list.style, {
    left: `${Math.min(Math.max(r.left, margin), innerWidth - width - margin)}px`,
    width: `${width}px`,
    top: up ? "auto" : `${r.bottom + gap}px`,
    bottom: up ? `${innerHeight - r.top + gap}px` : "auto",
    maxHeight: `${Math.max(Math.min(224, up ? above : below) - gap, 64)}px`,
  });
}

// Jump: select the words in the flow; the popover then follows the selection. With
// `after`, the panel that jumped is rebuilt once the selection has arrived, so the user
// can walk its list with the chosen entry marked. On a narrow screen the panel is a sheet
// over the text, so it closes and the text with the popover shows the target.
function jump(ws, after = null) {
  if (narrow.matches) { closePanel(); after = null; }
  if (state.view !== "text") setView("text");
  if (ws[0].c !== state.column) setColumn(ws[0].c);
  const ks = ws.map((w) => state.words.findIndex((x) => x.tok === w.tok)).filter((k) => k >= 0);
  if (!ks.length) return;
  const from = ks[0];
  const to = ks[ks.length - 1];
  state.words[from].node.scrollIntoView({ block: "center" });
  // An unchanged selection fires no select event, so the panel is rebuilt directly.
  if (after && state.sel && state.sel.from === from && state.sel.to === to && !state.sel.line) { after(); return; }
  if (after) flowEvents.addEventListener("select", after, { once: true });
  state.quiet = false;
  $("#flow").focus({ preventScroll: true });
  setWordRange(from, to);
}

// Arrow keys move between the buttons of a list; Tab enters it once.
function roving(ul) {
  const buttons = () => [...ul.querySelectorAll("button")];
  const reset = () => buttons().forEach((b, i) => { b.tabIndex = i ? -1 : 0; });
  ul.addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const bs = buttons();
    const i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const j = e.key === "Home" ? 0 : e.key === "End" ? bs.length - 1 : Math.min(Math.max(i + (e.key === "ArrowDown" ? 1 : -1), 0), bs.length - 1);
    bs[i].tabIndex = -1;
    bs[j].tabIndex = 0;
    bs[j].focus();
  });
  reset();
  return reset;
}

// F40: every reference on fol. 1r to one entry, in either form. The list is computed from
// the tokens, which hold data.registerUse as loaded plus the links of this session and
// lose the ones unlinked; the codex-wide count comes from the entry.
function refsPanel(type, id, current = -1) {
  const entry = findEntry(state.data, type, id);
  if (!entry) { searchPanel(`Der Eintrag ${TYPE_LABEL[type]}: ${id} besteht nicht mehr.`); return; }
  const mine = runs().filter((r) => r.ref.type === type && r.ref.target === id);
  const body = [
    el("p", { class: "reg-meta" }, [chipFor(`${type}|${id}`), el("span", { text: countText(entry.count) }),
      ...(entry.name && entry.name !== entry.id ? [el("span", { text: `Vorzugsname ${entry.name}` })] : [])]),
    el("div", { class: "group-title", text: `Auf fol. ${state.data.folio}` }),
  ];
  if (mine.length) {
    const ul = el("ul", { class: "reg-refs", "aria-label": `Verweise auf ${label(entry)}` });
    mine.forEach((r, i) => {
      const attrs = { type: "button", class: "reg-jump", onclick: () => jump(r.words, () => refsPanel(type, id, i)) };
      if (i === current) attrs["aria-current"] = "true";
      ul.append(el("li", {}, [el("button", attrs, [
        el("span", { text: where(r.words) }), el("q", { text: runText(r) }), el("span", { class: "type", text: elementOf(r.ref) === "rs" ? "rs/@ref" : "ref/@target" }),
      ])]));
    });
    roving(ul);
    if (current >= 0 && ul.children[current]) [...ul.querySelectorAll("button")].forEach((b, i) => { b.tabIndex = i === current ? 0 : -1; });
    body.push(ul);
  } else {
    body.push(el("p", { class: "empty-note", text: `Kein Verweis auf fol. ${state.data.folio}.` }));
  }
  body.push(el("button", { type: "button", class: "link-btn", text: "Anderen Eintrag suchen", onclick: () => searchPanel() }));
  openPanel("refs", ["Verweise auf ", el("q", { text: label(entry) })], body, () => refsPanel(type, id));
  ($('#side-refs .reg-jump[aria-current="true"]') || $("#side-refs .reg-jump, #side-refs .link-btn"))?.focus();
}

// Search panel (Verweise without a linked selection) and the lists Personen, Orte, Völker.
// In the search, a row opens the entry's references; in a list, it jumps to the first
// occurrence on this page where one exists.
function listPanel(type, mode, message = "", query = "") {
  const LIMIT = 50;
  const firstOnPage = new Map();
  for (const r of runs()) { const k = `${r.ref.type}|${r.ref.target}`; if (!firstOnPage.has(k)) firstOnPage.set(k, r); }
  const typeSel = el("select", { "aria-label": "Registertyp" }, [el("option", { value: "", text: "Alle" }), ...TYPES.map((v) => el("option", { value: v, text: TYPE_LABEL[v] }))]);
  typeSel.value = type || "";
  const input = el("input", { type: "search", value: query, "aria-label": "Eintrag suchen", placeholder: "Eintrag suchen …", autocomplete: "off" });
  const ul = el("ul", { class: "reg-list", "aria-label": "Registereinträge" });
  const more = el("p", { class: "empty-note", hidden: "" });
  let resetRoving = () => {};
  const fill = () => {
    const q = fold(input.value.trim());
    const t = typeSel.value;
    const hits = registerEntries().filter((e) => (!t || e.type === t) && (!q || fold(e.id).includes(q)));
    ul.replaceChildren();
    for (const e of hits.slice(0, LIMIT)) {
      const first = firstOnPage.get(`${e.type}|${e.id}`);
      const row = el("li", {});
      if (mode === "search") {
        row.append(el("button", { type: "button", class: "reg-jump", onclick: () => refsPanel(e.type, e.id) }, [
          el("span", { class: "id", text: e.id }), el("span", { class: "type", text: `${TYPE_LABEL[e.type]} · ${countText(e.count)}` }),
        ]));
      } else {
        row.append(el("span", { class: "id", text: e.id }), el("span", { class: "type", text: countText(e.count) }));
        if (first) row.append(el("button", { type: "button", class: "link-btn", text: `Zu ${where(first.words)}`, onclick: () => jump(first.words) }));
      }
      ul.append(row);
    }
    if (!hits.length) ul.append(el("li", { class: "empty-note", text: "Kein Eintrag gefunden." }));
    more.hidden = hits.length <= LIMIT;
    more.textContent = `Gezeigt sind die ersten ${LIMIT} Einträge; die Suche grenzt weiter ein.`;
    resetRoving();
  };
  resetRoving = roving(ul);
  input.addEventListener("input", fill);
  typeSel.addEventListener("change", fill);
  fill();
  const head = mode === "search" ? ["Verweise auf Eintrag"] : [`Register ${PLURAL[type]}`];
  const body = [];
  if (message) body.push(el("p", { class: "empty-note", text: message }));
  body.push(el("div", { class: "combo" }, mode === "search" ? [typeSel, input] : [input]), ul, more);
  openPanel("refs", head, body, () => listPanel(typeSel.value, mode, "", input.value));
  input.focus();
}

const searchPanel = (message = "") => listPanel("", "search", message);

function showReferences() {
  const run = selectedRun(selectedWords());
  if (run) refsPanel(run.ref.type, run.ref.target);
  else searchPanel(state.sel ? "Die Auswahl ist nicht verknüpft. Eintrag suchen:" : "");
}

// The word states carry the register field; a line selection continues as a word sequence.
function wordState() {
  if (state.sel.line) state.sel = { ...state.sel, line: null };
  state.quiet = false;
}

function createFromToolbar() {
  wordState();
  pendingCreate = true;
  openPopover();
  pendingCreate = false;
}

function linkFromToolbar() {
  if (state.sel.line || !isPopoverOpen()) { wordState(); openPopover(); }
  $("#popover-content .register input[role='combobox']")?.focus();
}

command("register:link", linkFromToolbar, selectionReason);
command("register:create", createFromToolbar, selectionReason);
command("register:refs", showReferences);
command("register:person", () => listPanel("person", "list"));
command("register:place", () => listPanel("place", "list"));
command("register:folk", () => listPanel("folk", "list"));
tabs.set("refs", { fresh: true, show: showReferences });

document.addEventListener("click", (e) => { if (!e.target.closest(".register")) for (const l of document.querySelectorAll(".ac-list:not([hidden])")) l.closeList(); });
// The autocomplete list is fixed to the viewport, so it follows its field on scroll and resize.
const follow = () => { const l = document.querySelector(".ac-list:not([hidden])"); if (l) placeList(l); };
document.addEventListener("scroll", follow, true);
addEventListener("resize", follow);

sections.push(registerSection);
