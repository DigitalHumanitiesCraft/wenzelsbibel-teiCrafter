import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const URL = "http://127.0.0.1:8765/wireframe/index.html";
const SHOTS = fileURLToPath(new globalThis.URL("../../test-results/wireframe/", import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(URL);
await page.waitForSelector("#flow .w");

const col = async (i) => { await page.click(`[data-column="${i}"]`); await page.waitForTimeout(100); };
// Select whole words a..b (a by text and occurrence) the way a mouse drag does.
const select = async (a, b = a, nth = 0) => {
  const ok = await page.evaluate(([a, b, nth]) => {
    const ws = [...document.querySelectorAll("#flow .w")];
    const text = (w) => w.textContent.replace(/\n/g, ""); // without the soft break of an inner lb
    const hit = ws.filter((w) => text(w) === a)[nth];
    if (!hit) return false;
    const i = ws.indexOf(hit);
    const j = ws.findIndex((w, k) => k >= i && text(w) === b);
    const flow = document.querySelector("#flow");
    flow.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    flow.focus();
    getSelection().setBaseAndExtent(ws[i].firstChild, 0, ws[j].firstChild, ws[j].firstChild.length);
    flow.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    return true;
  }, [a, b, nth]);
  await page.waitForTimeout(250);
  if (!ok) results.push(`FAIL select ${a}..${b}`);
  return ok;
};
const groupOf = (word, nth = 0) => page.evaluate(([word, nth]) => {
  const text = (x) => x.textContent.replace(/\n/g, "");
  const w = [...document.querySelectorAll("#flow .w")].filter((x) => text(x) === word)[nth];
  const g = w && w.closest(".ref-group");
  return g ? { words: [...g.querySelectorAll(".w")].map(text), chip: g.querySelector(".chip")?.textContent } : null;
}, [word, nth]);
const regChip = () => page.locator("#popover-content .register .linked .chip").textContent({ timeout: 1000 }).catch(() => null);
const note = () => page.locator("#popover-note").textContent();
// Entries of the Register dropdown in the Arbeitsleiste; force, because a disabled entry
// (aria-disabled) stays clickable and answers with its reason.
const menu = async (cmd) => { await page.click('.act[data-action="Register"] > button'); await page.click(`[data-cmd="${cmd}"]`, { force: true }); await page.waitForTimeout(200); };
const key = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(250); };
const tabTo = async (pred) => { for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); if (await page.evaluate(pred)) return true; } return false; };
const combo = () => page.locator('#popover-content [role="combobox"]');
const pickFirst = async (q) => { await combo().fill(q); await page.waitForTimeout(150); await page.keyboard.press("ArrowDown"); await key("Enter"); };

// US3.1 AC1: the existing link to Martin over all three words, also in the popover.
await col(1);
for (const w of ["Rotlebín", "herren", "merteín"]) {
  await select(w, w, w === "herren" ? 1 : 0);
  const g = await groupOf(w, w === "herren" ? 1 : 0);
  check(`3.1.1 ${w}: chip over the three words`, g && g.chip === "Person: Martin" && g.words.join(" ") === "Rotlebín herren merteín", JSON.stringify(g));
  check(`3.1.1 ${w}: popover register field shows Martin`, (await regChip()) === "Person: Martin");
}
check("no provenance disclosure under the field", !(await page.locator(".reg-note").count()) && !(await page.locator("#popover-content").innerText()).includes("Herkunft"));

// US3.1 AC2, AC3: keyboard-only autocomplete; new link of "werden vrowen" to Königin Sophie.
await select("werden", "vrowen", 1);
check("keyboard: Tab reaches the register combobox", await tabTo(() => document.activeElement?.getAttribute("aria-label") === "Registereintrag"));
await page.keyboard.type("Kö");
await page.waitForTimeout(150);
const hits = await page.locator("#ac-list .ac-item").allTextContents();
check("3.1.2 hits across registers with type, ID and count", hits.some((h) => h.includes("Königin Sophie") && h.includes("Person") && h.includes("1 Verweis im Codex")) && hits.some((h) => h.includes("Königstal") && h.includes("Ort")), hits.join(" | "));
await page.keyboard.press("Shift+Tab");
await page.keyboard.press("ArrowDown"); // type filter Alle -> Person
await page.waitForTimeout(150);
const filtered = await page.locator("#ac-list .ac-item:not(.is-new) .type").allTextContents();
check("3.1.2 type filter narrows to persons", filtered.length > 0 && filtered.every((t) => t.startsWith("Person")), filtered.join(" | "));
await page.keyboard.press("Tab");
let opt = "";
for (let i = 0; i < 8; i++) { await page.keyboard.press("ArrowDown"); opt = await page.locator("#ac-list .ac-item.is-active .id").textContent({ timeout: 500 }).catch(() => ""); if (opt === "Königin Sophie") break; }
check("keyboard: arrows reach the hit, aria-activedescendant set", opt === "Königin Sophie" && Boolean(await combo().getAttribute("aria-activedescendant")));
await key("Enter");
let g = await groupOf("vrowen");
check("3.1.3 Enter links both words in one wrapper", g && g.chip === "Person: Königin Sophie" && g.words.join(" ") === "werden vrowen", JSON.stringify(g));
check("3.1.3 popover shows the new link (rs/@ref)", (await regChip()) === "Person: Königin Sophie" && (await page.locator("#popover-content .ref-form").textContent()) === "rs/@ref");
await page.screenshot({ path: `${SHOTS}wireframe-register-1.png` });
await key("Control+z");
check("3.1.3 Ctrl+Z removes the link in one step", (await groupOf("vrowen")) === null && (await groupOf("werden", 1)) === null);
await key("Control+y");
check("Ctrl+Y restores the link", (await groupOf("vrowen"))?.chip === "Person: Königin Sophie");

// US3.1 AC4: refused partial wraps, source unchanged.
await select("Dem", "Rotlebín", 1);
await pickFirst("Martin");
const n1 = await page.locator("#popover-content .register [role=alert]").textContent(); // finding 13: at the field
check("3.1.4 partial wrap of the Martin ref refused naming the element", /teilen/.test(n1) && /Element ref/.test(n1) && /Martin/.test(n1), n1);
check("3.1.4 source unchanged after the refusal", (await groupOf("Dem")) === null && (await groupOf("Rotlebín"))?.words.length === 3);
await col(0);
await select("hat", "er");
await pickFirst("Martin");
// Finding 5 (review 2): an anchor between the words does not block the link (F38).
check("3.1.4 link across an apparatus anchor written", (await groupOf("hat"))?.words.join(" ") === "hat er");
await key("Control+z");

// Verknüpfung lösen removes the whole run in one step.
await col(1);
await select("herren", "herren", 1);
await page.click('#popover-content .register button:text-is("Verknüpfung lösen")');
await page.waitForTimeout(250);
check("Verknüpfung lösen removes the whole run", (await groupOf("Rotlebín")) === null && (await groupOf("merteín")) === null);
await key("Control+z");
check("Ctrl+Z restores the Martin run", (await groupOf("merteín"))?.words.length === 3);

// US3.2: create from the text on "Got" (column a), duplicate ID first.
await col(0);
await select("Got");
await combo().fill("Gott");
await page.waitForTimeout(150);
const newOpt = page.locator("#ac-list .ac-item.is-new");
check("3.2.1 '+ neu anlegen' offered when no hit matches", ((await newOpt.textContent()) || "").includes("+ neu anlegen"));
await newOpt.click();
await page.waitForTimeout(150);
const idField = page.locator("#popover-content .reg-form label:has-text('ID') input");
const nameField = page.locator("#popover-content .reg-form label:has-text('Vorzugsname') input");
check("3.2.1 form prefilled with type, ID and preferred name", (await page.locator("#popover-content .reg-form select").inputValue()) === "person" && (await idField.inputValue()) === "Got" && (await nameField.inputValue()) === "Got"); // finding 18
await idField.fill(" Martin ");
await page.click("#popover-apply"); // the popover's one Anwenden (F28)
await page.waitForTimeout(150);
const err = await page.locator("#reg-id-error").textContent();
check("3.2.2 existing ID refused at the ID field", /besteht bereits/.test(err) && (await idField.getAttribute("aria-invalid")) === "true" && (await groupOf("Got")) === null, err);
await page.screenshot({ path: `${SHOTS}wireframe-register-2.png` });
await idField.fill("Gott");
await idField.press("Enter");
await page.waitForTimeout(250);
check("3.2.2 Anwenden creates the entry and links the selection", (await groupOf("Got"))?.chip === "Person: Gott");
await select("herczen");
await combo().fill("Gott");
await page.waitForTimeout(150);
check("created entry appears in later autocomplete hits", (await page.locator("#ac-list .ac-item .id").allTextContents()).includes("Gott"));
await key("Escape");
check("Escape closes the autocomplete first", (await page.locator("#ac-list").isHidden()) && !(await page.locator("#popover").isHidden()));
await combo().fill("");
await key("Control+z");
await select("herczen");
await combo().fill("Gott");
await page.waitForTimeout(150);
check("Ctrl+Z removes link and entry in one step", (await groupOf("Got")) === null && !(await page.locator("#ac-list .ac-item .id").allTextContents()).includes("Gott"));
await key("Escape");
await combo().fill("");
await key("Control+y");
check("Ctrl+Y restores created entry and link", (await groupOf("Got"))?.chip === "Person: Gott");

// Neu anlegen without and with a selection: disabled with its reason, then the form.
await key("Escape"); await key("Escape"); await key("Escape");
check("Neu anlegen disabled without a selection, reason as title", (await page.getAttribute('[data-cmd="register:create"]', "aria-disabled")) === "true" && /auswählen/.test(await page.getAttribute('[data-cmd="register:create"]', "title")));
await menu("register:create");
check("Neu anlegen without selection states the need", /auswählen/.test((await page.locator("#notice").textContent()) || ""));
await select("liebes");
await menu("register:create");
check("Eintrag anlegen opens the form for the selection", (await idField.inputValue()) === "liebes" && (await idField.evaluate((x) => x === document.activeElement)));

// US3.2 AC3: references panel with the codex link and a session link to Martin.
await col(1);
await select("vromen", "herren", 0);
await pickFirst("Martin");
check("second link to Martin written as its own run", (await groupOf("vromen"))?.words.join(" ") === "vromen herren");
await select("merteín");
const textX = (await page.locator("#flow .w").first().boundingBox()).x;
await menu("register:refs");
const refs = await page.locator("#side-refs .reg-refs li").allTextContents();
check("Verweise open in the Seitenleiste tab, the text stays in place", (await page.getAttribute("#tab-refs", "aria-selected")) === "true" && (await page.locator("#flow .w").first().boundingBox()).x === textX);
check("3.2.3 panel lists every reference in either form", refs.length === 2 && refs.some((r) => r.includes("Spalte b, Z. 16") && !r.includes("bis") && r.includes("ref/@target")) && refs.some((r) => r.includes("Z. 13") && r.includes("rs/@ref")), refs.join(" | "));
check("panel shows the codex-wide count", (await page.locator("#side-refs .reg-meta").textContent()).includes("2 Verweise im Codex"));
await page.screenshot({ path: `${SHOTS}wireframe-register-3.png` });
await page.locator("#side-refs .reg-refs li button").first().focus();
await key("ArrowDown");
await key("Enter");
let t = await page.locator("#side-refs .panel-title").textContent();
const cur = await page.evaluate(() => [...document.querySelectorAll("#flow .w.is-current")].map((w) => w.textContent.replace(/\n/g, "")).join(" "));
check("jump selects the reference's words (keyboard), panel stays open", cur === "Rotlebín herren merteín" && t.startsWith("Verweise"), `${cur} / ${t}`);
await key("Control+z");
await select("merteín");
await page.click("#popover-content .reg-show-refs");
await page.waitForTimeout(150);
check("after Ctrl+Z the panel lists only the codex reference (opened from the chip's Verweise)", (await page.locator("#side-refs .reg-refs li").count()) === 1);
// Escape: the panel holding the focus, the popover, then the selection.
await key("Escape"); await key("Escape"); await key("Escape");
check("Escape order closed panel and popover and cleared the selection", await page.isHidden("#side") && await page.isHidden("#popover") && (await page.locator("#flow .w.is-current").count()) === 0);
await menu("register:refs");
check("without a linked selection the panel offers a search", await page.locator('#side-refs input[type="search"]').isVisible());
await page.locator('#side-refs input[type="search"]').fill("Martin");
await page.waitForTimeout(100);
await page.locator("#side-refs .reg-list button").first().click();
await page.waitForTimeout(100);
check("search row opens the entry's references", (await page.locator("#side-refs .reg-refs li").count()) === 1);
await menu("register:person");
await page.locator('#side-refs input[type="search"]').fill("mart");
await page.waitForTimeout(100);
const row = await page.locator("#side-refs .reg-list li").first().textContent();
check("Register Personen: filtered list with ID, count and jump", row.includes("Martin") && row.includes("1 Verweis im Codex") && row.includes("Zu Spalte b"), row);
await page.locator("#side-refs .reg-list li button").first().click();
await page.waitForTimeout(300);
t = await page.locator("#popover-title").textContent();
check("list jump selects the first occurrence", t.includes("Rotlebín"), t);
await menu("register:folk");
check("Register Völker lists peoples", (await page.locator("#side-refs .panel-title").textContent()) === "Register Völker" && (await page.locator("#side-refs .reg-list li").count()) > 0);
check("no provenance disclosure in the register list", !(await page.locator("#side-refs .reg-note").count()) && !(await page.locator("#side-refs").innerText()).includes("Herkunft"));

// Narrow sheet layout.
await page.setViewportSize({ width: 390, height: 800 });
await key("Escape"); // the focus is in the Völker list, so the panel closes
await col(1);
await select("Rotlebín");
await combo().fill("Ma");
await page.waitForTimeout(200);
const narrow = await page.evaluate(() => {
  const l = document.querySelector("#ac-list").getBoundingClientRect();
  return { noHScroll: document.documentElement.scrollWidth <= innerWidth, inside: l.left >= 0 && l.right <= innerWidth, visible: l.height > 0 };
});
check("390 px: no horizontal scroll, list inside the viewport", narrow.noHScroll && narrow.inside && narrow.visible, JSON.stringify(narrow));
await page.screenshot({ path: `${SHOTS}wireframe-register-narrow.png` });

check("no console errors", errors.length === 0, errors.join(" | "));
console.log(results.join("\n"));
await browser.close();
