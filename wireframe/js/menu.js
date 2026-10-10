// Menu bar, the action registry behind it, keyboard shortcuts and the Escape order.
import { $, el, state, STUB } from "./state.js";
import { canRedo, canUndo, onChange, redo, undo } from "./history.js";
import { highlightSelection } from "./flow.js";
import { closeInspector } from "./inspector.js";
import { notify } from "./notice.js";

export const MENUS = [
  { label: "Datei", items: ["Öffnen …", "Projektordner öffnen …", "-", ["Speichern", "Strg+S"], "-", "Zuletzt geöffnet"] },
  { label: "Bearbeiten", items: [["Rückgängig", "Strg+Z"], ["Wiederholen", "Strg+Y"], "-", ["Suchen", "Strg+F"], "-", "Apparatkommentar zur Auswahl", ["Element für Auswahl …", "Strg+E"], "-", "XML formatieren"] },
  { label: "Ansicht", items: [["Text", ""], ["XML", ""], "-", "Faksimile", "Zonen", "Auswahl"] },
  { label: "Register", items: ["Personen", "Orte", "Völker", "-", "Eintrag anlegen …", "Verweise auf Eintrag anzeigen"] },
  { label: "Prüfen", items: ["Wohlgeformtheit", "TEI All", "Schematron editing", "Schematron review", "-", "Befundliste"] },
  { label: "Hilfe", items: ["Transkriptionsrichtlinie", "Über"] },
];

// "Menü/Eintrag" => () => void. Entries without a registered action answer STUB.
export const actions = new Map();

// "Menü/Eintrag" => the entry's button, for enabling and disabling.
const items = new Map();

const UNDO = "Bearbeiten/Rückgängig";
const REDO = "Bearbeiten/Wiederholen";
actions.set(UNDO, undo);
actions.set(REDO, redo);

// Shortcuts by lower-case key with Ctrl or Cmd. Without the interception the browser
// would open its own save dialog, address bar or find bar.
const SHORTCUTS = { s: "Datei/Speichern", e: "Bearbeiten/Element für Auswahl …", f: "Bearbeiten/Suchen", z: UNDO, y: REDO };

export function buildMenus() {
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
      items.set(`${menu.label}/${label}`, b);
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
  document.addEventListener("keydown", onKey, true);
  const syncHistory = () => { setItemEnabled(UNDO, canUndo()); setItemEnabled(REDO, canRedo()); };
  onChange(syncHistory);
  syncHistory();
}

function onKey(e) {
  if (e.key === "Escape") { onEscape(e); return; }
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  let key = SHORTCUTS[k];
  if (!key) return;
  if (k === "z" && e.shiftKey) key = REDO;
  // A field with typing not yet applied keeps the browser's own text undo; once its
  // value equals the applied one (defaultValue), Ctrl+Z belongs to the document.
  const t = e.target;
  if ((key === UNDO || key === REDO) && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) && t.value !== t.defaultValue) return;
  e.preventDefault();
  runAction(key);
}

export function setItemEnabled(key, on) {
  const b = items.get(key);
  if (!b) return;
  b.disabled = !on;
  b.setAttribute("aria-disabled", String(!on));
}

export function closeMenus() {
  for (const b of document.querySelectorAll('.menus [aria-expanded="true"], .act > [aria-expanded="true"]')) { b.setAttribute("aria-expanded", "false"); b.nextElementSibling.hidden = true; }
}

export function runAction(key) {
  const fn = actions.get(key);
  if (fn) fn(); else notify(STUB);
}

export function menuAction(menu, label) { runAction(`${menu}/${label}`); }

// Agreed order: autocomplete, menus, inspector, selection. Each step closes one layer.
function onEscape(e) {
  const ac = document.querySelector(".ac-list:not([hidden])");
  if (ac) { ac.closeList(); e.preventDefault(); return; }
  const origin = document.querySelector('.menus [aria-expanded="true"], .act > [aria-expanded="true"]');
  if (origin) { closeMenus(); origin.focus(); return; }
  if (!$("#inspector").hidden) { closeInspector(); return; }
  if (state.sel) {
    const s = getSelection();
    if (s.rangeCount && $("#flow").contains(s.anchorNode)) s.collapseToStart();
    state.sel = null; state.quiet = true; highlightSelection();
  }
}
