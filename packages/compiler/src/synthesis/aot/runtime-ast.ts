/* =============================================================================
 * Runtime AST - Compiler to Runtime Translation
 * -----------------------------------------------------------------------------
 * The compiler AST carries provenance (spans, Identifier nodes, Paren nodes).
 * The runtime AST is a compact, JSON-friendly shape used by AOT/SSR.
 *
 * This module defines runtime-compatible AST types and a conversion function
 * from compiler AST to runtime AST.
 * ============================================================================= */

import type {
  AnyBindingExpression,
  IsBindingBehavior,
  IsValueConverter,
  IsAssign,
  IsBinary,
  IsLeftHandSide,
  IsAssignable,
  BindingPattern,
  BindingIdentifier,
  ArrayBindingPattern,
  ObjectBindingPattern,
  ForOfStatement,
  Interpolation,
  Identifier,
  UnaryOperator,
  BinaryOperator,
  AssignmentOperator,
  SourceSpan,
} from "../../model/index.js";

/* =============================================================================
 * Runtime AST Types (shape-compatible with @aurelia/expression-parser)
 * ============================================================================= */

export type RuntimeAnyBindingExpression =
  | RuntimeInterpolation
  | RuntimeForOfStatement
  | RuntimeCustomExpression
  | RuntimeIsBindingBehavior;

export type RuntimeIsPrimary =
  | RuntimeAccessThisExpression
  | RuntimeAccessBoundaryExpression
  | RuntimeAccessScopeExpression
  | RuntimeAccessGlobalExpression
  | RuntimeArrayLiteralExpression
  | RuntimeObjectLiteralExpression
  | RuntimePrimitiveLiteralExpression
  | RuntimeTemplateExpression
  | RuntimeNewExpression;

export type RuntimeIsLeftHandSide =
  | RuntimeIsPrimary
  | RuntimeCallGlobalExpression
  | RuntimeCallFunctionExpression
  | RuntimeCallMemberExpression
  | RuntimeCallScopeExpression
  | RuntimeAccessMemberExpression
  | RuntimeAccessKeyedExpression
  | RuntimeTaggedTemplateExpression;

export type RuntimeIsUnary = RuntimeIsLeftHandSide | RuntimeUnaryExpression;
export type RuntimeIsBinary = RuntimeIsUnary | RuntimeBinaryExpression;
export type RuntimeIsConditional = RuntimeIsBinary | RuntimeConditionalExpression;
export type RuntimeIsAssign = RuntimeIsConditional | RuntimeAssignExpression | RuntimeArrowFunction;
export type RuntimeIsValueConverter = RuntimeIsAssign | RuntimeValueConverterExpression;
export type RuntimeIsBindingBehavior = RuntimeIsValueConverter | RuntimeBindingBehaviorExpression;
export type RuntimeIsAssignable =
  | RuntimeAccessScopeExpression
  | RuntimeAccessKeyedExpression
  | RuntimeAccessMemberExpression
  | RuntimeAssignExpression;

export type RuntimeBindingIdentifierOrPattern =
  | RuntimeBindingIdentifier
  | RuntimeArrayBindingPattern
  | RuntimeObjectBindingPattern;

interface RuntimeNodeSpan {
  span?: SourceSpan;
}

export interface RuntimeCustomExpression extends RuntimeNodeSpan {
  $kind: "Custom";
  value: unknown;
}

export interface RuntimeBindingBehaviorExpression extends RuntimeNodeSpan {
  $kind: "BindingBehavior";
  key: string;
  expression: RuntimeIsBindingBehavior;
  name: string;
  args: RuntimeIsAssign[];
}

export interface RuntimeValueConverterExpression extends RuntimeNodeSpan {
  $kind: "ValueConverter";
  expression: RuntimeIsValueConverter;
  name: string;
  args: RuntimeIsAssign[];
}

export interface RuntimeAssignExpression extends RuntimeNodeSpan {
  $kind: "Assign";
  target: RuntimeIsAssignable;
  value: RuntimeIsAssign;
  op: AssignmentOperator;
}

export interface RuntimeConditionalExpression extends RuntimeNodeSpan {
  $kind: "Conditional";
  condition: RuntimeIsBinary;
  yes: RuntimeIsAssign;
  no: RuntimeIsAssign;
}

export interface RuntimeAccessGlobalExpression extends RuntimeNodeSpan {
  $kind: "AccessGlobal";
  name: string;
}

export interface RuntimeAccessThisExpression extends RuntimeNodeSpan {
  $kind: "AccessThis";
  ancestor: number;
}

export interface RuntimeAccessBoundaryExpression extends RuntimeNodeSpan {
  $kind: "AccessBoundary";
}

export interface RuntimeAccessScopeExpression extends RuntimeNodeSpan {
  $kind: "AccessScope";
  name: string;
  ancestor: number;
}

export interface RuntimeAccessMemberExpression extends RuntimeNodeSpan {
  $kind: "AccessMember";
  accessGlobal: boolean;
  object: RuntimeIsLeftHandSide;
  name: string;
  optional: boolean;
}

export interface RuntimeAccessKeyedExpression extends RuntimeNodeSpan {
  $kind: "AccessKeyed";
  accessGlobal: boolean;
  object: RuntimeIsLeftHandSide;
  key: RuntimeIsAssign;
  optional: boolean;
}

export interface RuntimeNewExpression extends RuntimeNodeSpan {
  $kind: "New";
  func: RuntimeIsLeftHandSide;
  args: RuntimeIsAssign[];
}

export interface RuntimeCallScopeExpression extends RuntimeNodeSpan {
  $kind: "CallScope";
  name: string;
  args: RuntimeIsAssign[];
  ancestor: number;
  optional: boolean;
}

export interface RuntimeCallMemberExpression extends RuntimeNodeSpan {
  $kind: "CallMember";
  object: RuntimeIsLeftHandSide;
  name: string;
  args: RuntimeIsAssign[];
  optionalMember: boolean;
  optionalCall: boolean;
}

export interface RuntimeCallFunctionExpression extends RuntimeNodeSpan {
  $kind: "CallFunction";
  func: RuntimeIsLeftHandSide;
  args: RuntimeIsAssign[];
  optional: boolean;
}

export interface RuntimeCallGlobalExpression extends RuntimeNodeSpan {
  $kind: "CallGlobal";
  name: string;
  args: RuntimeIsAssign[];
}

export interface RuntimeBinaryExpression extends RuntimeNodeSpan {
  $kind: "Binary";
  operation: BinaryOperator;
  left: RuntimeIsBinary;
  right: RuntimeIsBinary;
}

export interface RuntimeUnaryExpression extends RuntimeNodeSpan {
  $kind: "Unary";
  operation: UnaryOperator;
  expression: RuntimeIsLeftHandSide;
  pos: 0 | 1;
}

export interface RuntimePrimitiveLiteralExpression extends RuntimeNodeSpan {
  $kind: "PrimitiveLiteral";
  value: null | undefined | number | boolean | string;
}

export interface RuntimeArrayLiteralExpression extends RuntimeNodeSpan {
  $kind: "ArrayLiteral";
  elements: RuntimeIsAssign[];
}

export interface RuntimeObjectLiteralExpression extends RuntimeNodeSpan {
  $kind: "ObjectLiteral";
  keys: (number | string)[];
  values: RuntimeIsAssign[];
}

export interface RuntimeTemplateExpression extends RuntimeNodeSpan {
  $kind: "Template";
  cooked: string[];
  expressions: RuntimeIsAssign[];
}

export interface RuntimeTaggedTemplateExpression extends RuntimeNodeSpan {
  $kind: "TaggedTemplate";
  cooked: (string[] & { raw?: string[] });
  func: RuntimeIsLeftHandSide;
  expressions: RuntimeIsAssign[];
}

export interface RuntimeArrayBindingPattern extends RuntimeNodeSpan {
  $kind: "ArrayBindingPattern";
  elements: RuntimeIsAssign[];
}

export interface RuntimeObjectBindingPattern extends RuntimeNodeSpan {
  $kind: "ObjectBindingPattern";
  keys: (string | number)[];
  values: RuntimeIsAssign[];
}

export interface RuntimeBindingIdentifier extends RuntimeNodeSpan {
  $kind: "BindingIdentifier";
  name: string;
}

export interface RuntimeForOfStatement extends RuntimeNodeSpan {
  $kind: "ForOfStatement";
  declaration: RuntimeBindingIdentifierOrPattern | RuntimeDestructuringAssignmentExpression;
  iterable: RuntimeIsBindingBehavior;
  semiIdx: number;
}

export interface RuntimeInterpolation extends RuntimeNodeSpan {
  $kind: "Interpolation";
  isMulti: boolean;
  firstExpression: RuntimeIsBindingBehavior;
  parts: string[];
  expressions: RuntimeIsBindingBehavior[];
}

export interface RuntimeDestructuringAssignmentExpression extends RuntimeNodeSpan {
  $kind: "ArrayDestructuring" | "ObjectDestructuring";
  list: RuntimeDestructuringAssignmentItem[];
  source: RuntimeAccessMemberExpression | RuntimeAccessKeyedExpression | undefined;
  initializer: RuntimeIsBindingBehavior | undefined;
}

export type RuntimeDestructuringAssignmentItem =
  | RuntimeDestructuringAssignmentExpression
  | RuntimeDestructuringAssignmentSingleExpression
  | RuntimeDestructuringAssignmentRestExpression;

export interface RuntimeDestructuringAssignmentSingleExpression extends RuntimeNodeSpan {
  $kind: "DestructuringAssignmentLeaf";
  target: RuntimeAccessMemberExpression;
  source: RuntimeAccessMemberExpression | RuntimeAccessKeyedExpression;
  initializer: RuntimeIsBindingBehavior | undefined;
}

export interface RuntimeDestructuringAssignmentRestExpression extends RuntimeNodeSpan {
  $kind: "DestructuringAssignmentLeaf";
  target: RuntimeAccessMemberExpression;
  indexOrProperties: string[] | number;
}

export interface RuntimeArrowFunction extends RuntimeNodeSpan {
  $kind: "ArrowFunction";
  args: RuntimeBindingIdentifier[];
  body: RuntimeIsAssign;
  rest: boolean;
}

/* =============================================================================
 * Conversion
 * ============================================================================= */

const identifierRegex = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function withSpan<T>(
  node: T,
  span: SourceSpan | null | undefined,
  includeSpans: boolean,
): T & RuntimeNodeSpan {
  if (!includeSpans || !span) return node as T & RuntimeNodeSpan;
  return { ...(node as T & RuntimeNodeSpan), span };
}

function unsupportedExpression(kind: string): never {
  throw new Error(`AOT emission does not support ${kind}.`);
}

export function toRuntimeExpression(
  ast: AnyBindingExpression,
  options?: { includeSpans?: boolean },
): RuntimeAnyBindingExpression {
  const includeSpans = options?.includeSpans ?? false;
  switch (ast.$kind) {
    case "Interpolation":
      return toRuntimeInterpolation(ast, includeSpans);
    case "ForOfStatement":
      return toRuntimeForOf(ast, includeSpans);
    case "Custom":
      return unsupportedExpression("CustomExpression");
    case "BadExpression":
      return unsupportedExpression("BadExpression");
    default:
      return toRuntimeIsBindingBehavior(ast as IsBindingBehavior, includeSpans);
  }
}

function toRuntimeInterpolation(ast: Interpolation, includeSpans: boolean): RuntimeInterpolation {
  const expressions = ast.expressions.map((expr) => toRuntimeIsBindingBehavior(expr, includeSpans));
  const firstExpression = expressions[0] ?? (createPrimitiveLiteral(undefined, includeSpans) as RuntimeIsBindingBehavior);
  return withSpan({
    $kind: "Interpolation",
    isMulti: expressions.length > 1,
    firstExpression,
    parts: ast.parts.slice(),
    expressions,
  }, ast.span, includeSpans);
}

function toRuntimeForOf(ast: ForOfStatement, includeSpans: boolean): RuntimeForOfStatement {
  return withSpan({
    $kind: "ForOfStatement",
    declaration: toRuntimeForDeclaration(ast.declaration, includeSpans),
    iterable: toRuntimeIsBindingBehavior(ast.iterable, includeSpans),
    semiIdx: ast.semiIdx,
  }, ast.span, includeSpans);
}

function toRuntimeForDeclaration(
  ast: BindingPattern,
  includeSpans: boolean,
): RuntimeBindingIdentifierOrPattern | RuntimeDestructuringAssignmentExpression {
  switch (ast.$kind) {
    case "BindingIdentifier":
      return toRuntimeBindingIdentifier(ast, includeSpans);
    case "ArrayBindingPattern":
      return toRuntimeArrayDestructuring(ast, includeSpans);
    case "ObjectBindingPattern":
      return toRuntimeObjectDestructuring(ast, includeSpans);
    default:
      throw new Error(`Unsupported for-of declaration kind: ${ast.$kind}`);
  }
}

function toRuntimeBindingIdentifier(ast: BindingIdentifier, includeSpans: boolean): RuntimeBindingIdentifier {
  return withSpan({ $kind: "BindingIdentifier", name: ast.name.name }, ast.span, includeSpans);
}

function toRuntimeIsBindingBehavior(ast: IsBindingBehavior, includeSpans: boolean): RuntimeIsBindingBehavior {
  return toRuntimeNode(ast, includeSpans) as RuntimeIsBindingBehavior;
}

function toRuntimeIsValueConverter(ast: IsValueConverter, includeSpans: boolean): RuntimeIsValueConverter {
  return toRuntimeNode(ast, includeSpans) as RuntimeIsValueConverter;
}

function toRuntimeIsAssign(ast: IsAssign, includeSpans: boolean): RuntimeIsAssign {
  return toRuntimeNode(ast, includeSpans) as RuntimeIsAssign;
}

function toRuntimeIsBinary(ast: IsBinary, includeSpans: boolean): RuntimeIsBinary {
  return toRuntimeNode(ast, includeSpans) as RuntimeIsBinary;
}

function toRuntimeIsLeftHandSide(ast: IsLeftHandSide, includeSpans: boolean): RuntimeIsLeftHandSide {
  return toRuntimeNode(ast, includeSpans) as RuntimeIsLeftHandSide;
}

function toRuntimeIsAssignable(ast: IsAssignable, includeSpans: boolean): RuntimeIsAssignable {
  return toRuntimeNode(ast, includeSpans) as RuntimeIsAssignable;
}

function toRuntimeNode(
  ast: AnyBindingExpression | IsAssign | IsBindingBehavior,
  includeSpans: boolean,
): RuntimeAnyBindingExpression | RuntimeIsAssign {
  switch (ast.$kind) {
    case "BindingBehavior":
      return withSpan({
        $kind: "BindingBehavior",
        key: `_bb_${ast.name.name}`,
        expression: toRuntimeIsBindingBehavior(ast.expression, includeSpans),
        name: ast.name.name,
        args: ast.args.map((arg) => toRuntimeIsAssign(arg, includeSpans)),
      }, ast.span, includeSpans);
    case "ValueConverter":
      return withSpan({
        $kind: "ValueConverter",
        expression: toRuntimeIsValueConverter(ast.expression, includeSpans),
        name: ast.name.name,
        args: ast.args.map((arg) => toRuntimeIsAssign(arg, includeSpans)),
      }, ast.span, includeSpans);
    case "Assign":
      return withSpan({
        $kind: "Assign",
        target: toRuntimeIsAssignable(ast.target, includeSpans),
        value: toRuntimeIsAssign(ast.value, includeSpans),
        op: ast.op,
      }, ast.span, includeSpans);
    case "Conditional":
      return withSpan({
        $kind: "Conditional",
        condition: toRuntimeIsBinary(ast.condition, includeSpans),
        yes: toRuntimeIsAssign(ast.yes, includeSpans),
        no: toRuntimeIsAssign(ast.no, includeSpans),
      }, ast.span, includeSpans);
    case "AccessGlobal":
      return withSpan({ $kind: "AccessGlobal", name: ast.name.name }, ast.span, includeSpans);
    case "AccessThis":
      return withSpan({ $kind: "AccessThis", ancestor: ast.ancestor }, ast.span, includeSpans);
    case "AccessBoundary":
      return withSpan({ $kind: "AccessBoundary" }, ast.span, includeSpans);
    case "AccessScope":
      return withSpan({
        $kind: "AccessScope",
        name: ast.name.name,
        ancestor: ast.ancestor,
      }, ast.span, includeSpans);
    case "AccessMember": {
      const object = toRuntimeIsLeftHandSide(ast.object, includeSpans);
      return withSpan({
        $kind: "AccessMember",
        accessGlobal: isAccessGlobal(object),
        object,
        name: ast.name.name,
        optional: ast.optional,
      }, ast.span, includeSpans);
    }
    case "AccessKeyed": {
      const object = toRuntimeIsLeftHandSide(ast.object, includeSpans);
      return withSpan({
        $kind: "AccessKeyed",
        accessGlobal: isAccessGlobal(object),
        object,
        key: toRuntimeIsAssign(ast.key, includeSpans),
        optional: ast.optional,
      }, ast.span, includeSpans);
    }
    case "New":
      return withSpan({
        $kind: "New",
        func: toRuntimeIsLeftHandSide(ast.func, includeSpans),
        args: ast.args.map((arg) => toRuntimeIsAssign(arg, includeSpans)),
      }, ast.span, includeSpans);
    case "CallScope":
      return withSpan({
        $kind: "CallScope",
        name: ast.name.name,
        args: ast.args.map((arg) => toRuntimeIsAssign(arg, includeSpans)),
        ancestor: ast.ancestor,
        optional: ast.optional,
      }, ast.span, includeSpans);
    case "CallMember":
      return withSpan({
        $kind: "CallMember",
        object: toRuntimeIsLeftHandSide(ast.object, includeSpans),
        name: ast.name.name,
        args: ast.args.map((arg) => toRuntimeIsAssign(arg, includeSpans)),
        optionalMember: ast.optionalMember,
        optionalCall: ast.optionalCall,
      }, ast.span, includeSpans);
    case "CallFunction":
      return withSpan({
        $kind: "CallFunction",
        func: toRuntimeIsLeftHandSide(ast.func, includeSpans),
        args: ast.args.map((arg) => toRuntimeIsAssign(arg, includeSpans)),
        optional: ast.optional,
      }, ast.span, includeSpans);
    case "CallGlobal":
      return withSpan({
        $kind: "CallGlobal",
        name: ast.name.name,
        args: ast.args.map((arg) => toRuntimeIsAssign(arg, includeSpans)),
      }, ast.span, includeSpans);
    case "Binary":
      return withSpan({
        $kind: "Binary",
        operation: ast.operation,
        left: toRuntimeIsBinary(ast.left, includeSpans),
        right: toRuntimeIsBinary(ast.right, includeSpans),
      }, ast.span, includeSpans);
    case "Unary":
      return withSpan({
        $kind: "Unary",
        operation: ast.operation,
        expression: toRuntimeIsLeftHandSide(ast.expression as IsLeftHandSide, includeSpans),
        pos: ast.pos,
      }, ast.span, includeSpans);
    case "PrimitiveLiteral":
      return createPrimitiveLiteral(ast.value, includeSpans, ast.span);
    case "ArrayLiteral":
      return withSpan({
        $kind: "ArrayLiteral",
        elements: ast.elements.map((el) => toRuntimeIsAssign(el, includeSpans)),
      }, ast.span, includeSpans);
    case "ObjectLiteral":
      return withSpan({
        $kind: "ObjectLiteral",
        keys: ast.keys.slice(),
        values: ast.values.map((val) => toRuntimeIsAssign(val, includeSpans)),
      }, ast.span, includeSpans);
    case "Template":
      return withSpan({
        $kind: "Template",
        cooked: ast.cooked.slice(),
        expressions: ast.expressions.map((expr) => toRuntimeIsAssign(expr, includeSpans)),
      }, ast.span, includeSpans);
    case "TaggedTemplate":
      return withSpan({
        $kind: "TaggedTemplate",
        cooked: copyCooked(ast.cooked),
        func: toRuntimeIsLeftHandSide(ast.func, includeSpans),
        expressions: ast.expressions.map((expr) => toRuntimeIsAssign(expr, includeSpans)),
      }, ast.span, includeSpans);
    case "ArrowFunction":
      return withSpan({
        $kind: "ArrowFunction",
        args: ast.args.map((arg) => toRuntimeBindingIdentifier(arg, includeSpans)),
        body: toRuntimeIsAssign(ast.body, includeSpans),
        rest: ast.rest,
      }, ast.span, includeSpans);
    case "Interpolation":
      return toRuntimeInterpolation(ast, includeSpans);
    case "ForOfStatement":
      return toRuntimeForOf(ast, includeSpans);
    case "Paren":
      return toRuntimeIsAssign(ast.expression, includeSpans);
    case "BadExpression":
      return unsupportedExpression("BadExpression");
    case "Custom":
      return unsupportedExpression("CustomExpression");
    case "DestructuringAssignment":
      return unsupportedExpression("DestructuringAssignment");
    default: {
      const _exhaustive: never = ast;
      return createPrimitiveLiteral(undefined, includeSpans);
    }
  }
}

function createPrimitiveLiteral(
  value: null | undefined | number | boolean | string,
  includeSpans: boolean,
  span?: SourceSpan | null,
): RuntimePrimitiveLiteralExpression {
  return withSpan({ $kind: "PrimitiveLiteral", value }, span, includeSpans);
}

function copyCooked(
  cooked: (string[] & { raw?: string[] }),
): string[] & { raw?: string[] } {
  const next = cooked.slice() as string[] & { raw?: string[] };
  if (Array.isArray(cooked.raw)) {
    next.raw = cooked.raw.slice();
  }
  return next;
}

function isAccessGlobal(ast: RuntimeIsLeftHandSide): boolean {
  return ast.$kind === "AccessGlobal"
    || ((ast.$kind === "AccessMember" || ast.$kind === "AccessKeyed") && ast.accessGlobal);
}

function toRuntimeArrayDestructuring(
  pattern: ArrayBindingPattern,
  includeSpans: boolean,
  source?: RuntimeAccessMemberExpression | RuntimeAccessKeyedExpression,
  initializer?: RuntimeIsBindingBehavior,
): RuntimeDestructuringAssignmentExpression {
  const list: RuntimeDestructuringAssignmentItem[] = [];
  let index = 0;

  for (const element of pattern.elements) {
    if (element.$kind === "BindingPatternHole") {
      index += 1;
      continue;
    }

    const item = buildDestructuringItem(
      element,
      createArraySource(index, includeSpans),
      undefined,
      includeSpans,
    );
    if (item) {
      list.push(item);
    }
    index += 1;
  }

  if (pattern.rest) {
    const target = toRuntimeRestTarget(pattern.rest);
    if (target) {
      list.push(withSpan({
        $kind: "DestructuringAssignmentLeaf",
        target,
        indexOrProperties: index,
      }, pattern.rest.span, includeSpans));
    }
  }

  return withSpan({
    $kind: "ArrayDestructuring",
    list,
    source,
    initializer,
  }, pattern.span, includeSpans);
}

function toRuntimeObjectDestructuring(
  pattern: ObjectBindingPattern,
  includeSpans: boolean,
  source?: RuntimeAccessMemberExpression | RuntimeAccessKeyedExpression,
  initializer?: RuntimeIsBindingBehavior,
): RuntimeDestructuringAssignmentExpression {
  const list: RuntimeDestructuringAssignmentItem[] = [];

  for (const prop of pattern.properties) {
    const item = buildDestructuringItem(
      prop.value,
      createObjectSource(prop.key, includeSpans),
      undefined,
      includeSpans,
    );
    if (item) {
      list.push(item);
    }
  }

  if (pattern.rest) {
    const target = toRuntimeRestTarget(pattern.rest);
    if (target) {
      list.push(withSpan({
        $kind: "DestructuringAssignmentLeaf",
        target,
        indexOrProperties: pattern.properties.map((prop) => String(prop.key)),
      }, pattern.rest.span, includeSpans));
    }
  }

  return withSpan({
    $kind: "ObjectDestructuring",
    list,
    source,
    initializer,
  }, pattern.span, includeSpans);
}

function buildDestructuringItem(
  pattern: BindingPattern,
  source: RuntimeAccessMemberExpression | RuntimeAccessKeyedExpression,
  initializer: RuntimeIsBindingBehavior | undefined,
  includeSpans: boolean,
): RuntimeDestructuringAssignmentItem | null {
  switch (pattern.$kind) {
    case "BindingIdentifier":
      return withSpan({
        $kind: "DestructuringAssignmentLeaf",
        target: createTarget(pattern.name),
        source,
        initializer,
      }, pattern.span, includeSpans);
    case "BindingPatternDefault": {
      const nextInitializer = toRuntimeIsAssign(pattern.default, includeSpans) as RuntimeIsBindingBehavior;
      return buildDestructuringItem(pattern.target, source, nextInitializer, includeSpans);
    }
    case "ArrayBindingPattern":
      return toRuntimeArrayDestructuring(pattern, includeSpans, source, initializer);
    case "ObjectBindingPattern":
      return toRuntimeObjectDestructuring(pattern, includeSpans, source, initializer);
    case "BindingPatternHole":
    case "BadExpression":
      return null;
    default:
      return null;
  }
}

function createTarget(identifier: Identifier): RuntimeAccessMemberExpression {
  return createAccessMember(createAccessThis(), identifier.name, false);
}

function createArraySource(index: number, includeSpans: boolean): RuntimeAccessKeyedExpression {
  return createAccessKeyed(
    createAccessThis(),
    createPrimitiveLiteral(index, includeSpans),
    false,
  );
}

function createObjectSource(
  key: string | number,
  includeSpans: boolean,
): RuntimeAccessMemberExpression | RuntimeAccessKeyedExpression {
  if (typeof key === "number") {
    return createAccessKeyed(createAccessThis(), createPrimitiveLiteral(key, includeSpans), false);
  }
  if (identifierRegex.test(key)) {
    return createAccessMember(createAccessThis(), key, false);
  }
  return createAccessKeyed(createAccessThis(), createPrimitiveLiteral(key, includeSpans), false);
}

function toRuntimeRestTarget(
  pattern: BindingPattern,
): RuntimeAccessMemberExpression | null {
  if (pattern.$kind !== "BindingIdentifier") {
    return null;
  }
  return createTarget(pattern.name);
}

function createAccessThis(): RuntimeAccessThisExpression {
  return { $kind: "AccessThis", ancestor: 0 };
}

function createAccessMember(
  object: RuntimeIsLeftHandSide,
  name: string,
  optional: boolean,
): RuntimeAccessMemberExpression {
  return {
    $kind: "AccessMember",
    accessGlobal: isAccessGlobal(object),
    object,
    name,
    optional,
  };
}

function createAccessKeyed(
  object: RuntimeIsLeftHandSide,
  key: RuntimeIsAssign,
  optional: boolean,
): RuntimeAccessKeyedExpression {
  return {
    $kind: "AccessKeyed",
    accessGlobal: isAccessGlobal(object),
    object,
    key,
    optional,
  };
}
