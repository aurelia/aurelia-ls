import type { SourceSpan } from './source-span.js';
import { auLink } from '../kernel/au-link.js';

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

/** Primitive literal value carried by Aurelia expression AST nodes before runtime/evaluator-specific wrapping. */
export type ExpressionPrimitiveLiteralValue = null | undefined | number | boolean | string;

export interface ExpressionPrimitiveLiteralValueMapper<TValue> {
  /** Map a string literal value. */
  readonly string: (value: string) => TValue;
  /** Map a number literal value. */
  readonly number: (value: number) => TValue;
  /** Map a boolean literal value. */
  readonly boolean: (value: boolean) => TValue;
  /** Map the null literal value. */
  readonly null: () => TValue;
  /** Map the undefined literal value. */
  readonly undefined: () => TValue;
}

/** Dispatch one parser-level primitive literal value to a substrate-specific wrapper or projection. */
export function mapExpressionPrimitiveLiteralValue<TValue>(
  value: ExpressionPrimitiveLiteralValue,
  mapper: ExpressionPrimitiveLiteralValueMapper<TValue>,
): TValue {
  switch (typeof value) {
    case 'string':
      return mapper.string(value);
    case 'number':
      return mapper.number(value);
    case 'boolean':
      return mapper.boolean(value);
    case 'undefined':
      return mapper.undefined();
    default:
      return mapper.null();
  }
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

@auLink('expression-parser:BindingBehaviorExpression')
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

@auLink('expression-parser:ValueConverterExpression')
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

@auLink('expression-parser:AssignExpression')
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

@auLink('expression-parser:ConditionalExpression')
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

@auLink('expression-parser:AccessGlobalExpression')
export class AccessGlobalExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessGlobal' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
  ) {
    super(span);
  }
}

@auLink('expression-parser:AccessThisExpression')
export class AccessThisExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessThis' as const;

  constructor(
    span: SourceSpan,
    /** Runtime Scope depth after accounting for nested Aurelia arrow callbacks. */
    readonly ancestor: number,
    /** Exact authored `$this` / `$parent` tokens; absent on synthetic ASTs. */
    readonly authoredScopePath: AuthoredScopePath | null = null,
  ) {
    super(span);
  }
}

@auLink('expression-parser:AccessBoundaryExpression')
export class AccessBoundaryExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessBoundary' as const;
}

export const enum AuthoredScopePathKind {
  /** The path starts at the current binding context through one authored `$this` qualifier. */
  CurrentBindingContext = 'current-binding-context',
  /** The path selects an exact ancestor through one or more authored `$parent` qualifiers. */
  AncestorBindingContext = 'ancestor-binding-context',
}

/** Exact parser-local source provenance for an authored `$this` or `$parent` path. */
export class AuthoredScopePath {
  constructor(
    readonly pathKind: AuthoredScopePathKind,
    readonly qualifierSpans: readonly SourceSpan[],
    readonly optionalAccessSpan: SourceSpan | null = null,
  ) {
    if (
      qualifierSpans.length === 0
      || (pathKind === AuthoredScopePathKind.CurrentBindingContext && qualifierSpans.length !== 1)
    ) {
      throw new Error(`Invalid authored scope path '${pathKind}' with ${qualifierSpans.length} qualifier(s).`);
    }
  }

  withOptionalAccess(span: SourceSpan): AuthoredScopePath {
    return new AuthoredScopePath(this.pathKind, this.qualifierSpans, span);
  }
}

@auLink('expression-parser:AccessScopeExpression')
export class AccessScopeExpression extends ExpressionNodeBase {
  readonly $kind = 'AccessScope' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
    /** Runtime Scope depth; independent from the number of authored qualifiers. */
    readonly ancestor: number = 0,
    readonly authoredScopePath: AuthoredScopePath | null = null,
    /** Intended optional explicit-ancestor lookup semantics retained ahead of the framework parser fix. */
    readonly optional: boolean = false,
  ) {
    super(span);
  }
}

function isGlobalAccessRoot(expression: IsLeftHandSide): boolean {
  return expression.$kind === 'AccessGlobal'
    || ((expression.$kind === 'AccessMember' || expression.$kind === 'AccessKeyed')
      && expression.accessGlobal);
}

@auLink('expression-parser:AccessMemberExpression')
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

@auLink('expression-parser:AccessKeyedExpression')
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

@auLink('expression-parser:NewExpression')
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

@auLink('expression-parser:CallScopeExpression')
export class CallScopeExpression extends ExpressionNodeBase {
  readonly $kind = 'CallScope' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
    readonly args: IsAssign[],
    /** Runtime Scope depth; independent from the number of authored qualifiers. */
    readonly ancestor: number,
    /** Optional callee call (`name?.()`). */
    readonly optional: boolean,
    readonly authoredScopePath: AuthoredScopePath | null = null,
    /** Optional explicit-ancestor owner lookup (`$parent?.name()`). */
    readonly optionalAccess: boolean = false,
  ) {
    super(span);
  }
}

export function scopeExpressionWasAuthoredFromCurrentBindingContext(
  expression: AccessScopeExpression | CallScopeExpression,
): boolean {
  return expression.authoredScopePath?.pathKind === AuthoredScopePathKind.CurrentBindingContext;
}

@auLink('expression-parser:CallMemberExpression')
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

@auLink('expression-parser:CallFunctionExpression')
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

@auLink('expression-parser:CallGlobalExpression')
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

@auLink('expression-parser:BinaryExpression')
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

@auLink('expression-parser:UnaryExpression')
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

@auLink('expression-parser:PrimitiveLiteralExpression')
export class PrimitiveLiteralExpression extends ExpressionNodeBase {
  readonly $kind = 'PrimitiveLiteral' as const;

  constructor(
    span: SourceSpan,
    readonly value: ExpressionPrimitiveLiteralValue,
  ) {
    super(span);
  }
}

@auLink('expression-parser:ArrayLiteralExpression')
export class ArrayLiteralExpression extends ExpressionNodeBase {
  readonly $kind = 'ArrayLiteral' as const;

  constructor(
    span: SourceSpan,
    readonly elements: IsAssign[],
  ) {
    super(span);
  }
}

@auLink('expression-parser:ObjectLiteralExpression')
export class ObjectLiteralExpression extends ExpressionNodeBase {
  readonly $kind = 'ObjectLiteral' as const;

  constructor(
    span: SourceSpan,
    readonly keys: (number | string)[],
    readonly keySpans: SourceSpan[],
    readonly values: IsAssign[],
  ) {
    super(span);
  }
}

@auLink('expression-parser:TemplateExpression')
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

@auLink('expression-parser:TaggedTemplateExpression')
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

@auLink('expression-parser:BindingIdentifier')
export class BindingIdentifier extends ExpressionNodeBase {
  readonly $kind = 'BindingIdentifier' as const;

  constructor(
    span: SourceSpan,
    readonly name: Identifier,
  ) {
    super(span);
  }
}

@auLink('expression-parser:ForOfStatement')
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

@auLink('expression-parser:Interpolation')
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

@auLink('expression-parser:ArrayBindingPattern')
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

@auLink('expression-parser:ObjectBindingPattern')
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

@auLink('expression-parser:DestructuringAssignmentExpression')
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

@auLink('expression-parser:ArrowFunction')
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

@auLink('expression-parser:CustomExpression')
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

/** Whether a left-hand-side tree contains an optional access or call segment. */
export function expressionHasOptionalChain(expression: IsLeftHandSide): boolean {
  switch (expression.$kind) {
    case 'AccessScope':
      return expression.optional;
    case 'AccessMember':
      return expression.optional || expressionHasOptionalChain(expression.object);
    case 'AccessKeyed':
      return expression.optional || expressionHasOptionalChain(expression.object);
    case 'CallScope':
      return expression.optionalAccess || expression.optional;
    case 'CallFunction':
      return expression.optional || expressionHasOptionalChain(expression.func);
    case 'CallMember':
      return expression.optionalMember
        || expression.optionalCall
        || expressionHasOptionalChain(expression.object);
    case 'TaggedTemplate':
      return expressionHasOptionalChain(expression.func);
    case 'New':
      return expressionHasOptionalChain(expression.func);
    default:
      return false;
  }
}

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
