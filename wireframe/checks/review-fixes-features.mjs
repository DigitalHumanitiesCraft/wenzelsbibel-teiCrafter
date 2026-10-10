// Review round 2, findings 5, 13, 14, 18, 19, 20 and the Verweise walk. Each check fails
// on the code before the fix and passes after it.
import { chromium } from "playwright";

const URL = "http://127.0.0.1:8765/wireframe/index.html";
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(3000);
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(URL);
await page.waitForSelector("#flow .w");

const wait = (ms = 250) => page.waitForTimeout(ms);
const col = async (i) => { await page.click(`[data-column="${i}"]`); await wait(100); };
// Whole words a..b, matched by text prefix and occurrence, selected the way a drag does.
const select = async (a, b = a, nth = 0) => {
  const ok = await page.evaluate(([a, b, nth]) => {
    const ws = [...document.querySelectorAll("#flow .w")];
    const hit = ws.filter((w) => w.textContent.startsWith(a))[nth];
    if (!hit) return false;
    const i = ws.indexOf(hit);
    const j = ws.findIndex((w, k) => k >= i && w.textContent.startsWith(b));
    const flow = document.querySelector("#flow");
    flow.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    flow.focus();
    getSelection().setBaseAndExtent(ws[i].firstChild, 0, ws[j].firstChild, ws[j].firstChild.length);
    flow.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    return true;
  }, [a, b, nth]);
  await wait();
  if (!ok) results.push(`FAIL select ${a}..${b}`);
};
const groupOf = (word, nth = 0) => page.evaluate(([word, nth]) => {
  const w = [...document.querySelectorAll("#flow .w")].filter((x) => x.textContent === word)[nth];
  const g = w && w.closest(".ref-group");
  return g ? { words: [...g.querySelectorAll(".w")].map((x) => x.textContent), chip: g.querySelector(".chip")?.textContent } : null;
}, [word, nth]);
const combo = () => page.locator('#popover-content [role="combobox"]');
const pickFirst = async (q) => { await combo().fill(q); await wait(150); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await wait(); };
// Commands of the Arbeitsleiste: a toolbar button, or an entry of a dropdown when given.
const menu = async (cmd, dropdown = null) => { if (dropdown) await page.click(`.act[data-action="${dropdown}"] > button`); await page.click(`[data-cmd="${cmd}"]`); await wait(200); };
const notice = () => page.locator("#notice").textContent();

// 5: a register link across an apparatus anchor (end_42725 between "hat" and "er") is allowed.
await col(0);
await select("hat", "er");
await pickFirst("Martin");
const g5 = await groupOf("hat");
check("5 link across an apparatus anchor is written", g5?.chip === "Person: Martin" && g5.words.join(" ") === "hat er", JSON.stringify(g5));
await page.keyboard.press("Control+z");
await wait();
// 5: what still must be refused, a cut through an existing ref and through the marginal seg.
await col(1);
await select("Dem", "Rotlebín", 1);
await pickFirst("Martin");
check("5 partial cut of the Martin ref still refused", (await groupOf("Dem", 1)) === null && /teilen/.test(await page.locator("#popover-content .register [role=alert]").textContent().catch(() => "") || await page.locator("#popover-note").textContent()));
await select("erſterbe", "NB");
await pickFirst("Martin");
const segReason = await page.locator("#popover-content .register [role=alert]").textContent().catch(() => "");
check("5 selection across the marginal seg refused naming seg", /seg/.test(segReason) && (await groupOf("erſterbe")) === null, segReason);

// 13: the refusal stands at the field, marks the combobox invalid and stays until the next input.
await select("Dem", "Rotlebín", 1);
await pickFirst("Martin");
const alert13 = page.locator("#popover-content .register [role=alert]");
check("13 refusal rendered at the register field", (await alert13.count()) === 1 && /teilen/.test(await alert13.textContent()));
check("13 combobox aria-invalid", (await combo().getAttribute("aria-invalid")) === "true");
check("13 reason not repeated under the popover head", !(/teilen/.test((await page.locator("#popover-note").isVisible()) ? await page.locator("#popover-note").textContent() : "")));
await wait(5600);
check("13 reason still visible after 5 s", (await alert13.count()) === 1 && (await alert13.isVisible()));
await combo().fill("Kö");
await wait(150);
check("13 next input clears reason and aria-invalid", !(await alert13.isVisible().catch(() => false)) && (await combo().getAttribute("aria-invalid")) !== "true");
await page.keyboard.press("Escape");

// 18: "+ neu anlegen" prefills ID and preferred name from the selection, the typed text is a hint.
await col(0);
await select("Got");
await combo().fill("Gott");
await wait(150);
await page.locator("#ac-list .ac-item.is-new").click();
await wait(150);
const idv = await page.locator("#popover-content .reg-form label:has-text('ID') input").inputValue();
const namev = await page.locator("#popover-content .reg-form label:has-text('Vorzugsname') input").inputValue();
const hint = await page.locator("#popover-content .reg-form").innerText();
check("18 ID and Vorzugsname from the selection", idv === "Got" && namev === "Got", `${idv}/${namev}`);
check("18 typed text shown as hint", hint.includes("Gott"), hint.replace(/\n/g, " | "));
await page.click('#popover-content .reg-form button:text-is("Abbrechen")');

// 19: Hervorhebung gold on Rotlebín names the replaced rubrication; the menu marks the current value.
await col(1);
await select("Rotlebín");
await page.click('#tb-markup .act[data-action="Hervorhebung"] > button');
const cur = await page.locator('#tb-markup .act[data-action="Hervorhebung"] [aria-checked="true"]').allTextContents();
check("19 menu marks the current value rubrication", cur.length === 1 && cur[0].includes("rubrication"), JSON.stringify(cur));
await page.click('#tb-markup .act[data-action="Hervorhebung"] .menu-item:has-text("gold")');
await wait();
const n19 = await page.locator("#popover-note").textContent();
check("19 note confirms with übernommen and names the replacement", /übernommen/.test(n19) && /rubrication durch gold ersetzt/.test(n19), n19);
await page.click('#tb-markup .act[data-action="Hervorhebung"] > button');
const cur2 = await page.locator('#tb-markup .act[data-action="Hervorhebung"] [aria-checked="true"]').allTextContents();
check("19 menu marks gold after the change", cur2.length === 1 && cur2[0].includes("gold"), JSON.stringify(cur2));
await page.keyboard.press("Escape");
await page.keyboard.press("Control+z");
await wait();

// 5 (apparatus): a boundary word with a ligature takes anchors outside the word.
await col(0);
await select("liebes");
await menu("comment");
check("5 apparatus form for a ligature word shows no refusal", (await page.locator("#popover-content .app-refusal").count()) === 0);
// 20: no placeholder, an example hint beside the field, the last sigle prefilled.
const sig = page.locator("#popover-content .app-sigle input");
check("20 sigle has no placeholder", (await sig.getAttribute("placeholder")) === null);
check("20 hint z. B. MK beside the field", (await page.locator("#popover-content .app-sigle").innerText()).includes("z. B. MK"));
await page.locator('#popover-content .app-form textarea[lang="de"]').fill("Test de");
await page.locator('#popover-content .app-form textarea[lang="en"]').fill("Test en");
await sig.fill("CP");
await page.click('#popover-content .app-form button[type="submit"]');
await wait();
check("5 comment on the ligature word created, confirmed with übernommen", /übernommen/.test(await page.locator("#popover-note").textContent()));
await col(1);
await select("NB");
await menu("comment");
check("5 apparatus form for NB (ligature, anchor after it) shows no refusal", (await page.locator("#popover-content .app-refusal").count()) === 0);
check("20 last used sigle prefilled as value", (await page.locator("#popover-content .app-sigle input").inputValue()) === "CP");
await page.click('#popover-content .app-form button:text-is("Abbrechen")');
await page.keyboard.press("Control+z");
await wait();

// 14: ICONCLASS language labels reach 4.5:1 on the hit background.
const ratio = await page.evaluate(() => {
  const li = document.createElement("li");
  li.className = "ic-hit is-active";
  const s = document.createElement("span");
  s.className = "lang";
  s.textContent = "de";
  li.append(s);
  document.body.append(li);
  const rgb = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const fg = getComputedStyle(s).color;
  const bg = getComputedStyle(li).backgroundColor;
  li.remove();
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
});
check("14 ICONCLASS lang label contrast >= 4.5", ratio >= 4.5, ratio.toFixed(2));

// Verweise: a jump keeps the panel open with the chosen entry marked, so the list can be walked.
await select("werden", "vrowen", 1);
await pickFirst("Martin");
await menu("register:refs", "Register");
const jumps = page.locator("#side-refs .reg-jump");
check("Verweise lists two runs to Martin", (await jumps.count()) === 2);
await jumps.nth(0).click();
await wait(400);
const title = await page.locator("#side-refs .panel-title").textContent();
check("Verweise panel stays open after the jump", title.startsWith("Verweise"), title);
check("chosen entry marked and focused", (await page.locator('#side-refs .reg-jump[aria-current="true"]').count()) === 1
  && (await page.evaluate(() => document.activeElement?.getAttribute("aria-current"))) === "true");
const selText = await page.evaluate(() => [...document.querySelectorAll("#flow .w.is-current")].map((w) => w.textContent).join(" "));
check("selection moved to the chosen run", selText === "Rotlebín herren merteín", selText);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await wait(400);
check("keyboard walk: second jump keeps the panel open", (await page.locator("#side-refs .panel-title").textContent()).startsWith("Verweise")
  && ((await page.locator('#side-refs .reg-jump[aria-current="true"]').textContent({ timeout: 1000 }).catch(() => "")) || "").includes("vrowen"));

check("no console errors", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(results.join("\n"));
console.log(`${results.filter((r) => r.startsWith("PASS")).length}/${results.length} passed`);
