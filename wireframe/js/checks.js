// Checks, findings bar and findings list (phase 2 owner: checks).
// No permanent status line: a notice appears only when there is something to act on;
// a clean run is announced to assistive technology and leaves no bar.
// Simulated: "Schematron review" reports the real words without @xml:id on this
// page as findings; the rule itself is a stand-in for the project schema, and the
// interface says so. The other checks answer STUB through the menu registry.
import { el, columns, state } from "./state.js";
import { placeCaret, setColumn } from "./flow.js";
import { setView } from "./xml.js";
import { openPanel } from "./inspector.js";
import { actions } from "./menu.js";
import { announce, notify, setStanding } from "./notice.js";

const SAMPLE = "Beispielbefund aus den Daten";

export function runCheck(label) {
  if (label === "Befundliste") { if (state.findings) showFindings(); else notify("Noch keine Prüfung gelaufen."); return; }
  state.findings = [];
  columns().forEach((col, ci) => {
    let n = 0;
    for (const line of col.lines) {
      const header = line.tokens.some((t) => t.fw === "header");
      if (!header) n++;
      for (const tok of line.tokens) if (tok.type === "w" && !tok.id) state.findings.push({ ci, line, tok, where: `fol. ${state.data.folio} ${"ab"[ci]} ${header ? "Kopfzeile" : `Z. ${n}`}`, message: `Wort „${tok.text}“ ohne @xml:id` });
    }
  });
  if (!state.findings.length) { setStanding(null); announce("Schematron review: keine Befunde."); return; }
  setStanding(findingsBar);
}

function findingsBar() {
  const f = state.findings;
  return [
    el("strong", { text: `Schematron review: ${f.length} ${f.length === 1 ? "Befund" : "Befunde"}` }),
    el("span", { text: `${f[0].message}, ${f[0].where} (${SAMPLE})` }),
    el("button", { type: "button", class: "act-btn", text: "Befunde anzeigen", onclick: showFindings }),
  ];
}

export function showFindings() {
  const list = el("ul", { class: "findings" });
  list.append(el("li", { class: "findings-sample", text: `${SAMPLE}: Die Regel steht stellvertretend für das Projektschema.` }));
  for (const f of state.findings) {
    list.append(el("li", {}, [
      el("span", { text: f.message }),
      el("button", { type: "button", class: "link-btn", text: f.where, onclick: () => jumpToFinding(f) }),
    ]));
  }
  // No reopen after undo: findings hold token objects of the data before the undo.
  openPanel(["Befunde ", el("span", { class: "context", text: "Schematron review" })], [list]);
  list.querySelector("button")?.focus();
}

export function jumpToFinding(f) {
  if (state.view !== "text") setView("text");
  if (f.ci !== state.column) setColumn(f.ci);
  const k = state.words.findIndex((w) => w.tok === f.tok);
  if (k >= 0) placeCaret(k);
}

actions.set("Prüfen/Schematron review", () => runCheck("Schematron review"));
actions.set("Prüfen/Befundliste", () => runCheck("Befundliste"));
