// Register linking and autocomplete (phase 2 owner: register).
import { chipFor, el, refKey, state, STUB, TYPE_LABEL } from "./state.js";
import { sections } from "./inspector.js";
import { notify } from "./notice.js";

export function registerEntries() {
  const reg = state.data.registers;
  const entries = [];
  const seen = new Set();
  const add = (type, id) => { const k = `${type}|${id.trim()}`; if (!seen.has(k) && id.trim()) { seen.add(k); entries.push({ type, id: id.trim() }); } };
  for (const [type, list] of Object.entries(reg.codex || {})) for (const e of list) add(type, e.id);
  for (const id of reg.places || []) add("place", id);
  for (const id of reg.persons || []) add("person", id);
  return entries.sort((a, b) => a.id.localeCompare(b.id, "de"));
}

export function registerSection(ref) {
  const sec = el("div", { class: "register" });
  sec.append(el("div", { class: "group-title", text: "Register" }));
  const linked = el("div", { class: "linked" });
  if (ref) linked.append(chipFor(`${ref.type}|${ref.target}`), el("button", { class: "link-btn", type: "button", text: "Verknüpfung lösen", onclick: () => notify(STUB, true) }));
  else linked.append(el("span", { class: "empty-note", text: "Nicht verknüpft" }));
  sec.append(linked);
  const typeSel = el("select", { "aria-label": "Registertyp" }, [el("option", { value: "", text: "Alle" }), ...Object.entries(TYPE_LABEL).map(([v, t]) => el("option", { value: v, text: t }))]);
  const input = el("input", {
    type: "text", role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": "ac-list",
    placeholder: "Eintrag suchen oder anlegen …", "aria-label": "Registereintrag", autocomplete: "off",
  });
  const list = el("ul", { class: "ac-list", id: "ac-list", role: "listbox", "aria-label": "Registertreffer", hidden: "" });
  sec.append(el("div", { class: "combo" }, [typeSel, input]), list);
  const entries = registerEntries();
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
  // menu.js calls closeList on Escape; it is the first layer of the Escape order.
  list.closeList = () => { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
  list.anchor = input;
  // Linking and creating entries belong to the real build; the choice is shown, not written.
  const choose = (value) => { if (value !== null) input.value = value; list.closeList(); input.focus(); notify(STUB, true); };
  const option = (i, onPick, children) => el("li", { class: "ac-item", id: `ac-opt-${i}`, role: "option", "aria-selected": "false", onclick: onPick }, children);
  const update = () => {
    const q = input.value.trim().toLowerCase();
    const type = typeSel.value;
    list.replaceChildren();
    if (!q) { list.closeList(); return; }
    const hits = entries.filter((e) => (!type || e.type === type) && e.id.toLowerCase().includes(q)).slice(0, 8);
    hits.forEach((h, i) => list.append(option(i, () => choose(h.id), [el("span", { text: h.id }), el("span", { class: "type", text: TYPE_LABEL[h.type] })])));
    if (!hits.some((h) => h.id.toLowerCase() === q)) {
      const create = option(hits.length, () => choose(null), [el("span", { text: "+ neu anlegen" }), el("span", { class: "type", text: `„${input.value.trim()}“` })]);
      create.classList.add("is-new");
      list.append(create);
    }
    active = -1;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");
    placeList(list);
  };
  input.addEventListener("input", update);
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
  return sec;
}

// The list is fixed to the viewport so the inspector's scroll edge cannot clip it.
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

document.addEventListener("click", (e) => { if (!e.target.closest(".register")) for (const l of document.querySelectorAll(".ac-list:not([hidden])")) l.closeList(); });
// The autocomplete list is fixed to the viewport, so it follows its field on scroll and resize.
const follow = () => { const l = document.querySelector(".ac-list:not([hidden])"); if (l) placeList(l); };
document.addEventListener("scroll", follow, true);
addEventListener("resize", follow);

sections.push((words) => {
  const refs = new Set(words.map((w) => refKey(w.tok)));
  return registerSection(refs.size === 1 ? words[0].tok.ref : null);
});
