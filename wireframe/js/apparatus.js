// Apparatus (phase 2 owner: apparatus).
import { el, state, STUB } from "./state.js";
import { sections } from "./inspector.js";
import { notify } from "./notice.js";

// Words between start_N and end_N anchors belong to the app with those anchors.
// Rebuilt from state.data after undo or redo, because the map is keyed by token objects.
export function indexApparatus() {
  state.appsByWord = new Map();
  const open = new Map();
  const apps = state.data.apparatus;
  for (const col of state.data.columns) {
    for (const line of col.lines) {
      for (const tok of line.tokens) {
        if (tok.type === "anchor") {
          const app = apps.find((a) => a.from === tok.id || a.to === tok.id);
          if (!app) continue;
          if (tok.id === app.from) open.set(app.from, app);
          if (tok.id === app.to) open.delete(app.from);
        } else if (tok.type === "w" && open.size) {
          state.appsByWord.set(tok, [...open.values()]);
        }
      }
    }
  }
}

export function apparatusSection(apps) {
  const sec = el("div", { class: "apparatus" });
  sec.append(el("div", { class: "group-title", text: apps.length ? `Apparat (${apps.length})` : "Apparat" }));
  const list = el("div", { class: "app-list" });
  for (const a of apps) {
    const entry = el("div", { class: "app-entry" }, [el("div", { class: "type", text: `${a.type}  ${a.from} → ${a.to}` })]);
    for (const [lang, text] of Object.entries(a.notes)) entry.append(el("p", {}, [el("span", { class: "lang", text: lang }), text]));
    list.append(entry);
  }
  sec.append(list, el("button", { class: "link-btn", type: "button", text: "+ Kommentar zur Auswahl", onclick: () => notify(STUB, true) }));
  return sec;
}

sections.push((words) => apparatusSection([...new Set(words.flatMap((w) => state.appsByWord.get(w.tok) || []))]));
