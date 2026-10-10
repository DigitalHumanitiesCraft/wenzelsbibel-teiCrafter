// Notice bar and live announcements. No permanent status line: the bar shows either a
// short-lived message or a standing content (such as check findings) that a feature
// sets with setStanding, and disappears when neither exists.
import { $, el } from "./state.js";
import { isPopoverOpen, popoverNote } from "./popover.js";

let noticeTimer = 0;
let standing = null; // () => Node[] for the bar's standing content, or null

function restore() {
  const bar = $("#notice");
  if (standing) { bar.replaceChildren(...standing()); bar.hidden = false; } else bar.hidden = true;
}

// A message about the selection goes under the popover head while the popover is open,
// otherwise to the notice bar, which returns to its standing content after a while.
export function notify(text, atSelection = false) {
  if (atSelection && isPopoverOpen()) { popoverNote(text); return; }
  const bar = $("#notice");
  bar.replaceChildren(el("span", { text }));
  bar.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(restore, 4000);
}

// Sets (or with null clears) the standing content and shows it at once.
export function setStanding(render) {
  standing = render;
  clearTimeout(noticeTimer);
  restore();
}

// For status changes without a visible bar, such as a clean check.
export function announce(text) { const a = $("#announce"); a.textContent = ""; requestAnimationFrame(() => { a.textContent = text; }); }
