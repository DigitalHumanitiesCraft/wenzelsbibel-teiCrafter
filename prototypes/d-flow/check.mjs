// Node acceptance check for prototype D. It runs the editor state, its filters and
// commands headless on the fol. 1r fixture, loading the TypeScript through Vite:
//   node prototypes/d-flow/check.mjs
// The browser side (rendering, keyboard, pointer) is covered by browser-check.mjs.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const fixture = readFileSync(new URL("./fixture/fol1r.xml", import.meta.url), "utf8");
const server = await createServer({ root, configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, hmr: false } });
const load = (id) => server.ssrLoadModule(id);
const { createXmlState, rawOf } = await load("/src/editor/offsets.ts");
const flow = await load("/prototypes/d-flow/flow-state.ts");
const { tokenAt } = await load("/prototypes/d-flow/flow-model.ts");
const { history, undo, redo } = await load("@codemirror/commands");

const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`); };

/** A minimal command target: the commands and the wrap functions only read state and call dispatch. */
function session(raw) {
  const target = {
    state: createXmlState(raw, [history(), flow.flowExtensions()]),
    statuses: [],
    dispatch(spec) {
      const tr = "startState" in spec ? spec : target.state.update(spec);
      for (const e of tr.effects) if (e.is(flow.flowStatus)) target.statuses.push(e.value);
      target.state = tr.state;
    },
  };
  return target;
}
const model = (s) => s.state.field(flow.flowField).model;
/** Editor position of the character `at` characters into the first occurrence of `needle` after `after`. */
const posOf = (s, needle, at = 0, after = "") => {
  const text = s.state.doc.sliceString(0);
  const i = text.indexOf(needle, after ? text.indexOf(after) : 0);
  if (i < 0) throw new Error(`Not found: ${needle}`);
  return i + at;
};
const type = (s, pos, insert) => s.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length }, userEvent: "input.type" });
const select = (s, anchor, head, userEvent = "select") => s.dispatch({ selection: { anchor, head }, userEvent });
const bytes = (s) => Buffer.from(rawOf(s.state), "utf8");

// 1. Loading and saving without edits is byte-identical, for the LF fixture and a CRLF copy of it.
for (const [label, raw] of [["LF", fixture], ["CRLF", fixture.replace(/\n/g, "\r\n")]]) {
  const s = session(raw);
  const m = model(s);
  check(`${label}: untouched save is byte-identical`, bytes(s).equals(Buffer.from(raw, "utf8")));
  const visible = m.runs.map((r) => s.state.sliceDoc(r.from, r.to)).join("");
  check(`${label}: no markup character is visible`, !/[<>]/.test(visible));
  check(`${label}: every w is one token`, m.tokens.filter((t) => t.el?.localName === "w").length === 323, String(m.tokens.filter((t) => t.el?.localName === "w").length));
}

// 2. Typing inside a word changes the word text and its @orig, nothing else.
{
  const s = session(fixture);
  const tag = 'orig="hebt" xml:id="region_1639399488602_10l1_0">hebt</w>';
  const at = posOf(s, tag, tag.indexOf(">hebt") + 3);
  type(s, at, "x");
  const expected = fixture.replace(tag, 'orig="hexbt" xml:id="region_1639399488602_10l1_0">hexbt</w>');
  check("typed x into hebt: text and @orig change, the rest is byte-identical", rawOf(s.state) === expected);
  check("caret stays after the typed character", s.state.selection.main.head === at + 1 + "x".length);
  undo(s);
  check("one undo restores the original bytes", rawOf(s.state) === fixture);
  redo(s);
  check("redo brings text and @orig back together", rawOf(s.state) === expected);
}
{
  const s = session(fixture);
  const tag = '<w norm="der" orig="der" xml:id="region_1639399488602_10l1_7">\n                <hi rend="ligature">de</hi>r</w>';
  type(s, posOf(s, tag, tag.length - "</w>".length), "e");
  check("typing after a ligature hi syncs @orig over the visible word text",
    rawOf(s.state) === fixture.replace(tag, tag.replace('orig="der"', 'orig="dere"').replace("r</w>", "re</w>")));
}
{
  const s = session(fixture);
  const tag = '<supplied reason="damage">wer</supplied>';
  type(s, posOf(s, tag, tag.indexOf("wer") + 1), "q");
  check("@orig that differs from the word text (bit over supplied wer) stays as it is",
    rawOf(s.state) === fixture.replace(tag, '<supplied reason="damage">wqer</supplied>'));
}
{
  const s = session(fixture.replace(/\n/g, "\r\n"));
  const tag = 'orig="hebt" xml:id="region_1639399488602_10l1_0">hebt</w>';
  type(s, posOf(s, tag, tag.indexOf(">hebt") + 3), "x");
  check("CRLF: typed edit and @orig land at the right raw offsets",
    rawOf(s.state) === fixture.replace(/\n/g, "\r\n").replace(tag, 'orig="hexbt" xml:id="region_1639399488602_10l1_0">hexbt</w>'));
}
{
  const s = session(fixture);
  const at = posOf(s, ">hebt</w>", 3);
  type(s, at, " ");
  check("a space inside a word is refused with a message", rawOf(s.state) === fixture && /space/.test(s.statuses.at(-1) ?? ""), s.statuses.at(-1));
  const hie = posOf(s, ">Hie</w>", 4);
  s.dispatch({ changes: { from: hie, to: posOf(s, ">hebt</w>", 1) }, userEvent: "delete.forward" });
  check("a deletion across a word boundary is refused", rawOf(s.state) === fixture && /hidden markup/.test(s.statuses.at(-1) ?? ""));
}

// 3. Selection snapping, including the keyboard step back from a snapped end.
{
  const s = session(fixture);
  const mut = posOf(s, ">mut</w>", 2);
  const rufet = posOf(s, ">rufet</w>", 3);
  select(s, mut, rufet);
  const m = model(s);
  const { anchor, head } = s.state.selection.main;
  check("a selection from inside mut to inside rufet snaps to both words",
    s.state.sliceDoc(anchor, anchor + 3) === "mut" && s.state.sliceDoc(head - 5, head) === "rufet", `${anchor}-${head}`);
  select(s, anchor, head - 1);
  const back = s.state.selection.main.head;
  check("stepping back from a snapped end drops one whole word", s.state.sliceDoc(back - 3, back) === "Und" && tokenAt(m, back) !== tokenAt(m, head));
}

// 4. Wrap inserts exactly two tags; lb, pc and supplied between the words are allowed.
{
  const s = session(fixture);
  select(s, posOf(s, ">mut</w>", 2), posOf(s, ">rufet</w>", 3));
  const message = flow.wrapAsRs(s, "person", "pers_test");
  const open = '<rs type="person" ref="#pers_test">';
  const from = fixture.lastIndexOf("<w", fixture.indexOf(">mut</w>"));
  const to = fixture.indexOf("</w>", fixture.indexOf(">rufet</w>")) + 4;
  const expected = fixture.slice(0, from) + open + fixture.slice(from, to) + "</rs>" + fixture.slice(to);
  check("wrap over mut • Und lb rufet inserts exactly the two tags", rawOf(s.state) === expected, message);
  const chip = model(s).gaps.some((g) => g.parts.some((p) => p.kind === "chip" && p.label === "person #pers_test"));
  check("the wrapped run gets a chip with type and target", chip);
  select(s, posOf(s, ">Und</w>", 2), posOf(s, ">Und</w>", 2));
  flow.removeWrapper(s);
  check("removing the wrapper restores the original bytes", rawOf(s.state) === fixture);
  undo(s);
  check("undo brings the wrapper back", rawOf(s.state) === expected);
}
{
  const s = session(fixture);
  select(s, posOf(s, ">dich</w>", 2, ">An</w>"), posOf(s, ">wil</w>", 2));
  flow.wrapAsRs(s, "person", "pers_x");
  const from = fixture.lastIndexOf("<w", fixture.indexOf(">dich</w>", fixture.indexOf(">An</w>")));
  const to = fixture.indexOf("</w>", fixture.indexOf(">wil</w>")) + 4;
  check("wrap across a supplied pc inserts exactly the two tags",
    rawOf(s.state) === fixture.slice(0, from) + '<rs type="person" ref="#pers_x">' + fixture.slice(from, to) + "</rs>" + fixture.slice(to));
}

// 5. A selection that would cut a hi is refused with the reason.
{
  const s = session(fixture);
  select(s, posOf(s, ">Biblia</w>", 2), posOf(s, '<hi rend="initial_historisiert">O</hi>', '<hi rend="initial_historisiert">'.length + 1));
  const message = flow.wrapAsRs(s, "person", "pers_cut");
  check("a selection from inside the inkRed hi into the next paragraph is refused",
    rawOf(s.state) === fixture && message.includes('<hi rend="inkRed">'), message);
  select(s, posOf(s, ">erſterbe</w>", 2), posOf(s, ">NB</hi>", 2));
  const message2 = flow.wrapAsRs(s, "person", "pers_cut");
  check("a selection from the main text into the marginal seg is refused", rawOf(s.state) === fixture && message2.startsWith("The selection would cut"), message2);
  select(s, posOf(s, ">herren</w>", 2, "Rotleb"), posOf(s, ">vnd</w>", 2, "merteín"));
  const message3 = flow.wrapAsRs(s, "person", "pers_cut");
  check("a selection reaching out of an existing ref is refused", rawOf(s.state) === fixture && message3.includes("<ref>"), message3);
}

await server.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `FAILED ${failed} of ${results.length}` : `PASSED ${results.length}`);
process.exit(failed ? 1 : 0);
