// Word editing: the applicable Diplomatisch field (F29), the markup actions of the
// word states (F32, F33) and the element list behind Strg+E (F21).
import { $, el, refKey, state, STUB } from "./state.js";
import { commit } from "./history.js";
import { flowEvents, highlightSelection, renderFlow, selectedWords, setWordRange, wordDecorators } from "./flow.js";
import { field, hideNote, inspectorNote, openInspector, sections, wordFields } from "./inspector.js";
import { actions, closeMenus } from "./menu.js";
import { notify } from "./notice.js";
import { setView } from "./xml.js";

// The five markup actions of F32 with the handbook values (editorial-guidelines.md,
// controlled vocabularies); the real tool reads them from the manifest. Tilgung
// covers surplus/@reason and del/@type. Data-only values such as erasure_point stay
// out until the edition team ratifies them.
export const MARKUP = [
  { label: "Hervorhebung", groups: [["hi/@rend", ["rubrication", "inkRed", "gold", "initial", "initial_historisiert", "border_decoration"]]] },
  { label: "Ergänzung", groups: [["supplied/@reason", ["text_intervention", "switch", "damage"]]] },
  { label: "Tilgung", groups: [["surplus/@reason", ["Diplography", "decor", "text_erasure", "switch", "instruction_note"]], ["del/@type", ["erasure", "redemption_point"]]] },
  { label: "Fremdsprache", groups: [["foreign/@xml:lang", ["lat", "cze"]]] },
  { label: "Zahl", groups: [["num/@type", ["chapter"]]] },
];

const HI_VALUES = MARKUP[0].groups[0][1];
const actionOf = (element) => MARKUP.find((m) => m.groups.some(([g]) => g.startsWith(`${element}/`)));

// Inner markup of a word

// Content of each <w xml:id> in the excerpt, rebuilt when the excerpt string changes
// (XML formatieren, undo).
let excerptSource = null;
let excerptWords = new Map();
function wordContent(id) {
  const src = state.data.xmlExcerpt;
  if (src !== excerptSource) {
    excerptSource = src;
    excerptWords = new Map();
    for (const m of src.matchAll(/<w\b[^>]*\sxml:id="([^"]*)"[^>]*>([\s\S]*?)<\/w>/g)) excerptWords.set(m[1], m[2].trim());
  }
  return excerptWords.get(id);
}

// A word is simple when its content is text, or text wrapped whole in one hi (rend
// is a token attribute in the model). Anything else (an inner lb, a partial hi such
// as a ligature, choice, anchors, damage) is edited in the XML view. The inspector's
// former test (ligature rend, a line break in the text) misses merteín, whose inner
// lb the model does not carry, so the excerpt decides where it holds the word.
export function hasInnerMarkup(tok) {
  if ((tok.rend || []).includes("ligature") || /\n/.test(tok.text || "")) return true;
  const content = tok.id ? wordContent(tok.id) : undefined;
  if (content === undefined) return false;
  const whole = /^<hi\b[^>]*>([^<]*)<\/hi>$/.exec(content);
  return /</.test(whole ? whole[1] : content);
}

// Re-render after a commit that changed what the flow shows; app.js re-renders only
// after undo and redo. The selection and the inspector return to the same words.
function rerenderWords(focusSelector) {
  const sel = state.sel;
  renderFlow();
  state.sel = sel;
  if (sel && state.view === "text") setWordRange(sel.from, sel.to);
  highlightSelection();
  openInspector();
  if (focusSelector) $("#inspector-body").querySelector(focusSelector)?.focus();
}

// Diplomatisch (F29)

function diplomaticField(tok) {
  const shown = tok.orig ?? tok.text ?? "";
  if (hasInnerMarkup(tok)) {
    const f = field("Diplomatisch", shown, "Enthält Binnen-Markup, Bearbeitung in der XML-Ansicht");
    f.querySelector("input").readOnly = true;
    const route = el("button", { type: "button", class: "act-btn", text: "In der XML-Ansicht bearbeiten", onclick: () => openInXml(tok) });
    return el("div", { class: "field-group" }, [f, el("div", { class: "field-actions" }, [route])]);
  }
  const f = field("Diplomatisch", shown, "");
  const input = f.querySelector("input");
  const apply = () => {
    const value = input.value.trim();
    if (value === shown) { inspectorNote("Keine Änderung an der diplomatischen Lesung."); return; }
    if (!value) { inspectorNote("Ein Wort braucht Text. Wörter löschen geht über die XML-Ansicht."); return; }
    if (/\s/.test(value)) { inspectorNote("Ein Leerzeichen würde das Wort teilen. Wörter teilen geht über die XML-Ansicht."); return; }
    // Text and @orig change together; a word without @orig (Got) keeps none.
    commit("Diplomatisch", () => { tok.text = value; if (tok.orig != null) tok.orig = value; });
    const w = state.words.find((x) => x.tok === tok);
    if (w) w.node.firstChild.data = value;
    input.value = value;
    input.defaultValue = value;
    flowEvents.dispatchEvent(new Event("edit"));
    inspectorNote(`Diplomatische Lesung „${value}“ übernommen.`);
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } });
  const buttons = el("div", { class: "field-actions" }, [
    el("button", { type: "button", class: "act-btn", text: "Abbrechen", onclick: () => { input.value = input.defaultValue; hideNote(); } }),
    el("button", { type: "button", class: "act-btn is-primary", text: "Anwenden", onclick: apply }),
  ]);
  return el("div", { class: "field-group" }, [f, buttons]);
}

function openInXml(tok) {
  setView("xml");
  const x = tok.id && document.querySelector(`.xml .xw[data-id="${CSS.escape(tok.id)}"]`);
  if (x) { x.classList.add("is-selected"); x.scrollIntoView({ block: "center" }); } else inspectorNote("Das Wort steht nicht im XML-Auszug dieses Entwurfs.");
}

wordFields.diplomatic = diplomaticField;

// Markup actions (F32, F33)

// Runs of consecutive words in the current column that form one element: words
// sharing one markup object, or one register reference. Returns [from, to] indices.
function runAround(k, same) {
  let a = k;
  let b = k;
  while (a > 0 && same(state.words[a - 1].tok, state.words[k].tok)) a--;
  while (b < state.words.length - 1 && same(state.words[b + 1].tok, state.words[k].tok)) b++;
  return [a, b];
}

// The reason a wrap of words[from..to] in `element` would be refused, or null.
function refusal(element, from, to) {
  for (let k = from; k <= to; k++) {
    const tok = state.words[k].tok;
    if (tok.markup) {
      const [a, b] = runAround(k, (x, y) => x.markup === y.markup);
      if (tok.markup.element !== element && actionOf(tok.markup.element) !== actionOf(element)) {
        return `„${state.words[k].node.textContent}“ steht bereits in <${tok.markup.element}>. Verschachteltes Markup wird in der XML-Ansicht angelegt.`;
      }
      // Replacing the value of part of an element would split it.
      if (a < from || b > to) return `Die Auswahl umfasst nur einen Teil des Elements <${tok.markup.element}> (${b - a + 1} Wörter). Ein Teilwechsel würde es teilen. Das ganze Element auswählen.`;
    }
    if (refKey(tok)) {
      const [a, b] = runAround(k, (x, y) => refKey(x) === refKey(y));
      // Inside the reference or around it is well-formed; across its edge is not.
      if ((a < from || b > to) && (from < a || to > b)) return `Die Auswahl schneidet den Registerverweis <ref> „${tok.ref.target.trim()}“ an seiner Grenze. Das Element würde geteilt.`;
    }
  }
  return null;
}

export function applyMarkup(group, value) {
  const words = selectedWords();
  if (!words.length || !state.sel) { notify("Erst Wörter im Text auswählen.", true); return; }
  const [element, attr] = group.split("/@");
  const { from, to } = state.sel;
  if (element === "hi") {
    // rend is per word in the model, so a hi never spans words and cannot be split.
    // A second Hervorhebung replaces the handbook value and keeps data values (ligature).
    const ok = commit(`Hervorhebung ${value}`, () => {
      for (const w of words) w.tok.rend = [...(w.tok.rend || []).filter((r) => !HI_VALUES.includes(r)), value];
    });
    if (ok) { rerenderWords('.act[data-action="Hervorhebung"] > button'); notify(`hi/@rend="${value}" auf ${words.length === 1 ? "das Wort" : `${words.length} Wörter`} angewendet.`, true); }
    return;
  }
  const reason = refusal(element, from, to);
  if (reason) { notify(reason, true); return; }
  // One object for the run, so its identity marks the element's extent (structuredClone
  // in history.js keeps shared references, so the run survives undo).
  const mk = { element, attr, value };
  commit(`${element} ${value}`, () => { for (const w of words) w.tok.markup = mk; });
  rerenderWords(`.act[data-action="${actionOf(element).label}"] > button`);
  notify(`<${element} ${attr}="${value}"> um ${words.length === 1 ? "das Wort" : `${words.length} Wörter`} gelegt.`, true);
}

function menuKeys(list) {
  list.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...list.querySelectorAll("button")];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  });
}

export function markupAction(m) {
  const wrap = el("div", { class: "act", "data-action": m.label });
  const btn = el("button", { type: "button", "aria-haspopup": "true", "aria-expanded": "false", text: `${m.label} ▾` });
  const list = el("ul", { class: "menu-list", role: "menu", hidden: "" });
  for (const [group, values] of m.groups) {
    list.append(el("li", { class: "menu-caption", role: "presentation", text: group }));
    for (const v of values) list.append(el("li", { role: "none" }, [el("button", { class: "menu-item", type: "button", role: "menuitem", text: v, onclick: () => { closeMenus(); applyMarkup(group, v); } })]));
  }
  menuKeys(list);
  btn.addEventListener("click", () => { const open = btn.getAttribute("aria-expanded") === "true"; closeMenus(); if (!open) { btn.setAttribute("aria-expanded", "true"); list.hidden = false; } });
  wrap.append(btn, list);
  return wrap;
}

function openAction(label) {
  const btn = $(`#inspector-body .act[data-action="${label}"] > button`);
  if (!btn) return;
  btn.click();
  btn.nextElementSibling.querySelector("button")?.focus();
}

export function markupSection(words) {
  const row = el("div", { class: "actions" }, [el("span", { text: "Markup" })]);
  const present = [...new Set(words.map((w) => w.tok.markup).filter(Boolean))];
  if (present.length) {
    row.append(el("p", { class: "markup-present" }, present.map((mk) => el("code", { text: `<${mk.element} ${mk.attr}="${mk.value}">` }))));
  }
  for (const m of MARKUP) row.append(markupAction(m));
  return row;
}

sections.push(markupSection);

// Mark in the flow: a dotted underline and the element name as a short label on the
// first word of the run, so the element does not rest on colour alone. The title stays
// with the apparatus marks (apparatus.js sets and clears it); the inspector names the
// element with its attribute.
wordDecorators.push((tok, node, k) => {
  const mk = tok.markup;
  if (!mk) return;
  node.classList.add("has-markup", `mk-${mk.element}`);
  if (k === 0 || state.words[k - 1]?.tok.markup !== mk) node.dataset.mk = mk.element;
});

// Strg+E: elements allowed at a word position (F21)

// Fixed list in the wireframe; the real tool reads the allowed elements from the manifest.
const ELEMENTS = [
  { name: "hi", label: "Hervorhebung", route: "Hervorhebung" },
  { name: "supplied", label: "Ergänzung", route: "Ergänzung" },
  { name: "surplus", label: "Tilgung (überflüssig)", route: "Tilgung" },
  { name: "del", label: "Tilgung (getilgt)", route: "Tilgung" },
  { name: "foreign", label: "Fremdsprache", route: "Fremdsprache" },
  { name: "num", label: "Zahl", route: "Zahl" },
  { name: "rs", label: "Registerverweis", route: "register" },
  { name: "seg", label: "Textregion", route: null },
];

export function elementList() {
  if (!state.sel) { notify("Erst Wörter im Text auswählen, dann Strg+E."); return; }
  // The line state carries no markup actions, so the line becomes a word sequence.
  if (state.sel.line) state.sel = { ...state.sel, line: null };
  openInspector();
  const list = el("ul", { class: "element-list", "aria-label": "Elemente für die Auswahl" });
  const box = el("div", { class: "element-choice" }, [
    el("div", { class: "group-title", text: "Element für Auswahl" }),
    el("p", { class: "element-note", text: "Feste Liste im Entwurf; das Werkzeug liest die zulässigen Elemente aus dem Manifest." }),
    list,
  ]);
  for (const e of ELEMENTS) {
    // The click must not reach menu.js's document handler, which would close the
    // value menu this choice opens.
    list.append(el("li", {}, [el("button", { type: "button", class: "element-item", onclick: (ev) => { ev.stopPropagation(); chooseElement(e, box); } }, [
      el("code", { text: `<${e.name}>` }), el("span", { text: e.label }),
    ])]));
  }
  menuKeys(list);
  $("#inspector-body").prepend(box);
  list.querySelector("button").focus();
}

function chooseElement(e, box) {
  box.remove();
  if (e.route === "register") {
    const input = $("#inspector-body .register input[role='combobox'], #inspector-body .register input");
    if (input) input.focus(); else inspectorNote("Kein Registerfeld für diese Auswahl.");
    return;
  }
  if (!e.route) { inspectorNote(STUB); return; }
  openAction(e.route);
}

actions.set("Bearbeiten/Element für Auswahl …", elementList);
