/**
 * TODO(mapped-emitter)
 * - Integrate into overlay plan (replace string printer) and have emit.ts only offset/prefix.
 * - Member paths: derive from AST (call scope/member/global, optional, keyed) with stable path model.
 * - Destructuring patterns: emit with full mappings (array/object/rest/defaults).
 * - Optional/keyed mapping math: verify spans stay aligned under nesting/optionals.
 * - JS mode: validate JSDoc wrapping shift with mappings/segments.
 * - Tests: overlay mapped emitter cases (members, optionals, calls, templates, destructuring, JS mode).
  * - Normalize mappings with files when wiring into plan artifacts; avoid double-normalizing later.
  * - Path stability: settle on canonical path strings ($this/$parent^n/brackets) and reuse.
  * - BadExpression handling: decide placeholder vs. empty code and how mappings propagate.
  * - Add a thin adapter for plan.ts to consume this emitter without touching call sites everywhere.
 */
import type {
  ArrayLiteralExpression,
  AssignExpression,
  BindingBehaviorExpression,
  BindingIdentifier,
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  IsAssign,
  IsBindingBehavior,
  IsBinary,
  IsLeftHandSide,
  IsUnary,
  ObjectLiteralExpression,
  PrimitiveLiteralExpression,
  TaggedTemplateExpression,
  TemplateExpression,
  UnaryExpression,
  ValueConverterExpression,
  AccessScopeExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  AccessBoundaryExpression,
  AccessThisExpression,
  AccessGlobalExpression,
  ArrowFunction,
  BadExpression,
  ParenExpression,
  NewExpression,
  BinaryExpression,
  DestructuringAssignmentExpression,
  BindingPattern,
  BindingPatternDefault,
  ArrayBindingPattern,
  BindingPatternHole,
  ObjectBindingPattern,
  CustomExpression,
  Interpolation,
} from "../../../model/ir.js";
import type { OverlayLambdaSegment } from "./types.js";
import type { SourceSpan, TextSpan } from "../../../model/span.js";

/**
 * Span-aware emission result for a single expression.
 * `mappings` describe how authored spans map onto emitted text ranges (relative offsets).
 */
export interface MappedExpressionEmitResult {
  readonly code: string;
  readonly span: TextSpan;
  readonly mappings: readonly SpanMapping[];
  readonly segments: readonly OverlayLambdaSegment[];
}

export interface SpanMapping {
  readonly source: SourceSpan;
  readonly target: TextSpan;
}

export interface PrintedExpressionLike {
  readonly code: string;
  readonly segments: readonly OverlayLambdaSegment[];
  readonly path?: string;
}

/**
 * Emit an expression to overlay-friendly code while preserving span projections.
 * This walker is self-contained and does not rely on string scanning to locate
 * the arrow body or member segments; callers can offset `mappings` as needed.
 */
export type MappableExpression = IsBindingBehavior | Interpolation;

export function emitMappedExpression(expr: MappableExpression): MappedExpressionEmitResult {
  const result = emitBindingBehavior(expr);
  return {
    ...result,
    span: { start: 0, end: result.code.length },
  };
}

/**
  * Adapter for plan.ts: produce a PrintedExpression-like shape from a mapped emit.
  * This lets plan swap to the span-aware emitter without reworking every call site.
  */
export function emitPrintedExpression(expr: IsBindingBehavior): PrintedExpressionLike | null {
  try {
    const emitted = emitMappedExpression(expr);
    const path = emitted.segments.length ? emitted.segments[emitted.segments.length - 1]!.path : undefined;
    return { code: emitted.code, segments: emitted.segments, ...(path ? { path } : {}) };
  } catch {
    return null;
  }
}

/* -----------------------------------------------------------------------------
 * Visitor: emit with span tracking
 * --------------------------------------------------------------------------- */

type EmitResult = {
  code: string;
  mappings: SpanMapping[];
  segments: OverlayLambdaSegment[];
  span: TextSpan;
};

function emitBindingBehavior(node: MappableExpression): EmitResult {
  switch (node.$kind) {
    case "BindingBehavior":
      return emitBindingBehaviorExpr(node);
    case "ValueConverter":
      return emitValueConverter(node);
    case "Assign":
      return emitAssign(node);
    case "Conditional":
      return emitConditional(node);
    case "AccessGlobal":
      return simpleToken(node, node.name);
    case "AccessThis":
      return simpleToken(node, ancestorChain(node.ancestor));
    case "AccessBoundary":
      return simpleToken(node, "o.$vm");
    case "AccessScope":
      return emitAccessScope(node);
    case "AccessMember":
      return emitAccessMember(node);
    case "AccessKeyed":
      return emitAccessKeyed(node);
    case "Paren":
      return emitParen(node);
    case "New":
      return emitNew(node);
    case "CallScope":
      return emitCallScope(node);
    case "CallMember":
      return emitCallMember(node);
    case "CallFunction":
      return emitCallFunction(node);
    case "CallGlobal":
      return emitCallGlobal(node);
    case "Binary":
      return emitBinary(node);
    case "Unary":
      return emitUnary(node);
    case "PrimitiveLiteral":
      return simpleToken(node, literalText(node));
    case "ArrayLiteral":
      return emitArray(node);
    case "ObjectLiteral":
      return emitObject(node);
    case "Template":
      return emitTemplate(node);
    case "TaggedTemplate":
      return emitTaggedTemplate(node);
    case "Interpolation":
      return emitInterpolation(node);
    case "DestructuringAssignment":
      return emitDestructuring(node);
    case "ArrowFunction":
      return emitArrow(node);
    case "BadExpression":
      return simpleToken(node, node.text ?? "");
    case "Custom":
      return simpleToken(node, "");
    default: {
      const _exhaustive: never = node;
      return simpleToken(node as BadExpression, "");
    }
  }
}

function emitBindingBehaviorExpr(node: BindingBehaviorExpression): EmitResult {
  const expr = emitBindingBehavior(node.expression);
  const args = emitArgsParts(node.args);
  const parts: (string | EmitResult)[] = [expr, " & ", node.name];
  if (args.length) parts.push(":", ...args);
  return combine(node, parts);
}

function emitValueConverter(node: ValueConverterExpression): EmitResult {
  const expr = emitBindingBehavior(node.expression);
  const args = emitArgsParts(node.args);
  const parts: (string | EmitResult)[] = [expr, " | ", node.name];
  if (args.length) parts.push(":", ...args);
  return combine(node, parts);
}

function emitAssign(node: AssignExpression): EmitResult {
  const target = emitBindingBehavior(node.target);
  const value = emitBindingBehavior(node.value);
  return combine(node, [target, ` ${node.op} `, value]);
}

function emitConditional(node: ConditionalExpression): EmitResult {
  const cond = emitBindingBehavior(node.condition);
  const yes = emitBindingBehavior(node.yes);
  const no = emitBindingBehavior(node.no);
  return combine(node, [cond, " ? ", yes, " : ", no]);
}

function emitAccessScope(node: AccessScopeExpression): EmitResult {
  const base = ancestorChain(node.ancestor);
  const code = node.name ? `${base}.${node.name}` : base;
  const pathBase = pathPrefix(node.ancestor);
  const path = node.name ? (pathBase ? `${pathBase}.${node.name}` : node.name) : pathBase || undefined;
  const segments: OverlayLambdaSegment[] = [];
  if (pathBase) {
    segments.push({ kind: "member", path: pathBase, span: spanFromBounds(2, base.length) });
  }
  if (node.name && path) {
    segments.push({
      kind: "member",
      path,
      span: spanFromBounds(base.length + 1, base.length + 1 + node.name.length),
    });
  }
  return combine(node, [code], segments);
}

function emitAccessMember(node: AccessMemberExpression): EmitResult {
  const obj = emitBindingBehavior(node.object);
  const head = `${obj.code}${node.optional ? "?." : "."}`;
  const memberStart = head.length;
  const memberSpan = spanFromBounds(memberStart, memberStart + node.name.length);
  const basePath = deepestPath(obj.segments);
  const path = basePath ? `${basePath}.${node.name}` : node.name;
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path, span: memberSpan }];
  return combine(node, [obj, head.slice(obj.code.length), node.name], segments);
}

function emitAccessKeyed(node: AccessKeyedExpression): EmitResult {
  const obj = emitBindingBehavior(node.object);
  const key = emitBindingBehavior(node.key);
  const head = `${obj.code}${node.optional ? "?." : ""}[`;
  const close = "]";
  const memberSpan = spanFromBounds(head.length, head.length + key.code.length);
  const keyPath = deepestPath(key.segments) ?? key.code;
  const basePath = deepestPath(obj.segments);
  const path = basePath ? `${basePath}.${keyPath}` : keyPath;
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path, span: memberSpan }];
  return combine(node, [obj, head.slice(obj.code.length), key, close], segments);
}

function emitParen(node: ParenExpression): EmitResult {
  const inner = emitBindingBehavior(node.expression);
  return combine(node, ["(", inner, ")"]);
}

function emitNew(node: NewExpression): EmitResult {
  const fn = emitBindingBehavior(node.func);
  const args = emitArgsParts(node.args);
  return combine(node, ["new ", fn, "(", ...args, ")"]);
}

function emitCallScope(node: CallScopeExpression): EmitResult {
  const base = ancestorChain(node.ancestor);
  const head = `${base}${node.optional ? "?." : "."}${node.name}`;
  const args = emitArgsParts(node.args);
  const path = ancestorPath(node.ancestor, node.name);
  const memberSpan = spanFromBounds(base.length + 1, base.length + 1 + node.name.length);
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path, span: memberSpan }];
  return combine(node, [head, "(", ...args, ")"], segments);
}

function emitCallMember(node: CallMemberExpression): EmitResult {
  const obj = emitBindingBehavior(node.object);
  const head = `${obj.code}${node.optionalMember ? "?." : "."}${node.name}${node.optionalCall ? "?." : ""}`;
  const args = emitArgsParts(node.args);
  const memberStart = obj.code.length + (node.optionalMember ? 2 : 1);
  const memberSpan = spanFromBounds(memberStart, memberStart + node.name.length);
  const basePath = lastPath(obj.segments);
  const path = basePath ? `${basePath}.${node.name}` : node.name;
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path, span: memberSpan }];
  return combine(node, [obj, head.slice(obj.code.length), "(", ...args, ")"], segments);
}

function emitCallFunction(node: CallFunctionExpression): EmitResult {
  const fn = emitBindingBehavior(node.func);
  const args = emitArgsParts(node.args);
  const path = lastPath(fn.segments);
  const segments: OverlayLambdaSegment[] = path ? [{ kind: "member", path, span: spanFromBounds(0, fn.code.length) }] : [];
  return combine(node, [fn, node.optional ? "?." : "", "(", ...args, ")"], segments);
}

function emitCallGlobal(node: CallGlobalExpression): EmitResult {
  const args = emitArgsParts(node.args);
  const memberSpan = spanFromBounds(0, node.name.length);
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path: node.name, span: memberSpan }];
  return combine(node, [node.name, "(", ...args, ")"], segments);
}

function emitBinary(node: BinaryExpression): EmitResult {
  const left = emitBindingBehavior(node.left);
  const right = emitBindingBehavior(node.right);
  return combine(node, [left, ` ${node.operation} `, right]);
}

function emitUnary(node: UnaryExpression): EmitResult {
  const expr = emitBindingBehavior(node.expression);
  return node.pos === 0
    ? combine(node, [node.operation, expr])
    : combine(node, [expr, node.operation]);
}

function emitArray(node: ArrayLiteralExpression): EmitResult {
  const parts: (string | EmitResult)[] = ["["];
  node.elements.forEach((el, idx) => {
    parts.push(emitBindingBehavior(el));
    if (idx < node.elements.length - 1) parts.push(", ");
  });
  parts.push("]");
  return combine(node, parts);
}

function emitObject(node: ObjectLiteralExpression): EmitResult {
  const parts: (string | EmitResult)[] = ["{"];
  node.values.forEach((val, idx) => {
    const key = node.keys[idx];
    parts.push(String(key), ": ", emitBindingBehavior(val));
    if (idx < node.values.length - 1) parts.push(", ");
  });
  parts.push("}");
  return combine(node, parts);
}

function emitTemplate(node: TemplateExpression): EmitResult {
  const parts: (string | EmitResult)[] = ["`"];
  node.cooked.forEach((part, idx) => {
    parts.push(part);
    const expr = node.expressions[idx];
    if (expr) {
      parts.push("${", emitBindingBehavior(expr), "}");
    }
  });
  parts.push("`");
  return combine(node, parts);
}

function emitTaggedTemplate(node: TaggedTemplateExpression): EmitResult {
  const fn = emitBindingBehavior(node.func);
  const tpl = emitTemplate({ $kind: "Template", span: node.span, cooked: node.cooked, expressions: node.expressions });
  return combine(node, [fn, tpl]);
}

function emitDestructuring(node: DestructuringAssignmentExpression): EmitResult {
  const pattern = emitBindingPattern(node.pattern);
  const source = emitBindingBehavior(node.source);
  return combine(node, [pattern, " = ", source], [...pattern.segments, ...source.segments]);
}

function emitInterpolation(node: Interpolation): EmitResult {
  const parts: (string | EmitResult)[] = [];
  for (let i = 0; i < node.parts.length; i += 1) {
    const cooked = node.parts[i] ?? "";
    if (cooked) parts.push(cooked);
    const expr = node.expressions[i];
    if (expr) {
      parts.push("${", emitBindingBehavior(expr), "}");
    }
  }
  const code = parts.length ? parts.map((p) => (typeof p === "string" ? p : "")).join("") : "";
  // Use combine to offset expression spans; start with accumulated strings first.
  return combine(node, parts.length ? parts : [code]);
}

function emitBindingPattern(node: BindingPattern): EmitResult {
  switch (node.$kind) {
    case "BindingIdentifier":
      return simpleToken(node, node.name);
    case "BindingPatternDefault": {
      const target = emitBindingPattern(node.target);
      const def = emitBindingBehavior(node.default);
      return combine(node, [target, " = ", def]);
    }
    case "BindingPatternHole":
      return simpleToken(node, "");
    case "ArrayBindingPattern": {
      const parts: (string | EmitResult)[] = ["["];
      node.elements.forEach((el, idx) => {
        parts.push(emitBindingPattern(el));
        if (idx < node.elements.length - 1) parts.push(", ");
      });
      if (node.rest) {
        if (node.elements.length) parts.push(", ");
        parts.push("...", emitBindingPattern(node.rest));
      }
      parts.push("]");
      return combine(node, parts);
    }
    case "ObjectBindingPattern": {
      const parts: (string | EmitResult)[] = ["{"];
      node.properties.forEach((prop, idx) => {
        parts.push(String(prop.key), ": ", emitBindingPattern(prop.value));
        if (idx < node.properties.length - 1) parts.push(", ");
      });
      if (node.rest) {
        if (node.properties.length) parts.push(", ");
        parts.push("...", emitBindingPattern(node.rest));
      }
      parts.push("}");
      return combine(node, parts);
    }
    default:
      return simpleToken(node as BadExpression, "");
  }
}

function emitArrow(node: ArrowFunction): EmitResult {
  const args = node.args.map((a) => a.name).join(", ");
  const body = emitBindingBehavior(node.body);
  return combine(node, [`(${args}) => `, body], body.segments);
}

function emitArgsParts(args: IsAssign[]): (string | EmitResult)[] {
  if (!args.length) return [];
  const parts: (string | EmitResult)[] = [];
  args.forEach((a, idx) => {
    if (idx > 0) parts.push(", ");
    parts.push(emitBindingBehavior(a));
  });
  return parts;
}

/* -----------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

function combine(node: { span: SourceSpan }, parts: (string | EmitResult)[], segments: OverlayLambdaSegment[] = []): EmitResult {
  let code = "";
  const mappings: SpanMapping[] = [];
  const mergedSegments: OverlayLambdaSegment[] = [...segments];

  for (const part of parts) {
    if (typeof part === "string") {
      code += part;
      continue;
    }
    const offset = code.length;
    code += part.code;
    for (const m of part.mappings) {
      mappings.push({
        source: m.source,
        target: shiftSpan(m.target, offset),
      });
    }
    for (const seg of part.segments) {
      mergedSegments.push({ ...seg, span: shiftSpan(seg.span, offset) });
    }
  }

  const span = { start: 0, end: code.length };
  mappings.push({ source: node.span, target: span });

  return { code, mappings, segments: mergedSegments, span };
}

function simpleToken(node: { span: SourceSpan }, text: string): EmitResult {
  const span = { start: 0, end: text.length };
  return {
    code: text,
    mappings: [{ source: node.span, target: span }],
    segments: [],
    span,
  };
}

function shiftSpan(span: TextSpan, by: number): TextSpan {
  return { start: span.start + by, end: span.end + by };
}

function spanFromBounds(start: number, end: number): TextSpan {
  return { start, end };
}

function literalText(node: PrimitiveLiteralExpression): string {
  if (node.value === null) return "null";
  if (node.value === undefined) return "undefined";
  if (typeof node.value === "string") return JSON.stringify(node.value);
  return String(node.value);
}

function ancestorChain(ancestor: number): string {
  if (ancestor <= 0) return "o";
  const parents = Array.from({ length: ancestor }, () => "$parent").join(".");
  return `o.${parents}`;
}

function ancestorPath(ancestor: number, name: string): string {
  const prefix = pathPrefix(ancestor);
  return prefix ? `${prefix}.${name}` : name;
}

function appendPath(segments: OverlayLambdaSegment[], tail: string): string {
  const last = segments[segments.length - 1];
  return last?.path ? `${last.path}.${tail}` : tail;
}

function lastPath(segments: readonly OverlayLambdaSegment[]): string | undefined {
  return segments.length ? segments[segments.length - 1]!.path : undefined;
}

function pathPrefix(ancestor: number): string {
  if (ancestor <= 0) return "";
  return Array.from({ length: ancestor }, () => "$parent").join(".");
}

function deepestPath(segments: readonly OverlayLambdaSegment[]): string | undefined {
  let best: string | undefined;
  for (const seg of segments) {
    if (!seg.path) continue;
    if (!best || seg.path.length > best.length) best = seg.path;
  }
  return best;
}
