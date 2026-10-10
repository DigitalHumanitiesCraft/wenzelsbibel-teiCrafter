// Arbeitsleiste: the two toolbars at the top, the command registry behind their
// controls, keyboard shortcuts and the Escape order. A control names its command with
// data-cmd (runs it) or data-guard (a dropdown that opens only while the command is
// allowed). A command that is not allowed is disabled with its reason as title, never
// hidden, and its activation states the reason.
import { $, shell, state, STUB } from "./state.js";
import { activeDoc, canRedo, canUndo, onChange, redo, undo } from "./history.js";
import { flowEvents, highlightSelection } from "./flow.js";
import { closePopover, isPopoverOpen } from "./popover.js";
import { closePanel, isPanelOpen } from "./panel.js";
import { notify } from "./notice.js";

// id => { run, blocked: () => reason or null }
export const actions = new Map();

export function command(id, run, blocked = () => null) { actions.set(id, { run, blocked }); }

const DOC_NAME = { codex: "Codex", images: "Bildannotationen" };

// The reason an action on the selection is not possible now, or null.
export function selectionReason() {
  if (activeDoc() === "images") return "Gilt für den Codex. Erst im Dokumentwähler Codex 2759 wählen.";
  if (!state.sel) return "Erst ein Wort, eine Wortfolge oder eine Zeile im Text auswählen.";
  return null;
}

// Each step names what it reverted or repeated, because the view may not show it.
command("undo", () => { const label = undo(); notify(`Rückgängig: ${label}.`); },
  () => (canUndo() ? null : `Nichts rückgängig zu machen in ${DOC_NAME[activeDoc()]}.`));
command("redo", () => { const label = redo(); notify(`Wiederholt: ${label}.`); },
  () => (canRedo() ? null : `Nichts zu wiederholen in ${DOC_NAME[activeDoc()]}.`));
command("search", () => notify(STUB));

export function runAction(id) {
  const a = actions.get(id);
  if (!a) { notify(STUB); return; }
  const reason = a.blocked();
  if (reason) { notify(reason); return; }
  a.run();
}

// Shortcuts by lower-case key with Ctrl or Cmd. Without the interception the browser
// would open its own save dialog, address bar or find bar.
const SHORTCUTS = { s: "save", e: "element", f: "search", z: "undo", y: "redo" };

export function initToolbar() {
  for (const bar of document.querySelectorAll(".toolbar")) {
    bar.addEventListener("keydown", onBarKey);
    bar.addEventListener("focusin", (e) => { if (items(bar).includes(e.target)) { bar.current = e.target; rove(bar); } });
  }
  document.addEventListener("click", onClick);
  document.addEventListener("click", (e) => { if (!e.target.closest(".act")) closeMenus(); });
  // A fixed dropdown follows its button when the toolbar scrolls sideways or the window changes.
  for (const bar of document.querySelectorAll(".toolbar")) bar.addEventListener("scroll", placeOpenMenu);
  addEventListener("resize", placeOpenMenu);
  // Capture phase, so the facsimile viewer's own key handling cannot swallow Escape.
  document.addEventListener("keydown", onKey, true);
  for (const t of [flowEvents, shell]) for (const type of ["select", "column", "edit", "view", "side"]) t.addEventListener(type, scheduleSync);
  onChange(scheduleSync);
  syncToolbar();
}

// Enabled state, reasons and toggle states follow the selection, view, history and panel.
let syncFrame = 0;
export function scheduleSync() { if (!syncFrame) syncFrame = requestAnimationFrame(() => { syncFrame = 0; syncToolbar(); }); }

export function syncToolbar() {
  for (const n of document.querySelectorAll("[data-cmd], [data-guard]")) {
    const a = actions.get(n.dataset.cmd || n.dataset.guard);
    const reason = a ? a.blocked() : null;
    n.setAttribute("aria-disabled", String(Boolean(reason)));
    if (reason) n.title = reason;
    else if (n.dataset.title) n.title = n.dataset.title;
    else n.removeAttribute("title");
  }
  $("#toggle-facs").setAttribute("aria-pressed", String(state.side === "facs"));
  $("#toggle-zones").setAttribute("aria-pressed", String(state.zones));
  for (const bar of document.querySelectorAll(".toolbar")) rove(bar);
}

function onClick(e) {
  const trigger = e.target.closest(".act > button");
  if (trigger) {
    const open = trigger.getAttribute("aria-expanded") === "true";
    closeMenus();
    if (trigger.getAttribute("aria-disabled") === "true") { notify(trigger.title); return; }
    if (!open) openMenu(trigger);
    return;
  }
  const n = e.target.closest("[data-cmd]");
  if (!n) return;
  const wrap = n.closest(".act");
  closeMenus();
  runAction(n.dataset.cmd);
  scheduleSync();
  // After a menu entry runs, focus goes back to its dropdown button, unless the action
  // moved it somewhere visible itself (into the popover, the text, a side panel).
  const a = document.activeElement;
  if (wrap && (!a || a === document.body || wrap.querySelector(".menu-list").contains(a))) wrap.querySelector(":scope > button").focus();
}

function onKey(e) {
  if (e.key === "Escape") { onEscape(e); return; }
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  let id = SHORTCUTS[k];
  if (!id) return;
  if (k === "z" && e.shiftKey) id = "redo";
  // A field with typing not yet applied keeps the browser's own text undo; once its
  // value equals the applied one (defaultValue), Ctrl+Z belongs to the document.
  const t = e.target;
  if ((id === "undo" || id === "redo") && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) && t.value !== t.defaultValue) return;
  e.preventDefault();
  runAction(id);
}

// Toolbar keys (WAI-ARIA toolbar pattern): one Tab stop per toolbar, Left and Right move
// between its controls, Home and End jump to the ends, Down and Up open a dropdown on its
// first or last entry. Inside an open dropdown Down, Up, Home and End move, Left and Right
// close it and move on. Enter and Space are the buttons' own activation.
const items = (bar) => [...bar.querySelectorAll("button, select")].filter((n) => !n.closest(".menu-list") && n.offsetParent !== null);
const entries = (list) => [...list.querySelectorAll(".menu-item")];

function rove(bar) {
  const list = items(bar);
  const cur = list.includes(bar.current) ? bar.current : list[0];
  for (const n of list) n.tabIndex = n === cur ? 0 : -1;
}

function onBarKey(e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const bar = e.currentTarget;
  const list = items(bar);
  const inMenu = e.target.closest(".menu-list");
  const control = inMenu ? inMenu.closest(".act").querySelector(":scope > button") : e.target;
  const i = list.indexOf(control);
  if (i < 0) return;
  const go = (j) => { closeMenus(); list[(j + list.length) % list.length].focus(); };
  if (inMenu) {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      const its = entries(inMenu);
      const at = its.indexOf(document.activeElement);
      const step = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: its.length - 1 }[e.key];
      its[(step + its.length) % its.length]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") go(i + (e.key === "ArrowRight" ? 1 : -1));
    else if (e.key === "Tab") { closeMenus(); control.focus(); return; }
    else return;
    e.preventDefault();
    return;
  }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") go(i + (e.key === "ArrowRight" ? 1 : -1));
  else if (e.key === "Home" || e.key === "End") go(e.key === "Home" ? 0 : list.length - 1);
  else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && control.matches(".act > button")) {
    if (control.getAttribute("aria-disabled") === "true") { notify(control.title); e.preventDefault(); return; }
    closeMenus();
    openMenu(control, e.key === "ArrowDown" ? "first" : "last");
  } else return;
  e.preventDefault(); // also keeps Left and Right from changing the document select
}

// Opens a dropdown; `wrap.fill` (markup.js) rebuilds its entries for the current selection.
export function openMenu(btn, focus = null) {
  // An open hit list would otherwise sit above the menu in the Escape order and pull
  // focus back into its field when Escape closes it.
  for (const l of document.querySelectorAll(".ac-list:not([hidden]), .ic-hits:not([hidden])")) l.closeList(false);
  const wrap = btn.closest(".act");
  wrap.fill?.();
  const list = wrap.querySelector(".menu-list");
  btn.setAttribute("aria-expanded", "true");
  list.hidden = false;
  placeMenu(btn, list);
  const its = entries(list);
  if (focus === "first") its[0]?.focus();
  if (focus === "last") its[its.length - 1]?.focus();
}

// The list is fixed to the viewport (wireframe.css), below its button and inside the window.
function placeMenu(btn, list) {
  const r = btn.getBoundingClientRect();
  list.style.top = `${r.bottom + 2}px`;
  list.style.left = `${Math.max(8, Math.min(r.left, innerWidth - list.offsetWidth - 8))}px`;
  list.style.maxHeight = `${Math.max(innerHeight - r.bottom - 12, 120)}px`;
}

function placeOpenMenu() {
  const btn = document.querySelector('.act > button[aria-expanded="true"]');
  if (btn) placeMenu(btn, btn.closest(".act").querySelector(".menu-list"));
}

export function closeMenus() {
  for (const b of document.querySelectorAll('.act > button[aria-expanded="true"]')) {
    b.setAttribute("aria-expanded", "false");
    b.closest(".act").querySelector(".menu-list").hidden = true;
  }
}

// Agreed order: autocomplete, dropdown, a side panel holding the focus, the popover,
// the side panel, the selection. Each step closes one layer and
// returns the focus to where that layer was opened from. The ICONCLASS hit list closes
// first in its own handler (miniature.js).
function onEscape(e) {
  const ac = document.querySelector(".ac-list:not([hidden])");
  if (ac) { ac.closeList(); e.preventDefault(); return; }
  const origin = document.querySelector('.act > button[aria-expanded="true"]');
  if (origin) { closeMenus(); origin.focus(); return; }
  // The facsimile is a view, switched by its toggle, not a layer that Escape closes.
  const panel = isPanelOpen() && state.side !== "facs";
  if (panel && $("#side").contains(document.activeElement)) { closePanel(); return; }
  if (isPopoverOpen()) { closePopover(); return; }
  if (panel) { closePanel(); return; }
  if (state.sel) {
    const s = getSelection();
    if (s.rangeCount && $("#flow").contains(s.anchorNode)) s.collapseToStart();
    state.sel = null; state.quiet = true; highlightSelection();
    scheduleSync();
  }
}
