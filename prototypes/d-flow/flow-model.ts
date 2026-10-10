/**
 * Pure model of the flowing word view: which characters of the raw XML are
 * visible text, how they group into tokens (w or pc), what the hidden gaps
 * between them stand for, and the edit plans that keep the markup intact.
 *
 * Positions are editor positions. The caller parses the text an editor returns
 * for a range with "\n" as separator, so every line break counts as one
 * character whatever the file uses, and adds the range start as base. The range
 * is the body content here; the folio window of the full codex (work package 2)
 * passes a smaller range and nothing else changes.
 */
import { type TeiNode, escapeAttr, getAttr, getAttrObj, parseDocument } from "../../src/core/tei-document.js";

export type GapPart =
  | { kind: "space" }
  | { kind: "break"; line: number; soft: boolean }
  | { kind: "column"; column: number }
  | { kind: "page"; label: string }
  | { kind: "mark"; name: string; label: string }
  | { kind: "chip"; entity: string; label: string };

export interface Run { from: number; to: number; token: number; classes: string }
export interface Gap { from: number; to: number; parts: GapPart[] }
export interface OrigAttr { from: number; to: number; value: string; quote: string }
export interface Token {
  el: TeiNode | null;
  runs: number[];
  /** Visible extent: start of the first run, end of the last. */
  from: number;
  to: number;
  /** The visible text of the token, the text the reader sees and types into. */
  text: string;
  orig: OrigAttr | null;
}
export interface FlowModel {
  base: number;
  end: number;
  root: TeiNode;
  runs: Run[];
  tokens: Token[];
  gaps: Gap[];
}

/** Elements a wrapper may enclose whole between the first and the last selected word. */
const WRAP_ALLOWED = new Set(["w", "pc", "lb", "anchor", "milestone", "supplied", "hi", "choice", "damage", "unclear", "del", "add"]);
/** Wrappers the remove command takes off. */
const WRAPPERS = new Set(["rs", "ref"]);
const NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const CLOSING_PUNCTUATION = /^[,.;:!?)\]]/;

const HI_CLASS: Record<string, string> = {
  inkRed: "flow-red",
  rubrication: "flow-rub",
  initial: "flow-init",
  initial_historisiert: "flow-init",
  marginalia: "flow-marg",
  ligature: "flow-lig",
};
const ELEMENT_CLASS: Record<string, string> = {
  supplied: "flow-sup",
  del: "flow-del",
  unclear: "flow-unc",
  damage: "flow-dmg",
  fw: "flow-fw",
};

const entityOf = (el: TeiNode) => (getAttr(el, "type") ?? "entity").replace(/[^A-Za-z0-9_-]/g, "");

/** The editor range the view decorates: the body content, or the whole text when there is no body. */
export function flowRange(text: string): { from: number; to: number } {
  const open = /<body(\s[^>]*)?>/.exec(text);
  const close = text.lastIndexOf("</body>");
  if (!open || close < open.index) return { from: 0, to: text.length };
  return { from: open.index + open[0].length, to: close };
}

/** Build the model for `text`, the slice of the editor document that starts at `base`. */
export function buildFlow(text: string, base: number): FlowModel {
  const doc = parseDocument(text);
  const runs: Run[] = [];
  const tokens: Token[] = [];
  const gaps: Gap[] = [];
  let pending: GapPart[] = [];
  let gapFrom = base;
  let line = 0;
  let column = 0;

  const newToken = (el: TeiNode | null): number => {
    const orig = el ? getAttrObj(el, "orig") : null;
    tokens.push({
      el, runs: [], from: -1, to: -1, text: "",
      orig: orig ? { from: base + orig.valueStart, to: base + orig.valueEnd, value: orig.value, quote: orig.quote } : null,
    });
    return tokens.length - 1;
  };

  const emitRun = (from: number, to: number, token: number, classes: string[]) => {
    const previous = runs.at(-1);
    const parts = pending;
    if (previous && previous.token !== token) {
      const lineBreak = parts.some((p) => (p.kind === "break" && !p.soft) || p.kind === "column" || p.kind === "page");
      const tight = tokens[token].el?.localName === "pc" && CLOSING_PUNCTUATION.test(text.slice(from - base, to - base));
      if (!lineBreak && !tight) parts.push({ kind: "space" });
    }
    if (from > gapFrom || parts.length) gaps.push({ from: gapFrom, to: from, parts });
    runs.push({ from, to, token, classes: classes.join(" ") });
    const t = tokens[token];
    t.runs.push(runs.length - 1);
    if (t.from < 0) t.from = from;
    t.to = to;
    t.text += text.slice(from - base, to - base);
    pending = [];
    gapFrom = to;
  };

  const visit = (node: TeiNode, token: number, classes: string[], inWord: boolean) => {
    if (node.type === "text") {
      const start = node.start ?? 0;
      const raw = text.slice(start, node.end ?? start);
      const lead = raw.length - raw.trimStart().length;
      const core = raw.trim();
      if (!core) return;
      emitRun(base + start + lead, base + start + lead + core.length, token >= 0 ? token : newToken(null), classes);
      return;
    }
    if (node.type !== "element" && node.type !== "root") return;
    const name = node.localName ?? "";
    switch (name) {
      case "lb": pending.push({ kind: "break", line: ++line, soft: inWord }); return;
      case "cb": line = 0; pending.push({ kind: "column", column: ++column }); return;
      case "pb": pending.push({ kind: "page", label: `fol. ${getAttr(node, "n") ?? "?"}` }); return;
      case "anchor":
      case "milestone": {
        const label = getAttr(node, "unit") ?? getAttr(node, "id") ?? name;
        pending.push({ kind: "mark", name, label: `${name} ${label}` });
        return;
      }
      case "expan": return;
    }
    let childToken = token;
    let childClasses = classes;
    if ((name === "w" || name === "pc") && token < 0) childToken = newToken(node);
    const extra = name === "hi" ? HI_CLASS[getAttr(node, "rend") ?? ""] : ELEMENT_CLASS[name];
    if (extra) childClasses = [...classes, extra];
    if (WRAPPERS.has(name)) childClasses = [...childClasses, "flow-ent", `flow-ent-${entityOf(node)}`];
    for (const child of node.children ?? []) visit(child, childToken, childClasses, inWord || name === "w");
    if (WRAPPERS.has(name)) {
      const target = getAttr(node, "ref") ?? getAttr(node, "target") ?? "";
      pending.push({ kind: "chip", entity: entityOf(node), label: `${getAttr(node, "type") ?? name} ${target}`.trim() });
    }
  };
  visit(doc.root, -1, [], false);
  const end = base + text.length;
  if (end > gapFrom || pending.length) gaps.push({ from: gapFrom, to: end, parts: pending });
  return { base, end, root: doc.root, runs, tokens, gaps };
}

/** Index of the run with from <= pos <= to, or -1 when pos lies inside a gap. */
export function runAt(model: FlowModel, pos: number): number {
  let lo = 0;
  let hi = model.runs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = model.runs[mid];
    if (pos < r.from) hi = mid - 1;
    else if (pos > r.to) lo = mid + 1;
    else return mid;
  }
  return -1;
}

export const tokenAt = (model: FlowModel, pos: number): number => {
  const r = runAt(model, pos);
  return r < 0 ? -1 : model.runs[r].token;
};

export interface UserChange { from: number; to: number; insert: string }
export type EditPlan = { ok: true; extra: UserChange[] } | { ok: false; reason: string };

/**
 * Check a typed or deleted change against the model and derive the @orig
 * changes that go with it. A change must stay inside one visible text run, so
 * no tag is touched. @orig follows only where it equalled the visible word text
 * before the change, since elsewhere it records a reading of its own
 * (orig="bit" over supplied "wer", orig="⁊t͛" over abbr "⁊c͛").
 */
export function planUserEdit(model: FlowModel, changes: UserChange[]): EditPlan {
  const perToken = new Map<number, { offset: number; remove: number; insert: string }[]>();
  for (const c of changes) {
    if (/\s/.test(c.insert)) return { ok: false, reason: "A space inside a word is not accepted. Splitting a word needs a new w with its own xml:id, which is work package 4." };
    if (/[<&]/.test(c.insert)) return { ok: false, reason: "< and & are not typed into word text here. Use Show source for markup." };
    const r = runAt(model, c.from);
    const run = model.runs[r];
    if (!run || c.to > run.to) return { ok: false, reason: "The edit would change hidden markup at a word boundary or a tag and was not applied." };
    const token = model.tokens[run.token];
    let offset = c.from - run.from;
    for (const i of token.runs) {
      if (i === r) break;
      offset += model.runs[i].to - model.runs[i].from;
    }
    const list = perToken.get(run.token) ?? [];
    list.push({ offset, remove: c.to - c.from, insert: c.insert });
    perToken.set(run.token, list);
  }
  const extra: UserChange[] = [];
  for (const [index, edits] of perToken) {
    const token = model.tokens[index];
    let text = token.text;
    for (const e of [...edits].sort((a, b) => b.offset - a.offset)) text = text.slice(0, e.offset) + e.insert + text.slice(e.offset + e.remove);
    if (!text) return { ok: false, reason: "A word cannot be emptied here. Deleting words is work package 4." };
    if (token.orig && token.orig.value === token.text) {
      extra.push({ from: token.orig.from, to: token.orig.to, insert: escapeAttr(text, token.orig.quote) });
    }
  }
  return { ok: true, extra };
}

/**
 * Snap a selection whose ends lie in different tokens to the visible extent of
 * those tokens. `previousHead` lets a keyboard step back from a snapped end
 * shrink the selection by one token instead of snapping out again.
 */
export function snapSelection(model: FlowModel, anchor: number, head: number, previousHead: number | null): { anchor: number; head: number } | null {
  if (anchor === head) return null;
  const ta = tokenAt(model, anchor);
  const th = tokenAt(model, head);
  if (ta < 0 || th < 0 || ta === th) return null;
  const { tokens } = model;
  if (head > anchor) {
    let h = tokens[th].to;
    if (previousHead === tokens[th].to && head < previousHead) h = tokens[th - 1].to;
    return { anchor: tokens[ta].from, head: h };
  }
  let h = tokens[th].from;
  if (previousHead === tokens[th].from && head > previousHead) h = tokens[th + 1].from;
  return { anchor: tokens[ta].to, head: h };
}

export type WrapPlan = { ok: true; changes: UserChange[] } | { ok: false; reason: string };

const ancestors = (node: TeiNode): TeiNode[] => {
  const out: TeiNode[] = [];
  for (let n: TeiNode | null = node; n; n = n.parent) out.push(n);
  return out;
};
const describe = (el: TeiNode) => {
  const rend = getAttr(el, "rend");
  return `<${el.qname ?? el.localName}${rend ? ` rend="${rend}"` : ""}>`;
};

/** True when every visible run inside el lies within [from, to]. */
function covered(model: FlowModel, el: TeiNode, from: number, to: number): boolean {
  const start = model.base + (el.outerStart ?? 0);
  const end = model.base + (el.outerEnd ?? el.stagEnd ?? 0);
  return model.runs.every((r) => r.to <= start || r.from >= end || (r.from >= from && r.to <= to));
}

/**
 * Plan the two insertions that wrap the selected tokens in
 * <rs type=".." ref="#..">. The wrapper goes around whole elements of one
 * parent; an ancestor that the selection covers only in part would overlap, so
 * the plan names it and refuses.
 */
export function planWrap(model: FlowModel, from: number, to: number, type: string, id: string): WrapPlan {
  if (!NAME.test(type)) return { ok: false, reason: "The type must be a single name such as person." };
  if (!NAME.test(id)) return { ok: false, reason: "The ID must be an XML name such as pers_martin, without #." };
  if (from === to) return { ok: false, reason: "Select one or more words first." };
  const first = model.tokens[tokenAt(model, from)];
  const last = model.tokens[tokenAt(model, to)];
  if (!first?.el || !last?.el) return { ok: false, reason: "The selection does not start and end in a word." };
  const selFrom = first.from;
  const selTo = last.to;
  const lastChain = new Set(ancestors(last.el));
  const parent: TeiNode | null = first.el === last.el ? first.el.parent : ancestors(first.el).find((n) => lastChain.has(n)) ?? null;
  if (!parent) return { ok: false, reason: "The selected words share no parent." };
  // The child of parent on el's ancestor chain, or the ancestor the selection would cut on the way up.
  const childOn = (el: TeiNode): { child: TeiNode; cut: null } | { child: null; cut: TeiNode } => {
    let n = el;
    while (n.parent && n.parent !== parent) {
      if (!covered(model, n.parent, selFrom, selTo)) return { child: null, cut: n.parent };
      n = n.parent;
    }
    return { child: n, cut: null };
  };
  const a = childOn(first.el);
  if (a.cut) return { ok: false, reason: `The selection would cut ${describe(a.cut)}. Select all of it or only words inside it.` };
  const b = childOn(last.el);
  if (b.cut) return { ok: false, reason: `The selection would cut ${describe(b.cut)}. Select all of it or only words inside it.` };
  if (!a.child || !b.child) return { ok: false, reason: "The selected words share no parent." };
  const start = a.child.outerStart ?? 0;
  const end = b.child.outerEnd ?? 0;
  const children = parent.children ?? [];
  const i = children.indexOf(a.child);
  const j = children.indexOf(b.child);
  if (i < 0 || j < i) return { ok: false, reason: "The selected words share no parent." };
  for (const child of children.slice(i, j + 1)) {
    if (child.type === "text") continue;
    if (child.type !== "element") return { ok: false, reason: "A comment or processing instruction lies between the words." };
    if (!WRAP_ALLOWED.has(child.localName ?? "")) return { ok: false, reason: `The selection contains ${describe(child)}, which an rs may not enclose here.` };
  }
  return {
    ok: true,
    changes: [
      { from: model.base + start, to: model.base + start, insert: `<rs type="${type}" ref="#${escapeAttr(id)}">` },
      { from: model.base + end, to: model.base + end, insert: "</rs>" },
    ],
  };
}

/** Plan the removal of the start and end tag of the rs or ref around pos. */
export function planUnwrap(model: FlowModel, pos: number): WrapPlan {
  const token = model.tokens[tokenAt(model, pos)];
  if (!token?.el) return { ok: false, reason: "Place the caret in a word inside an rs or ref." };
  const wrapper = ancestors(token.el).find((n) => n.type === "element" && WRAPPERS.has(n.localName ?? ""));
  if (!wrapper || wrapper.etagStart == null || wrapper.etagEnd == null) return { ok: false, reason: "No rs or ref encloses the word at the caret." };
  const at = (n: number) => model.base + n;
  return {
    ok: true,
    changes: [
      { from: at(wrapper.stagStart ?? 0), to: at(wrapper.stagEnd ?? 0), insert: "" },
      { from: at(wrapper.etagStart), to: at(wrapper.etagEnd), insert: "" },
    ],
  };
}
