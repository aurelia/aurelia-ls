import type { ExpressionAstNode } from '../expression/ast.js';

export const enum RuntimeBindingSourceValueExpressionSupportKind {
  /** The binding-source value evaluator can reduce this expression into an EvaluationValue when operands close. */
  StaticValueReduced = 'static-value-reduced',
  /** The expression is reduced by Scope lookup before static source-value reads continue. */
  ScopeValueReduced = 'scope-value-reduced',
  /** The wrapper can change source Scope before the wrapped expression is reduced. */
  TransparentRuntimeWrapper = 'transparent-runtime-wrapper',
  /** The expression is valid Aurelia runtime syntax but requires live host/runtime semantics for value closure. */
  RuntimeOpen = 'runtime-open',
  /** The expression is owned by a larger product and is not a standalone source-value expression. */
  OwnerHandled = 'owner-handled',
  /** The expression is an opaque extension surface whose owner must provide value semantics. */
  OpaqueOwnerHandled = 'opaque-owner-handled',
  /** The AST kind would require statement/block value semantics before it can be reduced. */
  StatementValueNeeded = 'statement-value-needed',
}

export const enum RuntimeBindingSourceValueExpressionOwner {
  /** RuntimeBindingSourceValueEvaluator owns direct static value reduction for this expression. */
  BindingSourceValueEvaluator = 'binding-source-value-evaluator',
  /** BindingScope lookup owns context, local, and boundary value reads. */
  BindingScopeLookup = 'binding-scope-lookup',
  /** RuntimeBindingExpressionScopeProjector owns binding-behavior scope handoff before value reduction. */
  BindingBehaviorLifecycle = 'binding-behavior-lifecycle',
  /** Value-converter resource lookup and evaluator-local invocation own static source-value closure when the target closes. */
  ValueConverterResourceInvocation = 'value-converter-resource-invocation',
  /** Admitted Aurelia global names route through the shared host intrinsic substrate before remaining open. */
  JavaScriptGlobalIntrinsic = 'javascript-global-intrinsic',
  /** JavaScript host/global values remain live runtime pressure after intrinsic reduction is exhausted. */
  JavaScriptGlobalRuntime = 'javascript-global-runtime',
  /** Call owners that know framework callback parameter scopes own arrow callback value flow. */
  CallbackInvocation = 'callback-invocation',
  /** Runtime assignment side effects are not source-value reads. */
  AssignmentRuntime = 'assignment-runtime',
  /** Binding-pattern projection owns declaration locals rather than runtime values. */
  BindingPatternProjection = 'binding-pattern-projection',
  /** Repeat template-controller lowering owns ForOfStatement value flow. */
  RepeatTemplateController = 'repeat-template-controller',
  /** TranslationBinding owns CustomExpression as an extension grammar carrier. */
  TranslationBinding = 'translation-binding',
  /** Statement/block lowering must own non-expression value semantics. */
  StatementValueEmission = 'statement-value-emission',
}

export interface RuntimeBindingSourceValueExpressionSupport {
  readonly supportKind: RuntimeBindingSourceValueExpressionSupportKind;
  readonly owner: RuntimeBindingSourceValueExpressionOwner;
  readonly summary: string;
}

export interface RuntimeBindingSourceValueExpressionSupportRow extends RuntimeBindingSourceValueExpressionSupport {
  readonly expressionKind: ExpressionAstNode['$kind'];
}

const supportByKind = {
  Identifier: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingPatternProjection,
    summary: 'Identifiers are child tokens for binding patterns or TypeScript-shaped expressions, not standalone binding-source values.',
  },
  BindingBehavior: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.TransparentRuntimeWrapper,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingBehaviorLifecycle,
    summary: 'Binding behaviors may project a source Scope, then the wrapped expression continues through source-value reduction.',
  },
  ValueConverter: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.ValueConverterResourceInvocation,
    summary: 'Value converters reduce through compiler resource-scope lookup and evaluator-local toView invocation when the target, input, and arguments close; otherwise the runtime boundary stays explicit.',
  },
  Assign: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.RuntimeOpen,
    owner: RuntimeBindingSourceValueExpressionOwner.AssignmentRuntime,
    summary: 'Assignments are runtime side effects and are not static binding-source value reads.',
  },
  Conditional: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Conditional expressions reduce the known branch, or a representative branch value when both branches have a safe common shape.',
  },
  AccessGlobal: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.JavaScriptGlobalIntrinsic,
    summary: 'Aurelia global access reduces through the shared global intrinsic substrate into constants or host boundary objects.',
  },
  AccessThis: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.ScopeValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingScopeLookup,
    summary: '$this resolves through modeled BindingScope lookup into a boundary object or slot value.',
  },
  AccessBoundary: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.ScopeValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingScopeLookup,
    summary: 'Boundary access resolves through modeled BindingScope ancestry before value reduction continues.',
  },
  AccessScope: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.ScopeValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingScopeLookup,
    summary: 'Scope names resolve through BindingScope slots, static values, state initial values, or class member reads.',
  },
  AccessMember: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Member access reduces over closed owner values or BindingScope context members.',
  },
  AccessKeyed: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Keyed access reduces over closed owner and key values when the key can be represented statically.',
  },
  Paren: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Parentheses are transparent for source-value reduction.',
  },
  New: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'New expressions close only when the constructor reduces to an evaluator-local class or known intrinsic.',
  },
  CallScope: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Scope calls close when the callable scope value and all arguments reduce.',
  },
  CallMember: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Member calls close when the receiver, method, and arguments reduce under evaluator-local function semantics.',
  },
  CallFunction: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Function calls close when the callee and arguments reduce under evaluator-local function semantics.',
  },
  CallGlobal: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.JavaScriptGlobalIntrinsic,
    summary: 'Aurelia global calls reduce through the shared global intrinsic substrate when arguments close; host-time and unsupported calls remain explicit runtime opens.',
  },
  Binary: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Binary expressions reduce through the shared primitive operator algebra when operands close.',
  },
  Unary: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Unary expressions reduce through the shared primitive operator algebra for logical-not, numeric coercion/sign, typeof, and void; increment/decrement remain runtime side effects.',
  },
  PrimitiveLiteral: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Primitive literals reduce directly to EvaluationValue primitives.',
  },
  ArrayLiteral: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Array literals reduce element values and preserve static holes as boundary values when possible.',
  },
  ObjectLiteral: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Object literals reduce property values and preserve static holes as boundary values when possible.',
  },
  Template: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Template literals reduce to static strings or string patterns when holes close or become safe boundaries.',
  },
  TaggedTemplate: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Tagged templates close when the tag function and holes reduce under evaluator-local function semantics.',
  },
  BindingIdentifier: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingPatternProjection,
    summary: 'Binding identifiers declare locals for owner products instead of producing binding-source values.',
  },
  ForOfStatement: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.RepeatTemplateController,
    summary: 'ForOfStatement belongs to repeat template-controller scope/value construction rather than standalone source-value reads.',
  },
  Interpolation: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StaticValueReduced,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingSourceValueEvaluator,
    summary: 'Interpolation reduces to static strings or string patterns when holes close or become safe boundaries.',
  },
  BindingPatternDefault: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingPatternProjection,
    summary: 'Binding-pattern defaults are declaration-local projection facts, not standalone source-value reads.',
  },
  BindingPatternHole: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingPatternProjection,
    summary: 'Binding-pattern holes are declaration-local projection facts, not standalone source-value reads.',
  },
  ArrayBindingPattern: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingPatternProjection,
    summary: 'Array binding patterns are consumed by repeat/runtime-assignment local projection.',
  },
  ObjectBindingPattern: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.BindingPatternProjection,
    summary: 'Object binding patterns are consumed by repeat/runtime-assignment local projection.',
  },
  DestructuringAssignment: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.StatementValueNeeded,
    owner: RuntimeBindingSourceValueExpressionOwner.StatementValueEmission,
    summary: 'Destructuring assignment needs statement/block value semantics before it can be a source-value read.',
  },
  ArrowFunction: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.CallbackInvocation,
    summary: 'Arrow functions are callback-local closures; source-value array callback owners evaluate their bodies with Scope.fromParent-shaped parameter scopes.',
  },
  Custom: {
    supportKind: RuntimeBindingSourceValueExpressionSupportKind.OpaqueOwnerHandled,
    owner: RuntimeBindingSourceValueExpressionOwner.TranslationBinding,
    summary: 'CustomExpression is an owner surface such as i18n translation binding, not generic source-value syntax.',
  },
} satisfies Record<ExpressionAstNode['$kind'], RuntimeBindingSourceValueExpressionSupport>;

/** Returns source-value support metadata for one semantic-runtime expression kind. */
export function runtimeBindingSourceValueExpressionSupportForKind(
  kind: ExpressionAstNode['$kind'],
): RuntimeBindingSourceValueExpressionSupport {
  return supportByKind[kind];
}

/** Lists source-value support metadata for all semantic-runtime expression kinds. */
export function runtimeBindingSourceValueExpressionSupportRows(): readonly RuntimeBindingSourceValueExpressionSupportRow[] {
  return Object.entries(supportByKind).map(([expressionKind, support]) => ({
    expressionKind: expressionKind as ExpressionAstNode['$kind'],
    ...support,
  }));
}
