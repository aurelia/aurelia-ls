/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Type Analysis — derive types for scope symbols from expression ASTs.
 *
 * ## Pattern-Based Type Inference
 *
 * This module uses GENERIC origin patterns (iterator, valueOverlay, promiseValue, promiseBranch)
 * to determine how to type scope symbols. This enables userland template controllers
 * to get the same type inference as built-ins by using matching ControllerConfig.
 *
 * | Origin Pattern   | Type Inference                                            |
 * |------------------|-----------------------------------------------------------|
 * | iterator         | Extract iterable type → element type → project to locals |
 * | valueOverlay     | Extract value type → becomes overlay base for scope      |
 * | promiseValue     | Extract promise type → used by child branches            |
 * | promiseBranch    | then: Awaited<T>, catch: any                             |
 *
 * See symbols.ts header comment for the full design rationale.
 */
import type {
  AccessKeyedExpression,
  AccessMemberExpression,
  AccessScopeExpression,
  AccessThisExpression,
  ArrayBindingPattern,
  AssignExpression,
  BindingIdentifier,
  BindingIdentifierOrPattern,
  BindingPatternDefault,
  BindingPatternHole,
  BinaryExpression,
  CallFunctionExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  ForOfStatement,
  IsAssign,
  IsBindingBehavior,
  IsLeftHandSide,
  IsUnary,
  ObjectBindingPattern,
  PrimitiveLiteralExpression,
  UnaryExpression,
  ExprId,
  ExprTableEntry,
} from "../../model/ir.js";
import type { FrameId, ScopeTemplate } from "../../model/symbols.js";
import type { ReadonlyExprIdMap } from "../../model/identity.js";
import { buildScopeLookup } from "./scope-lookup.js";

export type Env = ReadonlyMap<string, string>;
type MutableEnv = Map<string, string>;

/**
 * Typing hints extracted from frame origin for downstream type inference.
 * These are pattern-based (not controller-specific) to support userland TCs.
 */
export type FrameTypingHints = {
  /** For valueOverlay: the type of the overlay base expression. */
  overlayBase?: string;
  /** For promiseValue/promiseBranch: the type of the promise expression. */
  promiseBase?: string;
  /** For iterator: the type of the iterable expression. */
  iterableType?: string;
};

export type FrameAnalysis = {
  envs: Map<FrameId, Env>;
  hints: Map<FrameId, FrameTypingHints>;
};

export function wrap(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("(")) return trimmed;
  return `(${trimmed})`;
}

export function contextualType(name: string): string {
  switch (name) {
    case "$index": return "number";
    case "$length": return "number";
    case "$first": return "boolean";
    case "$last": return "boolean";
    case "$even": return "boolean";
    case "$odd": return "boolean";
    case "$middle": return "boolean";
    default: return "unknown";
  }
}

export function buildFrameAnalysis(
  st: ScopeTemplate,
  exprIndex: ReadonlyExprIdMap<ExprTableEntry>,
  rootVm: string,
): FrameAnalysis {
  const envs = new Map<FrameId, Env>();
  const hints = new Map<FrameId, FrameTypingHints>();

  const scope = buildScopeLookup(st);

  const resolveEnvAt = (start: FrameId | null, up: number): Env | undefined => {
    const ancestor = scope.ancestorOf(start, up);
    return ancestor != null ? envs.get(ancestor) : undefined;
  };

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

  for (const f of scope.frames) {
    const parentEnv: Env = f.parent != null ? (envs.get(f.parent) ?? new Map()) : new Map();
    const env: MutableEnv = new Map(parentEnv);
    const h: FrameTypingHints = {};

    // === Extract typing hints from frame origin (pattern-based) ===
    // These patterns work for any controller with matching config, not just built-ins.

    if (f.origin?.kind === "iterator") {
      // Iterator pattern: extract iterable type for element type inference
      // Works for: repeat, virtual-repeat, or any TC with trigger.kind="iterator"
      const forOfAst = exprIndex.get(f.origin.forOfAstId);
      if (forOfAst?.expressionType === "IsIterator") {
        if (forOfAst.ast.$kind !== "BadExpression") {
          const iterType = evalTypeInFrame(f.parent ?? f.id, forOfAst.ast.iterable);
          h.iterableType = iterType;
        }
      }
    } else if (f.origin?.kind === "valueOverlay") {
      // Value overlay pattern: extract overlay base type
      // Works for: with, or any TC with scope="overlay" + injects.alias
      const e = exprIndex.get(f.origin.valueExprId);
      if (e?.expressionType === "IsProperty") {
        h.overlayBase = evalTypeInFrame(f.parent ?? f.id, e.ast);
      }
    } else if (f.origin?.kind === "promiseValue") {
      // Promise value pattern: extract promise type for child branches
      // Works for: promise, or any TC with promise-like branch structure
      const e = exprIndex.get(f.origin.valueExprId);
      if (e?.expressionType === "IsProperty") {
        h.promiseBase = evalTypeInFrame(f.parent ?? f.id, e.ast);
      }
    }
    hints.set(f.id, h);

    // === Type iterator locals ===
    // Project element type from iterable onto destructured loop variables
    if (h.iterableType) {
      const iterT = h.iterableType;
      const elemT = `CollectionElement<${iterT}>`;
      const proj = f.origin?.kind === "iterator"
        ? projectIteratorLocals(exprIndex.get(f.origin.forOfAstId)?.ast as ForOfStatement | undefined, elemT)
        : new Map<string, string>();
      for (const s of f.symbols) {
        if (s.kind === "iteratorLocal") {
          const t = proj.get(s.name);
          env.set(s.name, t ?? "unknown");
        }
      }
    } else {
      // Fallback for iterator locals without type info
      for (const s of f.symbols) {
        if (s.kind === "iteratorLocal") env.set(s.name, "unknown");
      }
    }

    // === Type contextuals ===
    // These have known types based on their names ($index → number, etc.)
    for (const s of f.symbols) {
      if (s.kind === "contextual") env.set(s.name, contextualType(s.name));
    }

    // === Type alias symbols ===
    // Aliases receive their type from the frame origin or parent frame.
    //
    // For promise branches (then/catch):
    // - then alias: Awaited<T> where T is the promise type (resolved value)
    // - catch alias: `any` (rejection can be any value, not just Error)
    //
    // For value overlays (with):
    // - The overlay base handles scope resolution; no explicit alias symbol needed
    if (f.origin?.kind === "promiseValue" || f.origin?.kind === "promiseBranch") {
      // For promiseValue frames, use our own promiseBase.
      // For promiseBranch frames, find parent's promiseBase.
      let base = h.promiseBase;
      if (!base && f.parent != null) {
        const parentHints = hints.get(f.parent);
        base = parentHints?.promiseBase;
      }
      for (const s of f.symbols) {
        if (s.kind === "alias") {
          if (s.aliasKind === "then" && base) env.set(s.name, `Awaited<${base}>`);
          else if (s.aliasKind === "catch") env.set(s.name, "any");
          else env.set(s.name, "unknown");
        }
      }
    }

    // === Type <let> locals ===
    if (f.letValueExprs) {
      for (const [name, id] of Object.entries(f.letValueExprs)) {
        const entry = exprIndex.get(id);
        if (entry?.expressionType === "IsProperty") {
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

export type TypeCtx = {
  rootVm: string;
  resolveEnv(depth: number): Env | undefined;
};

export function typeFromExprAst(ast: IsBindingBehavior, ctx: TypeCtx): string {
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
      case "Paren":           return tIsBindingBehavior(n.expression as IsBindingBehavior);
      case "Template":        return "string";
      case "TaggedTemplate":  return "unknown";
      default:
        return "unknown";
    }
  }

  function tAccessThis(n: AccessThisExpression): string {
    if (n.ancestor === 0) return `(${ctx.rootVm})`;
    return "unknown";
  }

  function tAccessScope(n: AccessScopeExpression): string {
    const env = ctx.resolveEnv(n.ancestor);
    if (n.name && env) {
      const t = env.get(n.name.name);
      if (t) return `(${t})`;
    }
    return n.ancestor === 0 && n.name ? indexType(ctx.rootVm, [n.name.name]) : "unknown";
  }

  function tAccessMember(n: AccessMemberExpression): string {
    const base = tIsBindingBehavior(n.object as IsBindingBehavior);
    if (!base || base === "unknown") return "unknown";
    return indexType(base, [n.name.name]);
  }

  function tAccessKeyed(n: AccessKeyedExpression): string {
    const base = tIsBindingBehavior(n.object as IsBindingBehavior);
    if (!base || base === "unknown") return "unknown";
    if (n.key.$kind === "PrimitiveLiteral") {
      const keyVal = n.key.value;
      const key = keyVal === undefined ? "undefined" : String(keyVal);
      return indexType(base, [key]);
    }
    return "unknown";
  }

  function tCallScope(n: CallScopeExpression): string {
    const calleeT = tAccessScope({ $kind: "AccessScope", name: n.name, ancestor: n.ancestor, span: n.name.span });
    return returnTypeOf(calleeT);
  }

  function tCallMember(n: CallMemberExpression): string {
    const base = tIsBindingBehavior(n.object as IsBindingBehavior);
    if (!base || base === "unknown") return "unknown";
    const calleeT = indexType(base, [n.name.name]);
    return returnTypeOf(calleeT);
  }

  function tCallFunction(n: CallFunctionExpression): string {
    const fnT = tIsBindingBehavior(n.func as IsBindingBehavior);
    return returnTypeOf(fnT);
  }
}

/**
 * Project element type onto iterator locals from ForOfStatement destructuring.
 * Works for any iterator-based controller (repeat, virtual-repeat, etc.).
 */
export function projectIteratorLocals(forOf: ForOfStatement | undefined, elemT: string): Map<string, string> {
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
      if (name) out.set(name.name, wrap(baseType));
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
        const restType = tupleIndexType(baseType, i);
        projectPatternTypes(pattern.rest, restType, out);
      }
      return;
    }
    case "ObjectBindingPattern": {
      for (const prop of pattern.properties) {
        projectPatternTypes(prop.value, indexType(baseType, [String(prop.key)]), out);
      }
      if (pattern.rest) {
        const keys =
          pattern.properties.length === 0
            ? "never"
            : pattern.properties.map(p => `'${String(p.key)}'`).join("|");
        const restType = `Omit<${wrap(baseType)}, ${keys}>`;
        projectPatternTypes(pattern.rest, restType, out);
      }
      return;
    }
    default:
      return;
  }
}

function literalType(n: PrimitiveLiteralExpression): string {
  const v = n.value;
  switch (typeof v) {
    case "string": return "string";
    case "number": return "number";
    case "boolean": return "boolean";
    default: return v === null ? "null" : "unknown";
  }
}

function returnTypeOf(fnType: string): string {
  return `ReturnType<NonNullable<${wrap(fnType)}>>`;
}

function indexType(base: string, parts: string[]): string {
  const idx = parts.map(p => `['${escapeKey(p)}']`).join("");
  return `NonNullable<${wrap(base)}>${idx}`;
}

function tupleIndexType(base: string, i: number): string {
  return `TupleElement<NonNullable<${wrap(base)}>, ${i}>`;
}

function escapeKey(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
