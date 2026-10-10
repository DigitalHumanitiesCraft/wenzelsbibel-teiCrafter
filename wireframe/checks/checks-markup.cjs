// Walk-through for word editing (US1.2 criteria 3-6, F29, F32, F33, F21) and checks/save (US5.1, US5.2).
const { chromium } = require("playwright");
const fs = require("fs");
const SCRATCH = require("path").join(__dirname, "../../test-results/wireframe");
fs.mkdirSync(SCRATCH, { recursive: true });
const URL = "http://127.0.0.1:8765/wireframe/index.html";
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); };

const ID = { sich: "region_1639399488602_10l1_1", mertein: "region_1639399535558_19l6_3", hie: "region_1639399488602_10l3_0", hebt: "region_1639399488602_10l1_0", dem: "region_1639399535558_19l6_0", rotlebin: "region_1639399535558_19l6_1" };

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForSelector(".w");

  const S = () => page.evaluate(async () => { const { state } = await import("/wireframe/js/state.js"); return JSON.stringify(state.data); });
  const tok = (id) => page.evaluate(async (id) => { const { state } = await import("/wireframe/js/state.js"); for (const c of state.data.columns) for (const l of c.lines) for (const t of l.tokens) if (t.id === id) return t; return null; }, id);
  const gotTok = () => page.evaluate(async () => { const { state } = await import("/wireframe/js/state.js"); for (const l of state.data.columns[0].lines) for (const t of l.tokens) if (t.text === "Got") return t; return null; });
  const clickWord = async (id) => { await page.click(`#flow .w[data-id="${id}"]`); await page.waitForTimeout(250); };
  const column = async (c) => { await page.click(`[data-column="${c}"]`); await page.waitForTimeout(100); };
  const unsaved = () => page.isVisible("#status-unsaved");
  const note = () => page.textContent("#inspector-note");
  const bar = () => page.evaluate(() => (document.querySelector("#notice").hidden ? "" : document.querySelector("#notice").textContent));
  const undoKey = async () => { await page.focus("#flow"); await page.keyboard.press("Control+z"); await page.waitForTimeout(150); };
  const menu = async (m, item) => { await page.click(`.menu-btn:text-is("${m}")`); await page.click(`.menu-item:has-text("${item}")`); await page.waitForTimeout(100); };
  const select = (from, to) => page.evaluate(async ([a, b]) => {
    const { state } = await import("/wireframe/js/state.js"); const { setWordRange } = await import("/wireframe/js/flow.js");
    const k = (id) => state.words.findIndex((w) => w.tok.id === id);
    document.querySelector("#flow").focus(); state.quiet = false; setWordRange(k(a), k(b));
  }, [from, to]).then(() => page.waitForTimeout(250));

  const original = await S();

  // US1.2 criterion 3: norm of ſich
  await clickWord(ID.sich);
  ok("C3 inspector shows Wort ſich", (await page.textContent("#inspector-title")).includes("ſich"));
  const before = await tok(ID.sich);
  const normInput = page.locator(".field:has(span:text-is('Normalisiert')) input");
  await normInput.fill("sych");
  await page.click(".field-group:has(span:text-is('Normalisiert')) button:text-is('Anwenden')");
  const after = await tok(ID.sich);
  ok("C3 only @norm changed", after.norm === "sych" && JSON.stringify({ ...after, norm: before.norm }) === JSON.stringify(before));
  ok("C3 unsaved marker shown", await unsaved());
  await page.keyboard.press("Control+z"); await page.waitForTimeout(150);
  ok("C3 undo restores original", (await S()) === original);
  ok("C3 marker cleared after undo", !(await unsaved()));

  // US1.2 criterion 4: diplomatic edit of a simple word
  await clickWord(ID.sich);
  const dipl = page.locator(".field:has(span:text-is('Diplomatisch')) input");
  ok("C4 diplomatic field editable", !(await dipl.evaluate((i) => i.readOnly)));
  await dipl.fill("ſych");
  await dipl.press("Enter");
  const d4 = await tok(ID.sich);
  ok("C4 text and @orig changed together", d4.text === "ſych" && d4.orig === "ſych");
  ok("C4 id and other attributes unchanged", JSON.stringify({ ...d4, text: before.text, orig: before.orig }) === JSON.stringify(before));
  ok("C4 flow shows new text", (await page.textContent(`#flow .w[data-id="${ID.sich}"]`)) === "ſych");
  await dipl.press("Control+z"); await page.waitForTimeout(150);
  ok("C4 undo restores original", (await S()) === original);
  // Refusal: a space would split the word.
  await clickWord(ID.sich);
  await dipl.fill("ſi ch"); await dipl.press("Enter");
  ok("C4 space refused at field", (await note()).includes("Leerzeichen") && (await S()) === original);

  // US1.2 criterion 5: merteín
  await column(1);
  await clickWord(ID.mertein);
  const dm = page.locator(".field:has(span:text-is('Diplomatisch')) input");
  ok("C5 diplomatic field read-only", await dm.evaluate((i) => i.readOnly));
  const nm = page.locator(".field:has(span:text-is('Normalisiert')) input");
  ok("C5 normalised field editable", !(await nm.evaluate((i) => i.readOnly || i.disabled)));
  await nm.fill("Martin"); await nm.press("Enter");
  ok("C5 norm applied", (await tok(ID.mertein)).norm === "Martin");
  await nm.press("Control+z"); await page.waitForTimeout(150);
  ok("C5 undo", (await S()) === original);
  await page.click("button:text-is('In der XML-Ansicht bearbeiten')");
  await page.waitForTimeout(200);
  ok("C5 route opens XML view at the word", await page.isVisible("#xml-view") && (await page.getAttribute(".xml .xw.is-selected", "data-id")) === ID.mertein);
  await page.click('[data-view="text"]');
  await column(0);

  // US1.2 criterion 6: Got gets @norm only
  await page.click('#flow .w:text-is("Got")'); await page.waitForTimeout(250);
  const g0 = await gotTok();
  const ng = page.locator(".field:has(span:text-is('Normalisiert')) input");
  await ng.fill("Gott"); await ng.press("Enter");
  const g1 = await gotTok();
  ok("C6 Got: @norm added, nothing else", g1.norm === "Gott" && JSON.stringify({ ...g1, norm: g0.norm }) === JSON.stringify(g0), JSON.stringify(g1).slice(0, 80));

  // Markup action on Hie hebt, refusal, replace, undo
  const afterGot = await S();
  await select(ID.hie, ID.hebt);
  await page.click('.act[data-action="Ergänzung"] > button');
  await page.click('.act[data-action="Ergänzung"] .menu-item:text-is("damage")');
  await page.waitForTimeout(150);
  const [mh, mb] = [await tok(ID.hie), await tok(ID.hebt)];
  ok("M1 supplied on both words", mh.markup?.element === "supplied" && mb.markup?.value === "damage");
  ok("M1 shared markup object", await page.evaluate(async ([a, b]) => { const { state } = await import("/wireframe/js/state.js"); const t = state.data.columns[0].lines[1].tokens; return t.find((x) => x.id === a).markup === t.find((x) => x.id === b).markup; }, [ID.hie, ID.hebt]));
  ok("M1 flow mark not colour only", (await page.getAttribute(`#flow .w[data-id="${ID.hie}"]`, "data-mk")) === "supplied" && (await page.getAttribute(`#flow .w[data-id="${ID.hebt}"]`, "class")).includes("has-markup") && (await page.textContent(".markup-present")).includes('<supplied reason="damage">'));
  await page.screenshot({ path: `${SCRATCH}/wireframe-checks-1.png` });
  const afterMarkup = await S();
  await select(ID.hie, ID.hie);
  await page.click('.act[data-action="Ergänzung"] > button');
  await page.click('.act[data-action="Ergänzung"] .menu-item:text-is("switch")');
  ok("M2 partial replace refused with element", (await note()).includes("<supplied>") && (await S()) === afterMarkup, await note());
  await select(ID.hie, ID.hebt);
  await page.click('.act[data-action="Ergänzung"] > button');
  await page.click('.act[data-action="Ergänzung"] .menu-item:text-is("switch")');
  ok("M3 second application replaces value", (await tok(ID.hie)).markup.value === "switch" && (await tok(ID.hebt)).markup.value === "switch");
  await undoKey();
  ok("M4 undo restores damage", (await tok(ID.hie)).markup.value === "damage");
  await undoKey();
  ok("M4 undo removes markup and mark", (await S()) === afterGot && !(await page.getAttribute(`#flow .w[data-id="${ID.hie}"]`, "data-mk")));
  // Hervorhebung
  await select(ID.hie, ID.hie);
  await page.click('.act[data-action="Hervorhebung"] > button');
  await page.click('.act[data-action="Hervorhebung"] .menu-item:text-is("gold")');
  ok("M5 Hervorhebung sets rend", JSON.stringify((await tok(ID.hie)).rend) === '["gold"]' && (await page.getAttribute(`#flow .w[data-id="${ID.hie}"]`, "class")).includes("rend-gold"));
  await undoKey();
  ok("M5 undo", (await S()) === afterGot);
  // ref crossing refused
  await column(1);
  await select(ID.dem, ID.rotlebin);
  await page.click('.act[data-action="Fremdsprache"] > button');
  await page.click('.act[data-action="Fremdsprache"] .menu-item:text-is("lat")');
  ok("M6 crossing a ref refused", (await note()).includes("<ref>") && (await S()) === afterGot, await note());
  await column(0);

  // Ctrl+E
  await clickWord(ID.hie);
  await page.focus("#flow");
  await page.keyboard.press("Control+e");
  await page.waitForTimeout(100);
  ok("E1 element list opens", await page.isVisible(".element-list") && (await page.textContent(".element-choice")).startsWith("Element für Auswahl") && !(await page.locator(".element-choice p").count()));
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
  const focused = await page.evaluate(() => document.activeElement.textContent);
  ok("E2 arrows move in list", focused.includes("foreign"), focused);
  await page.keyboard.press("Enter");
  ok("E3 routes to Fremdsprache values", (await page.getAttribute('.act[data-action="Fremdsprache"] > button', "aria-expanded")) === "true" && (await page.evaluate(() => document.activeElement.textContent)) === "lat");
  await page.keyboard.press("Escape");
  await page.focus("#flow");
  await page.keyboard.press("Control+e");
  await page.click('.element-item:has-text("<rs>")');
  ok("E4 rs focuses register field", await page.evaluate(() => !!document.activeElement.closest(".register")));

  // Checks
  await page.keyboard.press("Escape");
  await menu("Prüfen", "Wohlgeformtheit");
  ok("P1 well-formed", (await bar()).includes("Wohlgeformtheit: wohlgeformt."), await bar());
  // Negative: an end tag removed from the excerpt (test commit; the XML view is read-only).
  await page.evaluate(async () => { const { commit } = await import("/wireframe/js/history.js"); commit("Test: Endtag", (d) => { d.xmlExcerpt = d.xmlExcerpt.replace("</w>", ""); }); });
  await menu("Prüfen", "Wohlgeformtheit");
  ok("P1 broken excerpt reported", /Wohlgeformtheit: 1 Befund/.test(await bar()), (await bar()).slice(0, 140));
  await page.focus("#flow"); await page.keyboard.press("Control+z"); await page.waitForTimeout(150);
  await menu("Prüfen", "Wohlgeformtheit");
  ok("P1 well-formed again after undo", (await bar()).includes("wohlgeformt"));
  await menu("Prüfen", "TEI All");
  ok("P2 TEI All running with cancel", (await bar()).includes("TEI All läuft") && await page.isVisible("#notice button:text-is('Abbrechen')"));
  await page.click("#flow .w[data-id='" + ID.sich + "']"); await page.waitForTimeout(250);
  ok("P2 interface usable while running", (await page.textContent("#inspector-title")).includes("ſich"));
  await page.click("#notice button:text-is('Abbrechen')");
  ok("P2 cancel", (await bar()).includes("abgebrochen"), await bar());
  await menu("Prüfen", "TEI All");
  await page.waitForTimeout(2300);
  ok("P2 TEI All clean confirmation", (await bar()).includes("TEI All: keine Befunde"), await bar());
  await page.waitForTimeout(4200);
  ok("P2 confirmation disappears", !(await page.isVisible("#notice")));
  await menu("Prüfen", "Schematron editing");
  ok("P3 Schematron editing clean", (await bar()).includes("Schematron editing: keine Befunde"), await bar());
  await page.waitForTimeout(4200);
  await menu("Prüfen", "Schematron review");
  const rb = await bar();
  ok("P3 Schematron review findings in bar", /Schematron review: \d+ Befunde/.test(rb) && rb.includes("xml:id") && rb.includes("Befunde anzeigen"), rb.slice(0, 160));
  await page.click("#notice button:text-is('Befunde anzeigen')");
  const list = await page.textContent("#inspector-body");
  ok("P4 list grouped per check", ["Wohlgeformtheit", "TEI All", "Schematron editing", "Schematron review"].every((c) => list.includes(c)));
  ok("P4 finding names doc, rule, location", list.includes("codex-2759.xml") && list.includes("w-id") && list.includes("fol. 1r a Z. 5") && list.includes("hi-rend-data-only"));
  const wid = page.locator(".finding:has(code:text-is('w-id')) button");
  await wid.click(); await page.waitForTimeout(300);
  ok("P4 jump selects Got", (await page.evaluate(() => document.querySelector("#flow .w.is-current")?.textContent)) === "Got");
  // Outdated after an edit
  await clickWord(ID.sich);
  const n2 = page.locator(".field:has(span:text-is('Normalisiert')) input");
  await n2.fill("sich2"); await n2.press("Enter");
  ok("P5 bar says outdated", (await bar()).includes("Ergebnis veraltet, Prüfung erneut ausführen"), await bar());
  await menu("Prüfen", "Befundliste");
  ok("P5 list says outdated at top", (await page.textContent("#inspector-body p.findings-stale")).includes("Ergebnis veraltet"));
  await page.screenshot({ path: `${SCRATCH}/wireframe-checks-2.png` });
  await page.focus("#inspector-body .findings button");
  await page.keyboard.press("Control+z"); await page.waitForTimeout(200);
  ok("P5 list survives undo (reopen)", await page.isVisible("#inspector-body .findings-group"));

  // Save, failing: no UI path creates an editing-phase finding, so the test commits a
  // register type outside the handbook through history.commit.
  await page.evaluate(async () => {
    const { commit } = await import("/wireframe/js/history.js");
    commit("Test: Registertyp", (d) => { for (const c of d.columns) for (const l of c.lines) for (const t of l.tokens) if (t.ref) t.ref.type = "persona"; });
  });
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(100);
  ok("S1 save runs the set (TEI All running)", (await bar()).includes("Speichern: TEI All läuft"), await bar());
  await page.waitForTimeout(2300);
  const fb = await bar();
  ok("S1 failed save names schema and count", fb.includes("Nicht gespeichert: Schematron editing mit 1 Befund") && fb.includes("Befunde anzeigen"), fb);
  ok("S1 unsaved dot stays", await unsaved());
  await page.click("#notice button:text-is('Befunde anzeigen')");
  ok("S1 list shows register-type", (await page.textContent("#inspector-body")).includes("register-type"));
  await page.screenshot({ path: `${SCRATCH}/wireframe-checks-3.png` });
  await undoKey();
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(2400);
  const sb = await bar();
  ok("S2 save passes", sb.startsWith("Gespeichert.") && sb.includes("Herunterladen") && !(await unsaved()), sb);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#notice a[download]")]);
  const dlPath = `${SCRATCH}/dl-auszug.xml`;
  await dl.saveAs(dlPath);
  const excerpt = await page.evaluate(async () => (await import("/wireframe/js/state.js")).state.data.xmlExcerpt);
  ok("S2 download is the excerpt", dl.suggestedFilename() === "codex-2759-fol-1r-auszug.xml" && fs.readFileSync(dlPath, "utf8") === excerpt);
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(100);
  ok("S3 save with current clean result skips rerun", (await bar()).includes("Gespeichert"));

  // Narrow
  const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } });
  narrow.on("pageerror", (e) => errors.push(String(e)));
  narrow.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await narrow.goto(URL); await narrow.waitForSelector(".w");
  await narrow.click('#flow .w:text-is("Got")'); await narrow.waitForTimeout(250);
  const n3 = narrow.locator(".field:has(span:text-is('Normalisiert')) input");
  await n3.fill("Gott"); await n3.press("Enter");
  await narrow.keyboard.press("Escape"); // the word sheet covers the menu bar at this width
  await narrow.click(`.menu-btn:text-is("Prüfen")`); await narrow.click(`.menu-item:has-text("Schematron review")`);
  await narrow.click("#notice button:text-is('Befunde anzeigen')");
  await narrow.waitForTimeout(150);
  ok("N1 findings sheet at 390 px without horizontal scroll", await narrow.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector("#inspector").getBoundingClientRect().width <= innerWidth));
  await narrow.screenshot({ path: `${SCRATCH}/wireframe-checks-narrow.png` });

  ok("no console errors", errors.length === 0, errors.join(" | "));
  console.log(results.join("\n"));
  await browser.close();
}
main().catch((e) => { console.log(results.join("\n")); console.error(e); process.exit(1); });
