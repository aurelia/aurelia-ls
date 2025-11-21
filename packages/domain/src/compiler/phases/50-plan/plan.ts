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
/* Frame analysis: Env + origin typing                                                    */
/* ===================================================================================== */

type Env = ReadonlyMap<string, string>;        // name -> TS type expr
type MutableEnv = Map<string, string>;

type FrameTypingHints = {
  /** For 'with': overlay value type. */
  overlayBase?: string;
  /** For 'promise': raw promise type (before Awaited). */
  promiseBase?: string;
  /** For 'repeat': iterable type; element type computed via CollectionElement<>. */
  repeatIterable?: string;
};

type FrameAnalysis = {
  envs: Map<FrameId, Env>;
  hints: Map<FrameId, FrameTypingHints>;
};

function buildFrameAnalysis(
  st: ScopeTemplate,
  exprIndex: ReadonlyMap<ExprId, ExprTableEntry>,
  rootVm: string,
): FrameAnalysis {
  const envs = new Map<FrameId, Env>();
  const hints = new Map<FrameId, FrameTypingHints>();

  // Helpers to navigate frame ancestry quickly
  const frameById = new Map<FrameId, ScopeFrame>();
  for (const f of st.frames) frameById.set(f.id, f);

  const resolveEnvAt = (start: FrameId | null, up: number): Env | undefined => {
    let id = start;
    let steps = up;
    while (steps > 0 && id != null) {
      id = frameById.get(id!)?.parent ?? null;
      steps--;
    }
    return id != null ? envs.get(id) : undefined;
  };

  // Evaluate a type in the context of a frame. Allow the *current* env to be seen for depth 0.
  const evalTypeInFrame = (
    frameId: FrameId,
    ast: IsBindingBehavior | ForOfStatement | undefined,
    currentEnv?: Env,
  ): string => {
    if (!ast) return "unknown";
    const node = ast as IsBindingBehavior;
    return typeFromExprAst(node, {
      rootVm,
      resolveEnv: (depth: number) => {
        if (depth === 0 && currentEnv) return currentEnv;
        return resolveEnvAt(frameId, depth);
      },
    });
  };

  for (const f of st.frames) {
    const parentEnv: Env = f.parent != null ? (envs.get(f.parent) ?? new Map()) : new Map();
    const env: MutableEnv = new Map(parentEnv); // start with inherited names
    const h: FrameTypingHints = {};

    // ---- Origin typing (repeat / with / promise) ----
    if (f.origin?.kind === "repeat") {
      const forOfAst = exprIndex.get(f.origin.forOfAstId);
      if (forOfAst?.expressionType === "IsIterator") {
        if (forOfAst.ast.$kind !== "BadExpression") {
          // Header evaluates in the *outer* frame
          const iterType = evalTypeInFrame(f.parent ?? f.id, forOfAst.ast.iterable);
          h.repeatIterable = iterType;
        }
      }
    } else if (f.origin?.kind === "with") {
      const e = exprIndex.get(f.origin.valueExprId);
      if (e?.expressionType === "IsProperty") {
        h.overlayBase = evalTypeInFrame(f.parent ?? f.id, e.ast);
      }
    } else if (f.origin?.kind === "promise") {
      const e = exprIndex.get(f.origin.valueExprId);
      if (e?.expressionType === "IsProperty") {
        h.promiseBase = evalTypeInFrame(f.parent ?? f.id, e.ast);
      }
    }
    hints.set(f.id, h);

    // ---- Populate env with this-frame names (shadowing parent) ----

    // repeat locals / contextuals
    if (h.repeatIterable) {
      const iterT = h.repeatIterable;                  // e.g., Map<K,V> | T[] | Iterable<T>
      const elemT = `CollectionElement<${iterT}>`;     // element/tuple/object view
      // Project locals from the header declaration shape
      const proj = f.origin?.kind === "repeat"
        ? projectRepeatLocals(exprIndex.get(f.origin.forOfAstId)?.ast as ForOfStatement | undefined, elemT)
        : new Map<string, string>();
      for (const s of f.symbols) {
        if (s.kind === "repeatLocal") {
          const t = proj.get(s.name);
          env.set(s.name, t ?? "unknown");
        }
      }
    } else {
      // Even if we don't know iterable type, surface unknown for locals
      for (const s of f.symbols) {
        if (s.kind === "repeatLocal") env.set(s.name, "unknown");
      }
    }
    for (const s of f.symbols) {
      if (s.kind === "repeatContextual") env.set(s.name, contextualType(s.name));
    }

    // promise alias (then/catch)
    if (f.origin?.kind === "promise") {
      const base = h.promiseBase;
      for (const s of f.symbols) {
        if (s.kind === "promiseAlias") {
          if (s.branch === "then" && base) env.set(s.name, `Awaited<${base}>`);
          else if (s.branch === "catch") env.set(s.name, "any");
          else env.set(s.name, "unknown");
        }
      }
    }

    // <let> locals (value exprs evaluate in *current* frame)
    if (f.letValueExprs) {
      for (const [name, id] of Object.entries(f.letValueExprs)) {
        const entry = exprIndex.get(id);
        if (entry?.expressionType === "IsProperty") {
          // Use the in-construction env so let values can reference locals in the same frame
          const t = evalTypeInFrame(f.id, entry.ast, env as Env);
          env.set(name, t);
        } else {
          env.set(name, "unknown");
        }
      }
    }

    envs.set(f.id, env);
  }

  return { envs, hints };
}

/**
 * Compute name -> type for repeat locals based on the header declaration.
 *
 * Supported shapes:
 *   - BindingIdentifier('item')           -> item: elemT
 *   - ArrayBindingPattern([...])          -> leaves in order: TupleElement<elemT, 0>, TupleElement<elemT, 1>, ...
 *   - ObjectBindingPattern({...})         -> leaf maps to elemT['prop']
 */

function projectRepeatLocals(forOf: ForOfStatement | undefined, elemT: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!forOf) return out;
  projectPatternTypes(forOf.declaration, elemT, out);
  return out;
}

function projectPatternTypes(pattern: BindingIdentifierOrPattern, baseType: string, out: Map<string, string>): void {
  switch (pattern.$kind) {
    case "BadExpression":
      return;
    case "BindingIdentifier": {
      const name = pattern.name;
      if (name) out.set(name, wrap(baseType));
      return;
    }
    case "BindingPatternDefault":
      projectPatternTypes(pattern.target, baseType, out);
      return;
    case "BindingPatternHole":
      return;
    case "ArrayBindingPattern": {
      let i = 0;
      for (const el of pattern.elements) {
        projectPatternTypes(el, tupleIndexType(baseType, i), out);
        i++;
      }
      if (pattern.rest) {
        const restType = `Array<${tupleIndexType(baseType, i)}>`;
        projectPatternTypes(pattern.rest, restType, out);
      }
      return;
    }
    case "ObjectBindingPattern": {
      for (const prop of pattern.properties) {
        projectPatternTypes(prop.value, indexType(baseType, [String(prop.key)]), out);
      }
      if (pattern.rest) {
        const keys = pattern.properties.map(p => `'${escapeKey(String(p.key))}'`).join(" | ") || "never";
        const restType = `Omit<${wrap(baseType)}, ${keys}>`;
        projectPatternTypes(pattern.rest, restType, out);
      }
      return;
    }
    default:
      return assertUnreachable(pattern as never);
  }
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

function wrap(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("(")) return trimmed;
  return `(${trimmed})`;
}

function contextualType(name: string): string {
  switch (name) {
    case "$index":   return "number";
    case "$length":  return "number";
    case "$first":   return "boolean";
    case "$last":    return "boolean";
    case "$even":    return "boolean";
    case "$odd":     return "boolean";
    case "$middle":  return "boolean";
    default:         return "unknown";
  }
}

function safeProp(n: string): string {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(n) ? n : JSON.stringify(n);
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
/* Env-aware Expression → type expressions                                               */
/* ===================================================================================== */

type TypeCtx = {
  rootVm: string;
  /**
   * Resolve the *Env* at a given $parent depth from the frame where the expression is evaluated.
   * depth 0 = current frame, 1 = parent, ...
   */
  resolveEnv(depth: number): Env | undefined;
};

/**
 * Produce a TS type expression for an expression in the given frame context:
 * - Locals first (via Env), then fall back to root VM bracket-indexing
 * - AccessThis(0) → root VM (the overlay gets intersected into the frame type)
 * - AccessScope with ancestor>0 resolves against ancestor Env
 * - AccessMember/Keyed index into the base type
 * - Calls → ReturnType<NonNullable<calleeType>>
 * - Unknown/complex shapes → 'unknown'
 */
function typeFromExprAst(ast: IsBindingBehavior, ctx: TypeCtx): string {
  return tIsBindingBehavior(ast);

function tIsBindingBehavior(n: PrintableAst): string {
  switch (n.$kind) {
    case "BindingBehavior": return tIsBindingBehavior(n.expression);
    case "ValueConverter":  return tIsBindingBehavior(n.expression);

      case "Assign":          return "unknown";
      case "Conditional":     return "unknown";

      case "AccessThis":      return tAccessThis(n);
      case "AccessBoundary":  return `(${ctx.rootVm})`;
      case "AccessScope":     return tAccessScope(n);
      case "AccessMember":    return tAccessMember(n);
      case "AccessKeyed":     return tAccessKeyed(n);

      case "CallScope":       return tCallScope(n);
      case "CallMember":      return tCallMember(n);
      case "CallFunction":    return tCallFunction(n);
      case "CallGlobal":      return "unknown";

      case "New":             return "unknown";
      case "Binary":          return "unknown";
      case "Unary":           return "unknown";

      case "PrimitiveLiteral":return literalType(n);
      case "ArrayLiteral":    return "unknown[]";
      case "ObjectLiteral":   return "Record<string, unknown>";
      case "Paren":           return tIsBindingBehavior(n.expression);

      case "Template":        return "string";
      case "TaggedTemplate":  return "unknown";

      default:
        return "unknown";
    }
  }

  function tAccessThis(n: AccessThisExpression): string {
    if (n.ancestor === 0) return `(${ctx.rootVm})`;
    // Accessing $parent.$this is not modeled as a value path here; rely on frame $parent typing
    return "unknown";
  }

  function tAccessScope(n: AccessScopeExpression): string {
    const env = ctx.resolveEnv(n.ancestor);
    if (n.name && env) {
      const t = env.get(n.name);
      if (t) return `(${t})`;
    }
    // Fallback to root VM only when ancestor === 0
    return n.ancestor === 0 && n.name ? indexType(ctx.rootVm, [n.name]) : "unknown";
  }

  function tAccessMember(n: AccessMemberExpression): string {
    const base = tIsBindingBehavior(n.object);
    if (!base || base === "unknown") return "unknown";
    return indexType(base, [n.name]);
  }

  function tAccessKeyed(n: AccessKeyedExpression): string {
    const base = tIsBindingBehavior(n.object);
    if (!base || base === "unknown") return "unknown";
    if (n.key.$kind === "PrimitiveLiteral") {
      const keyVal = (n.key as PrimitiveLiteralExpression).value;
      const key = keyVal === undefined ? "undefined" : String(keyVal);
      return indexType(base, [key]);
    }
    return "unknown";
  }

  function tCallScope(n: CallScopeExpression): string {
    // ReturnType of the callee found via scope lookup
    const calleeT = tAccessScope({ $kind: "AccessScope", name: n.name, ancestor: n.ancestor, span: null! /* TODO: integrate spans */ });
    return returnTypeOf(calleeT);
  }

  function tCallMember(n: CallMemberExpression): string {
    const base = tIsBindingBehavior(n.object);
    if (!base || base === "unknown") return "unknown";
    const calleeT = indexType(base, [n.name]);
    return returnTypeOf(calleeT);
  }

  function tCallFunction(n: CallFunctionExpression): string {
    const fnT = tIsBindingBehavior(n.func);
    return returnTypeOf(fnT);
  }
}

function literalType(n: PrimitiveLiteralExpression): string {
  const v = n.value;
  switch (typeof v) {
    case "string":  return "string";
    case "number":  return "number";
    case "boolean": return "boolean";
    default:        return v === null ? "null" : "unknown";
  }
}

/** `ReturnType<NonNullable<T>>` */
function returnTypeOf(fnType: string): string {
  return `ReturnType<NonNullable<${wrap(fnType)}>>`;
}

/** Index like: `NonNullable<Base>[0]['b']` (numeric indices stay numeric). */
function indexType(base: string, parts: string[]): string {
  const idx = parts.map(p => `['${escapeKey(p)}']`).join("");
  return `NonNullable<${wrap(base)}>${idx}`;
}

/** Tuple index like: `TupleElement<NonNullable<Base>, I>` */
function tupleIndexType(base: string, i: number): string {
  return `TupleElement<NonNullable<${wrap(base)}>, ${i}>`;
}

function escapeKey(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
