import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import type { CheckerTypeReference } from './type-shape.js';

export interface CheckerExpressionTypeEvaluationRuntimeContext {
  /** Mirrors the runtime `IConnectable | null` argument that decides whether dependency-collecting evaluation is active. */
  readonly connectable: boolean;
  /** Mirrors `IAstEvaluator.strict`; null means the caller has not proven the runtime evaluator mode. */
  readonly strict: boolean | null;
  /** Controls whether binding-behavior source-scope effects have run before this `astEvaluate(...)` request. */
  readonly bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation;
}

export const enum CheckerExpressionTypeBindingBehaviorEvaluation {
  /** `astBind(...)` has run for this source owner, so scope-changing binding behaviors affect the evaluated root. */
  AstBindThenEvaluate = 'ast-bind-then-evaluate',
  /** Only `astEvaluate(...)` runs for this owner, so binding behaviors unwrap without bind-time side effects. */
  AstEvaluateOnly = 'ast-evaluate-only',
}

/** Creates a TypeChecker-side runtime mode for an Aurelia expression evaluator request. */
export function checkerExpressionTypeRuntimeContext(
  connectable: boolean,
  strict: boolean | null,
  bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation,
): CheckerExpressionTypeEvaluationRuntimeContext {
  return { connectable, strict, bindingBehavior };
}

/** Creates the normal runtime mode where `astBind(...)` has already applied binding-behavior source effects. */
export function astBindThenEvaluateRuntimeContext(
  connectable: boolean,
  strict: boolean | null,
): CheckerExpressionTypeEvaluationRuntimeContext {
  return checkerExpressionTypeRuntimeContext(
    connectable,
    strict,
    CheckerExpressionTypeBindingBehaviorEvaluation.AstBindThenEvaluate,
  );
}

/** Creates the runtime mode where an owner calls `astEvaluate(...)` without first applying binding-behavior bind effects. */
export function astEvaluateOnlyRuntimeContext(
  connectable: boolean,
  strict: boolean | null,
): CheckerExpressionTypeEvaluationRuntimeContext {
  return checkerExpressionTypeRuntimeContext(
    connectable,
    strict,
    CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly,
  );
}

export const nonConnectableEvaluationContext: CheckerExpressionTypeEvaluationRuntimeContext =
  astBindThenEvaluateRuntimeContext(false, null);

/** One TypeChecker-backed Aurelia expression evaluation request with explicit runtime, scope, source, and contextual-type axes. */
export class CheckerExpressionTypeEvaluationContext<TExpression extends ExpressionAstNode = ExpressionAstNode> {
  /** Creates an expression evaluation request when the caller already owns the exact Aurelia source Scope. */
  static knownScope<TExpression extends ExpressionAstNode>(
    expression: TExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    contextualType: CheckerTypeReference | null = null,
    runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext = nonConnectableEvaluationContext,
  ): CheckerExpressionTypeEvaluationContext<TExpression> {
    return new CheckerExpressionTypeEvaluationContext(
      expression,
      scope,
      localKey,
      sourceAddressHandle,
      contextualType,
      runtimeContext,
    );
  }

  private constructor(
    /** Aurelia expression AST being statically evaluated. */
    readonly expression: TExpression,
    /** Modeled runtime Scope used for `Scope.getContext`, `$this`, `$parent`, and boundary lookup. */
    readonly scope: BindingScope,
    /** Semantic local key for generated TypeChecker products and cache bucketing. */
    readonly localKey: string,
    /** Source address for the authored expression or owning binding product. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Contextual target type supplied by a call, literal, binding target, or cursor owner. */
    readonly contextualType: CheckerTypeReference | null = null,
    /** Runtime evaluator mode visible to Aurelia expression semantics. */
    readonly runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext = nonConnectableEvaluationContext,
  ) {}

  /** Returns the same evaluation request with contextual type removed unless this AST kind can spend it. */
  withEffectiveContextualType(): CheckerExpressionTypeEvaluationContext<TExpression> {
    const effectiveContextualType = contextualTypeForExpression(this.expression, this.contextualType);
    return effectiveContextualType === this.contextualType
      ? this
      : new CheckerExpressionTypeEvaluationContext(
        this.expression,
        this.scope,
        this.localKey,
        this.sourceAddressHandle,
        effectiveContextualType,
        this.runtimeContext,
      );
  }

  /** Returns a child request whose local key is rooted in this expression's projected source identity. */
  child<TChildExpression extends ExpressionAstNode>(
    expression: TChildExpression,
    localSuffix: string,
    contextualType: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeEvaluationContext<TChildExpression> {
    return this.childInScope(expression, this.scope, localSuffix, contextualType);
  }

  /** Returns a child request evaluated in a derived runtime Scope. */
  childInScope<TChildExpression extends ExpressionAstNode>(
    expression: TChildExpression,
    scope: BindingScope,
    localSuffix: string,
    contextualType: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeEvaluationContext<TChildExpression> {
    return new CheckerExpressionTypeEvaluationContext(
      expression,
      scope,
      `${this.projectionLocalKey()}:${localSuffix}`,
      this.sourceAddressHandle,
      contextualType,
      this.runtimeContext,
    );
  }

  /** Returns the request in another modeled runtime Scope while preserving source and runtime-mode axes. */
  withScope(
    scope: BindingScope,
    contextualType: CheckerTypeReference | null = this.contextualType,
  ): CheckerExpressionTypeEvaluationContext<TExpression> {
    return new CheckerExpressionTypeEvaluationContext(
      this.expression,
      scope,
      this.localKey,
      this.sourceAddressHandle,
      contextualType,
      this.runtimeContext,
    );
  }

  /** Returns the request with an explicit contextual target type for the current expression. */
  withContextualType(contextualType: CheckerTypeReference | null): CheckerExpressionTypeEvaluationContext<TExpression> {
    return new CheckerExpressionTypeEvaluationContext(
      this.expression,
      this.scope,
      this.localKey,
      this.sourceAddressHandle,
      contextualType,
      this.runtimeContext,
    );
  }

  /** Returns the request with a proven runtime evaluator mode. */
  withRuntimeContext(runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext): CheckerExpressionTypeEvaluationContext<TExpression> {
    return new CheckerExpressionTypeEvaluationContext(
      this.expression,
      this.scope,
      this.localKey,
      this.sourceAddressHandle,
      this.contextualType,
      runtimeContext,
    );
  }

  /** Local key used when this expression publishes projected TypeChecker products. */
  projectionLocalKey(): string {
    return expressionEvaluationProjectionLocalKey(this.localKey, this.expression);
  }

  /** Cache key that isolates expression evaluation by scope, resource scope, source, runtime mode, and contextual type. */
  cacheKey(resourceScope: TemplateResourceScope | null): string {
    const scopedLocalKey = runtimeContextualEvaluationLocalKey(
      contextualEvaluationLocalKey(this.projectionLocalKey(), this.contextualType),
      this.runtimeContext,
    );
    const source = this.sourceAddressHandle == null
      ? expressionSourceSpanKey(this.expression)
      : `${this.sourceAddressHandle}:${expressionSourceSpanKey(this.expression)}`;
    const resource = resourceScope?.productHandle ?? 'no-resource-scope';
    return `${scopedLocalKey}:scope:${this.scope.productHandle}:resource:${resource}:expr:${this.expression.$kind}:${source}`;
  }
}

export function contextualTypeForExpression(
  expression: ExpressionAstNode,
  contextualType: CheckerTypeReference | null,
): CheckerTypeReference | null {
  if (contextualType == null) {
    return null;
  }
  if (expression.$kind === 'Paren') {
    return contextualTypeForExpression(expression.expression, contextualType);
  }
  return expression.$kind === 'ArrowFunction'
    || expression.$kind === 'ArrayLiteral'
    || expression.$kind === 'ObjectLiteral'
    || expression.$kind === 'Conditional'
    ? contextualType
    : null;
}

function contextualEvaluationLocalKey(
  localKey: string,
  contextualType: CheckerTypeReference | null,
): string {
  if (contextualType == null) {
    return localKey;
  }
  const contextKey = contextualType.checkerKey
    ?? contextualType.productHandle
    ?? contextualType.display
    ?? contextualType.shapeKind;
  return `${localKey}:contextual:${contextKey}`;
}

function expressionEvaluationProjectionLocalKey(
  localKey: string,
  expression: ExpressionAstNode,
): string {
  return `${localKey}:expr:${expression.$kind}:${expressionSourceSpanKey(expression)}`;
}

function runtimeContextualEvaluationLocalKey(
  localKey: string,
  runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext,
): string {
  const connectable = runtimeContext.connectable ? ':runtime-connectable' : '';
  const strict = runtimeContext.strict == null ? '' : `:runtime-strict:${runtimeContext.strict}`;
  const bindingBehavior = `:binding-behavior:${runtimeContext.bindingBehavior}`;
  return `${localKey}${connectable}${strict}${bindingBehavior}`;
}

function expressionSourceSpanKey(expression: ExpressionAstNode): string {
  return `${expression.span.start}-${expression.span.end}`;
}
