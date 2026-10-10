// Markup actions of the word states (phase 2 owner: word editing).
import { el, STUB } from "./state.js";
import { sections } from "./inspector.js";
import { closeMenus } from "./menu.js";
import { notify } from "./notice.js";

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

export function markupAction(m) {
  const wrap = el("div", { class: "act" });
  const btn = el("button", { type: "button", "aria-haspopup": "true", "aria-expanded": "false", text: `${m.label} ▾` });
  const list = el("ul", { class: "menu-list", role: "menu", hidden: "" });
  for (const [attr, values] of m.groups) {
    list.append(el("li", { class: "menu-caption", role: "presentation", text: attr }));
    for (const v of values) list.append(el("li", { role: "none" }, [el("button", { class: "menu-item", type: "button", role: "menuitem", text: v, onclick: () => { closeMenus(); notify(STUB, true); } })]));
  }
  btn.addEventListener("click", () => { const open = btn.getAttribute("aria-expanded") === "true"; closeMenus(); if (!open) { btn.setAttribute("aria-expanded", "true"); list.hidden = false; } });
  wrap.append(btn, list);
  return wrap;
}

export function markupSection() {
  const row = el("div", { class: "actions" }, [el("span", { text: "Markup" })]);
  for (const m of MARKUP) row.append(markupAction(m));
  return row;
}

sections.push(markupSection);
