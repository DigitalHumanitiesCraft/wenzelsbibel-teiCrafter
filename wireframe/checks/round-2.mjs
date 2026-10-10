// Second feedback round: word commands in the flow (F18), folding in the XML view (F57),
// the facsimile following a selection (F24), one Anwenden and Abbrechen per popover (F28,
// F31), the notice bar over the work area (F44), the line rule (data.md), the Prüfen
// labels (F9) and the findings list without the middle dot (F47).
import { chromium } from "playwright";

const URL = "http://127.0.0.1:8765/wireframe/index.html";
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${String(extra).replace(/\s+/g, " ").slice(0, 200)})` : ""}`);
const browser = await chromium.launch();
const errors = [];

async function open() {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForSelector("#flow .w");
  return page;
}
const scenario = async (name, fn) => { try { await fn(); } catch (e) { check(`${name} ran`, false, String(e).split("\n")[0]); } };
const wait = (page, ms = 250) => page.waitForTimeout(ms);
const model = (page) => page.evaluate(async () => JSON.stringify((await import("/wireframe/js/state.js")).state.data));
const tokens = (page, ci, li) => page.evaluate(async ([ci, li]) => (await import("/wireframe/js/state.js")).state.data.columns[ci].lines[li].tokens, [ci, li]);
const tok = (page, id) => page.evaluate(async (id) => {
  const { state } = await import("/wireframe/js/state.js");
  for (const c of state.data.columns) for (const l of c.lines) for (const t of l.tokens) if (t.id === id) return t;
  return null;
}, id);
const notice = (page) => page.evaluate(() => (document.querySelector("#notice").hidden ? "" : document.querySelector("#notice").textContent));
// Caret at offset `off` of a word, or the whole word selected natively, as the user's
// click and double-click leave them after the flow snapped the selection.
const caret = (page, id, off) => page.evaluate(([id, off]) => {
  const t = document.querySelector(`#flow .w[data-id="${id}"]`).firstChild;
  document.querySelector("#flow").focus();
  getSelection().setBaseAndExtent(t, off === "end" ? t.length : off, t, off === "end" ? t.length : off);
}, [id, off]).then(() => wait(page, 150));
const wholeWord = (page, id) => page.evaluate((id) => {
  const t = document.querySelector(`#flow .w[data-id="${id}"]`).firstChild;
  document.querySelector("#flow").focus();
  getSelection().setBaseAndExtent(t, 0, t, t.length);
}, id).then(() => wait(page, 150));
const undo = async (page) => { await page.focus("#flow"); await page.keyboard.press("Control+z"); await wait(page, 200); };
const lineNumber = (page, n) => page.locator("#flow .ln", { hasText: new RegExp(`^${n}$`) });

const HEBT = "region_1639399488602_10l1_0";
const SICH = "region_1639399488602_10l1_1";
const AN = "region_1639399488602_10l1_2";
const DIE = "region_1639399488602_10l1_3";
const VND = "region_1639399488602_10l1_6";
const REDE = "region_1639399488602_10l1_5";
const MERTEIN = "region_1639399535558_19l6_3";

// 1: word commands, each one undo step with its name, new words with a data-like xml:id.
await scenario("F18", async () => {
  const page = await open();
  const original = await model(page);
  const stem = "region_1639399488602_10l1";
  const expected = `${stem}_${Math.max(...[...original.matchAll(new RegExp(`"${stem}_(\\d+)`, "g"))].map((m) => Number(m[1]))) + 1}`;
  await caret(page, HEBT, 2);
  await page.keyboard.press(" ");
  await wait(page, 300);
  const line = await tokens(page, 0, 1);
  const i = line.findIndex((t) => t.id === HEBT);
  const added = line[i + 1];
  check("split: a space inside hebt makes he and bt", line[i].text === "he" && line[i].orig === "he" && line[i].norm === "he" && added?.text === "bt", JSON.stringify([line[i], added]).slice(0, 160));
  check("split: the new word has @orig and @norm equal to its text", added?.orig === "bt" && added?.norm === "bt");
  check("split: the new xml:id is the line's zone id plus the next free token index", added?.id === expected && /^region_1639399488602_10l1_\d+$/.test(added?.id), `${added?.id} want ${expected}`);
  check("split: the flow shows both words and the caret stands in the new one", (await page.textContent(`#flow .w[data-id="${expected}"]`)) === "bt" && (await page.textContent("#popover-title q")) === "bt", await page.textContent("#popover-title"));
  await undo(page);
  check("split: Rückgängig names the step and restores the model", (await notice(page)) === "Rückgängig: Wort teilen." && (await model(page)) === original, await notice(page));

  await caret(page, SICH, 0);
  await page.keyboard.press("Backspace");
  await wait(page, 300);
  const joined = await tok(page, HEBT);
  check("join: Backspace at the start of ſich joins it with hebt", joined.text === "hebtſich" && joined.orig === "hebtſich" && joined.norm === "hebtsich" && !(await tok(page, SICH)), JSON.stringify(joined).slice(0, 120));
  await undo(page);
  check("join: Rückgängig names the step and restores the model", (await notice(page)) === "Rückgängig: Wörter verbinden." && (await model(page)) === original, await notice(page));

  await caret(page, AN, "end");
  await page.keyboard.press("Delete");
  await wait(page, 300);
  check("join: Delete at the end of an joins it with die", (await tok(page, AN)).text === "andie" && !(await tok(page, DIE)));
  await undo(page);
  check("join by Delete undone in one step", (await model(page)) === original);

  await wholeWord(page, VND);
  await page.keyboard.press("Delete");
  await wait(page, 300);
  check("delete: Delete on the selected word vnd removes it", !(await tok(page, VND)) && (await page.locator(`#flow .w[data-id="${VND}"]`).count()) === 0);
  await undo(page);
  check("delete: Rückgängig names the step and restores the model", (await notice(page)) === "Rückgängig: Wort löschen." && (await model(page)) === original, await notice(page));
  await wholeWord(page, REDE);
  await page.keyboard.press("Backspace");
  await wait(page, 300);
  check("delete: Backspace on the selected word rede removes it", !(await tok(page, REDE)));
  await undo(page);
  check("delete by Backspace undone in one step", (await model(page)) === original);

  // Refusals: the reason in the notice bar, the model unchanged.
  const refused = async (name, act, re) => {
    await wait(page, 1100); // one refusal notice per second
    await act();
    await wait(page, 200);
    const n = await notice(page);
    check(`refused: ${name}`, re.test(n) && (await model(page)) === original, n);
  };
  await refused("a space in liebes would cut its inner hi", async () => { await caret(page, "region_1639399497290_13l1_3", 2); await page.keyboard.press(" "); }, /Element <hi>/);
  await refused("a space at the word edge would make an empty word", async () => { await caret(page, AN, "end"); await page.keyboard.press(" "); }, /Wortrand/);
  await refused("Backspace before wil does not join across the comma", async () => { await caret(page, "region_1639399497290_13l5_1", 0); await page.keyboard.press("Backspace"); }, /Satzzeichen/);
  await refused("typing < stays refused", async () => { await caret(page, AN, 1); await page.keyboard.type("<"); }, /< und &/);
  await page.click('[data-column="1"]');
  await wait(page);
  await refused("deleting merteín would remove its inner lb", async () => { await wholeWord(page, MERTEIN); await page.keyboard.press("Delete"); }, /<lb>/);
  await refused("Backspace inside merteín does not delete its line break", async () => {
    await page.evaluate((id) => { const t = document.querySelector(`#flow .w[data-id="${id}"]`).firstChild; document.querySelector("#flow").focus(); const k = t.data.indexOf("\n") + 1; getSelection().setBaseAndExtent(t, k, t, k); }, MERTEIN);
    await page.keyboard.press("Backspace");
  }, /<lb>/);
  await page.close();
});

// 6: the line rule: merteín belongs to line 16, where it begins.
await scenario("line rule", async () => {
  const page = await open();
  const l16 = await tokens(page, 1, 16);
  const l17 = await tokens(page, 1, 17);
  check("data: merteín is a token of column b line 16 with its inner lb as a newline", l16.some((t) => t.id === MERTEIN && t.text === "mer\nteín") && !l17.some((t) => t.id === MERTEIN));
  await page.click('[data-column="1"]');
  await wait(page);
  await lineNumber(page, 16).click();
  await wait(page, 400);
  const sel = await page.evaluate(async () => {
    const { state } = await import("/wireframe/js/state.js");
    return state.words.slice(state.sel.from, state.sel.to + 1).map((w) => w.tok.id);
  });
  check("the line selection of Z. 16 includes merteín", sel.includes(MERTEIN), sel.join(" "));
  const rowNames = await page.$$eval("#popover-content .line-row:not(.line-head) .field input", (is) => is.map((i) => i.labels[0]?.firstChild.textContent));
  check("the state Zeile lists merteín", rowNames.some((n) => n === "Diplomatisch merteín"), rowNames.join(" | "));
  const geo = await page.evaluate((id) => {
    const rects = [...document.querySelector(`#flow .w[data-id="${id}"]`).getClientRects()];
    const ln = [...document.querySelectorAll("#flow .ln")].find((n) => n.textContent === "17").getBoundingClientRect();
    const mid = ln.top + ln.height / 2;
    const second = rects[rects.length - 1];
    return { parts: rects.length, sameLine: rects.length > 1 && second.top > rects[0].bottom - 1 && mid > second.top && mid < second.bottom };
  }, MERTEIN);
  check("merteín breaks at its inner lb and line number 17 stands beside teín", geo.sameLine, JSON.stringify(geo));
  await page.close();
});

// 4: one Anwenden and one Abbrechen per popover, applied as one undo step.
await scenario("F28", async () => {
  const page = await open();
  const original = await model(page);
  const pairs = () => page.evaluate(() => {
    const vis = (b) => b.offsetParent !== null;
    const bs = [...document.querySelectorAll("#popover button")].filter(vis);
    return [bs.filter((b) => b.textContent === "Anwenden").length, bs.filter((b) => b.textContent === "Abbrechen").length].join("/");
  });
  await page.click(`#flow .w[data-id="${SICH}"]`);
  await wait(page, 300);
  check("Wort: one Anwenden and one Abbrechen", (await pairs()) === "1/1", await pairs());
  await page.locator("#popover-content .app-add").click();
  check("Wort with the comment form open: still one pair", (await pairs()) === "1/1", await pairs());
  await page.click("#popover-cancel");
  check("Abbrechen closes the comment form", (await page.locator("#popover-content .app-form").count()) === 0);
  await page.locator('#popover-content [role="combobox"]').fill("Neuer Eintrag");
  await wait(page, 150);
  await page.locator("#ac-list .ac-item.is-new").click();
  check("Wort with the register form open: still one pair", (await pairs()) === "1/1" && (await page.locator("#popover-content .reg-form").count()) === 1, await pairs());
  await page.click("#popover-cancel");
  check("Abbrechen returns to the register search", (await page.locator("#popover-content .reg-form").count()) === 0);
  const dip = page.getByRole("textbox", { name: "Diplomatisch", exact: true });
  const norm = page.getByRole("textbox", { name: "Normalisiert", exact: true });
  await dip.fill("ſych");
  await norm.fill("sych");
  await page.click("#popover-apply");
  await wait(page);
  const t = await tok(page, SICH);
  check("Anwenden applies Diplomatisch and Normalisiert together", t.text === "ſych" && t.orig === "ſych" && t.norm === "sych", JSON.stringify(t).slice(0, 120));
  await undo(page);
  check("one undo step named after both fields restores both", (await notice(page)) === "Rückgängig: Diplomatisch und Normalisiert." && (await model(page)) === original, await notice(page));
  await dip.fill("ſi ch");
  await page.click("#popover-apply");
  await wait(page, 150);
  const err = await page.locator("#popover-content .field:has(input[aria-invalid='true']) .field-error").textContent().catch(() => "");
  check("a refused value states its reason at its field and applies nothing", /Leerzeichen/.test(err) && (await model(page)) === original, err);
  await page.click("#popover-cancel");
  check("Abbrechen restores the field", (await dip.inputValue()) === "ſich");

  // State Zeile: rows of Diplomatisch and Normalisiert instead of chips.
  await lineNumber(page, 1).click();
  await wait(page, 400);
  const rows = await page.locator("#popover-content .line-row:not(.line-head)").count();
  const words = await page.evaluate(async () => { const { state } = await import("/wireframe/js/state.js"); return state.sel.to - state.sel.from + 1; });
  check("Zeile: one row per word with Diplomatisch and Normalisiert, no chips", rows === words && (await page.locator("#popover-content .line-row:not(.line-head) input").count()) === 2 * words && (await page.locator(".word-chip").count()) === 0, `${rows} rows, ${words} words`);
  check("Zeile: one Anwenden and one Abbrechen", (await pairs()) === "1/1", await pairs());
  await page.getByRole("textbox", { name: "Normalisiert hebt", exact: true }).fill("hebet");
  await page.getByRole("textbox", { name: "Normalisiert an", exact: true }).fill("ane");
  await page.click("#popover-apply");
  await wait(page);
  check("Zeile: Anwenden applies the changed rows", (await tok(page, HEBT)).norm === "hebet" && (await tok(page, AN)).norm === "ane" && (await page.textContent("#popover-title")).startsWith("Zeile"));
  await undo(page);
  check("Zeile: one undo step restores every row", (await notice(page)) === "Rückgängig: Normalisiert." && (await model(page)) === original, await notice(page));
  await page.close();
});

// 2: xml:id and facs folded in the XML view, IDs anzeigen, unfolded on the selection.
await scenario("F57", async () => {
  const page = await open();
  const source = await page.evaluate(async () => (await import("/wireframe/js/state.js")).state.data.xmlExcerpt);
  check("IDs anzeigen is hidden in the text view", await page.isHidden("#toggle-ids"));
  const GOT = "region_1639399497290_13l1_0"; // carries the comment start_42597 to end_42599
  await page.click(`#flow .w[data-id="${GOT}"]`);
  await wait(page, 300);
  await page.click('[data-view="xml"]');
  await wait(page, 300);
  check("IDs anzeigen shows in the XML view, off", await page.isVisible("#toggle-ids") && (await page.getAttribute("#toggle-ids", "aria-pressed")) === "false");
  const shown = await page.innerText("#xml");
  const ids = (shown.match(/xml:id="/g) || []).length;
  check("xml:id and facs folded into markers", (await page.locator("#xml .fold-mark").count()) > 100 && !shown.includes('facs="') && !shown.includes('xml:id="lb_42528"'), `${ids} xml:id shown`);
  const sel = await page.innerText("#xml .xw.is-selected");
  check("the selected word shows its xml:id regardless", sel.includes(`xml:id="${GOT}"`), sel.slice(0, 120));
  check("the anchors its comment points to show their xml:id", shown.includes('xml:id="start_42597"') && shown.includes('xml:id="end_42599"') && ids === 3, `${ids} xml:id shown`);
  const title = await page.getAttribute(`#xml .xw[data-id="region_1639399497290_13l1_1"] .fold-mark`, "title");
  check("a marker names its folded attributes in its title", title === 'xml:id="region_1639399497290_13l1_1"', title);
  await page.click("#toggle-ids");
  const all = await page.innerText("#xml");
  check("IDs anzeigen unfolds every xml:id and facs", (await page.getAttribute("#toggle-ids", "aria-pressed")) === "true" && all.includes('xml:id="lb_42528"') && all.includes('facs="#region_1639399488602_10l1"') && (await page.locator("#xml .fold-mark:visible").count()) === 0);
  await page.click("#toggle-ids");
  check("switched off, the attributes fold again", !(await page.innerText("#xml")).includes('xml:id="lb_42528"'));
  const intact = await page.evaluate(async () => {
    const { state } = await import("/wireframe/js/state.js");
    const copy = document.querySelector("#xml").cloneNode(true);
    for (const m of copy.querySelectorAll(".fold-mark")) m.remove();
    return copy.textContent === state.data.xmlExcerpt;
  });
  check("folding is display only: the source string is unchanged", intact && source === (await page.evaluate(async () => (await import("/wireframe/js/state.js")).state.data.xmlExcerpt)));
  await page.click('[data-view="text"]');
  check("back in the text view the switch hides again", await page.isHidden("#toggle-ids"));
  await page.close();
});

// 3: a line selection brings its zone into the visible image, and only then.
await scenario("F24", async () => {
  const page = await open();
  await page.emulateMedia({ reducedMotion: "reduce" }); // the viewer moves at once
  await page.click("#toggle-facs");
  // The zone layer joins the viewer once the image has opened and the column is fitted.
  const ready = await page.waitForSelector("#zones", { state: "attached", timeout: 20000 }).then(() => true, () => false);
  check("the facsimile opened from the ONB image service", ready);
  if (!ready) { await page.close(); return; }
  // View on the first lines of column a only, so the last line lies outside.
  const zoneBounds = (zoneId) => page.evaluate(async (zoneId) => {
    const { state } = await import("/wireframe/js/state.js");
    const z = state.data.zones.find((x) => x.id === zoneId);
    const pts = z.points.trim().split(/\s+/).map((p) => p.split(",").map(Number));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const r = state.viewer.viewport.imageToViewportRectangle(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, zoneId);
  const bounds = () => page.evaluate(async () => { const b = (await import("/wireframe/js/state.js")).state.viewer.viewport.getBounds(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
  const first = await zoneBounds("region_1639399488602_10l1");
  await page.evaluate(async (r) => {
    const { state } = await import("/wireframe/js/state.js");
    const OSD = window.OpenSeadragon;
    state.viewer.viewport.fitBounds(new OSD.Rect(r.x - r.width * 0.2, r.y - r.height * 2, r.width * 1.4, r.height * 5), true);
  }, first);
  await wait(page, 300);
  const before = await bounds();
  const last = await zoneBounds("region_1639399497290_13l19");
  const inside = (z, b) => z.x >= b.x - 1e-9 && z.y >= b.y - 1e-9 && z.x + z.width <= b.x + b.width + 1e-9 && z.y + z.height <= b.y + b.height + 1e-9;
  check("setup: the zone of the last line of column a lies outside the view", !inside(last, before));
  await lineNumber(page, 23).click();
  await wait(page, 400);
  const after = await bounds();
  const moved = Math.abs(after.x - before.x) + Math.abs(after.y - before.y) > 1e-6;
  check("a line selection outside the view pans the viewer until its zone is inside", moved && inside(last, after), `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  check("the zone fitted, so the viewer panned without zooming", Math.abs(after.width - before.width) < 1e-9, `${before.width} -> ${after.width}`);
  await page.click('#flow .w[data-id="region_1639399497290_13l19_2"]');
  await wait(page, 400);
  const still = await bounds();
  check("a selection whose zone is already in view leaves the image still", JSON.stringify(still) === JSON.stringify(after), `${JSON.stringify(after)} -> ${JSON.stringify(still)}`);
  await page.close();
});

// 5: the notice bar lies over the work area and moves nothing.
await scenario("F44", async () => {
  const page = await open();
  const rects = () => page.evaluate(() => [document.querySelector("#work"), document.querySelector("#flow .w")].map((n) => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].join(","); }).join(" "));
  const before = await rects();
  await page.click('[data-cmd="undo"]', { force: true }); // disabled: states its reason
  await wait(page, 150);
  const shown = await page.isVisible("#notice");
  const during = await rects();
  check("main#work and the text keep their place when the notice bar appears", shown && during === before, `${before} | ${during}`);
  check("the notice bar is a live region directly below the Arbeitsleiste", (await page.getAttribute("#notice", "aria-live")) === "polite" && await page.evaluate(() => Math.abs(document.querySelector("#notice").getBoundingClientRect().top - document.querySelector(".arbeitsleiste").getBoundingClientRect().bottom) < 1));
  await wait(page, 4300);
  check("nothing moves when it disappears", (await page.isHidden("#notice")) && (await rects()) === before);
  await page.click('.act[data-action="Prüfen"] > button');
  await page.click('[data-cmd="check:sch-review"]');
  await wait(page, 200);
  const order = await page.evaluate(() => [...document.querySelector("#notice").children].map((n) => n.tagName));
  check("a standing notice: message first, action at the end", order[0] !== "BUTTON" && order[order.length - 1] === "BUTTON" && (await rects()) === before, order.join(" "));
  await page.close();
});

// 7 and 8: the Prüfen labels and the findings list separators.
await scenario("F9/F47", async () => {
  const page = await open();
  await page.click('.act[data-action="Prüfen"] > button');
  const entries = await page.$$eval('.act[data-action="Prüfen"] .menu-item', (ns) => ns.map((n) => n.textContent));
  check("Prüfen lists Editionsregeln and Editionsregeln, Bericht", entries.join("|") === "Wohlgeformtheit|TEI All|Editionsregeln|Editionsregeln, Bericht|Befundliste", entries.join("|"));
  await page.click('[data-cmd="check:sch-editing"]');
  await wait(page, 150);
  check("the notice names Editionsregeln", (await notice(page)) === "Editionsregeln: keine Befunde.", await notice(page));
  await page.click('.act[data-action="Prüfen"] > button');
  await page.click('[data-cmd="check:sch-review"]');
  await wait(page, 150);
  check("the notice names Editionsregeln, Bericht", (await notice(page)).startsWith("Editionsregeln, Bericht: "), await notice(page));
  await page.click('#notice button:has-text("Befunde anzeigen")');
  await wait(page, 150);
  const heads = await page.$$eval("#side-findings .findings-check", (hs) => hs.map((h) => h.firstChild.textContent));
  check("the findings list titles name both labels", heads.includes("Editionsregeln") && heads.includes("Editionsregeln, Bericht") && !(await page.textContent("#side-findings")).includes("Schematron"), heads.join("|"));
  const metas = await page.$$eval("#side-findings .finding-meta", (ms) => ms.map((m) => m.textContent));
  check("rule and path are separated without the middle dot", metas.length > 0 && metas.every((m) => /^Regel \S+, Pfad \//.test(m)) && !(await page.textContent("#side-findings")).includes("·"), metas[0]);
  await page.close();
});

check("no console or page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
console.log(results.join("\n"));
console.log(`${results.filter((r) => r.startsWith("PASS")).length} PASS, ${results.filter((r) => r.startsWith("FAIL")).length} FAIL`);
