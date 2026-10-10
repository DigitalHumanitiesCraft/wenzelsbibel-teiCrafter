// Menu bar, the action registry behind it, keyboard shortcuts and the Escape order.
import { $, el, state, STUB } from "./state.js";
import { activeDoc, canRedo, canUndo, onChange, redo, undo } from "./history.js";
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
const DOC_NAME = { codex: "Codex", images: "Bildannotationen" };

// Each step names what it reverted or repeated, because the view may not show it.
actions.set(UNDO, () => {
  const label = undo();
  notify(label ? `Rückgängig: ${label}.` : `Nichts rückgängig zu machen in ${DOC_NAME[activeDoc()]}.`);
});
actions.set(REDO, () => {
  const label = redo();
  notify(label ? `Wiederholt: ${label}.` : `Nichts zu wiederholen in ${DOC_NAME[activeDoc()]}.`);
});

// Shortcuts by lower-case key with Ctrl or Cmd. Without the interception the browser
// would open its own save dialog, address bar or find bar.
const SHORTCUTS = { s: "Datei/Speichern", e: "Bearbeiten/Element für Auswahl …", f: "Bearbeiten/Suchen", z: UNDO, y: REDO };

export function buildMenus() {
  const ul = $("#menus");
  for (const menu of MENUS) {
    const li = el("li", { role: "none" });
    const btn = el("button", { class: "menu-btn", type: "button", role: "menuitem", "aria-haspopup": "menu", "aria-expanded": "false", text: menu.label });
    const list = el("ul", { class: "menu-list", role: "menu", hidden: "" });
    for (const item of menu.items) {
      if (item === "-") { list.append(el("li", { class: "menu-sep", role: "separator" })); continue; }
      const [label, key] = Array.isArray(item) ? item : [item, ""];
      const b = el("button", { class: "menu-item", type: "button", role: "menuitem", tabindex: "-1", onclick: () => runFromMenu(btn, list, () => menuAction(menu.label, label)) }, [el("span", { text: label })]);
      if (key) b.append(el("kbd", { text: key }));
      items.set(`${menu.label}/${label}`, b);
      list.append(el("li", { role: "none" }, [b]));
    }
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      closeMenus();
      if (!open) openMenu(btn);
    });
    li.append(btn, list);
    ul.append(li);
  }
  ul.addEventListener("keydown", onMenuKey);
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

// Menu bar keys (WAI-ARIA menubar pattern): Left and Right move between the menus and
// carry an open menu along, Down and Up open a menu or move inside it, Home and End
// jump to the ends. Enter and Space are the buttons' own activation.
const menuButtons = () => [...document.querySelectorAll("#menus .menu-btn")];
const enabledItems = (list) => [...list.querySelectorAll(".menu-item:not(:disabled)")];

function openMenu(btn, focus = null) {
  // An open hit list would otherwise sit above the menu in the Escape order and pull
  // focus back into its field when Escape closes it.
  for (const l of document.querySelectorAll(".ac-list:not([hidden]), .ic-hits:not([hidden])")) l.closeList(false);
  const list = btn.nextElementSibling;
  btn.setAttribute("aria-expanded", "true");
  list.hidden = false;
  const its = enabledItems(list);
  if (focus === "first") its[0]?.focus();
  if (focus === "last") its[its.length - 1]?.focus();
}

function onMenuKey(e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const btns = menuButtons();
  const inList = e.target.closest(".menu-list");
  const btn = inList ? inList.previousElementSibling : e.target.closest(".menu-btn");
  if (!btn) return;
  const i = btns.indexOf(btn);
  const isOpen = btn.getAttribute("aria-expanded") === "true";
  const go = (j, focus) => {
    const next = btns[(j + btns.length) % btns.length];
    closeMenus();
    if (focus) openMenu(next, focus); else next.focus();
  };
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    go(i + (e.key === "ArrowRight" ? 1 : -1), isOpen ? "first" : null);
  } else if (!inList && (e.key === "Home" || e.key === "End")) {
    go(e.key === "Home" ? 0 : btns.length - 1, isOpen ? "first" : null);
  } else if (!inList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    closeMenus();
    openMenu(btn, e.key === "ArrowDown" ? "first" : "last");
  } else if (inList && ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
    const its = enabledItems(inList);
    const at = its.indexOf(document.activeElement);
    const step = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: its.length - 1 }[e.key];
    its[(step + its.length) % its.length]?.focus();
  } else if (inList && e.key === "Tab") {
    closeMenus();
    btn.focus();
    return;
  } else return;
  e.preventDefault();
}

// After an entry runs, focus goes back to its menu button, unless the action moved it
// somewhere visible itself (into the inspector, the text, a form field).
function runFromMenu(btn, list, run) {
  closeMenus();
  run();
  const a = document.activeElement;
  if (!a || a === document.body || list.contains(a)) btn.focus();
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
