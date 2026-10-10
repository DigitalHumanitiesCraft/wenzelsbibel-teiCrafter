// Findings 1, 2, 3, 4/10, 6, 7, 8, 9, 12, 15, 16, 21 of review 2.
// node fixes-a-check.mjs [base]   base defaults to the live wireframe on :8765; the
// reviewed state of 2026-10-10 (commit ba71313) may be served on :8766, where a
// FAIL is the reproduction of the finding.
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:8765";
const URL = `${BASE}/wireframe/index.html`;
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${String(extra).replace(/\s+/g, " ").slice(0, 200)})` : ""}`);
const browser = await chromium.launch();
const errors = [];

const VIEWS = {
  wide: { viewport: { width: 1400, height: 900 } },
  narrow: { viewport: { width: 390, height: 844 } },
  // 200 percent browser zoom on 1400x900: the same CSS viewport at twice the pixel density.
  zoom200: { viewport: { width: 700, height: 450 }, deviceScaleFactor: 2 },
};

async function open(view = "wide", hash = "") {
  const ctx = await browser.newContext(VIEWS[view]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${view}: ${e}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${view}: ${m.text()}`); });
  await page.goto(URL + hash);
  await page.waitForSelector("#flow .w:visible, #minis .mini-item:visible");
  return page;
}
const data = (page, src) => page.evaluate(async (s) => {
  const { state } = await import("/wireframe/js/state.js");
  return new Function("d", `return (${s})(d)`)(state.data);
}, src);
const menu = async (page, m, item) => { await page.click(`.menu-btn:text-is("${m}")`); await page.click(`.menu-item:has-text("${item}")`); await page.waitForTimeout(150); };
const notice = (page) => page.evaluate(() => (document.querySelector("#notice").hidden ? "" : document.querySelector("#notice").textContent));
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}#${a.id}.${a.className}:${(a.getAttribute("aria-label") || a.textContent || "").slice(0, 30)}` : ""; });
const visible = (page, sel) => page.isVisible(sel);
const scenario = async (name, fn) => { try { await fn(); } catch (e) { check(`${name} ran`, false, String(e).split("\n")[0]); } };
const normInput = (page) => page.getByRole("textbox", { name: "Normalisiert", exact: true });

// 1: XML view in Bildannotationen
await scenario("F1", async () => {
  const page = await open();
  check("F1 the select names the codex file in its title, no second name", (await page.getAttribute("#doc-select", "title")) === "codex-2759.xml" && !(await page.locator("#status-file").count()));
  await page.selectOption("#doc-select", "images");
  await page.waitForTimeout(150);
  check("F1 the select title follows the document", (await page.getAttribute("#doc-select", "title")) === "Bildannotationen.xml");
  await page.click('[data-view="xml"]');
  await page.waitForTimeout(150);
  const xmlShown = await visible(page, "#xml");
  const note = await page.locator('#xml-view [data-doc="images"]').count() ? await page.locator('#xml-view [data-doc="images"]').innerText() : "";
  check("F1 XML in Bildannotationen shows no codex excerpt", !xmlShown);
  check("F1 XML in Bildannotationen shows the plain empty state", note === "Kein XML geladen.", note);
  check("F1 column switch hidden", !(await visible(page, "#column-switch")));
  await page.click('[data-view="text"]');
  await page.waitForTimeout(150);
  check("F1 back to Text shows the miniature list", await visible(page, "#minis .mini-item"));
  check("F1 back to Text keeps the codex flow hidden", !(await visible(page, "#flow")));
  await page.context().close();
});

// 2: unapplied input blocks the document switch, by select and by Back
await scenario("F2", async () => {
  const page = await open();
  await page.click("#flow .w >> nth=3");
  await page.waitForTimeout(300);
  await normInput(page).fill("ungesichert");
  await page.selectOption("#doc-select", "images");
  await page.waitForTimeout(200);
  check("F2 select: codex stays active", (await page.inputValue("#doc-select")) === "codex" && await visible(page, "#flow"));
  check("F2 select: input kept and refocused", (await normInput(page).inputValue()) === "ungesichert" && (await active(page)).startsWith("INPUT"), await active(page));
  const note = await page.locator("#inspector-note").innerText();
  check("F2 select: note asks to apply or cancel", /Anwenden oder Abbrechen/.test(note), note);
  await page.context().close();

  const p2 = await open();
  await p2.goto(`${URL}#bild/miniatures_01`);
  await p2.waitForSelector('#inspector-body input[data-key="title"]');
  await p2.fill('#inspector-body input[data-key="title"]', "Neuer Titel");
  await p2.goBack();
  await p2.waitForTimeout(300);
  check("F2 Back: Bildannotationen stays active", (await p2.inputValue("#doc-select")) === "images");
  check("F2 Back: title input kept", (await p2.locator('#inspector-body input[data-key="title"]').count()) === 1 && (await p2.inputValue('#inspector-body input[data-key="title"]')) === "Neuer Titel");
  check("F2 Back: address matches the shown item", (await p2.evaluate(() => location.hash)) === "#bild/miniatures_01", await p2.evaluate(() => location.hash));
  // After cancelling, Back works again.
  await p2.click("#inspector-body .mini-actions >> text=Abbrechen");
  await p2.goBack();
  await p2.waitForTimeout(300);
  check("F2 Back after Abbrechen leaves the document", (await p2.inputValue("#doc-select")) === "codex");
  await p2.context().close();
});

// 3: one history per document
await scenario("F3", async () => {
  const page = await open();
  await page.click("#flow .w >> nth=3");
  await page.waitForTimeout(300);
  const id = await page.getAttribute("#flow .w >> nth=3", "data-id");
  await normInput(page).fill("testnorm");
  await normInput(page).press("Enter");
  await page.selectOption("#doc-select", "images");
  await page.waitForTimeout(150);
  await page.click('.menu-btn:text-is("Bearbeiten")');
  check("F3 Rückgängig disabled in Bildannotationen without own edits", await page.locator(".menu-item", { hasText: "Rückgängig" }).isDisabled());
  await page.keyboard.press("Escape");
  await page.focus("#doc-select");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(150);
  const norm = await data(page, `(d) => { for (const c of d.columns) for (const l of c.lines) for (const t of l.tokens) if (t.id === ${JSON.stringify(id)}) return t.norm; }`);
  check("F3 Ctrl+Z in Bildannotationen leaves the codex edit", norm === "testnorm", norm);
  await page.click('#minis .mini-item[data-item="miniatures_01"]');
  await page.fill('#inspector-body input[data-key="title"]', "Titel neu");
  await page.click("#inspector-body .mini-actions >> text=Anwenden");
  await page.focus("#doc-select");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(150);
  const n1 = await notice(page);
  check("F3 undo in Bildannotationen announced with its label", /Rückgängig: Bildannotation miniatures_01/.test(n1), n1);
  check("F3 image edit undone", (await data(page, '(d) => d.miniatures.find((m) => m.id === "miniatures_01").fields.title.text')) !== "Titel neu");
  await page.selectOption("#doc-select", "codex");
  await page.waitForTimeout(150);
  await page.focus("#doc-select");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(150);
  const n2 = await notice(page);
  check("F3 undo in Codex announced with its label", /Rückgängig: Normalisiert/.test(n2), n2);
  await page.keyboard.press("Control+y");
  await page.waitForTimeout(150);
  check("F3 redo announced", /Wiederholt: Normalisiert/.test(await notice(page)), await notice(page));
  await page.context().close();
});

// 4 and 10: labels claim only what is checked
await scenario("F4/10", async () => {
  const page = await open();
  const badge = await page.getAttribute(".wireframe-badge", "title");
  check("F4 the header badge states the in-memory scope once", await visible(page, ".wireframe-badge") && badge === "Entwurf im Speicher auf fol. 1r; schreibt keine Datei." && (await page.locator(".wireframe-badge").textContent()).includes(badge), badge);
  await page.click('[data-view="xml"]');
  check("F4 the XML view begins with the source, without a toolbar or note", !(await page.locator("#xml-view .xml-head, #xml-note, #xml-format").count()) && await page.evaluate(() => document.querySelector("#xml-view").firstElementChild.id === "xml"));
  await menu(page, "Bearbeiten", "XML formatieren");
  const f = await notice(page);
  check("F4 XML formatieren from the menu commits and states its consequence in the notice bar", f.includes("wird erst beim Speichern wirksam") && await visible(page, "#status-unsaved"), f);
  await page.keyboard.press("Control+z");
  await menu(page, "Prüfen", "Wohlgeformtheit");
  const n = await notice(page);
  check("F10 well-formedness result is stated plainly", n.includes("Wohlgeformtheit: wohlgeformt."), n);
  await page.context().close();
});

// 6: every finding of the page resolves
await scenario("F6", async () => {
  const page = await open();
  await menu(page, "Prüfen", "Schematron review");
  await menu(page, "Prüfen", "Befundliste");
  const metas = await page.$$eval("#inspector-body .finding", (fs) => fs.map((f) => ({ link: !!f.querySelector(".link-btn"), where: f.querySelector(".link-btn")?.textContent || "", path: f.querySelector(".finding-meta").textContent })));
  let ok = 0;
  const bad = [];
  for (let i = 0; i < metas.length; i++) {
    if (!metas[i].link) { bad.push(`${i} no link`); continue; }
    if (i) { await menu(page, "Prüfen", "Befundliste"); }
    await page.locator("#inspector-body .finding .link-btn").nth(i).click();
    await page.waitForTimeout(120);
    const cur = await page.getAttribute("#flow .w.is-current >> nth=0", "data-id", { timeout: 500 }).catch(() => null); // "" for a word without id
    const want = (/xml:id='([^']+)'/.exec(metas[i].path) || [])[1];
    const isPc = metas[i].path.includes("following::pc");
    // A punctuation finding selects the word it follows (the path's word) unless it opens its line.
    if (cur !== null && (cur === want || isPc)) ok++; else bad.push(`${i} ${metas[i].where} want ${want} got ${cur} ${await notice(page)}`);
  }
  check(`F6 every finding selects its word (${ok}/${metas.length})`, ok === metas.length && metas.length > 0, bad.slice(0, 4).join("; "));
  // The finding of the review: line-final supplied "!" in column b, line 10.
  await menu(page, "Prüfen", "Befundliste");
  const idx = metas.findIndex((m) => m.path.includes("region_1639399508072_16l10_5']/following::pc"));
  await page.locator("#inspector-body .finding .link-btn").nth(idx).click();
  await page.waitForTimeout(150);
  const cur = await page.getAttribute("#flow .w.is-current >> nth=0", "data-id", { timeout: 500 }).catch(() => null);
  check("F6 column b Z. 10 '!' selects the word it closes", cur === "region_1639399508072_16l10_5", `${cur} ${await notice(page)}`);
  await page.context().close();
});

// 12: outdated position finding after anchors were inserted
await scenario("F12", async () => {
  const page = await open();
  await menu(page, "Prüfen", "Schematron review");
  // Two anchors at the start of the line that holds 13l1_4, as an apparatus comment would insert.
  await page.evaluate(async () => {
    const { commit } = await import("/wireframe/js/history.js");
    commit("Testanker", (d) => {
      const line = d.columns[0].lines.find((l) => l.tokens.some((t) => t.id === "region_1639399497290_13l1_4"));
      line.tokens.unshift({ type: "anchor", id: "t_start" }, { type: "anchor", id: "t_end" });
    });
  });
  await menu(page, "Prüfen", "Befundliste");
  const metas = await page.$$eval("#inspector-body .finding .finding-meta", (fs) => fs.map((f) => f.textContent));
  const pcIdx = metas.findIndex((m) => m.includes("13l1_4']/following::pc"));
  await page.locator("#inspector-body .finding .link-btn").nth(pcIdx).click();
  await page.waitForTimeout(150);
  const cur = await page.getAttribute("#flow .w.is-current >> nth=0", "data-id", { timeout: 500 }).catch(() => null);
  const n = await notice(page);
  check("F12 outdated punctuation finding selects no other word and says outdated", /veraltet/.test(n) && (cur === null || cur === "region_1639399497290_13l1_4"), `${cur} | ${n}`);
  await menu(page, "Prüfen", "Befundliste");
  const hiIdx = metas.findIndex((m) => m.includes("13l1_3']//hi"));
  await page.locator("#inspector-body .finding .link-btn").nth(hiIdx).click();
  await page.waitForTimeout(150);
  const cur2 = await page.getAttribute("#flow .w.is-current >> nth=0", "data-id", { timeout: 500 }).catch(() => null);
  check("F12 word finding still found by its xml:id", cur2 === "region_1639399497290_13l1_3", cur2);
  await page.context().close();
});

// 7: a findings jump from Bildannotationen switches to the codex first
await scenario("F7", async () => {
  const page = await open();
  await menu(page, "Prüfen", "Schematron review");
  await page.selectOption("#doc-select", "images");
  await page.waitForTimeout(150);
  await menu(page, "Prüfen", "Befundliste");
  await page.locator("#inspector-body .finding .link-btn").first().click();
  await page.waitForTimeout(200);
  check("F7 jump activates the codex", (await page.inputValue("#doc-select")) === "codex" && await visible(page, "#flow"));
  check("F7 the marked word is visible", await visible(page, "#flow .w.is-current"));
  await page.context().close();
});

// 8: the sheet leaves both bars operable and makes the covered area inert
for (const view of ["narrow", "zoom200"]) {
  await scenario(`F8 ${view}`, async () => {
    const page = await open(view);
    await page.click("#flow .w >> nth=3");
    await page.waitForTimeout(300);
    check(`F8 ${view} sheet open`, await visible(page, "#inspector"));
    const reachable = await page.evaluate(() => ["#menus .menu-btn:nth-child(1)", '[data-view="xml"]', "#toggle-facs", "#doc-select"].map((s) => {
      const n = document.querySelector(s.replace(":nth-child(1)", "")) ;
      const r = n.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return n === hit || n.contains(hit);
    }));
    const pruefen = await page.evaluate(() => { const n = [...document.querySelectorAll(".menu-btn")].find((b) => b.textContent === "Prüfen"); const r = n.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return n === hit; });
    check(`F8 ${view} menu, Text/XML, Faksimile and document select reachable by pointer`, reachable.every(Boolean) && pruefen, JSON.stringify(reachable) + pruefen);
    check(`F8 ${view} covered work area is inert`, await page.evaluate(() => document.querySelector("#work").inert === true));
    await page.focus("#inspector-close");
    let leaked = false;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Shift+Tab");
      if (await page.evaluate(() => document.querySelector("#work").contains(document.activeElement))) leaked = true;
    }
    check(`F8 ${view} Shift+Tab never lands in the covered area`, !leaked);
    await page.focus("#inspector-close");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check(`F8 ${view} Escape removes inert and returns focus to the text`, await page.evaluate(() => !document.querySelector("#work").inert && document.activeElement === document.querySelector("#flow")), await active(page));
    await page.click("#flow .w >> nth=5");
    await page.waitForTimeout(300);
    await page.click("#inspector-close");
    await page.waitForTimeout(150);
    check(`F8 ${view} Zum Text removes inert and returns focus`, await page.evaluate(() => !document.querySelector("#work").inert && document.activeElement === document.querySelector("#flow")), await active(page));
    await page.context().close();
  });
}

// 9: arrow keys in the menu bar, focus after an entry runs
await scenario("F9", async () => {
  const page = await open();
  await page.focus(".menu-btn >> nth=0");
  await page.keyboard.press("ArrowRight");
  check("F9 Right moves to Bearbeiten", (await active(page)).includes("Bearbeiten"), await active(page));
  await page.keyboard.press("ArrowDown");
  const first = await active(page);
  check("F9 Down opens the menu on its first enabled entry", first.includes("menu-item") && first.includes("Suchen"), first);
  await page.keyboard.press("ArrowDown");
  check("F9 Down moves inside the menu", (await active(page)).includes("Apparatkommentar"), await active(page));
  await page.keyboard.press("End");
  check("F9 End jumps to the last entry", (await active(page)).includes("XML formatieren"), await active(page));
  await page.keyboard.press("Home");
  check("F9 Home jumps to the first entry", (await active(page)).includes("Suchen"), await active(page));
  await page.keyboard.press("ArrowRight");
  check("F9 Right in an open menu opens Ansicht on its first entry", (await active(page)).includes("menu-item") && (await active(page)).includes("Text") && await visible(page, '.menu-btn:text-is("Ansicht") + .menu-list'), await active(page));
  await page.keyboard.press("ArrowLeft");
  check("F9 Left goes back to Bearbeiten, open", await visible(page, '.menu-btn:text-is("Bearbeiten") + .menu-list'));
  await page.keyboard.press("Escape");
  check("F9 Escape closes and focuses the menu button", (await active(page)).includes("Bearbeiten") && !(await visible(page, ".menu-list")), await active(page));
  await page.keyboard.press("End");
  check("F9 End on the bar jumps to Hilfe", (await active(page)).includes("Hilfe"), await active(page));
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter"); // Prüfen, Schematron review: findings, so Befundliste has links to focus
  await page.waitForTimeout(150);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter"); // Prüfen, Wohlgeformtheit
  await page.waitForTimeout(150);
  check("F9 after an entry runs focus returns to its menu button", (await active(page)).includes("Prüfen") && /wohlgeformt/.test(await notice(page)), await active(page));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press(" "); // Befundliste: moves focus into the inspector
  await page.waitForTimeout(150);
  check("F9 an action that moves focus keeps it", (await active(page)).includes("inspector") || await page.evaluate(() => document.querySelector("#inspector").contains(document.activeElement)), await active(page));
  await page.context().close();
});

// 21: codex column in the address
await scenario("F21", async () => {
  const page = await open();
  check("F21 codex address on load", (await page.evaluate(() => location.hash)) === "#codex/1r/a", await page.evaluate(() => location.hash));
  await page.click('[data-column="1"]');
  await page.waitForTimeout(150);
  check("F21 column b in the address", (await page.evaluate(() => location.hash)) === "#codex/1r/b", await page.evaluate(() => location.hash));
  await page.reload();
  await page.waitForSelector("#flow .w");
  check("F21 reload restores column b", await page.locator('[data-column="1"]').evaluate((b) => b.classList.contains("is-active")) && (await page.getAttribute("#flow", "aria-label")).endsWith("Spalte b"));
  await page.goBack();
  await page.waitForTimeout(200);
  check("F21 Back restores column a", (await page.getAttribute("#flow", "aria-label")).endsWith("Spalte a"), await page.evaluate(() => location.hash));
  await page.selectOption("#doc-select", "images");
  await page.waitForTimeout(100);
  await page.selectOption("#doc-select", "codex");
  await page.waitForTimeout(100);
  check("F21 back to the codex sets its address", (await page.evaluate(() => location.hash)) === "#codex/1r/a", await page.evaluate(() => location.hash));
  await page.context().close();
});

// 15: target sizes and the place chip outline
await scenario("F15", async () => {
  const page = await open();
  await page.click('[data-column="1"]'); // the person chips of fol. 1r are in column b
  await page.waitForTimeout(150);
  const h = await page.$$eval("#flow .chip", (cs) => (cs.length ? Math.min(...cs.map((c) => c.getBoundingClientRect().height)) : 0));
  check("F15 register chips at least 24 px high", h >= 24, h);
  // fol. 1r links no place in the text; a place chip as register.js renders it is measured instead.
  const contrast = await page.evaluate(async () => {
    const { chipFor } = await import("/wireframe/js/state.js");
    const c = chipFor("place|Jerusalem");
    document.querySelector("#flow").append(c);
    if (!c) return null;
    const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const cs = getComputedStyle(c);
    const [a, b] = [lum(rgb(cs.borderTopColor)), lum(rgb(cs.backgroundColor))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  check("F15 place chip outline reaches 3:1", contrast !== null && contrast >= 3, contrast);
  await page.click("#flow .w >> nth=3");
  await page.waitForTimeout(300);
  await menu(page, "Bearbeiten", "Apparatkommentar zur Auswahl");
  const sh = await page.$$eval("#inspector-body summary", (ss) => ss.map((s) => [s.textContent, s.getBoundingClientRect().height]));
  const types = sh.find(([t]) => t.includes("Im Codex verwendete Typen"));
  check("F15 'Im Codex verwendete Typen' summary at least 24 px", types && types[1] >= 24, JSON.stringify(sh));
  await page.context().close();
});

// 16: an open ICONCLASS hit list closes when a menu opens
await scenario("F16", async () => {
  const page = await open("wide", "#bild/miniatures_01");
  await page.click("#inspector-body .ic-search-open");
  await page.fill('#inspector-body input[type="search"]', "Gott");
  await page.waitForTimeout(150);
  check("F16 hit list open", await visible(page, ".ic-hits"));
  await page.click('.menu-btn:text-is("Datei")');
  check("F16 opening a menu closes the hit list", !(await visible(page, ".ic-hits")));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  check("F16 first Escape closes the menu and focuses its button", (await active(page)).includes("Datei") && !(await visible(page, ".menu-list")), await active(page));
  await page.context().close();
});

check("no console or page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
console.log(results.join("\n"));
console.log(`${results.filter((r) => r.startsWith("PASS")).length} PASS, ${results.filter((r) => r.startsWith("FAIL")).length} FAIL`);
