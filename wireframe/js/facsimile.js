// Facsimile: OpenSeadragon on the IIIF info.json, zones as one SVG overlay in
// image pixels so they scale with zoom. Without the library the static image stays.
import { $, columns, el, state } from "./state.js";
import { flowEvents, highlightSelection, selectedWords, selectLine, setColumn } from "./flow.js";
import { setView } from "./xml.js";
import { closePanel, showTab, tabs } from "./panel.js";

const OSD_IMAGES = "../docs/vendor/openseadragon/images/";
const IIIF_WIDTH = 900;
const SVG_NS = "http://www.w3.org/2000/svg";

// Click handlers for non-line zones by zone subtype, e.g. "img_miniature"; features register theirs.
export const zoneActions = new Map();

flowEvents.addEventListener("column", () => fitColumn());
flowEvents.addEventListener("select", (e) => { if (e.detail.changed) revealSelection(); });

// The facsimile is the first tab of the Seitenleiste; showing it opens the viewer once.
tabs.set("facs", { fresh: true, show: () => { if (!$("#zones")) initFacsimile(); highlightSelection(); } });

export function initFacsimile() {
  const { image } = state.data;
  const frame = $("#facs-frame");
  const svg = zoneLayer();
  if (!window.OpenSeadragon) {
    frame.classList.add("is-static");
    frame.append(el("img", { src: `${image.iiif}/full/${IIIF_WIDTH},/0/default.jpg`, alt: "" }), svg);
    return;
  }
  const loading = el("p", { class: "facs-loading", role: "status", text: "Faksimile wird geladen …" });
  frame.append(loading);
  const viewer = window.OpenSeadragon({
    element: frame, prefixUrl: OSD_IMAGES, tileSources: `${image.iiif}/info.json`,
    showNavigationControl: true, gestureSettingsMouse: { clickToZoom: false }, crossOriginPolicy: "Anonymous",
  });
  viewer.addHandler("open", () => {
    loading.remove();
    viewer.addOverlay({ element: svg, location: viewer.viewport.imageToViewportRectangle(0, 0, image.width, image.height) });
    fitColumn(true);
    highlightSelection();
  });
  // The viewer captures the pointer, so polygons never receive the click; hit-test instead.
  viewer.addHandler("canvas-click", (e) => {
    if (!e.quick) return;
    const z = document.elementsFromPoint(e.originalEvent.clientX, e.originalEvent.clientY).find((n) => n.classList && n.classList.contains("zone"));
    if (z) zoneClick(z);
  });
  viewer.addHandler("open-failed", () => frame.replaceChildren(el("p", { class: "empty-note", text: "Das Faksimile konnte vom Bildserver der ÖNB nicht geladen werden." })));
  state.viewer = viewer;
}

// Bounding box of zones in image pixels, or null without points.
function box(list) {
  const pts = list.flatMap((z) => z.points.trim().split(/\s+/).map((p) => p.split(",").map(Number)));
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// Bounding box of the current column in image pixels: the zones its lines point to,
// widened by every text region whose horizontal centre lies inside them.
function columnBox() {
  const { zones } = state.data;
  const byId = new Map(zones.map((z) => [z.id, z]));
  const col = columns()[state.column];
  const lineBox = col && box(col.lines.map((l) => byId.get((l.facs || "").replace("#", ""))).filter((z) => z && z.points));
  if (!lineBox) return null;
  const regions = zones.filter((z) => z.type === "TextRegion" && z.points && (() => { const b = box([z]); const cx = (b.x0 + b.x1) / 2; return cx >= lineBox.x0 && cx <= lineBox.x1; })());
  return box([...regions, { points: `${lineBox.x0},${lineBox.y0} ${lineBox.x1},${lineBox.y1}` }]);
}

export function fitColumn(immediately = false) {
  const viewer = state.viewer;
  const b = state.data && columnBox();
  if (!viewer || !viewer.world.getItemCount() || !b) return;
  const pad = 120;
  const rect = viewer.viewport.imageToViewportRectangle(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + 2 * pad, b.y1 - b.y0 + 2 * pad);
  viewer.viewport.fitBounds(rect, immediately || matchMedia("(prefers-reduced-motion: reduce)").matches);
}

// F24: a selection whose line zones lie outside the visible image pans them into view,
// zooming only when they do not fit; zones already in view leave the image still.
function revealSelection() {
  const viewer = state.viewer;
  if (state.side !== "facs" || !viewer || !viewer.world.getItemCount()) return;
  const ids = new Set(selectedWords().map((w) => (w.line.facs || "").replace("#", "")));
  const b = box(state.data.zones.filter((z) => ids.has(z.id) && z.points));
  if (!b) return;
  const pad = 40;
  const vp = viewer.viewport;
  const r = vp.imageToViewportRectangle(b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + 2 * pad, b.y1 - b.y0 + 2 * pad);
  const v = vp.getBounds();
  const now = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (r.width > v.width || r.height > v.height) { vp.fitBounds(r, now); return; }
  const dx = r.x < v.x ? r.x - v.x : Math.max(0, r.x + r.width - v.x - v.width);
  const dy = r.y < v.y ? r.y - v.y : Math.max(0, r.y + r.height - v.y - v.height);
  if (dx || dy) vp.panBy(new window.OpenSeadragon.Point(dx, dy), now);
}

function zoneLayer() {
  const { image, zones } = state.data;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.id = "zones";
  svg.setAttribute("viewBox", `0 0 ${image.width} ${image.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.toggleAttribute("hidden", !state.zones);
  for (const z of zones) {
    if (!z.points) continue;
    const p = document.createElementNS(SVG_NS, "polygon");
    p.setAttribute("points", z.points);
    p.setAttribute("class", `zone type-${z.type}${z.subtype ? ` sub-${z.subtype}` : ""}`);
    p.dataset.id = z.id;
    if (z.subtype) p.dataset.subtype = z.subtype;
    p.addEventListener("click", () => zoneClick(p)); // static fallback only
    svg.append(p);
  }
  return svg;
}

function zoneClick(p) {
  if (p.classList.contains("type-Line")) jumpToLine(p.dataset.id);
  else zoneActions.get(p.dataset.subtype)?.(p.dataset.id);
}

export function toggleZones(on) { state.zones = on; const svg = $("#zones"); if (svg) svg.toggleAttribute("hidden", !on); }

export function jumpToLine(zoneId) {
  const ci = columns().findIndex((c) => c.lines.some((l) => (l.facs || "").replace("#", "") === zoneId));
  if (ci < 0) return;
  if (state.view !== "text") setView("text");
  if (ci !== state.column) setColumn(ci);
  const line = columns()[ci].lines.find((l) => (l.facs || "").replace("#", "") === zoneId);
  if (line) selectLine(line.id);
}

// The Faksimile toggle shows the facsimile tab, or closes the column while it shows it.
export function setFacs(on) {
  if (on) showTab("facs", true);
  else if (state.side === "facs") closePanel();
}
