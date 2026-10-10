// Latency of the wireframe's core interactions in headless Chromium at 1400x900, as long
// tasks over 50 ms, event timing, the first frame after the input and layout shifts,
// each attributed to the interaction in whose window it starts.
//   python -m http.server 8766          (from the repository root, 8765 stays with the walkthroughs)
//   node test/wb-latency.mjs [out.json]  (default test-results/wb-latency.json)
// A measurement exits 0 whatever it finds. Exit 1 means the page did not load or an
// interaction did not reach its expected state, because its numbers would then
// describe a different interaction.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PAGE = "http://127.0.0.1:8766/wireframe/index.html";
const OUT = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("../test-results/wb-latency.json", import.meta.url));
// Event timing reports only entries at or above this duration, and 16 ms is the lowest
// value the API accepts, so a faster input leaves no entry and the frame fallback
// carries it. Durations are rounded to 8 ms by the browser.
const EVENT_THRESHOLD = 16;
// Each interaction's window stays open until no request has been in flight for this
// long, so deferred work (frame-coalesced reads, timers, facsimile tiles) and the
// observers' delivery land inside it.
const SETTLE_MS = 500;
const NETWORK_CAP_MS = 15000;
const IDLE_MS = 6000;

// Runs before the page's own scripts, so the observers see the load and every interaction.
function instrument(threshold) {
  const rec = { supported: [...PerformanceObserver.supportedEntryTypes], long: [], events: [], shifts: [], inputs: [] };
  window.__wbLatency = rec;
  const observe = (type, extra, push) => {
    if (!rec.supported.includes(type)) return;
    new PerformanceObserver((list) => { for (const e of list.getEntries()) push(e); }).observe({ type, buffered: true, ...extra });
  };
  observe("longtask", {}, (e) => rec.long.push({ start: e.startTime, duration: e.duration }));
  observe("event", { durationThreshold: threshold }, (e) => rec.events.push({
    name: e.name, start: e.startTime, duration: e.duration,
    processingStart: e.processingStart, processingEnd: e.processingEnd, interactionId: e.interactionId,
  }));
  // The shifted nodes tell a moving popover from moving text, which the value cannot.
  const describe = (n) => {
    const host = n && (n.nodeType === 1 ? n : n.parentElement);
    if (!host) return null;
    const cls = (host.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return `${n.nodeType === 1 ? "" : "text in "}${host.tagName.toLowerCase()}${host.id ? `#${host.id}` : ""}${cls.map((c) => `.${c}`).join("")}`;
  };
  const box = (r) => [r.x, r.y, r.width, r.height].map(Math.round);
  observe("layout-shift", {}, (e) => rec.shifts.push({
    start: e.startTime, value: e.value, hadRecentInput: e.hadRecentInput,
    sources: (e.sources || []).map((s) => ({ node: describe(s.node), from: box(s.previousRect), to: box(s.currentRect) })),
  }));
  // The frame fallback takes the second animation frame after an input, which starts
  // once the frame carrying the input's effect has been painted, so it bounds
  // input-to-paint from above by at most one frame interval. A pointermove counts only while a button is
  // held, because that is a drag whose highlight has to follow the pointer.
  for (const type of ["pointerdown", "pointerup", "click", "keydown", "keyup", "pointermove"]) {
    addEventListener(type, (e) => {
      if (type === "pointermove" && !e.buttons) return;
      const input = { type, start: e.timeStamp, paint: null };
      rec.inputs.push(input);
      requestAnimationFrame(() => requestAnimationFrame(() => { input.paint = performance.now(); }));
    }, true);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
// A covered or disabled target would otherwise hold a step for the default 30 s.
page.setDefaultTimeout(10000);
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
const pending = new Set();
page.on("request", (r) => pending.add(r));
page.on("requestfinished", (r) => pending.delete(r));
page.on("requestfailed", (r) => pending.delete(r));
await page.addInitScript(instrument, EVENT_THRESHOLD);

const now = () => page.evaluate(() => performance.now());

async function settle() {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const cap = Date.now() + NETWORK_CAP_MS;
  let quietSince = Date.now();
  while (Date.now() < cap) {
    if (pending.size) quietSince = Date.now();
    else if (Date.now() - quietSince >= SETTLE_MS) return;
    await page.waitForTimeout(25);
  }
}

// Windows in page time. Targets are located before t0, so the lookup is not measured.
const windows = [];
async function measure(name, act, reached) {
  const t0 = await now();
  await act();
  await settle();
  windows.push({ name, t0, t1: await now() });
  if (!(await reached())) throw new Error(`${name}: the expected state was not reached`);
}

// The popover may cover the next target, and a click on the popover would measure
// something else, so a step takes the first candidate from `from` on whose centre is
// inside the viewport and not covered.
const firstHittable = (sel, from) => page.evaluate(([sel, from]) => {
  const ns = [...document.querySelectorAll(sel)];
  for (let i = from; i < ns.length; i++) {
    const r = ns[i].getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (x > 0 && y > 0 && x < innerWidth && y < innerHeight && ns[i].contains(document.elementFromPoint(x, y))) return i;
  }
  return -1;
}, [sel, from]);

// A drag over five words whose start and end points are both uncovered.
const dragPoints = () => page.evaluate(() => {
  const ws = [...document.querySelectorAll("#flow .w")];
  const hit = (w, x, y) => x > 0 && y > 0 && x < innerWidth && y < innerHeight && w.contains(document.elementFromPoint(x, y));
  for (let k = 8; k + 4 < ws.length; k++) {
    const a = ws[k].getBoundingClientRect();
    const b = ws[k + 4].getBoundingClientRect();
    const p = { x: a.left + 1, y: a.top + a.height / 2 };
    const q = { x: b.right - 1, y: b.top + b.height / 2 };
    if (hit(ws[k], p.x, p.y) && hit(ws[k + 4], q.x, q.y)) return { p, q };
  }
  return null;
});

const target = async (sel, from) => {
  const i = await firstHittable(sel, from);
  if (i < 0) throw new Error(`no uncovered ${sel} from index ${from}`);
  return page.locator(sel).nth(i);
};
const visible = (sel) => page.isVisible(sel);
const popoverIs = async (re) => (await visible("#popover")) && re.test(await page.locator("#popover-title").innerText());
const pressed = (sel, value) => async () => (await page.getAttribute(sel, "aria-pressed")) === value;

// Escape order of design.md, by the selector that shows each layer open.
const LAYERS = {
  "value menu": '.act > button[aria-expanded="true"]',
  Seitenleiste: "#side:not([hidden])",
  popover: "#popover:not([hidden])",
  selection: "#flow .w.is-current",
};
async function openLayers() {
  const open = [];
  for (const [name, sel] of Object.entries(LAYERS)) if (await page.locator(sel).count()) open.push(name);
  return open;
}

let facsimile = "not opened";
let error = null;

async function run() {
  try {
    await page.goto(PAGE);
    await page.waitForSelector("#flow .w", { timeout: 15000 });
  } catch (e) {
    throw new Error(`page failed to load: ${String(e.message).split("\n")[0]}`);
  }
  await settle();
  windows.push({ name: "page load", t0: 0, t1: await now(), passive: true });
  const supported = await page.evaluate(() => window.__wbLatency.supported);
  const missing = ["longtask", "event", "layout-shift"].filter((t) => !supported.includes(t));
  // Without these observers every column would read zero, which looks like a result.
  if (missing.length) throw new Error(`entry types not supported: ${missing.join(", ")}`);

  let t = await target("#flow .w", 3);
  await measure("word click, popover Wort", () => t.click(), () => popoverIs(/^Wort\s/));

  const drag = await dragPoints();
  if (!drag) throw new Error("no uncovered five-word range for the drag");
  await measure("drag over five words, Wortfolge", async () => {
    await page.mouse.move(drag.p.x, drag.p.y);
    await page.mouse.down();
    await page.mouse.move(drag.q.x, drag.q.y, { steps: 10 });
    await page.mouse.up();
  }, () => popoverIs(/^Wortfolge/));

  t = await target("#flow .ln", 2);
  await measure("line number click, Zeile", () => t.click(), () => popoverIs(/^(Zeile|Kopfzeile)/));

  await measure("view XML", () => page.click('[data-view="xml"]'), async () => (await visible("#xml-view")) && !(await visible("#flow")));
  await measure("view Text", () => page.click('[data-view="text"]'), () => visible("#flow"));

  await measure("Faksimile on", async () => {
    await page.click("#toggle-facs");
    // The viewer opens once the IIIF info.json has arrived. Its tiles follow and are
    // part of this step's cost, so settle() keeps the window open until they are in.
    facsimile = await page.waitForFunction(
      () => (document.querySelector("#zones") ? "loaded" : document.querySelector("#facs-frame .empty-note") ? "failed" : null),
      null, { polling: 100, timeout: NETWORK_CAP_MS },
    ).then((h) => h.jsonValue(), () => "timeout");
  }, () => visible("#side-facs"));

  await measure("Zonen off", () => page.click("#toggle-zones"), pressed("#toggle-zones", "false"));
  await measure("Zonen on", () => page.click("#toggle-zones"), pressed("#toggle-zones", "true"));

  t = await target("#flow .ln", 5);
  await measure("line number click with Faksimile", () => t.click(), async () => (await popoverIs(/^(Zeile|Kopfzeile)/)) && visible("#side-facs"));

  // An unmeasured setup puts the caret at the end of an uncovered word.
  const k = await firstHittable("#flow .w", 5);
  if (k < 0) throw new Error("no uncovered word for typing");
  await page.locator("#flow .w").nth(k).click();
  await settle();
  const original = await page.locator("#flow .w").nth(k).innerText();
  await page.evaluate((k) => { const n = document.querySelectorAll("#flow .w")[k].firstChild; getSelection().setBaseAndExtent(n, n.length, n, n.length); }, k);
  await settle();
  const wordText = () => page.locator("#flow .w").nth(k).innerText();
  await measure("type one character", () => page.keyboard.type("x"), async () => (await wordText()) === `${original}x`);
  await measure("Ctrl+Z", () => page.keyboard.press("Control+z"), async () => (await wordText()) === original);

  const menu = page.locator("#tb-markup .act > button").first();
  await measure("value menu open", () => menu.click(), async () => (await menu.getAttribute("aria-expanded")) === "true");
  await measure("value menu close", () => menu.click(), async () => (await menu.getAttribute("aria-expanded")) === "false");

  // Opening the Prüfen dropdown is setup, so each row holds only the entry's own cost.
  const prufen = '.act[data-action="Prüfen"] > button';
  await page.click(prufen);
  await settle();
  await measure("Prüfen, Wohlgeformtheit", () => page.click('[data-cmd="check:wf"]'),
    async () => (await visible("#notice")) && (await page.locator("#notice").innerText()).includes("Wohlgeformtheit"));
  await page.click(prufen);
  await settle();
  await measure("Prüfen, Befundliste", () => page.click('[data-cmd="findings"]'), () => visible("#side-findings"));

  // A press that closes nothing while layers remain is a failed interaction, so the
  // loop ends after at most one press per layer.
  let open = await openLayers();
  for (let i = 1; open.length && i <= Object.keys(LAYERS).length; i++) {
    const before = open;
    let closed = [];
    await measure(`Escape #${i}`, () => page.keyboard.press("Escape"), async () => {
      open = await openLayers();
      closed = before.filter((l) => !open.includes(l));
      return closed.length > 0;
    });
    windows[windows.length - 1].name = `Escape closes ${closed.join(", ")}`;
  }
  if (open.length) throw new Error(`Escape left layers open: ${open.join(", ")}`);

  // Timers (notice bar, popover note) fire seconds after the last input. A shift they
  // cause has no recent input and counts toward CLS, so the run ends with a window
  // longer than the longest of them.
  const t0 = await now();
  await page.waitForTimeout(IDLE_MS);
  windows.push({ name: "idle, timers only", t0, t1: await now(), passive: true });
}

const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const total = (xs) => xs.reduce((a, b) => a + b, 0);

function summarise(w, rec) {
  const inside = (x) => x.start >= w.t0 && x.start <= w.t1;
  const long = rec.long.filter(inside);
  const events = rec.events.filter(inside);
  // Only events with an interactionId (pointerdown, pointerup, click, keydown, keyup)
  // count, as in INP. The hover events of the pointer's approach stay in `events`.
  const worst = events.filter((e) => e.interactionId > 0).reduce((a, e) => (a && a.duration >= e.duration ? a : e), null);
  const paints = rec.inputs.filter((x) => inside(x) && x.paint !== null).map((x) => x.paint - x.start);
  const shifts = rec.shifts.filter(inside);
  return {
    name: w.name,
    windowMs: round(w.t1 - w.t0),
    longTasks: {
      count: long.length,
      totalMs: round(total(long.map((x) => x.duration))),
      longestMs: long.length ? round(Math.max(...long.map((x) => x.duration))) : null,
      entries: long.map((x) => ({ atMs: round(x.start - w.t0), durationMs: round(x.duration) })),
    },
    // The worst event of the interaction, as INP takes it, split into its three phases.
    event: worst ? {
      name: worst.name,
      durationMs: worst.duration,
      inputDelayMs: round(worst.processingStart - worst.start),
      processingMs: round(worst.processingEnd - worst.processingStart),
      presentationMs: round(worst.start + worst.duration - worst.processingEnd),
    } : null,
    events: events.map((e) => ({ name: e.name, atMs: round(e.start - w.t0), durationMs: e.duration, interactionId: e.interactionId })),
    nextPaintMs: paints.length ? round(Math.max(...paints)) : null,
    shifts: {
      count: shifts.length,
      value: round(total(shifts.map((x) => x.value)), 4),
      // Shifts within 500 ms of an input are excused from CLS, and these are the others.
      withoutRecentInput: shifts.filter((x) => !x.hadRecentInput).length,
      entries: shifts.map((x) => ({ atMs: round(x.start - w.t0), value: round(x.value, 4), hadRecentInput: x.hadRecentInput, sources: x.sources })),
    },
    passive: Boolean(w.passive),
  };
}

function table(rows) {
  const head = ["interaction", "long tasks", "total ms", "longest ms", "event ms", "paint ms", "shifts"];
  const body = rows.map((r) => [
    r.name,
    String(r.longTasks.count),
    String(r.longTasks.totalMs),
    r.longTasks.longestMs === null ? "-" : String(r.longTasks.longestMs),
    r.event ? String(r.event.durationMs) : r.passive ? "-" : `<${EVENT_THRESHOLD}`,
    r.nextPaintMs === null ? "-" : String(r.nextPaintMs),
    r.shifts.count ? `${r.shifts.count} (${r.shifts.value})` : "0",
  ]);
  const width = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => cells.map((c, i) => (i ? c.padStart(width[i]) : c.padEnd(width[i]))).join("  ");
  return [line(head), width.map((w) => "-".repeat(w)).join("  "), ...body.map(line)].join("\n");
}

try {
  await run();
} catch (e) {
  error = String(e.message || e);
}
const rec = await page.evaluate(() => window.__wbLatency).catch(() => null);
const rows = rec ? windows.map((w) => summarise(w, rec)) : [];
// Setup steps between the windows are not measured, but what happens during them is kept.
const outside = (x) => !windows.some((w) => x.start >= w.t0 && x.start <= w.t1);
const unattributed = {
  longTasks: rec ? rec.long.filter(outside).map((x) => ({ atMs: round(x.start), durationMs: round(x.duration) })) : [],
  shifts: rec ? rec.shifts.filter(outside).map((x) => ({ atMs: round(x.start), value: round(x.value, 4), hadRecentInput: x.hadRecentInput, sources: x.sources })) : [],
};
const report = {
  page: PAGE,
  measuredAt: new Date().toISOString(),
  browser: `Chromium ${browser.version()} headless`,
  viewport: { width: 1400, height: 900 },
  eventThresholdMs: EVENT_THRESHOLD,
  settleMs: SETTLE_MS,
  facsimile,
  rows,
  idleMs: IDLE_MS,
  outsideWindows: unattributed,
  consoleErrors,
  error,
};
await browser.close();

if (rows.length) console.log(table(rows));
const unexcused = total(rows.map((r) => r.shifts.withoutRecentInput)) + unattributed.shifts.filter((x) => !x.hadRecentInput).length;
console.log(`\nfacsimile: ${facsimile}; outside the windows: ${unattributed.longTasks.length} long tasks, ${unattributed.shifts.length} shifts; shifts without recent input: ${unexcused}; console errors: ${consoleErrors.length}`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`JSON: ${OUT}`);
if (error) {
  console.error(`FAILED ${error}`);
  process.exitCode = 1;
}
