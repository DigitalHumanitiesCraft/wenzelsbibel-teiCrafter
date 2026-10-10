// Word editing: the applicable Diplomatisch field (F29), the markup dropdowns of the
// Arbeitsleiste (F32, F33) and the element list behind Strg+E (F21).
import { $, el, refKey, state } from "./state.js";
import { commit } from "./history.js";
import { flowEvents, highlightSelection, renderFlow, selectedWords, setWordRange, wordDecorators } from "./flow.js";
import { field, hideNote, isPopoverOpen, openPopover, popoverNote, sections, wordFields } from "./popover.js";
import { closeMenus, command, openMenu, selectionReason } from "./toolbar.js";
import { notify } from "./notice.js";
import { setView } from "./xml.js";

// The five markup actions of F32 with the handbook values (editorial-guidelines.md,
// controlled vocabularies); the real tool reads them from the project vocabulary
// docs/schemas/wenzelsbibel-vocabulary.json (F32). Tilgung covers surplus/@reason and
// del/@type. Data-only values such as erasure_point stay out until the edition team
// ratifies them.
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
// as a ligature, choice, anchors, damage) is edited in the XML view. The
// earlier test (ligature rend, a line break in the text) misses merteín, whose inner
// lb the model does not carry, so the excerpt decides where it holds the word.
export function hasInnerMarkup(tok) {
  if ((tok.rend || []).includes("ligature") || /\n/.test(tok.text || "")) return true;
  const content = tok.id ? wordContent(tok.id) : undefined;
  if (content === undefined) return false;
  const whole = /^<hi\b[^>]*>([^<]*)<\/hi>$/.exec(content);
  return /</.test(whole ? whole[1] : content);
}

// Re-render after a commit that changed what the flow shows; app.js re-renders only
// after undo and redo. The selection and an open popover return to the same words, and
// the focus to the toolbar control that applied the change.
function rerenderWords(focusSelector) {
  const sel = state.sel;
  renderFlow();
  state.sel = sel;
  if (sel && state.view === "text") setWordRange(sel.from, sel.to);
  highlightSelection();
  if (isPopoverOpen()) openPopover();
  if (focusSelector) $(focusSelector)?.focus();
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
    if (value === shown) { popoverNote("Keine Änderung an der diplomatischen Lesung."); return; }
    if (!value) { popoverNote("Ein Wort braucht Text."); return; }
    if (/\s/.test(value)) { popoverNote("Ein Leerzeichen würde das Wort teilen."); return; }
    // Text and @orig change together; a word without @orig (Got) keeps none.
    commit("Diplomatisch", () => { tok.text = value; if (tok.orig != null) tok.orig = value; });
    const w = state.words.find((x) => x.tok === tok);
    if (w) w.node.firstChild.data = value;
    input.value = value;
    input.defaultValue = value;
    flowEvents.dispatchEvent(new Event("edit"));
    popoverNote(`Diplomatische Lesung „${value}“ übernommen.`);
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
  if (x) { x.classList.add("is-selected"); x.scrollIntoView({ block: "center" }); } else popoverNote("Das Wort steht nicht im XML.");
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
        return `„${state.words[k].node.textContent}“ steht bereits in <${tok.markup.element}>.`;
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

// The values of `group` the selected words carry now, as "element/@attr=value" keys for
// the menu and as display strings for the note.
function currentValues(words, group) {
  const [element] = group.split("/@");
  if (element === "hi") return [...new Set(words.flatMap((w) => (w.tok.rend || []).filter((r) => HI_VALUES.includes(r))))];
  return [...new Set(words.map((w) => w.tok.markup).filter((mk) => mk && `${mk.element}/@${mk.attr}` === group).map((mk) => mk.value))];
}

// Values of the same action that a new value replaces, named in the note, so a
// replacement is never silent (rubrication on Rotlebín replaced by gold).
const replacedNote = (old, value) => {
  const gone = old.filter((v) => v !== value);
  return gone.length ? ` ${gone.join(", ")} durch ${value} ersetzt.` : "";
};

export function applyMarkup(group, value) {
  const words = selectedWords();
  if (!words.length || !state.sel) { notify("Erst Wörter im Text auswählen.", true); return; }
  const [element, attr] = group.split("/@");
  const { from, to } = state.sel;
  const scope = words.length === 1 ? "das Wort" : `${words.length} Wörter`;
  if (element === "hi") {
    const old = currentValues(words, group);
    if (old.length === 1 && old[0] === value && words.every((w) => (w.tok.rend || []).includes(value))) { notify(`hi/@rend="${value}" ist bereits gesetzt.`, true); return; }
    // rend is per word in the model, so a hi never spans words and cannot be split.
    // A second Hervorhebung replaces the handbook value and keeps data values (ligature).
    const ok = commit(`Hervorhebung ${value}`, () => {
      for (const w of words) w.tok.rend = [...(w.tok.rend || []).filter((r) => !HI_VALUES.includes(r)), value];
    });
    if (ok) { rerenderWords('#tb-markup .act[data-action="Hervorhebung"] > button'); notify(`hi/@rend="${value}" für ${scope} übernommen.${replacedNote(old, value)}`, true); }
    return;
  }
  const reason = refusal(element, from, to);
  if (reason) { notify(reason, true); return; }
  // An element of the same action that the new one replaces (supplied, or surplus by del).
  const before = [...new Set(words.map((w) => w.tok.markup).filter(Boolean))];
  if (before.length === 1 && before[0].element === element && before[0].value === value && words.every((w) => w.tok.markup === before[0])) {
    notify(`<${element} ${attr}="${value}"> ist bereits gesetzt.`, true);
    return;
  }
  const old = before.map((mk) => (mk.element === element ? mk.value : `<${mk.element} ${mk.attr}="${mk.value}">`));
  // One object for the run, so its identity marks the element's extent (structuredClone
  // in history.js keeps shared references, so the run survives undo).
  const mk = { element, attr, value };
  commit(`${element} ${value}`, () => { for (const w of words) w.tok.markup = mk; });
  rerenderWords(`#tb-markup .act[data-action="${actionOf(element).label}"] > button`);
  notify(`<${element} ${attr}="${value}"> um ${scope} gelegt.${replacedNote(old, value)}`, true);
}

// Up and Down move inside the element list of Strg+E.
function listKeys(list) {
  list.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...list.querySelectorAll("button")];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  });
}

// One dropdown of the Arbeitsleiste per action. Its entries are rebuilt each time it
// opens (toolbar.js calls wrap.fill), so the value the selection carries now is a checked
// radio item with a visible "aktuell", and the user sees what a choice would replace.
function markupAction(m) {
  const wrap = el("div", { class: "act", "data-action": m.label });
  const btn = el("button", { type: "button", "aria-haspopup": "menu", "aria-expanded": "false", "data-guard": "markup" }, [m.label, " ", el("span", { "aria-hidden": "true", text: "▾" })]);
  const list = el("ul", { class: "menu-list", role: "menu", "aria-label": m.label, hidden: "" });
  wrap.fill = () => {
    const words = selectedWords();
    list.replaceChildren();
    for (const [group, values] of m.groups) {
      const current = currentValues(words, group);
      list.append(el("li", { class: "menu-caption", role: "presentation", text: group }));
      for (const v of values) {
        const on = current.includes(v);
        const item = el("button", { class: "menu-item", type: "button", role: "menuitemradio", tabindex: "-1", "aria-checked": String(on), onclick: () => { closeMenus(); applyMarkup(group, v); } }, [v]);
        if (on) item.append(el("span", { class: "menu-current", text: "aktuell" }));
        list.append(el("li", { role: "none" }, [item]));
      }
    }
  };
  wrap.append(btn, list);
  return wrap;
}

$("#tb-markup").append(...MARKUP.map(markupAction));
command("markup", () => {}, selectionReason);

function openAction(label) {
  const btn = $(`#tb-markup .act[data-action="${label}"] > button`);
  if (btn) openMenu(btn, "first");
}

// The elements the selection carries, named with their attribute, so the popover shows
// what a markup dropdown would replace.
sections.push((words) => {
  const present = [...new Set(words.map((w) => w.tok.markup).filter(Boolean))];
  if (!present.length) return null;
  return el("div", { class: "markup-row" }, [
    el("span", { class: "group-title", text: "Markup" }),
    el("p", { class: "markup-present" }, present.map((mk) => el("code", { text: `<${mk.element} ${mk.attr}="${mk.value}">` }))),
  ]);
});

// Mark in the flow: a dotted underline and the element name as a short label on the
// first word of the run, so the element does not rest on colour alone. The title stays
// with the apparatus marks (apparatus.js sets and clears it); the popover names the
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
];

export function elementList() {
  // The line state carries no register field, so the line becomes a word sequence.
  if (state.sel.line) state.sel = { ...state.sel, line: null };
  state.quiet = false;
  openPopover();
  const list = el("ul", { class: "element-list", "aria-label": "Elemente für die Auswahl" });
  const box = el("div", { class: "element-choice" }, [
    el("div", { class: "group-title", text: "Element für Auswahl" }),
    list,
  ]);
  for (const e of ELEMENTS) {
    // The click must not reach toolbar.js's document handler, which would close the
    // value menu this choice opens.
    list.append(el("li", {}, [el("button", { type: "button", class: "element-item", onclick: (ev) => { ev.stopPropagation(); chooseElement(e, box); } }, [
      el("code", { text: `<${e.name}>` }), el("span", { text: e.label }),
    ])]));
  }
  listKeys(list);
  $("#popover-content").prepend(box);
  list.querySelector("button").focus();
}

function chooseElement(e, box) {
  box.remove();
  if (e.route === "register") {
    const input = $("#popover-content .register input[role='combobox'], #popover-content .register input");
    if (input) input.focus(); else popoverNote("Kein Registerfeld für diese Auswahl.");
    return;
  }
  openAction(e.route);
}

command("element", elementList, selectionReason);
