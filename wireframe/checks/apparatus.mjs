import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const URL = "http://127.0.0.1:8765/wireframe/index.html";
const SHOTS = fileURLToPath(new globalThis.URL("../../test-results/wireframe/", import.meta.url));
mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, ok, extra = "") => { results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`); };

const browser = await chromium.launch();
const errors = [];
const watch = (page) => {
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
};
const word = (id) => `#flow .w[data-id="${id}"]`;
const data = (page, fn) => page.evaluate(async (src) => {
  const { state } = await import("/wireframe/js/state.js");
  return new Function("d", `return (${src})(d)`)(state.data);
}, fn.toString());
const anchorsOfLine = (page, c, l) => data(page, new Function(`return (d) => d.columns[${c}].lines[${l}].tokens.map((t) => t.type === "anchor" ? "#" + t.id : t.text).join(" ")`)());
// A word under the open popover is reached as a user reaches it: Escape closes the
// popover (the selection stays), then the click lands on the word.
async function clickWord(page, sel, opts) {
  const covered = await page.$eval(sel, (n) => {
    n.scrollIntoView({ block: "center" });
    const r = n.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !(hit === n || n.contains(hit));
  });
  if (covered) await page.keyboard.press("Escape");
  await page.click(sel, opts);
}
async function selectRange(page, a, b) {
  await clickWord(page, word(a));
  if (b) { await page.waitForTimeout(250); await clickWord(page, word(b), { modifiers: ["Shift"] }); }
  await page.waitForTimeout(350);
}
const entryFroms = (page) => page.$$eval("#popover-content .app-entry", (es) => es.map((e) => e.dataset.from));

const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
watch(page);
await page.goto(URL);
await page.waitForSelector("#flow .w");

// US2.2.1: the second got in "O Got got"
const GOT2 = "region_1639399497290_13l1_0";
check("second got is marked in-app with end marker", await page.$eval(word(GOT2), (n) => n.classList.contains("in-app") && n.classList.contains("app-end") && n.title.startsWith("Apparat")));
await selectRange(page, GOT2);
const gotEntry = page.locator('#popover-content .app-entry[data-from="start_42597"]');
check("US2.2.1 second got shows comment_edition 'Die doppelte Apostrophe'",
  (await gotEntry.count()) === 1 && (await gotEntry.locator("textarea[lang=de]").inputValue()).startsWith("Die doppelte Apostrophe") && (await gotEntry.locator(".type").innerText()).includes("comment_edition"),
  `entries: ${await entryFroms(page)}`);
check("US2.2.1 both notes shown", (await gotEntry.locator("textarea[lang=en]").inputValue()).startsWith("The double apostrophe"));
const firstGot = await page.$eval("#flow .w", () => 0);
// first Got (no id) of the same line is not covered
const firstGotCovered = await page.evaluate(() => [...document.querySelectorAll("#flow .w")].find((n) => n.textContent === "Got")?.classList.contains("in-app"));
check("first Got (before the in-word anchors) not covered", firstGotCovered === false);
void firstGot;
await gotEntry.scrollIntoViewIfNeeded();
await page.screenshot({ path: `${SHOTS}wireframe-apparatus-1.png` });

// US2.2.2: edit the note, anchors stay in place
const before = await anchorsOfLine(page, 0, 5);
const de = gotEntry.locator("textarea[lang=de]");
await de.fill("Die doppelte Apostrophe ist Emphase. (MK)");
await page.click("#popover-apply"); // the popover's one Anwenden (F28)
const noteNow = await data(page, (d) => d.apparatus.find((a) => a.from === "start_42597").notes.de);
check("US2.2.2 note edited in data", noteNow === "Die doppelte Apostrophe ist Emphase. (MK)");
check("US2.2.2 anchors unchanged", (await anchorsOfLine(page, 0, 5)) === before, before);
check("unsaved marker on", await page.isVisible("#status-unsaved"));
await page.locator('#popover-content .app-entry[data-from="start_42597"] textarea[lang=de]').focus();
await page.keyboard.press("Control+z");
await page.waitForTimeout(200);
const noteUndone = await data(page, (d) => d.apparatus.find((a) => a.from === "start_42597").notes.de);
check("Ctrl+Z restores the note", noteUndone.startsWith("Die doppelte Apostrophe \"O Got got\" wird wohl"));
check("after undo the index still shows the comment on got", (await entryFroms(page)).includes("start_42597"));

// Unresolved start anchor (start_9748 not on the page): bound to uebit, page start uncovered
const UEBIT = "region_1639399497290_13l7_1";
await selectRange(page, UEBIT);
check("app with anchors.from null shown at uebit", (await entryFroms(page)).includes("start_9748") && (await page.locator("#popover-content .app-unresolved").count()) === 1);
const unresolvedNote = await page.locator("#popover-content .app-unresolved").innerText();
check("the missing anchor is named in one sentence", unresolvedNote === "Startanker start_9748 steht nicht auf dieser Seite.", unresolvedNote);
check("page start not covered by the unresolved app", await page.$eval("#flow .w", (n) => !n.classList.contains("in-app")));

// Column b app spanning two lines
await page.click('[data-column="1"]');
await page.waitForTimeout(200);
check("column b NB covered by start_43578", await page.$eval(word("line_1639405016730_271_1"), (n) => n.classList.contains("in-app")));
await page.click('[data-column="0"]');
await page.waitForTimeout(200);

const appCount0 = await data(page, (d) => d.apparatus.length);
// US2.1.4: anchors are empty milestones placed outside the w elements, so neither an
// overlap with another comment nor inner markup of a boundary word blocks them
// (review 2, finding 5); the form opens without a refusal.
await selectRange(page, "line_1639403125044_125_1", "line_1639403125044_125_2"); // hat er, crosses end of start_42715..end_42725
await page.locator("#popover-content .app-add").click();
check("overlapping range takes anchors (no refusal)", (await page.locator("#popover-content .app-refusal").count()) === 0);
await page.click("#popover-cancel");
await selectRange(page, "region_1639399497290_13l1_3"); // liebes, ligature
await page.locator("#popover-content .app-add").click();
check("ligature boundary word takes anchors (no refusal)", (await page.locator("#popover-content .app-refusal").count()) === 0);
await page.click("#popover-cancel");

// US2.1.1 to 2.1.3 through the Arbeitsleiste: keíner hand geticht
const SEQ = ["region_1639399497290_13l7_2", "region_1639399497290_13l7_3", "region_1639399497290_13l7_4"];
await selectRange(page, SEQ[0], SEQ[2]);
check("Wortfolge selected", (await page.locator("#popover-title").innerText()).startsWith("Wortfolge"));
await page.click('#tb-selection [data-cmd="comment"]');
const formOpen = await page.locator("#popover-content .app-form").count();
const options = await page.$$eval("#popover-content .app-form select option", (os) => os.map((o) => o.value));
check("US2.1.1 toolbar Apparatkommentar opens the form in the popover with type, de, en, sigle", formOpen === 1 && options.join() === "comment_edition,comment_understanding"
  && (await page.locator("#popover-content .app-form textarea").count()) === 2 && (await page.locator("#popover-content .app-form input").count()) === 1
  && (await page.locator("#popover-content .app-refusal").count()) === 0, options.join());
check("type select focused", await page.evaluate(() => document.activeElement?.matches(".app-form select")));
await page.selectOption("#popover-content .app-form select", "comment_understanding");
await page.fill("#popover-content .app-form textarea[lang=de]", "Testkommentar zur Wortfolge.");
await page.fill("#popover-content .app-form textarea[lang=en]", "Test comment on the sequence.");
await page.fill("#popover-content .app-form input", "MK");
// The form opens beside the range: the popover covers none of the selected words.
const covered = await page.evaluate((ids) => {
  const p = document.querySelector("#popover").getBoundingClientRect();
  return ids.filter((id) => { const r = document.querySelector(`#flow .w[data-id="${id}"]`).getBoundingClientRect(); return !(p.bottom <= r.top || p.top >= r.bottom || p.right <= r.left || p.left >= r.right); });
}, SEQ);
check("the form in the popover leaves the selected range visible", covered.length === 0, covered.join());
await page.screenshot({ path: `${SHOTS}wireframe-apparatus-2.png` });
await page.click("#popover-apply");
await page.waitForTimeout(150);
const line11 = await anchorsOfLine(page, 0, 11);
const created = await data(page, (d) => d.apparatus[d.apparatus.length - 1]);
check("US2.1.2 anchors around the sequence", line11 === "wer uebit #end_42705 #start_43592 keíner hand geticht #end_43593 •", line11);
check("US2.1.2 app appended with sigle", created.from === "start_43592" && created.to === "end_43593" && created.type === "comment_understanding"
  && created.notes.de === "Testkommentar zur Wortfolge. (MK)" && created.notes.en === "Test comment on the sequence. (MK)", JSON.stringify(created));
const ids = await data(page, (d) => { const all = []; for (const c of d.columns) for (const l of c.lines) for (const t of l.tokens) if (t.id) all.push(t.id); return all.length === new Set(all).size; });
check("IDs unique in the data", ids);
let everyWord = true;
for (const id of SEQ) { await selectRange(page, id); everyWord &&= (await entryFroms(page)).includes("start_43592"); }
check("US2.1.3 new comment in the popover of every word in the range", everyWord);
check("flow marks the new range", await page.$eval(word(SEQ[2]), (n) => n.classList.contains("app-end")) && await page.$eval(word(SEQ[0]), (n) => n.classList.contains("in-app")));
await selectRange(page, "line_1639403125044_125_2"); // er, outside
check("word outside the range does not show it", !(await entryFroms(page)).includes("start_43592"));

// One undo step removes anchors and app
await clickWord(page, word(SEQ[1]));
await page.waitForTimeout(300);
await page.keyboard.press("Control+z");
await page.waitForTimeout(250);
check("Ctrl+Z removes both anchors", (await anchorsOfLine(page, 0, 11)) === "wer uebit #end_42705 keíner hand geticht •");
check("Ctrl+Z removes the app", (await data(page, (d) => d.apparatus.length)) === appCount0);
check("flow mark gone after undo", await page.$eval(word(SEQ[0]), (n) => !n.classList.contains("in-app")));
await page.keyboard.press("Control+y");
await page.waitForTimeout(250);
check("Ctrl+Y restores it, index rebuilt", (await data(page, (d) => d.apparatus.length)) === appCount0 + 1 && await page.$eval(word(SEQ[0]), (n) => n.classList.contains("in-app")));

// Popover button path on a single word with in-word anchors (got): nested comment around a point comment
await selectRange(page, GOT2);
await page.locator("#popover-content .app-add").click();
await page.fill("#popover-content .app-form textarea[lang=de]", "Zweiter Kommentar.");
await page.fill("#popover-content .app-form textarea[lang=en]", "Second comment.");
await page.click("#popover-apply");
const l5 = await anchorsOfLine(page, 0, 5);
check("+ Kommentar: start before the in-word anchors, end after the word", l5.startsWith("Got , #start_43594 #start_42597 #end_42599 got #end_43595 ,"), l5);
check("got now shows both comments", (await entryFroms(page)).join() === "start_42597,start_43594" || (await entryFroms(page)).length === 2, (await entryFroms(page)).join());

// Narrow layout: the popover is a bottom sheet
const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(narrow);
await narrow.goto(URL);
await narrow.waitForSelector("#flow .w");
await clickWord(narrow, word(GOT2));
await narrow.waitForTimeout(350);
await narrow.locator("#popover-content .app-add").click();
const overflow = await narrow.evaluate(() => { const b = document.querySelector("#popover-body"); return document.documentElement.scrollWidth > window.innerWidth || b.scrollWidth > b.clientWidth; });
check("390 px: form open in the bottom sheet, no horizontal scroll", (await narrow.locator("#popover-content .app-form").count()) === 1 && !overflow
  && await narrow.evaluate(() => { const r = document.querySelector("#popover").getBoundingClientRect(); return r.left === 0 && r.right === innerWidth && Math.abs(r.bottom - innerHeight) < 1; }));
await narrow.locator("#popover-content .app-form").scrollIntoViewIfNeeded();
await narrow.screenshot({ path: `${SHOTS}wireframe-apparatus-narrow.png` });

check("no console errors", errors.length === 0, errors.join(" | "));
console.log(results.join("\n"));
await browser.close();
