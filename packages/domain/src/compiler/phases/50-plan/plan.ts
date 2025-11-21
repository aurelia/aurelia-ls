/* =============================================================================
 * PHASE 50 — PLAN (Overlay planning for TTC)
 * Linked+Scoped → OverlayPlanModule (pure)
 * - Build per-frame overlay type expressions
 * - Collect **one** validation lambda per authored expression in that frame
 * - Frame-aware type environments (Env) with inheritance + shadowing
 * - Env-aware expression → type inference (incl. ReturnType<> for calls)
 * - $parent typed as the parent frame alias
 * - Emit visible identifier surface for every frame (outer locals included)
 * ============================================================================= */

import type {
  AnalyzeOptions, OverlayPlanModule, TemplateOverlayPlan, FrameOverlayPlan, OverlayLambdaPlan, OverlayLambdaSegment,
} from "./types.js";

import type { LinkedSemanticsModule } from "../20-resolve-host/types.js";
import type {
  ScopeModule, ScopeTemplate, ScopeFrame, FrameId,
} from "../../model/symbols.js";

import type {
  ExprId,
  // Expression AST (discriminated by $kind)
  IsBindingBehavior,
  IsUnary,
  ForOfStatement,
  BindingIdentifierOrPattern,
  IsAssign,
  IsLeftHandSide,
  BindingBehaviorExpression,
  ValueConverterExpression,
  AssignExpression,
  ConditionalExpression,
  AccessThisExpression,
  AccessBoundaryExpression,
  AccessScopeExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  CallScopeExpression,
  CallMemberExpression,
  CallFunctionExpression,
  CallGlobalExpression,
  NewExpression,
  BinaryExpression,
  UnaryExpression,
  PrimitiveLiteralExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  ParenExpression,
  TemplateExpression,
  TaggedTemplateExpression,
  ArrowFunction,
  ExprTableEntry,
  BadExpression,
} from "../../model/ir.js";
import {
  buildFrameAnalysis,
  typeFromExprAst,
  wrap,
  type FrameTypingHints,
  type Env,
} from "../shared/type-analysis.js";

function assertUnreachable(x: never): never { throw new Error("unreachable"); }

/* ===================================================================================== */
/* Public API                                                                             */
/* ===================================================================================== */

export function plan(linked: LinkedSemanticsModule, scope: ScopeModule, opts: AnalyzeOptions): OverlayPlanModule {
  const exprIndex = indexExprTable(linked.exprTable as readonly ExprTableEntry[] | undefined);
  const templates: TemplateOverlayPlan[] = [];

  /**
   * IMPORTANT:
   * - Bind already models nested template expressions inside the **first (root) template**.
   * - So we only analyze/emit for the root scope template.
   */
  const roots: ScopeTemplate[] = scope.templates.length > 0 ? [scope.templates[0]!] : [];
  for (let ti = 0; ti < roots.length; ti++) {
    const st = roots[ti]!;
    templates.push(analyzeTemplate(st, exprIndex, ti, opts));
  }

  return { templates };
}

/* ===================================================================================== */
/* Per-template analysis                                                                  */
/* ===================================================================================== */

function analyzeTemplate(
  st: ScopeTemplate,
  exprIndex: ReadonlyMap<ExprId, ExprTableEntry>,
  templateIndex: number,
  opts: AnalyzeOptions,
): TemplateOverlayPlan {
  const frames: FrameOverlayPlan[] = [];
  // Prefer a collision-safe, qualified VM expr if the adapter provides it.
  const vm = opts.vm;
  const rootVm = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
  const prefix = (opts.syntheticPrefix ?? vm.getSyntheticPrefix?.()) || "__AU_TTC_";

  // Stable per-frame alias names up front (root-first order already)
  const typeAliasByFrame = new Map<FrameId, string>();
  for (const f of st.frames) typeAliasByFrame.set(f.id, `${prefix}T${templateIndex}_F${f.id}`);

  // Build envs + typing hints for all frames
  const analysis = buildFrameAnalysis(st, exprIndex, rootVm);

  // Emit overlays
  const typeExprByFrame = new Map<FrameId, string>();
  for (const f of st.frames) {
    const typeName = `${prefix}T${templateIndex}_F${f.id}`;
    const parentExpr = f.parent != null ? typeExprByFrame.get(f.parent) : undefined;
    const typeExpr = buildFrameTypeExpr(f, rootVm, analysis.hints.get(f.id), analysis.envs, parentExpr);
    typeExprByFrame.set(f.id, typeExpr);
    const lambdas = collectOneLambdaPerExpression(st, f.id, exprIndex);
    frames.push({ frame: f.id, typeName, typeExpr, lambdas });
  }

  return { name: st.name!, frames };
}

/* ===================================================================================== */
/* Frame type assembly                                                                    */
/* ===================================================================================== */

function buildFrameTypeExpr(
  frame: ScopeFrame,
  rootVm: string,
  hints: FrameTypingHints | undefined,
  envs: Map<FrameId, Env>,
  parentTypeExpr?: string,
): string {
  // Locals in this frame (already include shadowed parent names)
  const env = envs.get(frame.id);
  const localEntries = env ? [...env.entries()].filter(([k]) => k !== "$this" && k !== "$parent" && k !== "$vm") : [];
  const localKeysUnion = localEntries.length > 0 ? localEntries.map(([k]) => `'${escapeKey(k)}'`).join(" | ") : "never";
  const localsType = localEntries.length > 0 ? `{ ${localEntries.map(([n, t]) => `${safeProp(n)}: ${t}`).join("; ")} }` : "{}";

  // Overlay object (with) if present
  const overlayObj = frame.overlay?.kind === "with" && hints?.overlayBase ? hints.overlayBase : null;

  // Root after overlay shadow:  Omit<VM, keyof Overlay>
  const rootAfterOverlay = overlayObj != null ? `Omit<${wrap(rootVm)}, keyof ${wrap(overlayObj)}>` : wrap(rootVm);

  // Root after overlay & locals shadow:  Omit<Root', 'k1'|'k2'|...>
  const rootAfterAll = localEntries.length > 0 ? `Omit<${wrap(rootAfterOverlay)}, ${localKeysUnion}>` : rootAfterOverlay;

  // Overlay reduced by locals: Omit<Overlay, 'k1'|'k2'|...>
  const overlayAfterLocals = overlayObj != null ? (localEntries.length > 0 ? `Omit<${wrap(overlayObj)}, ${localKeysUnion}>` : wrap(overlayObj)) : "{}";

  // $parent & $vm segments
  const parentSeg = parentTypeExpr ? `{ $parent: ${parentTypeExpr} }` : `{ $parent: unknown }`;
  const vmSeg = `{ $vm: ${wrap(rootVm)} }`;
  const thisSeg = overlayObj != null ? `{ $this: ${wrap(overlayObj)} }` : "{}";

  // Final frame type:
  //   Omit<VM, keyof Overlay | LocalKeys> & Omit<Overlay, LocalKeys> & Locals & { $parent: ... } & { $vm: VM } & { $this?: Overlay }
  return [
    wrap(rootAfterAll),
    wrap(overlayAfterLocals),
    wrap(localsType),
    wrap(parentSeg),
    wrap(vmSeg),
    wrap(thisSeg),
  ].join(" & ");
}

function safeProp(n: string): string {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(n) ? n : JSON.stringify(n);
}

function escapeKey(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/* ===================================================================================== */
/* Lambdas: **one per authored expression**                                               */
/* ===================================================================================== */

function collectOneLambdaPerExpression(
  st: ScopeTemplate,
  frameId: FrameId,
  exprIndex: ReadonlyMap<ExprId, ExprTableEntry>,
): OverlayLambdaPlan[] {
  const out: OverlayLambdaPlan[] = [];
  const seen = new Set<string /* ExprId string */>();

  for (const [idStr, fid] of Object.entries(st.exprToFrame)) {
    if (fid !== frameId) continue;
    if (seen.has(idStr)) continue;
    seen.add(idStr);

    const id = idStr as ExprId;
    const entry = exprIndex.get(id);
    if (!entry) continue;

    switch (entry.expressionType) {
      case "IsIterator":
        // headers are mapped for scope only; no overlay lambda
        break;

      case "IsProperty": {
        const expr = renderExpressionFromAst(entry.ast);
        if (expr) {
          const lambda = `o => ${expr.code}`;
          const exprStart = lambda.indexOf("=>") + 2;
          const segments = shiftSegments(expr.segments, exprStart);
          out.push({ exprId: id, lambda, exprSpan: [exprStart, exprStart + expr.code.length], segments });
        }
        break;
      }

      default:
        break;
    }
  }

  return out;
}

/* ===================================================================================== */
/* Expression rendering                                                                   */
/* ===================================================================================== */

type PrintableAst = IsBindingBehavior | IsAssign | IsLeftHandSide | IsUnary;
type PrintedExpression = { code: string; segments: OverlayLambdaSegment[]; path?: string };

function renderExpressionFromAst(ast: IsBindingBehavior): PrintedExpression | null {
  return printIsBindingBehavior(ast);
}

function shiftSegments(segs: OverlayLambdaSegment[], by: number): OverlayLambdaSegment[] {
  if (segs.length === 0) return segs;
  return segs.map((s) => ({ ...s, span: [s.span[0] + by, s.span[1] + by] }));
}

function mergeSegments(base: OverlayLambdaSegment[], extra: OverlayLambdaSegment[], offset: number): OverlayLambdaSegment[] {
  if (extra.length === 0) return base;
  return base.concat(shiftSegments(extra, offset));
}

function printIsBindingBehavior(n: PrintableAst): PrintedExpression | null {
  switch (n.$kind) {
    case "BindingBehavior": return printIsBindingBehavior(n.expression);
    case "ValueConverter":  return printIsBindingBehavior(n.expression);

    case "Assign":          return printAssign(n);
    case "Conditional":     return printConditional(n);

    case "AccessThis":      return baseThis(n);
    case "AccessBoundary":  return boundaryVm();
    case "AccessScope":     return scopeWithName(n);
    case "AccessMember":    return member(n);
    case "AccessKeyed":     return keyed(n);

    case "CallScope":       return callScope(n);
    case "CallMember":      return callMember(n);
    case "CallFunction":    return callFunction(n);
    case "CallGlobal":      return callGlobal(n);

    case "New":             return newExpr(n);
    case "Binary":          return binary(n);
    case "Unary":           return unary(n);

    case "PrimitiveLiteral":return primitive(n);
    case "ArrayLiteral":    return arrayLit(n);
    case "ObjectLiteral":   return objectLit(n);
    case "Paren":           return paren(n);

    case "Template":        return template(n);
    case "TaggedTemplate":  return taggedTemplate(n);

    default:
      return null;
  }
}

/* ---- Primitives / simple nodes ---- */
function boundaryVm(): PrintedExpression {
  return printed("o.$vm", []);
}
function baseThis(n: AccessThisExpression): PrintedExpression {
  return printed(ancestorChain(n.ancestor), [], n.ancestor === 0 ? "$this" : `$parent^${n.ancestor}`);
}
function scopeWithName(n: AccessScopeExpression): PrintedExpression {
  const base = ancestorChain(n.ancestor);
  const pathBase = n.ancestor === 0 ? "" : `$parent^${n.ancestor}.`;
  if (!n.name) return printed(base, [], pathBase ? pathBase.slice(0, -1) : undefined);
  const code = `${base}.${n.name}`;
  const start = base.length + 1;
  const seg: OverlayLambdaSegment = { kind: "member", path: `${pathBase}${n.name}`, span: [start, start + n.name.length] };
  return printed(code, [seg], `${pathBase}${n.name}`);
}

function member(n: AccessMemberExpression): PrintedExpression | null {
  const base = printLeft(n.object);
  if (!base) return null;
  const dot = n.optional ? "?." : ".";
  const head = `${base.code}${dot}`;
  const code = `${head}${n.name}`;
  const segs = base.path
    ? [{ kind: "member", path: `${base.path}.${n.name}`, span: [head.length, head.length + n.name.length] } as OverlayLambdaSegment]
    : [];
  const segments = mergeSegments(base.segments, segs, 0);
  const path = base.path ? `${base.path}.${n.name}` : undefined;
  return printed(code, segments, path);
}

function keyed(n: AccessKeyedExpression): PrintedExpression | null {
  const base = printLeft(n.object);
  const key = printIsAssign(n.key);
  if (!base || !key) return null;
  const opt = n.optional ? "?." : "";
  const head = `${base.code}${opt}[`;
  const code = `${head}${key.code}]`;
  const path = base.path && key.path ? `${base.path}.${key.path}` : base.path && key.code ? `${base.path}[${key.code}]` : undefined;
  const segs: OverlayLambdaSegment[] = key.path
    ? [{ kind: "member", path: path ?? key.path, span: [head.length, head.length + key.code.length] }]
    : [];
  const inner = mergeSegments(key.segments, segs, head.length);
  const segments = mergeSegments(base.segments, inner, 0);
  return printed(code, segments, path);
}

function callScope(n: CallScopeExpression): PrintedExpression | null {
  const callee = scopeWithName({ $kind: "AccessScope", name: n.name, ancestor: n.ancestor, span: null! /* spans handled separately */ });
  const args = joinArgs(n.args);
  const head = `${callee.code}${n.optional ? "?." : ""}(`;
  const code = `${head}${args.code})`;
  const segments = mergeSegments(callee.segments, args.segments, head.length);
  return printed(code, segments);
}

function callMember(n: CallMemberExpression): PrintedExpression | null {
  const obj = printLeft(n.object);
  if (!obj) return null;
  const head = `${obj.code}${n.optionalMember ? "?." : "."}${n.name}`;
  const args = joinArgs(n.args);
  const callHead = `${head}${n.optionalCall ? "?." : ""}(`;
  const code = `${callHead}${args.code})`;
  const segments = mergeSegments(obj.segments, args.segments, callHead.length);
  return printed(code, segments);
}

function callFunction(n: CallFunctionExpression): PrintedExpression | null {
  const fn = printLeft(n.func);
  if (!fn) return null;
  const args = joinArgs(n.args);
  const head = `${fn.code}${n.optional ? "?." : ""}(`;
  const code = `${head}${args.code})`;
  const segments = mergeSegments(fn.segments, args.segments, head.length);
  return printed(code, segments);
}

function callGlobal(_n: CallGlobalExpression): PrintedExpression | null {
  return null;
}

function newExpr(n: NewExpression): PrintedExpression | null {
  const f = printLeft(n.func);
  if (!f) return null;
  const args = joinArgs(n.args);
  const head = `new ${f.code}(`;
  const code = `${head}${args.code})`;
  const segments = mergeSegments(f.segments, args.segments, head.length);
  return printed(code, segments);
}

function binary(n: BinaryExpression): PrintedExpression | null {
  const l = printIsBindingBehavior(n.left);
  const r = printIsBindingBehavior(n.right);
  if (!l || !r) return null;
  const leftHead = `(${l.code}) ${n.operation} (`;
  const code = `${leftHead}${r.code})`;
  const segments = mergeSegments(l.segments, r.segments, leftHead.length);
  return printed(code, segments);
}

function unary(n: UnaryExpression): PrintedExpression | null {
  const e = printIsBindingBehavior(n.expression);
  if (!e) return null;
  const code = n.pos === 0 ? `${n.operation}${e.code}` : `${e.code}${n.operation}`;
  return printed(code, e.segments, e.path);
}

function primitive(n: PrimitiveLiteralExpression): PrintedExpression {
  const code = n.value === undefined ? "undefined" : JSON.stringify(n.value);
  return printed(code, []);
}

function arrayLit(n: ArrayLiteralExpression): PrintedExpression | null {
  const parts: string[] = [];
  let segments: OverlayLambdaSegment[] = [];
  for (let i = 0; i < n.elements.length; i++) {
    const el = printIsAssign(n.elements[i]!);
    if (!el) return null;
    const prefix = i === 0 ? "" : ", ";
    const offset = parts.join("").length + prefix.length;
    parts.push(`${prefix}${el.code}`);
    segments = mergeSegments(segments, el.segments, offset);
  }
  const code = `[${parts.join("")}]`;
  return printed(code, segments);
}

function objectLit(n: ObjectLiteralExpression): PrintedExpression | null {
  const parts: string[] = [];
  let segments: OverlayLambdaSegment[] = [];
  for (let i = 0; i < n.keys.length; i++) {
    const keyAst = n.keys[i];
    const val = printIsAssign(n.values[i]!);
    if (!val) return null;
    const key = typeof keyAst === "number" ? String(keyAst) : JSON.stringify(keyAst);
    const prefix = i === 0 ? "" : ", ";
    const offset = parts.join("").length + prefix.length + key.length + 2;
    parts.push(`${prefix}${key}: ${val.code}`);
    segments = mergeSegments(segments, val.segments, offset);
  }
  const code = `{ ${parts.join("")} }`;
  return printed(code, segments);
}

function paren(n: ParenExpression): PrintedExpression | null {
  const inner = printIsAssign(n.expression);
  if (!inner) return null;
  return printed(`(${inner.code})`, shiftSegments(inner.segments, 1), inner.path);
}

function template(n: TemplateExpression): PrintedExpression | null {
  const pieces: string[] = [];
  let segments: OverlayLambdaSegment[] = [];
  pieces.push(escapeBackticks(n.cooked[0] ?? ""));
  for (let i = 0; i < n.expressions.length; i++) {
    const e = printIsAssign(n.expressions[i]!);
    if (!e) return null;
    const before = pieces.join("");
    pieces.push(`\${${e.code}}${escapeBackticks(n.cooked[i + 1] ?? "")}`);
    segments = mergeSegments(segments, e.segments, before.length + 2);
  }
  return printed(`\`${pieces.join("")}\``, segments);
}

function taggedTemplate(n: TaggedTemplateExpression): PrintedExpression | null {
  const f = printLeft(n.func);
  if (!f) return null;
  const t = template({ $kind: "Template", cooked: n.cooked, expressions: n.expressions, span: null! /* spans handled elsewhere */ });
  if (!t) return null;
  const code = `${f.code}${t.code}`;
  const segments = mergeSegments(f.segments, t.segments, f.code.length);
  return printed(code, segments);
}

/* ---- Composite / helpers ---- */

function printAssign(n: AssignExpression): PrintedExpression | null {
  const t = printIsBindingBehavior(n.target);
  const v = printIsBindingBehavior(n.value);
  if (!t || !v) return null;
  const code = `${t.code} ${n.op} ${v.code}`;
  const segments = mergeSegments(t.segments, v.segments, t.code.length + 1 + n.op.length + 1);
  return printed(code, segments);
}

function printConditional(n: ConditionalExpression): PrintedExpression | null {
  const c = printIsBindingBehavior(n.condition);
  const y = printIsBindingBehavior(n.yes);
  const no = printIsBindingBehavior(n.no);
  if (!c || !y || !no) return null;
  const head = `(${c.code}) ? (${y.code}) : (`;
  const code = `${head}${no.code})`;
  const segments = mergeSegments(mergeSegments(c.segments, y.segments, head.length - y.code.length - 3), no.segments, head.length);
  return printed(code, segments);
}

function joinArgs(args: IsAssign[]): PrintedExpression {
  const parts: string[] = [];
  let segments: OverlayLambdaSegment[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = printIsAssign(args[i]!);
    if (!a) continue;
    const prefix = i === 0 ? "" : ", ";
    const offset = parts.join("").length + prefix.length;
    parts.push(`${prefix}${a.code}`);
    segments = mergeSegments(segments, a.segments, offset);
  }
  return printed(parts.join(""), segments);
}

function printIsAssign(n: IsAssign): PrintedExpression | null {
  return printIsBindingBehavior(n as IsBindingBehavior);
}

function printLeft(n: IsLeftHandSide): PrintedExpression | null {
  return printIsBindingBehavior(n as IsBindingBehavior);
}

function printed(code: string, segments: OverlayLambdaSegment[], path?: string): PrintedExpression {
  return path ? { code, segments, path } : { code, segments };
}

function ancestorChain(ancestor: number): string {
  return ancestor > 0 ? `o${".$parent".repeat(ancestor)}` : "o";
}

function escapeBackticks(s: string): string {
  return s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/* ===================================================================================== */
/* Expr-table indexing                                                                    */
/* ===================================================================================== */

function indexExprTable(table: readonly ExprTableEntry[] | undefined): ReadonlyMap<ExprId, ExprTableEntry> {
  const m = new Map<ExprId, ExprTableEntry>();
  if (!table) return m;
  for (const e of table) m.set(e.id, e);
  return m;
}

function hasQualifiedVm(vm: AnalyzeOptions["vm"]): vm is AnalyzeOptions["vm"] & { getQualifiedRootVmTypeExpr: () => string } {
  return typeof (vm as { getQualifiedRootVmTypeExpr?: unknown }).getQualifiedRootVmTypeExpr === "function";
}
