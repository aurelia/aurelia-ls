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
  AnalyzeOptions, OverlayPlanModule, TemplateOverlayPlan, FrameOverlayPlan,
} from "./types.js";

import type { LinkedSemanticsModule } from "../20-resolve-host/types.js";
import type {
  ScopeModule, ScopeTemplate, ScopeFrame, FrameId,
} from "../../model/symbols.js";

import type {
  ExprId,
  // Expression AST (discriminated by $kind)
  IsBindingBehavior,
  ForOfStatement,
  BindingIdentifierOrPattern,
  BindingIdentifier,
  DestructuringAssignmentExpression,
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
  TemplateExpression,
  TaggedTemplateExpression,
  ArrowFunction,
  DestructuringAssignmentRestExpression,
} from "../../model/ir.js";

function assertUnreachable(_: never): never { throw new Error("unreachable"); }

/* ===================================================================================== */
/* Expr-table slice used by Plan                                                          */
/* ===================================================================================== */

type ExprTableEntry =
  | { id: ExprId; expressionType: "IsBindingBehavior"; ast: IsBindingBehavior }
  | { id: ExprId; expressionType: "ForOfStatement";    ast: ForOfStatement };

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
  const vmAny = opts.vm as unknown as {
    getRootVmTypeExpr: () => string;
    getQualifiedRootVmTypeExpr?: () => string;
    getSyntheticPrefix?: () => string;
  };
  const rootVm = vmAny.getQualifiedRootVmTypeExpr?.() ?? vmAny.getRootVmTypeExpr();
  const prefix = (opts.syntheticPrefix ?? vmAny.getSyntheticPrefix?.()) || "__AU_TTC_";

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
  /** For 'with': overlay value type; for 'promise': raw promise type (before Awaited). */
  overlayBase?: string;
  /** then/catch to refine $this and alias typing */
  promiseBranch?: "then" | "catch";
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
      if (forOfAst && forOfAst.expressionType === "ForOfStatement") {
        // Header evaluates in the *outer* frame
        const iterType = evalTypeInFrame(f.parent ?? f.id, forOfAst.ast.iterable);
        h.repeatIterable = iterType;
      }
    } else if (f.origin?.kind === "with") {
      const e = exprIndex.get(f.origin.valueExprId);
      if (e && e.expressionType === "IsBindingBehavior") {
        h.overlayBase = evalTypeInFrame(f.parent ?? f.id, e.ast);
      }
    } else if (f.origin?.kind === "promise") {
      const e = exprIndex.get(f.origin.valueExprId);
      if (e && e.expressionType === "IsBindingBehavior") {
        h.overlayBase = evalTypeInFrame(f.parent ?? f.id, e.ast);
        h.promiseBranch = f.origin.branch!;
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
      const base = h.overlayBase;
      const branch = h.promiseBranch;
      for (const s of f.symbols) {
        if (s.kind === "promiseAlias") {
          if (branch === "then" && base) env.set(s.name, `Awaited<${base}>`);
          else if (branch === "catch") env.set(s.name, "any");
          else env.set(s.name, "unknown");
        }
      }
    }

    // <let> locals (value exprs evaluate in *current* frame)
    if (f.letValueExprs) {
      for (const [name, id] of Object.entries(f.letValueExprs)) {
        const entry = exprIndex.get(id);
        if (entry && entry.expressionType === "IsBindingBehavior") {
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
 * Compute name → type for repeat locals based on the header declaration.
 *
 * Supported shapes:
 *   - BindingIdentifier('item')           → item: elemT
 *   - ArrayDestructuring([...])           → leaves in order: TupleElement<elemT, 0>, TupleElement<elemT, 1>, ...
 *   - ObjectDestructuring({...})          → leaf maps to elemT['prop'] (or numeric index)
 */
function projectRepeatLocals(forOf: ForOfStatement | undefined, elemT: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!forOf) return out;
  const decl = forOf.declaration as BindingIdentifierOrPattern | DestructuringAssignmentExpression;
  switch (decl.$kind) {
    case "BindingIdentifier": {
      const name = (decl as BindingIdentifier).name;
      if (name) out.set(name, wrap(elemT));
      return out;
    }
    case "ArrayDestructuring":
    case "ObjectDestructuring": {
      projectFromDestructuring(decl as DestructuringAssignmentExpression, elemT, out);
      return out;
    }
    default:
      return out;
  }
}

function projectFromDestructuring(node: DestructuringAssignmentExpression, elemT: string, out: Map<string, string>): void {
  if (node.$kind === "ArrayDestructuring") {
    // Assign consecutive indices to leaf targets.
    let i = 0;
    for (const entry of node.list) {
      if (entry.$kind === "DestructuringAssignmentLeaf") {
        const name = entry.target.name;         // AccessMemberExpression.name
        if (name) out.set(name, tupleIndexType(elemT, i));
        i++;
      } else {
        // For nested patterns, just advance the index for now
        i++;
      }
    }
    return;
  }
  if (node.$kind === "ObjectDestructuring") {
    // Use first property or numeric index when available.
    for (const entry of node.list) {
      if (entry.$kind !== "DestructuringAssignmentLeaf") continue;
      const name = entry.target.name;
      if (!name) continue;
      const props = (entry as DestructuringAssignmentRestExpression).indexOrProperties;
      if (typeof props === "number") {
        out.set(name, indexType(elemT, [String(props)]));
      } else if (Array.isArray(props) && props.length > 0) {
        out.set(name, indexType(elemT, [String(props[0]!)]));
      } else {
        out.set(name, wrap(elemT));
      }
    }
  }
}

/** Extract a local identifier name from a binding pattern value. */
function nameFromPatternValue(v: IsAssign): string | null {
  switch (v.$kind) {
    case "AccessScope":
      return v.name || null;
    case "Assign":
      return v.target.$kind === "AccessScope" ? v.target.name : null;
    default:
      return null;
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

  // Overlay object (with / promise then) if present
  const overlayObj = hints?.overlayBase ? (hints.promiseBranch === "then" ? `Awaited<${hints.overlayBase}>` : hints.overlayBase) : null;

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
): string[] {
  const out: string[] = [];
  const seen = new Set<string /* ExprId string */>();

  for (const [idStr, fid] of Object.entries(st.exprToFrame)) {
    if (fid !== frameId) continue;
    if (seen.has(idStr)) continue;
    seen.add(idStr);

    const id = idStr as ExprId;
    const entry = exprIndex.get(id);
    if (!entry) continue;

    switch (entry.expressionType) {
      case "ForOfStatement":
        // headers are mapped for scope only; no overlay lambda
        break;

      case "IsBindingBehavior": {
        const expr = renderExpressionFromAst(entry.ast);
        if (expr) out.push(`o => ${expr}`);
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

/**
 * Render the authored expression once, rooted at `o`:
 * - Behaviors/converters are treated as transparent (for TTC purposes).
 * - `$parent` is represented via AccessThis/AccessScope.ancestor.
 * - Optional chaining flags are preserved where present in the AST.
 * If we cannot confidently render a node, return `null` (skip emission).
 */
function renderExpressionFromAst(ast: IsBindingBehavior): string | null {
  return printIsBindingBehavior(ast);
}

function printIsBindingBehavior(n: IsBindingBehavior): string | null {
  switch (n.$kind) {
    case "BindingBehavior":
      return printIsBindingBehavior(n.expression);
    case "ValueConverter":
      return printIsBindingBehavior(n.expression);

    case "Assign":           return printAssign(n);
    case "Conditional":      return printConditional(n);

    case "AccessThis":       return baseThis(n);
    case "AccessBoundary":   return boundaryVm();
    case "AccessScope":      return scopeWithName(n);
    case "AccessMember":     return member(n);
    case "AccessKeyed":      return keyed(n);

    case "CallScope":        return callScope(n);
    case "CallMember":       return callMember(n);
    case "CallFunction":     return callFunction(n);
    case "CallGlobal":       return callGlobal(n);

    case "New":              return newExpr(n);
    case "Binary":           return binary(n);
    case "Unary":            return unary(n);

    case "PrimitiveLiteral": return primitive(n);
    case "ArrayLiteral":     return arrayLit(n);
    case "ObjectLiteral":    return objectLit(n);

    case "Template":         return template(n);
    case "TaggedTemplate":   return taggedTemplate(n);

    default:
      return null;
  }
}

/* ---- Primitives / simple nodes ---- */
function boundaryVm(): string {
  return "o.$vm";
}
function baseThis(n: AccessThisExpression): string {
  return ancestorChain(n.ancestor);
}
function scopeWithName(n: AccessScopeExpression): string {
  const base = ancestorChain(n.ancestor);
  return n.name ? `${base}.${n.name}` : base;
}

function member(n: AccessMemberExpression): string | null {
  const base = printLeft(n.object);
  if (!base) return null;
  return `${base}${n.optional ? "?." : "."}${n.name}`;
}

function keyed(n: AccessKeyedExpression): string | null {
  const base = printLeft(n.object);
  const key = printIsAssign(n.key);
  if (!base || !key) return null;
  return `${base}${n.optional ? "?." : ""}[${key}]`;
}

function callScope(n: CallScopeExpression): string | null {
  const callee = scopeWithName({ $kind: "AccessScope", name: n.name, ancestor: n.ancestor, span: null! /* TODO: integrate spans */ });
  const args = joinArgs(n.args);
  return `${callee}${n.optional ? "?." : ""}(${args})`;
}

function callMember(n: CallMemberExpression): string | null {
  const obj = printLeft(n.object);
  if (!obj) return null;
  const head = `${obj}${n.optionalMember ? "?." : "."}${n.name}`;
  const args = joinArgs(n.args);
  return `${head}${n.optionalCall ? "?." : ""}(${args})`;
}

function callFunction(n: CallFunctionExpression): string | null {
  const f = printLeft(n.func);
  if (!f) return null;
  const args = joinArgs(n.args);
  return `${f}${n.optional ? "?." : ""}(${args})`;
}

function callGlobal(_n: CallGlobalExpression): string | null {
  // Globals are not part of component scope; for TTC we skip emitting them.
  // (If we later allow specific globals, thread a whitelist here.)
  return null;
}

function newExpr(n: NewExpression): string | null {
  const f = printLeft(n.func);
  if (!f) return null;
  const args = joinArgs(n.args);
  return `new ${f}(${args})`;
}

function binary(n: BinaryExpression): string | null {
  const l = printIsBindingBehavior(n.left);
  const r = printIsBindingBehavior(n.right);
  if (!l || !r) return null;
  return `(${l}) ${n.operation} (${r})`;
}

function unary(n: UnaryExpression): string | null {
  const e = printLeft(n.expression);
  if (!e) return null;
  return n.pos === 0 ? `${n.operation}${e}` : `${e}${n.operation}`;
}

function primitive(n: PrimitiveLiteralExpression): string {
  if (n.value === undefined) return "undefined";
  return JSON.stringify(n.value as unknown);
}

function arrayLit(n: ArrayLiteralExpression): string | null {
  const el = n.elements.map(printIsAssign);
  if (el.some(e => !e)) return null;
  return `[${el.join(", ")}]`;
}

function objectLit(n: ObjectLiteralExpression): string | null {
  const ks = n.keys;
  const vs = n.values.map(printIsAssign);
  if (vs.some(v => !v)) return null;
  const parts: string[] = [];
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i];
    const key = typeof k === "number" ? String(k) : JSON.stringify(k);
    const v = vs[i]!;
    parts.push(`${key}: ${v}`);
  }
  return `{ ${parts.join(", ")} }`;
}

function template(n: TemplateExpression): string | null {
  const chunks: string[] = [];
  chunks.push(escapeBackticks(n.cooked[0] ?? ""));
  for (let i = 0; i < n.expressions.length; i++) {
    const e = printIsAssign(n.expressions[i]!);
    if (!e) return null;
    const text = escapeBackticks(n.cooked[i + 1] ?? "");
    chunks.push(`\${${e}}${text}`);
  }
  return `\`${chunks.join("")}\``;
}

function taggedTemplate(n: TaggedTemplateExpression): string | null {
  const f = printLeft(n.func);
  if (!f) return null;
  const t = template({ $kind: "Template", cooked: n.cooked, expressions: n.expressions, span: null! /* TODO: integrate spans */ });
  if (!t) return null;
  return `${f}${t}`;
}

/* ---- Composite / helpers ---- */

function printAssign(n: AssignExpression): string | null {
  const t = printIsBindingBehavior(n.target);
  const v = printIsBindingBehavior(n.value);
  if (!t || !v) return null;
  return `${t} ${n.op} ${v}`;
}

function printConditional(n: ConditionalExpression): string | null {
  const c = printIsBindingBehavior(n.condition);
  const y = printIsBindingBehavior(n.yes);
  const no = printIsBindingBehavior(n.no);
  if (!c || !y || !no) return null;
  return `(${c}) ? (${y}) : (${no})`;
}

function joinArgs(args: IsAssign[]): string {
  const a = args.map(printIsAssign);
  if (a.some(x => !x)) return ""; // keep syntactically valid; emitter no-ops anyway
  return (a as string[]).join(", ");
}

function printIsAssign(n: IsAssign): string | null {
  // IsAssign ⊂ IsBindingBehavior, so we can reuse the main printer
  return printIsBindingBehavior(n as IsBindingBehavior);
}

function printLeft(n: IsLeftHandSide): string | null {
  // IsLeftHandSide ⊂ IsBindingBehavior
  return printIsBindingBehavior(n as IsBindingBehavior);
}

function ancestorChain(ancestor: number): string {
  return ancestor > 0 ? `o${".$parent".repeat(ancestor)}` : "o";
}

function escapeBackticks(s: string): string {
  // Escape ` and ${ inside template literal raw text
  return s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/* ===================================================================================== */
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

  function tIsBindingBehavior(n: IsBindingBehavior): string {
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
    const base = tIsBindingBehavior(n.object as unknown as IsBindingBehavior);
    if (!base || base === "unknown") return "unknown";
    return indexType(base, [n.name]);
  }

  function tAccessKeyed(n: AccessKeyedExpression): string {
    const base = tIsBindingBehavior(n.object as unknown as IsBindingBehavior);
    if (!base || base === "unknown") return "unknown";
    if (n.key.$kind === "PrimitiveLiteral") {
      const k = String((n.key as PrimitiveLiteralExpression).value as unknown);
      return indexType(base, [k]);
    }
    return "unknown";
  }

  function tCallScope(n: CallScopeExpression): string {
    // ReturnType of the callee found via scope lookup
    const calleeT = tAccessScope({ $kind: "AccessScope", name: n.name, ancestor: n.ancestor, span: null! /* TODO: integrate spans */ });
    return returnTypeOf(calleeT);
  }

  function tCallMember(n: CallMemberExpression): string {
    const base = tIsBindingBehavior(n.object as unknown as IsBindingBehavior);
    if (!base || base === "unknown") return "unknown";
    const calleeT = indexType(base, [n.name]);
    return returnTypeOf(calleeT);
  }

  function tCallFunction(n: CallFunctionExpression): string {
    const fnT = tIsBindingBehavior(n.func as unknown as IsBindingBehavior);
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
