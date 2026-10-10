/**
 * CodeMirror layer of the flowing word view. A StateField rebuilds the model
 * on every document change and provides the replace decorations from the
 * field itself, because the hidden gaps cross line breaks, which decorations
 * computed per viewport may not do. The gaps double as atomic ranges, so the
 * caret only ever stands at the edge of visible text, which is inside a word.
 */
import { Annotation, EditorSelection, EditorState, type Extension, type Range, StateEffect, StateField, type Transaction } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import {
  type FlowModel, type GapPart, type UserChange, type WrapPlan,
  buildFlow, flowRange, planUnwrap, planUserEdit, planWrap, snapSelection,
} from "./flow-model";

export interface FlowValue {
  model: FlowModel;
  hidden: DecorationSet;
  marks: DecorationSet;
  buildMs: number;
}

/** A message for the status line, carried by an otherwise empty transaction when an edit is refused. */
export const flowStatus = StateEffect.define<string>();
/** Marks a selection the view sets itself, which the word snap leaves alone. */
export const noSnap = Annotation.define<boolean>();

class GapWidget extends WidgetType {
  constructor(readonly parts: GapPart[], readonly signature: string) { super(); }
  eq(other: GapWidget) { return other.signature === this.signature; }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "flow-gap";
    const add = (tag: string, cls: string, text = "", title = "") => {
      const el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text) el.textContent = text;
      if (title) el.title = title;
      wrap.append(el);
      return el;
    };
    for (const p of this.parts) {
      switch (p.kind) {
        case "space": wrap.append(" "); break;
        case "mark": add("span", `flow-mark flow-mark-${p.name}`, "", p.label).setAttribute("aria-hidden", "true"); break;
        case "chip": add("span", `flow-chip flow-chip-${p.entity}`, p.label); break;
        case "page": add("span", "flow-page", p.label); break;
        case "column":
          add("br", "");
          add("span", "flow-column", `column ${String.fromCharCode(96 + p.column)}`);
          break;
        case "break":
          if (p.soft) add("span", "flow-soft", "-", "line break inside the word").setAttribute("aria-hidden", "true");
          add("br", "");
          add("span", "flow-ln", String(p.line)).setAttribute("aria-hidden", "true");
          break;
      }
    }
    return wrap;
  }
}

class OutsideWidget extends WidgetType {
  constructor(readonly label: string) { super(); }
  eq(other: OutsideWidget) { return other.label === this.label; }
  toDOM() {
    const el = document.createElement("span");
    el.className = "flow-outside";
    el.textContent = this.label;
    return el;
  }
}

const signature = (parts: GapPart[]) => parts.map((p) => {
  switch (p.kind) {
    case "break": return `b${p.line}${p.soft ? "s" : ""}`;
    case "column": return `c${p.column}`;
    case "space": return "_";
    default: return `${p.kind}:${p.label}`;
  }
}).join("|");

function compute(state: EditorState): FlowValue {
  const t0 = performance.now();
  // Joined with "\n" so that string offsets are editor positions even in a CRLF file.
  const text = state.doc.sliceString(0);
  const range = flowRange(text);
  const model = buildFlow(text.slice(range.from, range.to), range.from);
  const hidden: Range<Decoration>[] = [];
  if (range.from > 0) hidden.push(Decoration.replace({ widget: new OutsideWidget("teiHeader and text front, see source") }).range(0, range.from));
  for (const g of model.gaps) {
    if (g.to > g.from) hidden.push(Decoration.replace({ widget: new GapWidget(g.parts, signature(g.parts)) }).range(g.from, g.to));
  }
  if (range.to < state.doc.length) hidden.push(Decoration.replace({ widget: new OutsideWidget("end of text, see source") }).range(range.to, state.doc.length));
  const marks = model.runs.filter((r) => r.classes).map((r) => Decoration.mark({ class: r.classes }).range(r.from, r.to));
  return { model, hidden: Decoration.set(hidden), marks: Decoration.set(marks), buildMs: performance.now() - t0 };
}

export const flowField = StateField.define<FlowValue>({
  create: compute,
  update: (value, tr) => (tr.docChanged ? compute(tr.state) : value),
  provide: (f) => [
    EditorView.decorations.from(f, (v) => v.hidden),
    EditorView.decorations.from(f, (v) => v.marks),
    EditorView.atomicRanges.of((view) => view.state.field(f).hidden),
  ],
});

const userChanges = (tr: Transaction): UserChange[] => {
  const out: UserChange[] = [];
  tr.changes.iterChanges((from, to, _fromB, _toB, inserted) => out.push({ from, to, insert: inserted.toString() }));
  return out;
};

/** Typed and deleted text stays inside one word, and @orig follows in the same transaction. */
const editFilter = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !(tr.isUserEvent("input") || tr.isUserEvent("delete"))) return tr;
  const plan = planUserEdit(tr.startState.field(flowField).model, userChanges(tr));
  if (!plan.ok) return { effects: flowStatus.of(plan.reason) };
  return plan.extra.length ? [tr, { changes: plan.extra }] : tr;
});

/** A selection reaching from one word into another grows to whole words. */
const snapFilter = EditorState.transactionFilter.of((tr) => {
  if (tr.docChanged || !tr.selection || tr.annotation(noSnap)) return tr;
  const model = tr.startState.field(flowField).model;
  const previous = tr.startState.selection.main;
  // Only a keyboard step shrinks by a token; a pointer inside the last word keeps that word selected.
  const stepping = !tr.isUserEvent("select.pointer") && previous.anchor !== previous.head;
  let changed = false;
  const ranges = tr.selection.ranges.map((r, i) => {
    const prevHead = stepping && i === tr.selection!.mainIndex ? previous.head : null;
    const s = snapSelection(model, r.anchor, r.head, prevHead);
    if (!s || (s.anchor === r.anchor && s.head === r.head)) return r;
    changed = true;
    return EditorSelection.range(s.anchor, s.head);
  });
  if (!changed) return tr;
  return [tr, { selection: EditorSelection.create(ranges, tr.selection.mainIndex) }];
});

export function flowExtensions(): Extension {
  return [flowField, editFilter, snapFilter];
}

/** Move a caret that stands inside a hidden gap, for instance after the source view, to the visible text before it. */
export function settleCaret(view: EditorView): void {
  const { model } = view.state.field(flowField);
  const head = view.state.selection.main.head;
  const gap = model.gaps.find((g) => g.from < head && head < g.to);
  const outside = head < model.base ? model.runs[0]?.from : head > model.end ? model.runs.at(-1)?.to : undefined;
  const target = gap ? (gap.from === model.base ? gap.to : gap.from) : outside;
  if (target != null) view.dispatch({ selection: { anchor: target }, annotations: noSnap.of(true), scrollIntoView: true });
}

function apply(view: EditorView, plan: WrapPlan, userEvent: string, done: string): string {
  if (!plan.ok) return plan.reason;
  view.dispatch({ changes: plan.changes, userEvent, scrollIntoView: true });
  return done;
}

export function wrapAsRs(view: EditorView, type: string, id: string): string {
  const { model } = view.state.field(flowField);
  const { from, to } = view.state.selection.main;
  return apply(view, planWrap(model, from, to, type, id), "wrap", `Wrapped in <rs type="${type}" ref="#${id}">.`);
}

export function removeWrapper(view: EditorView): string {
  const { model } = view.state.field(flowField);
  return apply(view, planUnwrap(model, view.state.selection.main.head), "unwrap", "Wrapper removed.");
}
