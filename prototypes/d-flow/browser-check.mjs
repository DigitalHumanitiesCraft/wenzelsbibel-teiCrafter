// Browser check for prototype D. Expects the prototype dev server on port 5174
// (npm run dev:prototypes), or on the port given in PORT:
//   node prototypes/d-flow/browser-check.mjs [screenshot.png]
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const PAGE = `http://127.0.0.1:${process.env.PORT ?? "5174"}/prototypes/d-flow/index.html`;
const shot = process.argv[2] ?? new URL("./screenshot.png", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const fixture = readFileSync(new URL("./fixture/fol1r.xml", import.meta.url), "utf8");
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(PAGE);
await page.waitForSelector(".cm-content .flow-ln");

// Page-side helpers on the exposed view: raw text, selection, coordinates of a text position.
const raw = () => page.evaluate(() => window.dflow.view.state.sliceDoc());
const selection = () => page.evaluate(() => {
  const { state } = window.dflow.view;
  const { from, to, anchor, head } = state.selection.main;
  return { from, to, anchor, head, text: state.sliceDoc(from, to) };
});
const point = async (needle, at, after = "") => {
  const pos = await page.evaluate(({ needle, at, after }) => {
    const text = window.dflow.view.state.sliceDoc();
    const pos = text.indexOf(needle, after ? text.indexOf(after) : 0) + at;
    window.dflow.scrollTo(pos);
    return pos;
  }, { needle, at, after });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return page.evaluate((pos) => {
    const c = window.dflow.view.coordsAtPos(pos, 1);
    return { pos, x: c.left + 1, y: (c.top + c.bottom) / 2 };
  }, pos);
};
const message = () => page.locator("#message").innerText();

const shown = await page.locator(".cm-content").innerText();
check("no tag text is visible in the flowing view", !/<\/?w[\s>]|xml:id|orig=/.test(shown));
check("the first words read as running text", /PROLOGUS[\s\S]*Hie hebt ſich an die voꝛ rede vnd/.test(shown), shown.slice(0, 120).replace(/\s+/g, " "));
check("line counters are drawn", (await page.locator(".flow-ln").count()) >= 60, String(await page.locator(".flow-ln").count()));
const red = await page.locator(".flow-red").first().evaluate((el) => {
  const probe = document.createElement("span");
  probe.style.color = "var(--color-problem)";
  document.body.append(probe);
  const expected = getComputedStyle(probe).color;
  probe.remove();
  return getComputedStyle(el).color === expected;
});
check("hi inkRed renders in the red token", red);
check("the ref run carries a chip with type and target", (await page.locator(".flow-chip", { hasText: "person Martin" }).count()) === 1);

// Typing inside a word through the real keyboard.
const hebt = await point(">hebt</w>", 3);
await page.mouse.click(hebt.x, hebt.y);
const caret = await selection();
check("a click in hebt places the caret inside the word", caret.head === hebt.pos, `${caret.head} vs ${hebt.pos}`);
await page.keyboard.type("x");
check("typed x changes the word text and @orig", (await raw()) === fixture.replace('orig="hebt" xml:id="region_1639399488602_10l1_0">hebt<', 'orig="hexbt" xml:id="region_1639399488602_10l1_0">hexbt<'));
check("the view shows hexbt", (await page.locator(".cm-content").innerText()).includes("hexbt"));
await page.keyboard.press("Backspace");
check("Backspace restores the original bytes", (await raw()) === fixture);

// Latency from keydown to the next frame, as the page measures it, over alternating insert and delete.
const samples = [];
for (let i = 0; i < 20; i++) {
  await page.keyboard.press(i % 2 ? "Backspace" : "a");
  await page.waitForFunction(() => document.querySelector("#timing").textContent.includes("key to frame"));
  const t = await page.locator("#timing").innerText();
  samples.push(Number(/key to frame ([\d.]+)/.exec(t)[1]));
  await page.evaluate(() => { document.querySelector("#timing").textContent = ""; });
}
samples.sort((a, b) => a - b);
check("typing latency measured", samples.length === 20, `median ${samples[10].toFixed(1)} ms, max ${samples.at(-1).toFixed(1)} ms`);
check("twenty alternating keystrokes leave the bytes unchanged", (await raw()) === fixture);

await page.keyboard.press("Space");
check("a space inside a word is refused with a message", (await raw()) === fixture && (await message()).includes("space"), await message());
await page.keyboard.press("Home");

// Selection snapping by keyboard.
const mut = await point(">mut</w>", 2);
await page.mouse.click(mut.x, mut.y);
await page.keyboard.press("Shift+ArrowRight");
await page.keyboard.press("Shift+ArrowRight");
let sel = await selection();
check("Shift+Arrow inside one word selects characters", sel.text === "ut", JSON.stringify(sel.text));
await page.keyboard.press("Shift+ArrowRight");
sel = await selection();
const mutStart = fixture.indexOf(">mut</w>") + 1;
const bulletEnd = fixture.indexOf("•</pc>", mutStart) + 1;
const undEnd = fixture.indexOf(">Und</w>") + 4;
check("Shift+Arrow across the boundary snaps to whole tokens (mut and the following pc)", sel.from === mutStart && sel.to === bulletEnd, `${sel.from}-${sel.to}`);
await page.keyboard.press("Shift+ArrowRight");
sel = await selection();
check("the next Shift+Arrow takes the next word whole", sel.from === mutStart && sel.to === undEnd, `${sel.from}-${sel.to}`);
await page.keyboard.press("Shift+ArrowLeft");
sel = await selection();
check("Shift+ArrowLeft from a snapped end drops one token", sel.from === mutStart && sel.to === bulletEnd, `${sel.from}-${sel.to}`);
await page.keyboard.press("Shift+ArrowRight");
const drawn = await page.locator(".cm-selectionBackground").count();
check("the selection is drawn", drawn > 0, String(drawn));

// Wrap through the toolbar.
await page.fill("#rs-id", "pers_test");
await page.click("#wrap");
const afterWrap = await raw();
const from = fixture.lastIndexOf("<w", fixture.indexOf(">mut</w>"));
const to = fixture.indexOf("</w>", fixture.indexOf(">Und</w>")) + 4;
check("Wrap as rs inserts exactly the two tags", afterWrap === fixture.slice(0, from) + '<rs type="person" ref="#pers_test">' + fixture.slice(from, to) + "</rs>" + fixture.slice(to), await message());
check("the new rs shows its chip", (await page.locator(".flow-chip", { hasText: "person #pers_test" }).count()) === 1);
await page.locator(".flow-chip", { hasText: "person #pers_test" }).scrollIntoViewIfNeeded();
await page.screenshot({ path: shot });

// Pointer drag across words snaps as well, and a cut through a hi is refused with its reason.
const biblia = await point(">Biblia</w>", 3);
const o = await point('<hi rend="initial_historisiert">O</hi>', '<hi rend="initial_historisiert">'.length);
const start = await page.evaluate((pos) => { const c = window.dflow.view.coordsAtPos(pos, 1); return { x: c.left + 1, y: (c.top + c.bottom) / 2 }; }, biblia.pos);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(o.x + 4, o.y, { steps: 5 });
await page.mouse.up();
sel = await selection();
check("a pointer drag from Biblia into O snaps to whole tokens", sel.from === biblia.pos - 2 && sel.to === o.pos + 1, `${sel.from}-${sel.to}`);
await page.click("#wrap");
check("wrapping across the end of the inkRed hi is refused with the reason", (await raw()) === afterWrap && (await message()).includes('<hi rend="inkRed">'), await message());

// Source toggle keeps the caret, Check and Save report on the raw text.
const und = await point(">Und</w>", 2);
await page.mouse.click(und.x, und.y);
const before = (await selection()).head;
await page.click("#source");
check("Show source reveals the raw XML with the new tags", (await page.locator(".cm-lineNumbers").count()) === 1 && (await page.locator(".cm-content").innerText()).includes('<rs type="person" ref="#pers_test">'));
check("the caret stays at the same position in the source", (await selection()).head === before);
await page.click("#source");
check("back in the flowing view", (await page.locator(".flow-ln").count()) >= 60 && (await selection()).head === before);
await page.click("#check");
check("Check reports well-formed", (await page.locator("#wellformed").innerText()) === "well-formed", await message());
const [download] = await Promise.all([page.waitForEvent("download"), page.click("#save")]);
const chunks = [];
for await (const chunk of await download.createReadStream()) chunks.push(chunk);
check("Save downloads the raw text byte for byte", Buffer.concat(chunks).equals(Buffer.from(afterWrap, "utf8")));
await page.click("#undo");
check("Undo removes the wrapper again", (await raw()) === fixture);

check("no console errors", errors.length === 0, errors.join(" | "));
await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `FAILED ${failed} of ${results.length}` : `PASSED ${results.length}`);
process.exit(failed ? 1 : 0);
