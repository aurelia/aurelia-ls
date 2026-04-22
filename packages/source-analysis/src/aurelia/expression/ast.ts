import type { SourceFileRef } from "../refs.js";

// Keep span carriers method-free so they stay cheap, structurally friendly,
// and easy to pass through parser-local helper layers without extra wrappers.
export class TextSpan {
  constructor(
    readonly start: number,
    readonly end: number,
  ) {}
}

export class SourceSpan {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly file?: SourceFileRef | null,
  ) {}
}

export type SpanLike = TextSpan | SourceSpan;

function hasSourceSpanFileSlot(span: SpanLike): span is SourceSpan {
  return span instanceof SourceSpan
    || Object.prototype.hasOwnProperty.call(span, 'file');
}

function recreateSpanLike<TSpan extends SpanLike>(
  span: TSpan,
  start: number,
  end: number,
): TSpan {
  return (
    hasSourceSpanFileSlot(span)
      ? new SourceSpan(start, end, span.file ?? null)
      : new TextSpan(start, end)
  ) as TSpan;
}

export function normalizeSpan(span: SourceSpan): SourceSpan;
export function normalizeSpan(span: TextSpan): TextSpan;

export function normalizeSpan<TSpan extends SpanLike>(
  span: TSpan,
): TSpan {
  if (span.start <= span.end) {
    return span;
  }

  return recreateSpanLike(span, span.end, span.start);
}

export function spanFromBounds(
  start: number,
  end: number,
): TextSpan {
  return start <= end
    ? new TextSpan(start, end)
    : new TextSpan(end, start);
}

export function sourceSpanFromBounds(
  start: number,
  end: number,
  file: SourceFileRef | null = null,
): SourceSpan {
  return start <= end
    ? new SourceSpan(start, end, file)
    : new SourceSpan(end, start, file);
}

export function offsetSpan(span: SourceSpan, delta: number): SourceSpan;
export function offsetSpan(span: TextSpan, delta: number): TextSpan;

export function offsetSpan<TSpan extends SpanLike>(
  span: TSpan,
  delta: number,
): TSpan {
  if (delta === 0) {
    return span;
  }

  return recreateSpanLike(
    span,
    span.start + delta,
    span.end + delta,
  );
}

export function absoluteSpan(
  relative: TextSpan | null | undefined,
  base: SourceSpan | null | undefined,
): SourceSpan | null {
  if (relative == null || base == null) {
    return null;
  }

  const start = base.start + relative.start;
  const end = base.start + relative.end;
  return sourceSpanFromBounds(start, end, base.file ?? null);
}

export function ensureSpanFile(
  span: SourceSpan | null | undefined,
  file: SourceFileRef | null | undefined,
): SourceSpan | null {
  if (span == null) {
    return null;
  }

  if (span.file != null || file == null) {
    return normalizeSpan(span);
  }

  return sourceSpanFromBounds(span.start, span.end, file);
}

export type UnaryOperator = 'void' | 'typeof' | '!' | '-' | '+' | '++' | '--';
export type BinaryOperator =
  | '??'
  | '&&'
  | '||'
  | '=='
  | '==='
  | '!='
  | '!=='
  | 'instanceof'
  | 'in'
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '**'
  | '<'
  | '>'
  | '<='
  | '>=';
export type AssignmentOperator = '=' | '/=' | '*=' | '+=' | '-=';

abstract class ExpressionNodeBase {
  constructor(
    public span: SourceSpan,
  ) {}
}

export class Identifier extends ExpressionNodeBase {
  readonly $kind = 'Identifier' as const;

  constructor(
    span: SourceSpan,
    readonly name: string,
  ) {
    super(span);
  }
}

export class BindingBehaviorExpression extends ExpressionNodeBase {
  readonly $kind = 'BindingBehavior' as const;
  readonly key: string;

  constructor(
    span: SourceSpan,
    readonly expression: IsBindingBehavior,
    readonly name: Identifier,
    readonly args: IsAssign[],
  ) {
    super(span);
    this.key = `_bb_${name.name}`;
  }
}

export class ValueConverterExpression extends ExpressionNodeBase {
  readonly $kind = 'ValueConverter' as const;

  constructor(
    span: SourceSpan,
    readonly expression: IsValueConverter,
    readonly name: Identifier,
    readonly args: IsAssign[],
  ) {
    super(span);
  }
}

export class AssignExpression extends ExpressionNodeBase {
  readonly $kind = 'Assign' as const;

  constructor(
    span: SourceSpan,
    readonly target: IsAssignable,
    readonly value: IsAssign,
    readonly op: AssignmentOperator,
  ) {
    super(span);
  }
}

export class ConditionalExpression extends ExpressionNodeBase {
  readonly $kind = 'Conditional' as const;

  constructor(
    span: SourceSpan,
    readonly condition: IsBinary,
    readonly yes: IsAssign,
    readonly no: IsAssign,
  ) {
    super(span);
  }
}

export class AccessGlobalExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessGlobal' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
  ) {
    super(span);
  }
}

export class AccessThisExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessThis' as const;

  constructor(
    span: SourceSpan,
    readonly ancestor: number,
  ) {
    super(span);
  }
}

export class AccessBoundaryExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessBoundary' as const;
}

export class AccessScopeExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessScope' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
    readonly ancestor: number,
  ) {
    super(span);
  }
}

function isGlobalAccessRoot(expression: IsLeftHandSide): boolean {
  return expression.$kind === 'AccessGlobal'
    || ((expression.$kind === 'AccessMember' || expression.$kind === 'AccessKeyed')
      && expression.accessGlobal);
}

export class AccessMemberExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessMember' as const;
  readonly accessGlobal: boolean;

  constructor(
    span: SourceSpan,
    readonly object: IsLeftHandSide,
    readonly name: Identifier,
    readonly optional: boolean,
  ) {
    super(span);
    this.accessGlobal = isGlobalAccessRoot(object);
  }
}

export class AccessKeyedExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessKeyed' as const;
  readonly accessGlobal: boolean;

  constructor(
    span: SourceSpan,
    readonly object: IsLeftHandSide,
    readonly key: IsAssign,
    readonly optional: boolean,
  ) {
    super(span);
    this.accessGlobal = isGlobalAccessRoot(object);
  }
}

export class ParenExpression extends ExpressionNodeBase {
  readonly $kind = 'Paren' as const;

  constructor(
    span: SourceSpan,
    readonly expression: IsAssign,
  ) {
    super(span);
  }
}

export class NewExpression extends ExpressionNodeBase {
  readonly $kind = 'New' as const;

  constructor(
    span: SourceSpan,
    readonly func: IsLeftHandSide,
    readonly args: IsAssign[],
  ) {
    super(span);
  }
}

export class CallScopeExpression extends ExpressionNodeBase {
  readonly $kind = 'CallScope' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
    readonly args: IsAssign[],
    readonly ancestor: number,
    readonly optional: boolean,
  ) {
    super(span);
  }
}

export class CallMemberExpression extends ExpressionNodeBase {
  readonly $kind = 'CallMember' as const;

  constructor(
    span: SourceSpan,
    readonly object: IsLeftHandSide,
    readonly name: Identifier,
    readonly args: IsAssign[],
    readonly optionalMember: boolean,
    readonly optionalCall: boolean,
  ) {
    super(span);
  }
}

export class CallFunctionExpression extends ExpressionNodeBase {
  readonly $kind = 'CallFunction' as const;

  constructor(
    span: SourceSpan,
    readonly func: IsLeftHandSide,
    readonly args: IsAssign[],
    readonly optional: boolean,
  ) {
    super(span);
  }
}

export class CallGlobalExpression extends ExpressionNodeBase {
  readonly $kind = 'CallGlobal' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
    readonly args: IsAssign[],
  ) {
    super(span);
  }
}

export class BinaryExpression extends ExpressionNodeBase {
  readonly $kind = 'Binary' as const;

  constructor(
    span: SourceSpan,
    readonly operation: BinaryOperator,
    readonly left: IsBinary,
    readonly right: IsBinary,
  ) {
    super(span);
  }
}

export class UnaryExpression extends ExpressionNodeBase {
  readonly $kind = 'Unary' as const;

  constructor(
    span: SourceSpan,
    readonly operation: UnaryOperator,
    readonly expression: IsUnary,
    readonly pos: 0 | 1,
  ) {
    super(span);
  }
}

export class PrimitiveLiteralExpression extends ExpressionNodeBase {
  readonly $kind = 'PrimitiveLiteral' as const;

  constructor(
    span: SourceSpan,
    readonly value: null | undefined | number | boolean | string,
  ) {
    super(span);
  }
}

export class ArrayLiteralExpression extends ExpressionNodeBase {
  readonly $kind = 'ArrayLiteral' as const;

  constructor(
    span: SourceSpan,
    readonly elements: IsAssign[],
  ) {
    super(span);
  }
}

export class ObjectLiteralExpression extends ExpressionNodeBase {
  readonly $kind = 'ObjectLiteral' as const;

  constructor(
    span: SourceSpan,
    readonly keys: (number | string)[],
    readonly values: IsAssign[],
  ) {
    super(span);
  }
}

export class TemplateExpression extends ExpressionNodeBase {
  readonly $kind = 'Template' as const;

  constructor(
    span: SourceSpan,
    readonly cooked: string[],
    readonly expressions: IsAssign[],
  ) {
    super(span);
  }
}

export class TaggedTemplateExpression extends ExpressionNodeBase {
  readonly $kind = 'TaggedTemplate' as const;

  constructor(
    span: SourceSpan,
    readonly cooked: string[] & { raw?: string[] },
    readonly func: IsLeftHandSide,
    readonly expressions: IsAssign[],
  ) {
    super(span);
  }
}

export class BindingIdentifier extends ExpressionNodeBase {
  readonly $kind = 'BindingIdentifier' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
  ) {
    super(span);
  }
}

export class ForOfStatement extends ExpressionNodeBase {
  readonly $kind = 'ForOfStatement' as const;

  constructor(
    span: SourceSpan,
    readonly declaration: BindingIdentifierOrPattern,
    readonly iterable: IsBindingBehavior,
    readonly semiIdx: number,
  ) {
    super(span);
  }
}

export class Interpolation extends ExpressionNodeBase {
  readonly $kind = 'Interpolation' as const;
  readonly isMulti: boolean;
  readonly firstExpression: IsBindingBehavior;

  constructor(
    span: SourceSpan,
    readonly parts: string[],
    readonly expressions: IsBindingBehavior[],
  ) {
    super(span);
    this.isMulti = expressions.length > 1;
    this.firstExpression = expressions[0]!;
  }
}

export class BindingPatternDefault extends ExpressionNodeBase {
  readonly $kind = 'BindingPatternDefault' as const;
  readonly default: IsAssign;

  constructor(
    span: SourceSpan,
    readonly target: BindingPattern,
    defaultValue: IsAssign,
  ) {
    super(span);
    this.default = defaultValue;
  }
}

export class BindingPatternHole extends ExpressionNodeBase {
  readonly $kind = 'BindingPatternHole' as const;
}

export class ArrayBindingPattern extends ExpressionNodeBase {
  readonly $kind = 'ArrayBindingPattern' as const;

  constructor(
    span: SourceSpan,
    readonly elements: BindingPattern[],
    readonly rest: BindingPattern | null = null,
  ) {
    super(span);
  }
}

export class ObjectBindingPatternProperty {
  constructor(
    readonly key: string | number,
    readonly value: BindingPattern,
  ) {}
}

export class ObjectBindingPattern extends ExpressionNodeBase {
  readonly $kind = 'ObjectBindingPattern' as const;

  constructor(
    span: SourceSpan,
    readonly properties: ObjectBindingPatternProperty[],
    readonly rest: BindingPattern | null = null,
  ) {
    super(span);
  }
}

export class DestructuringAssignmentExpression extends ExpressionNodeBase {
  readonly $kind = 'DestructuringAssignment' as const;

  constructor(
    span: SourceSpan,
    readonly pattern: BindingPattern,
    readonly source: IsAssign,
  ) {
    super(span);
  }
}

export class ArrowFunction extends ExpressionNodeBase {
  readonly $kind = 'ArrowFunction' as const;

  constructor(
    span: SourceSpan,
    readonly args: BindingIdentifier[],
    readonly body: IsAssign,
    readonly rest: boolean,
  ) {
    super(span);
  }
}

export class CustomExpression extends ExpressionNodeBase {
  readonly $kind = 'Custom' as const;

  constructor(
    span: SourceSpan,
    readonly value: unknown,
  ) {
    super(span);
  }
}

export type IsPrimary =
  | AccessThisExpression
  | AccessBoundaryExpression
  | AccessScopeExpression
  | AccessGlobalExpression
  | ArrayLiteralExpression
  | ObjectLiteralExpression
  | ParenExpression
  | PrimitiveLiteralExpression
  | TemplateExpression
  | NewExpression
  | CustomExpression;

export type IsLeftHandSide =
  | IsPrimary
  | CallGlobalExpression
  | CallFunctionExpression
  | CallMemberExpression
  | CallScopeExpression
  | AccessMemberExpression
  | AccessKeyedExpression
  | TaggedTemplateExpression;

export type IsUnary = IsLeftHandSide | UnaryExpression;
export type IsBinary = IsUnary | BinaryExpression;
export type IsConditional = IsBinary | ConditionalExpression;
export type IsAssign =
  | IsConditional
  | AssignExpression
  | ArrowFunction
  | DestructuringAssignmentExpression;
export type IsValueConverter = IsAssign | ValueConverterExpression;
export type IsBindingBehavior = IsValueConverter | BindingBehaviorExpression;
export type IsAssignable =
  | AccessScopeExpression
  | AccessKeyedExpression
  | AccessMemberExpression
  | AssignExpression;
export type BindingPattern =
  | BindingIdentifier
  | BindingPatternDefault
  | BindingPatternHole
  | ArrayBindingPattern
  | ObjectBindingPattern;
export type BindingIdentifierOrPattern = BindingPattern;
export type IsExpression = IsBindingBehavior | Interpolation;
export type AnyBindingExpression =
  | Interpolation
  | ForOfStatement
  | CustomExpression
  | IsBindingBehavior;

export type ExpressionType =
  | 'IsProperty'
  | 'IsFunction'
  | 'IsIterator'
  | 'Interpolation'
  | 'IsCustom';

export type ExpressionAstNode =
  | Identifier
  | BindingBehaviorExpression
  | ValueConverterExpression
  | AssignExpression
  | ConditionalExpression
  | AccessGlobalExpression
  | AccessThisExpression
  | AccessBoundaryExpression
  | AccessScopeExpression
  | AccessMemberExpression
  | AccessKeyedExpression
  | ParenExpression
  | NewExpression
  | CallScopeExpression
  | CallMemberExpression
  | CallFunctionExpression
  | CallGlobalExpression
  | BinaryExpression
  | UnaryExpression
  | PrimitiveLiteralExpression
  | ArrayLiteralExpression
  | ObjectLiteralExpression
  | TemplateExpression
  | TaggedTemplateExpression
  | BindingIdentifier
  | ForOfStatement
  | Interpolation
  | BindingPatternDefault
  | BindingPatternHole
  | ArrayBindingPattern
  | ObjectBindingPattern
  | DestructuringAssignmentExpression
  | ArrowFunction
  | CustomExpression;
