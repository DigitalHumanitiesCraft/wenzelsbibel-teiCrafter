import { chromium } from "playwright";

const URL = "http://127.0.0.1:8765/wireframe/index.html";
const results = [];
const check = (name, ok, extra = "") => { results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(URL);
await page.waitForSelector("#flow .w");
const start = (await page.locator("#flow").innerText()).slice(0, 60).replace(/\s+/g, " ");
check("column a starts with header PROLOGUS", /^Kopfzeile\s*PROLOGUS/.test(start) || start.includes("PROLOGUS"), start);
check("flow label column a", (await page.getAttribute("#flow", "aria-label")).endsWith("Spalte a"));

await page.click('[data-column="1"]');
check("column b", (await page.getAttribute("#flow", "aria-label")).endsWith("Spalte b") && (await page.locator("#flow .w").count()) > 0);
await page.click('[data-column="0"]');

await page.click('[data-view="xml"]');
check("XML view", await page.isVisible("#xml-view") && (await page.locator("#xml .tag").count()) > 0 && await page.isHidden("#flow"));
await page.click('[data-view="text"]');
check("back to text", await page.isVisible("#flow"));

await page.click("#toggle-facs");
await page.waitForSelector("#zones", { state: "attached", timeout: 15000 }).catch(() => {});
check("Faksimile pane", await page.isVisible("#facs-pane") && (await page.getAttribute("#toggle-facs", "aria-pressed")) === "true", `zones attached: ${await page.locator("#zones").count()}`);
await page.click("#toggle-facs");

await page.locator("#flow .ln").nth(2).click();
await page.waitForTimeout(300);
const lineTitle = await page.locator("#inspector-title").innerText();
check("line number opens Zeile", !(await page.isHidden("#inspector")) && lineTitle.startsWith("Zeile"), lineTitle);

check("Rückgängig disabled initially", await page.locator(".menu-item", { hasText: "Rückgängig" }).isDisabled());

// Normalisiert apply, then Ctrl+Z
const word = page.locator("#flow .w").nth(3);
await word.click();
await page.waitForTimeout(300);
const wordTitle = await page.locator("#inspector-title").innerText();
check("word click opens Wort", wordTitle.startsWith("Wort"), wordTitle.replace(/\s+/g, " "));
const norm = page.getByRole("textbox", { name: "Normalisiert", exact: true });
const before = await norm.inputValue();
await norm.fill("testwert");
await norm.press("Enter");
check("Normalisiert sets unsaved dot", await page.isVisible("#status-unsaved"));
check("Rückgängig enabled after edit", !(await page.locator(".menu-item", { hasText: "Rückgängig" }).isDisabled()));
await page.keyboard.press("Control+z");
await page.waitForTimeout(300);
check("Ctrl+Z removes unsaved dot", await page.isHidden("#status-unsaved"));
check("Ctrl+Z restores Normalisiert value", (await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()) === before, `before="${before}" now="${await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()}"`);
check("inspector stays on same word", (await page.locator("#inspector-title").innerText()) === wordTitle);
await page.keyboard.press("Control+y");
await page.waitForTimeout(200);
check("Ctrl+Y redoes", (await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()) === "testwert" && await page.isVisible("#status-unsaved"));
await page.keyboard.press("Control+Shift+z");
await page.keyboard.press("Control+z");
await page.waitForTimeout(200);
check("undo after redo", (await page.getByRole("textbox", { name: "Normalisiert", exact: true }).inputValue()) === before && await page.isHidden("#status-unsaved"));

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

// Register autocomplete
await page.locator("#flow .w").nth(3).click();
await page.waitForTimeout(300);
await page.fill('[aria-label="Registereintrag"]', "Ab");
check("autocomplete opens", await page.isVisible(".ac-list"), `${await page.locator(".ac-item").count()} items`);
await page.keyboard.press("Escape");
check("Escape closes autocomplete, inspector stays", await page.isHidden(".ac-list") && await page.isVisible("#inspector"));

// Schematron review
await page.click('.menu-btn:has-text("Prüfen")');
await page.click('.menu-item:has-text("Schematron review")');
check("notice bar", await page.isVisible("#notice"), (await page.locator("#notice").innerText()).replace(/\s+/g, " ").slice(0, 80));
await page.click('#notice button:has-text("Befunde anzeigen")');
const fTitle = await page.locator("#inspector-title").innerText();
check("Befunde list", fTitle.startsWith("Befunde") && (await page.locator(".findings li").count()) > 1, `${await page.locator(".findings li").count()} li`);

// Ctrl+S reaches Datei, Speichern, which the checks module implements since phase 2.
await page.keyboard.press("Escape");
await page.keyboard.press("Control+s");
await page.waitForTimeout(100);
check("Ctrl+S runs the save flow", /Speichern|Gespeichert/.test(await page.locator("#notice").innerText()), await page.locator("#notice").innerText());

check("no console errors", errors.length === 0, errors.join(" | "));
console.log(results.join("\n"));
await browser.close();
