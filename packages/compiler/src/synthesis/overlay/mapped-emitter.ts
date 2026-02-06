/**
 * TODO(mapped-emitter)
 * - Integrate into overlay plan (replace string printer) and have emit.ts only offset/prefix.
 * - Destructuring patterns: emit with full mappings (array/object/rest/defaults).
 * - JS mode: validate JSDoc wrapping shift with mappings/segments.
 * - Normalize mappings with files when wiring into plan artifacts; avoid double-normalizing later.
 */
import type {
  ArrayLiteralExpression,
  AssignExpression,
  BindingBehaviorExpression,
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  IsAssign,
  IsBindingBehavior,
  ObjectLiteralExpression,
  PrimitiveLiteralExpression,
  TaggedTemplateExpression,
  TemplateExpression,
  UnaryExpression,
  ValueConverterExpression,
  AccessScopeExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  ArrowFunction,
  BadExpression,
  ParenExpression,
  NewExpression,
  BinaryExpression,
  DestructuringAssignmentExpression,
  BindingPattern,
  Interpolation,
} from "../../model/ir.js";
import type { OverlayLambdaSegment } from "./types.js";
import { spanLength, type SourceSpan, type TextSpan } from "../../model/span.js";

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
      return simpleToken(node, node.name.name);
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
      // Parser recovery: keep overlay syntactically valid with a TS-safe placeholder
      // while still mapping the authored span for diagnostics.
      return badToken(node, "undefined/*bad*/");
    case "Custom":
      return simpleToken(node, "");
    default:
      return simpleToken(node, "");
  }
}

function emitBindingBehaviorExpr(node: BindingBehaviorExpression): EmitResult {
  const expr = emitBindingBehavior(node.expression);
  const args = emitArgsParts(node.args);
  const parts: (string | EmitResult)[] = ["__au_bb(", expr, ", ", JSON.stringify(node.name.name)];
  if (args.length) parts.push(", ", ...args);
  parts.push(")");
  return combine(node, parts);
}

function emitValueConverter(node: ValueConverterExpression): EmitResult {
  const expr = emitBindingBehavior(node.expression);
  const args = emitArgsParts(node.args);
  const parts: (string | EmitResult)[] = ["__au_vc(", expr, ", ", JSON.stringify(node.name.name)];
  if (args.length) parts.push(", ", ...args);
  parts.push(")");
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
  const code = node.name ? `${base}.${node.name.name}` : base;
  const pathBase = pathPrefix(node.ancestor);
  const path = node.name ? (pathBase ? `${pathBase}.${node.name.name}` : node.name.name) : pathBase || undefined;
  const segments: OverlayLambdaSegment[] = [];
  if (pathBase) {
    segments.push({ kind: "member", path: pathBase, span: spanFromBounds(2, base.length) });
  }
  if (node.name && path) {
    segments.push({
      kind: "member",
      path,
      span: spanFromBounds(base.length + 1, base.length + 1 + node.name.name.length),
    });
  }
  return combine(node, [code], segments);
}

function emitAccessMember(node: AccessMemberExpression): EmitResult {
  const obj = emitBindingBehavior(node.object);
  const dot = node.optional ? "?." : ".";
  const head = `${obj.code}${dot}`;
  // Include the dot in the member segment for symmetric mapping with HTML spans
  const memberStart = obj.code.length;
  const memberSpan = spanFromBounds(memberStart, head.length + node.name.name.length);
  const basePath = deepestPath(obj.segments);
  const path = basePath ? `${basePath}.${node.name.name}` : node.name.name;
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path, span: memberSpan }];
  return combine(node, [obj, dot, node.name.name], segments);
}

function emitAccessKeyed(node: AccessKeyedExpression): EmitResult {
  const obj = emitBindingBehavior(node.object);
  const key = emitBindingBehavior(node.key);
  const head = `${obj.code}${node.optional ? "?." : ""}[`;
  const close = "]";
  const memberSpan = spanFromBounds(head.length, head.length + key.code.length);
  const basePath = deepestPath(obj.segments);
  // Use bracket notation with JSON.stringify to match collectExprMemberSegments path format.
  // This ensures segment paths align for proper pairing in buildSegmentPairs.
  const keyText = key.code;
  const path = basePath ? `${basePath}[${JSON.stringify(keyText)}]` : `[${JSON.stringify(keyText)}]`;
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
  const dot = node.optional ? "?." : ".";
  const args = emitArgsParts(node.args);
  const path = ancestorPath(node.ancestor, node.name.name);
  // Include the dot in the member segment for symmetric mapping with HTML spans
  const memberSpan = spanFromBounds(base.length, base.length + dot.length + node.name.name.length);
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path, span: memberSpan }];
  return combine(node, [base, dot, node.name.name, "(", ...args, ")"], segments);
}

function emitCallMember(node: CallMemberExpression): EmitResult {
  const obj = emitBindingBehavior(node.object);
  const dot = node.optionalMember ? "?." : ".";
  const optCall = node.optionalCall ? "?." : "";
  const args = emitArgsParts(node.args);
  // Include the dot in the member segment for symmetric mapping with HTML spans
  const memberStart = obj.code.length;
  const memberEnd = obj.code.length + dot.length + node.name.name.length;
  const memberSpan = spanFromBounds(memberStart, memberEnd);
  const basePath = lastPath(obj.segments);
  const path = basePath ? `${basePath}.${node.name.name}` : node.name.name;
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path, span: memberSpan }];
  return combine(node, [obj, dot, node.name.name, optCall, "(", ...args, ")"], segments);
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
  const memberSpan = spanFromBounds(0, node.name.name.length);
  const segments: OverlayLambdaSegment[] = [{ kind: "member", path: node.name.name, span: memberSpan }];
  return combine(node, [node.name.name, "(", ...args, ")"], segments);
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
      return simpleToken(node, node.name.name);
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
      return simpleToken(node, "");
  }
}

function emitArrow(node: ArrowFunction): EmitResult {
  const args = node.args.map((a) => a.name.name).join(", ");
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

function badToken(node: BadExpression, text: string): EmitResult {
  const authoredLength = Math.max(0, spanLength(node.span));
  const padded = authoredLength > text.length ? text.padEnd(authoredLength, " ") : text;
  return simpleToken(node, padded);
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
