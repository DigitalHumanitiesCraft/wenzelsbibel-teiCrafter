import { chromium } from "playwright";

const URL = "http://127.0.0.1:8765/wireframe/index.html";
const results = [];
const check = (name, ok, extra = "") => { results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
const title = () => page.locator("#popover-title").innerText();
const disabled = async (sel) => (await page.getAttribute(sel, "aria-disabled")) === "true";
const prufen = async (cmd) => { await page.click('.act[data-action="Prüfen"] > button'); await page.click(`[data-cmd="${cmd}"]`); };

await page.goto(URL);
await page.waitForSelector("#flow .w");
const start = (await page.locator("#flow").innerText()).slice(0, 60).replace(/\s+/g, " ");
check("column a starts with header PROLOGUS", /^Kopfzeile\s*PROLOGUS/.test(start) || start.includes("PROLOGUS"), start);
check("flow label column a", (await page.getAttribute("#flow", "aria-label")).endsWith("Spalte a"));
check("no menu bar, no document bar, no inspector dock", !(await page.locator(".menubar, .docbar, #inspector, #menus").count()));

// Row 2 is always visible and disabled with a reason while nothing is selected.
const row2 = await page.$$eval('#tb-selection [data-guard="markup"], #tb-selection [data-cmd="comment"]', (bs) => bs.map((b) => [b.offsetParent !== null, b.getAttribute("aria-disabled"), b.title]));
check("row 2 visible and disabled with a title reason before a selection", row2.length === 6 && row2.every(([vis, dis, t]) => vis && dis === "true" && /auswählen/.test(t)), JSON.stringify(row2[0]));
await page.click('#tb-selection [data-cmd="comment"]', { force: true }); // aria-disabled stays clickable
check("activating a disabled control states its reason", /auswählen/.test(await page.locator("#notice").innerText()));

await page.click('[data-column="1"]');
check("column b", (await page.getAttribute("#flow", "aria-label")).endsWith("Spalte b") && (await page.locator("#flow .w").count()) > 0);
await page.click('[data-column="0"]');

await page.click('[data-view="xml"]');
check("XML view", await page.isVisible("#xml-view") && (await page.locator("#xml .tag").count()) > 0 && await page.isHidden("#flow"));
check("column switch hidden in XML", await page.isHidden("#column-switch"));
await page.click('[data-view="text"]');
check("back to text", await page.isVisible("#flow"));

check("Zonen disabled with reason while the facsimile is hidden", await disabled("#toggle-zones") && (await page.getAttribute("#toggle-zones", "title")).includes("Faksimile"));
await page.click("#toggle-facs");
await page.waitForSelector("#zones", { state: "attached", timeout: 15000 }).catch(() => {});
check("Faksimile in the Seitenleiste", await page.isVisible("#side-facs") && (await page.getAttribute("#toggle-facs", "aria-pressed")) === "true" && (await page.getAttribute("#tab-facs", "aria-selected")) === "true", `zones attached: ${await page.locator("#zones").count()}`);
check("Zonen enabled with the facsimile", !(await disabled("#toggle-zones")));
await page.click("#toggle-facs");
check("Faksimile toggle closes the column", await page.isHidden("#side"));

await page.locator("#flow .ln").nth(2).click();
await page.waitForTimeout(300);
const lineTitle = await title();
check("line number opens Zeile in the popover", await page.isVisible("#popover") && lineTitle.startsWith("Zeile"), lineTitle);

check("Rückgängig disabled initially with reason", await disabled('[data-cmd="undo"]') && (await page.getAttribute('[data-cmd="undo"]', "title")).startsWith("Nichts rückgängig"));

// Normalisiert apply, then Ctrl+Z
const word = page.locator("#flow .w").nth(3);
const before0 = await word.boundingBox();
await word.click();
await page.waitForTimeout(300);
const wordTitle = await title();
check("word click opens Wort", wordTitle.startsWith("Wort"), wordTitle.replace(/\s+/g, " "));
// The popover sits below the selection inside the text pane and moves no text.
const geo = await page.evaluate(() => {
  const r = (n) => n.getBoundingClientRect();
  const p = r(document.querySelector("#popover"));
  const w = r(document.querySelectorAll("#flow .w")[3]);
  const pane = r(document.querySelector("#text-pane"));
  return { below: p.top >= w.bottom, overlap: !(p.bottom <= w.top || p.top >= w.bottom || p.right <= w.left || p.left >= w.right), inside: p.left >= pane.left && p.right <= pane.right && p.top >= pane.top && p.bottom <= pane.bottom + 1, alignedLeft: Math.abs(p.left - w.left) < 2 || p.right <= pane.right };
});
const after0 = await word.boundingBox();
check("popover below the word, not covering it, inside the text pane", geo.below && !geo.overlap && geo.inside, JSON.stringify(geo));
check("opening the popover does not shift the text", before0.y === after0.y && before0.x === after0.x, `${before0.y} -> ${after0.y}`);
check("row 2 enabled with a selection", !(await disabled('#tb-selection [data-cmd="comment"]')) && !(await disabled('#tb-markup [data-guard="markup"]')));
const norm = page.getByRole("textbox", { name: "Normalisiert", exact: true });
const before = await norm.inputValue();
await norm.fill("testwert");
await norm.press("Enter");
check("Normalisiert sets unsaved dot", await page.isVisible("#status-unsaved"));
await page.waitForTimeout(50);
check("Rückgängig enabled after edit", !(await disabled('[data-cmd="undo"]')));
await page.keyboard.press("Control+z");
await page.waitForTimeout(300);
check("Ctrl+Z removes unsaved dot", await page.isHidden("#status-unsaved"));
check("Ctrl+Z restores Normalisiert value", (await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()) === before, `before="${before}" now="${await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()}"`);
check("popover stays on same word", (await title()) === wordTitle);
await page.keyboard.press("Control+y");
await page.waitForTimeout(200);
check("Ctrl+Y redoes", (await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()) === "testwert" && await page.isVisible("#status-unsaved"));
await page.keyboard.press("Control+Shift+z");
await page.keyboard.press("Control+z");
await page.waitForTimeout(200);
check("undo after redo", (await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()) === before && await page.isHidden("#status-unsaved"));
await page.click('[data-cmd="undo"]', { force: true });
check("toolbar Rückgängig names the step", /Rückgängig: Normalisiert|Nichts rückgängig/.test(await page.locator("#notice").innerText()));

// Escape closes the popover and returns the focus to the flow; the selection stays.
await norm.focus();
await page.keyboard.press("Escape");
check("Escape closes the popover, focus back in the flow, selection kept", await page.isHidden("#popover") && await page.evaluate(() => document.activeElement.id === "flow" && document.querySelectorAll("#flow .w.is-current").length === 1));
await word.click();
await page.waitForTimeout(250);
await page.mouse.click(1300, 600); // empty area of the text pane
await page.waitForTimeout(100);
check("a click outside closes the popover, selection kept", await page.isHidden("#popover") && (await page.locator("#flow .w.is-current").count()) === 1);

// Diplomatic typing in the flow, then Ctrl+Z
const w5 = page.locator("#flow .w").nth(5);
const w5text = await w5.innerText();
await w5.click();
await page.evaluate(() => { const t = document.querySelectorAll("#flow .w")[5].firstChild; getSelection().setBaseAndExtent(t, t.length, t, t.length); });
await page.keyboard.type("x");
const typed = await page.locator("#flow .w").nth(5).innerText();
await page.keyboard.press("Control+z");
await page.waitForTimeout(300);
check("flow typing and undo", typed === `${w5text}x` && (await page.locator("#flow .w").nth(5).innerText()) === w5text && await page.isHidden("#status-unsaved"), `typed="${typed}" after="${await page.locator("#flow .w").nth(5).innerText()}"`);
await page.keyboard.press(" ");
check("refused keystroke states its reason", /teilen|XML-Ansicht/.test(await page.locator("#notice").innerText()), await page.locator("#notice").innerText());

// Register autocomplete; Tab from the flow reaches the popover's controls.
await page.locator("#flow .w").nth(3).click();
await page.waitForTimeout(300);
let reached = false;
for (let i = 0; i < 12 && !reached; i++) { await page.keyboard.press("Tab"); reached = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Registereintrag"); }
check("Tab from the flow reaches the register field in the popover", reached);
await page.fill('[aria-label="Registereintrag"]', "Ab");
check("autocomplete opens", await page.isVisible(".ac-list"), `${await page.locator(".ac-item").count()} items`);
await page.keyboard.press("Escape");
check("Escape closes autocomplete, popover stays", await page.isHidden(".ac-list") && await page.isVisible("#popover"));

// Toolbar pattern: one Tab stop per toolbar, arrows move inside.
await page.focus("#doc-select");
await page.keyboard.press("ArrowRight");
const next = await page.evaluate(() => document.activeElement.dataset.column);
await page.keyboard.press("End");
const end = await page.evaluate(() => document.activeElement.dataset.cmd);
const stops = await page.$$eval("#tb-document button, #tb-document select", (ns) => ns.filter((n) => n.offsetParent && n.tabIndex === 0).length);
check("toolbar: ArrowRight and End move inside, one Tab stop", next === "0" && end === "download" && stops === 1, `${next} ${end} ${stops}`);
check("document select kept its value under ArrowRight", (await page.inputValue("#doc-select")) === "codex");

// Schematron review
await prufen("check:sch-review");
check("notice bar below the Arbeitsleiste", await page.isVisible("#notice") && await page.evaluate(() => document.querySelector("#notice").getBoundingClientRect().top >= document.querySelector(".arbeitsleiste").getBoundingClientRect().bottom - 1), (await page.locator("#notice").innerText()).replace(/\s+/g, " ").slice(0, 80));
const textX = (await page.locator("#flow .w").nth(3).boundingBox()).x;
await page.click('#notice button:has-text("Befunde anzeigen")');
const fTitle = await page.locator("#side-findings .panel-title").innerText();
check("Befunde list in the Seitenleiste", fTitle.startsWith("Befunde") && (await page.locator("#side-findings .findings li").count()) > 1 && (await page.getAttribute("#tab-findings", "aria-selected")) === "true", `${await page.locator(".findings li").count()} li`);
check("opening the list does not push the text", (await page.locator("#flow .w").nth(3).boundingBox()).x === textX);

// Ctrl+S reaches Speichern, which the checks module implements.
await page.keyboard.press("Escape");
await page.keyboard.press("Control+s");
await page.waitForTimeout(100);
check("Ctrl+S runs the save flow", /Speichern|Gespeichert/.test(await page.locator("#notice").innerText()), await page.locator("#notice").innerText());

check("no console errors", errors.length === 0, errors.join(" | "));
console.log(results.join("\n"));
await browser.close();
