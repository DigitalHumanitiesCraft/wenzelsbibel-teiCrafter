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
const val = (sel) => page.locator(sel).inputValue();
// The image-annotation form is the tab Bild of the Seitenleiste; the word states are the popover.
const body = "#side-image .panel-body";
const title = () => page.locator("#side-image .panel-title").innerText();
const note = () => page.locator("#panel-note").innerText();
const pop = "#popover-content";
const apply = () => page.click(`${body} .mini-actions >> text=Anwenden`);
const cancel = () => page.click(`${body} .mini-actions >> text=Abbrechen`);
const titleInput = () => page.locator(`${body} input[data-key="title"]`);

await page.goto(URL);
await page.waitForSelector("#flow .w");

// US4.1.1: zone click in the facsimile
await page.click("#toggle-facs");
let zoneClicked = false;
try {
  await page.waitForSelector('.zone[data-id="Image_1676476154286_76"]', { timeout: 20000, state: "attached" });
  await page.waitForTimeout(2000);
  const box = await page.locator('.zone[data-id="Image_1676476154286_76"]').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);
  zoneClicked = true;
} catch (e) { check("facsimile loaded for zone click", false, String(e).slice(0, 160)); }
if (zoneClicked) {
  const t = await title();
  check("US4.1.1 zone Image_1676476154286_76 opens miniatures_01", t.includes("miniatures_01"), t);
  check("US4.1.1 title in form", (await titleInput().inputValue()) === "Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron");
  check("F25 zone click activates Bildannotationen", (await val("#doc-select")) === "images");
  check("chosen zone outlined", (await page.locator('.zone.is-chosen[data-id="Image_1676476154286_76"]').count()) === 1);
  check("the form takes the tab Bild of the shared column", (await page.getAttribute("#tab-image", "aria-selected")) === "true" && await page.isHidden("#side-facs"));
  await page.click("#tab-facs"); // back to the facsimile for the next zone
  await page.waitForTimeout(1200);
  const mb = await page.locator('.zone[data-id="Image_1678370825437_16"]').boundingBox();
  if (mb) {
    await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
    await page.waitForTimeout(500);
    check("img_marginalia zone Image_1678370825437_16 opens margins_01", (await title()).includes("margins_01"), await title());
  } else check("margin zone visible", false);
  await page.click("#side-close");
}

// Bildannotationen list
await page.selectOption("#doc-select", "codex");
await page.selectOption("#doc-select", "images");
const listText = await page.locator("#minis").innerText();
check("list holds the four items", ["miniatures_01", "margins_01", "margins_02", "margins_03"].every((id) => listText.includes(id)));
check("empty item label", listText.includes("ohne Beschreibung, verweist auf margins_01"));
check("address #bild on document switch", (await page.evaluate(() => location.hash)) === "#bild");
await page.locator('#minis [data-item="miniatures_01"]').focus();
await page.keyboard.press("ArrowDown");
check("ArrowDown moves in list", (await page.evaluate(() => document.activeElement.dataset.item)) === "margins_01");
await page.keyboard.press("ArrowUp");
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
check("address #bild/miniatures_01", (await page.evaluate(() => location.hash)) === "#bild/miniatures_01");

// US4.1.2 values
const form = await page.locator(body).evaluate((b) => ({
  objectType: b.querySelector('input[data-key="objectTypes"]').value,
  height: b.querySelector('input[data-key="height"]').value,
  artist: b.querySelector('select[data-key="artists"]').selectedOptions[0].textContent,
  persons: [...b.querySelectorAll('.tags[aria-label="Personen"] .tag > span')].map((s) => s.textContent),
  ic: [...b.querySelectorAll('.ic-entry input[aria-label^="Notation"]')].map((i) => i.value),
  text: b.innerText,
}));
check("US4.1.2 object type", form.objectType === "Historisierte Initiale (O)");
check("US4.1.2 rend shown", form.text.includes("initial_historisiert"));
check("US4.1.2 height 14", form.height === "14");
check("US4.1.2 artist BA Balaam-Meister", form.artist === "BA, Balaam-Meister", form.artist);
check("US4.1.2 persons Gott, Engel", form.persons.join() === "Gott,Engel", form.persons.join());
check("US4.1.2 ICONCLASS entries", form.ic.join() === "11C21(+0),11C211", form.ic.join());
check("resp and verankert shown in German", form.text.includes("resp #JT #KS, verankert true") && form.text.includes("resp editor, verankert true") && form.text.includes("Eintrag #") && !form.text.includes("anchored"));
check("two field columns at 1400", (await page.evaluate(() => getComputedStyle(document.querySelector(".mini-form")).gridTemplateColumns.split(" ").length)) === 2);
await page.screenshot({ path: `${SHOTS}wireframe-miniature-1.png` });

// US4.1.3 edit one field, Abbrechen, Anwenden, resp kept, Ctrl+Z
await titleInput().fill("Anfangs-Initiale (O): Gott thronend");
await cancel();
check("Abbrechen restores title", (await titleInput().inputValue()) === "Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron");
check("Abbrechen says it discards the unapplied input", (await note()) === "Nicht übernommene Eingaben verworfen.", await note());
await titleInput().fill("Anfangs-Initiale (O): Gott thronend");
await apply();
check("Anwenden commits only Titel", (await note()) === "Übernommen: Titel.", await note());
check("unsaved marker set", !(await page.locator("#status-unsaved").isHidden()));
check("resp kept on title", (await page.locator(body).innerText()).includes("resp #JT #KS"));
check("list shows new title", (await page.locator("#minis").innerText()).includes("Gott thronend"));
await titleInput().focus();
await page.keyboard.press("Control+z");
await page.waitForTimeout(200);
check("Ctrl+Z restores title", (await titleInput().inputValue()) === "Anfangs-Initiale (O) zum Prolog: Gott auf dem Thron");
check("Ctrl+Z restores list title", !(await page.locator("#minis").innerText()).includes("Gott thronend"));
await page.keyboard.press("Control+y");
await page.waitForTimeout(200);
check("Ctrl+Y redoes title", (await titleInput().inputValue()) === "Anfangs-Initiale (O): Gott thronend");
await page.keyboard.press("Control+z");
await page.waitForTimeout(200);

// refused height
await page.locator(`${body} input[data-key="height"]`).fill("vierzehn");
await apply();
const refused = await note();
check("height refused with reason at the field", refused.includes("ganze Zahl") && (await page.evaluate(() => document.activeElement.dataset.key)) === "height", refused);
await cancel();

// persons tag list
const pInput = () => page.locator(`${body} input[aria-label="Personen hinzufügen"]`);
await pInput().fill("Niemand");
await pInput().press("Enter");
check("unknown person refused", (await note()).includes("nicht im Personenregister"));
await pInput().fill("Abraham");
await pInput().press("Enter");
await page.click(`${body} button[aria-label="Engel entfernen"]`);
await apply();
check("persons apply", (await note()) === "Übernommen: Personen.", await note());
const tags = await page.locator(`${body} .tags[aria-label="Personen"] .tag > span`).allInnerTexts();
check("persons now Gott, Abraham", tags.join() === "Gott,Abraham", tags.join());
await page.locator(`${body} input[data-key="title"]`).focus();
await page.keyboard.press("Control+z");
await page.waitForTimeout(200);
check("Ctrl+Z restores persons", (await page.locator(`${body} .tags[aria-label="Personen"] .tag > span`).allInnerTexts()).join() === "Gott,Engel");

// US4.2 ICONCLASS
await page.click(`${body} .ic-search-open`);
check("no scope sentence at the search", !(await page.locator(`${body} .ic-scope`).count()) && !(await page.locator(`${body} .ic-search`).innerText()).includes("Katalog"));
const q = () => page.locator(`${body} .ic-search input`);
await q().fill("11C21(+0)");
const first = await page.locator("#ic-hits li").first().innerText();
check("US4.2.1 11C21(+0) returns both labels", first.includes("11C21(+0)") && first.includes("Gottvater als junger oder erwachsener Mann") && first.includes("God the Father as young or adult man"), first.replace(/\n/g, " | "));
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}wireframe-miniature-2.png` });
await q().fill("lowe");
const lion = await page.locator("#ic-hits").innerText();
check("term search normalised (lowe finds Löwe)", lion.includes("25F23(LION)"));
check("variants flagged in hits", lion.includes("abweichende Bezeichnung"));
await q().fill("DRACHE");
check("case-insensitive German term", (await page.locator("#ic-hits").innerText()).includes("25FF411"));
await q().fill("qqqq");
check("no hit stated plainly", (await page.locator(`${body} .ic-count`).innerText()) === "Kein Treffer.");
await q().fill("dragon");
await q().press("ArrowDown");
await q().press("Enter");
const entries = await page.locator(`${body} .ic-entry input[aria-label^="Notation"]`).evaluateAll((xs) => xs.map((x) => x.value));
check("US4.2.2 chosen hit fills a new entry", entries.join() === "11C21(+0),11C211,25FF411", entries.join());
const de3 = page.locator(`${body} .ic-entry input[aria-label="Deutsch 3"]`);
check("new entry editable with resp #ICONCLASS", (await de3.inputValue()) === "Drache" && (await page.locator(`${body} .ic-entry`).nth(2).innerText()).includes("resp #ICONCLASS"));
await de3.fill("Drache (geflügelt)");
await page.click(`${body} button[aria-label="ICONCLASS 11C211 entfernen"]`);
await apply();
check("ICONCLASS apply", (await note()) === "Übernommen: ICONCLASS.", await note());
const applied = await page.locator(`${body} .ic-entry input[aria-label^="Deutsch"]`).evaluateAll((xs) => xs.map((x) => x.value));
check("edited label kept after apply", applied.includes("Drache (geflügelt)"), applied.join(" / "));
await page.click(`${body} .ic-search-open`);
await page.click(`${body} .ic-search-open`);
await page.locator(`${body} input[data-key="title"]`).focus();
await page.keyboard.press("Control+z");
await page.waitForTimeout(200);
const back = await page.locator(`${body} .ic-entry input[aria-label^="Notation"]`).evaluateAll((xs) => xs.map((x) => x.value));
check("Ctrl+Z restores ICONCLASS", back.join() === "11C21(+0),11C211", back.join());
await page.click(`${body} .ic-search-open`);
await q().fill("25FF39");
await q().press("ArrowDown");
await q().press("Enter");
check("variant note at an entry", (await page.locator(`${body} .ic-variants`).innerText()).includes("andere (weiter oben nicht erwähnte) Vögel"));
await page.click(`${body} .ic-search-open`);
await q().fill("11");
await q().press("ArrowDown");
await page.keyboard.press("Escape");
check("Escape closes the hit list first", (await page.locator("#ic-hits").isHidden()) && !(await page.locator("#side").isHidden()));
await cancel();

// US4.3
const rel = await page.locator(body).innerText();
const content = await page.locator(`${body} textarea[data-key="textRelation"]`).inputValue();
check("US4.3.1 content note and range text", content.startsWith("Im Text wird der Segen Gottes") && rel.includes("gesamter Prolog bis fol. 2r"));
check("parsed range shown, end off this page", rel.includes("region_1639399488602_10l3_0") && rel.includes("region_1639577288773_22l29_4") && rel.includes("endet auf fol. 2r"));
await page.click(`${body} >> text=Im Text zeigen`);
await page.waitForTimeout(500);
check("codex chosen, column a", (await val("#doc-select")) === "codex" && (await page.getAttribute("#flow", "aria-label")).endsWith("Spalte a"));
const caret = await page.evaluate(() => getSelection().anchorNode.parentElement.closest(".w").dataset.id);
check("US4.3.2 caret on region_1639399488602_10l3_0", caret === "region_1639399488602_10l3_0", caret);
const marked = await page.evaluate(() => [...document.querySelectorAll(".w.in-mini-range")].map((n) => n.dataset.id));
const total = await page.evaluate(() => document.querySelectorAll("#flow .w").length);
check("US4.3.2 range marked from the first word to the column end (running head excluded)", marked[0] === "region_1639399488602_10l3_0" && marked.length === total - 1, `${marked.length}/${total}`);
const insp = await page.locator(pop).innerText();
check("US4.3.3 Bilder zu diesem Wort on the first word", insp.includes("Bilder zu diesem Wort") && insp.includes("miniatures_01"));
check("popover says the range ends on fol. 2r, without a note on the marking", insp.includes("endet auf fol. 2r") && !insp.includes("Seitenende"));
check("address names the codex column", (await page.evaluate(() => location.hash)).startsWith("#codex/1r/"));
await page.click('[data-column="1"]');
await page.waitForTimeout(200);
check("column b marked to the page end", await page.evaluate(() => document.querySelectorAll(".w.in-mini-range").length === document.querySelectorAll("#flow .w").length - 1));
await page.locator("#flow .w").nth(20).click();
await page.waitForTimeout(500);
check("US4.3.3 word inside the range in column b lists miniatures_01", (await page.locator(pop).innerText()).includes("miniatures_01"));
await page.screenshot({ path: `${SHOTS}wireframe-miniature-3.png` });
await page.click(`${pop} .mini-refs .link-btn >> nth=0`);
await page.waitForTimeout(300);
check("jump back to the form", (await title()).includes("miniatures_01") && (await page.evaluate(() => location.hash)) === "#bild/miniatures_01");
await page.click('[data-column="0"]').catch(() => {});

// F12 reload and browser history
await page.reload();
await page.waitForSelector("#side-image .mini-form");
check("F12 reload restores miniatures_01", (await val("#doc-select")) === "images" && (await title()).includes("miniatures_01"));
await page.goBack();
await page.waitForTimeout(400);
check("browser back follows the address", (await val("#doc-select")) === "codex", await page.evaluate(() => location.hash));
await page.goto(`${URL}#bild/margins_02`);
await page.waitForSelector("#side-image:not([hidden])");
check("empty item points to margins_01", (await page.locator(body).innerText()).includes("margins_01"));
await page.keyboard.press("Escape");
check("Escape closes the form, focus returns to the list entry", (await page.evaluate(() => document.activeElement.dataset.item)) === "margins_02");

// 390 px sheet
const small = await browser.newPage({ viewport: { width: 390, height: 844 } });
small.on("pageerror", (e) => errors.push(String(e)));
small.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await small.goto(`${URL}#bild/miniatures_01`);
await small.waitForSelector("#side-image .mini-form");
const sheet = await small.evaluate(() => {
  const r = document.querySelector("#side").getBoundingClientRect();
  const bar = document.querySelector(".arbeitsleiste").getBoundingClientRect();
  const b = document.querySelector("#side-image .panel-body");
  return { top: Math.round(r.top), barBottom: Math.round(bar.bottom), bottom: Math.round(r.bottom), vh: innerHeight, cols: getComputedStyle(document.querySelector(".mini-form")).gridTemplateColumns.split(" ").length, h: Math.round(r.height), scroll: document.documentElement.scrollWidth, bodyScroll: b.scrollWidth, bodyW: b.clientWidth };
});
check("390: side sheet from the Arbeitsleiste to the bottom, one column, no horizontal scroll", sheet.cols === 1 && sheet.top >= sheet.barBottom && sheet.bottom >= sheet.vh - 2 && sheet.scroll <= 390 && sheet.bodyScroll <= sheet.bodyW, JSON.stringify(sheet));
await small.screenshot({ path: `${SHOTS}wireframe-miniature-sheet.png` });
check("390: the text under the side sheet is inert", await small.evaluate(() => document.querySelector("#text-pane").inert === true));

check("no console errors", errors.length === 0, errors.join(" | ").slice(0, 500));
console.log(results.join("\n"));
await browser.close();
