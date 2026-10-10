// Seitenleiste: the right column that the facsimile shares with the side panels for
// lists and large forms (Befunde, Verweise, Bild), switched by one tab row, so opening a
// list never pushes the text. Feature modules register a tab's default content in
// `tabs` and fill a tab with openPanel.
import { $, shell, state } from "./state.js";

// tab => { show(): renders the tab's default content, fresh: re-render on every
// activation (otherwise kept, so unapplied input survives a tab switch),
// returnFocus(): true when it placed the focus after the panel closed }
export const tabs = new Map();

// tab => { reopen } for tabs whose content was filled; reopen rebuilds it from state.data.
const content = new Map();
let origin = null; // the element that had focus when the column opened

const side = () => $("#side");
const panelOf = (tab) => $(`#side [role="tabpanel"][data-tab="${tab}"]`);
export const panelBody = (tab) => panelOf(tab).querySelector(".panel-body");
export const isPanelOpen = () => state.side !== null;

// Shows the column on `tab`. With `render`, the tab's default content is built.
export function showTab(tab, render = false) {
  const was = state.side;
  if (!was) {
    const a = document.activeElement;
    // A menu entry is hidden once its menu closes; its dropdown button stands in.
    origin = a && a.closest(".menu-list") ? a.closest(".act").querySelector(":scope > button") : a;
  }
  state.side = tab;
  side().hidden = false;
  $("#work").classList.add("has-side");
  $("#work").classList.toggle("side-sheet", tab !== "facs");
  for (const b of side().querySelectorAll('[role="tab"]')) {
    const on = b.dataset.tab === tab;
    b.setAttribute("aria-selected", String(on));
    b.classList.toggle("is-active", on);
    b.tabIndex = on ? 0 : -1;
  }
  for (const p of side().querySelectorAll('[role="tabpanel"]')) p.hidden = p.dataset.tab !== tab;
  if (render) tabs.get(tab)?.show();
  syncSheet();
  if (was !== tab) shell.dispatchEvent(new Event("side"));
}

// Fills a tab with a title and body. `reopen` rebuilds it after undo or redo; without
// it the content stays as it is.
export function openPanel(tab, titleNodes, bodyNodes, reopen = null) {
  showTab(tab);
  content.set(tab, { reopen });
  hideNote();
  const p = panelOf(tab);
  p.querySelector(".panel-title").replaceChildren(...titleNodes);
  p.querySelector(".panel-body").replaceChildren(...bodyNodes);
}

export const hasContent = (tab) => content.has(tab);

// Rebuild after undo or redo: every filled tab, so a tab shown later is not stale.
// Focus returns to the control at the same position in the visible tab.
export function refreshPanel() {
  const body = state.side ? panelOf(state.side) : null;
  const focusables = () => (body ? [...body.querySelectorAll("input, textarea, select, button")] : []);
  const i = focusables().indexOf(document.activeElement);
  for (const [, c] of content) if (c.reopen) c.reopen();
  if (i >= 0) focusables()[i]?.focus();
}

export function closePanel() {
  if (!state.side) return;
  const tab = state.side;
  const hadFocus = side().contains(document.activeElement);
  state.side = null;
  side().hidden = true;
  $("#work").classList.remove("has-side", "side-sheet");
  hideNote();
  syncSheet(); // before the focus move below, which inert would refuse
  shell.dispatchEvent(new Event("side"));
  if (!hadFocus && document.activeElement !== document.body) return;
  if (tabs.get(tab)?.returnFocus?.()) return;
  const back = origin && origin.isConnected && origin.offsetParent !== null && !origin.closest("[inert]") ? origin : $("#flow");
  if (back.offsetParent !== null) back.focus({ preventScroll: true });
}

// Tab row: click activates; Left, Right, Home and End move the focus, Enter or Space
// activates (manual activation, because the facsimile tab loads the image).
export function initPanel() {
  const row = side().querySelector('[role="tablist"]');
  row.addEventListener("click", (e) => {
    const b = e.target.closest('[role="tab"]');
    if (!b) return;
    const hook = tabs.get(b.dataset.tab);
    showTab(b.dataset.tab, Boolean(hook && (hook.fresh || !content.has(b.dataset.tab))));
  });
  row.addEventListener("keydown", (e) => {
    const bs = [...row.querySelectorAll('[role="tab"]')];
    const i = bs.indexOf(document.activeElement);
    if (i < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const j = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: bs.length - 1 }[e.key];
    bs[(j + bs.length) % bs.length].focus();
  });
  $("#side-close").addEventListener("click", closePanel);
  narrow.addEventListener("change", syncSheet);
}

// On narrow screens a side panel other than the facsimile is a sheet over the text
// (wireframe.css). The covered text pane becomes inert while it is open, so neither
// pointer nor Tab reaches what the sheet hides; the Arbeitsleiste stays operable.
export const narrow = matchMedia("(width < 48rem)");

function syncSheet() {
  const pane = $("#text-pane");
  const cover = narrow.matches && state.side !== null && state.side !== "facs";
  if (cover === pane.inert) return;
  const hadFocus = pane.contains(document.activeElement);
  pane.inert = cover;
  if (cover && hadFocus) $(`#tab-${state.side}`).focus();
}

// Short-lived message under the tab row, for controls inside a side panel.
let noteTimer = 0;

export function panelNote(text) {
  const note = $("#panel-note");
  note.textContent = text;
  note.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(hideNote, 5000);
}

function hideNote() { clearTimeout(noteTimer); $("#panel-note").hidden = true; }
