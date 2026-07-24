import type { BindingScope } from '../configuration/scope.js';
import type {
  ExpressionAstNode,
  IsValueConverter,
} from '../expression/ast.js';
import { ValueConverterExpression } from '../expression/ast.js';
import { unwrapExpressionAstNodeParens } from '../expression/parse-result-inspection.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { auLink } from '../kernel/au-link.js';
import type { KernelSourceFileReadView } from '../kernel/store.js';
import {
  STATE_BINDING_BEHAVIOR_NAME,
  StateBindingScopeProjector,
} from '../state/state-binding-scope.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import type { RuntimeExpressionResourcePlan } from '../template/runtime-expression-resource-plan.js';
import {
  RuntimeExpressionResourceBindReachability,
  type RuntimeExpressionResourcePhaseReachability,
} from '../template/runtime-expression-resource.js';

export class RuntimeBindingExpressionScopeProjection {
  constructor(
    /** Expression that Aurelia will evaluate after binding-behavior bind-time side effects have run. */
    readonly expression: ExpressionAstNode,
    /** Scope that the binding will use for source evaluation, or null when a scope-changing behavior stays open. */
    readonly scope: BindingScope | null,
    /** Reason a scope-changing binding behavior could not close, when applicable. */
    readonly openReason: string | null,
  ) {}
}

export interface RuntimeBindingExpressionScopeProjectionRequest {
  /** Exact rendered binding whose resource-plan application owns this lifecycle handoff. */
  readonly bindingProductHandle: ProductHandle;
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope;
  readonly localKey: string;
  readonly sourceAddressHandle: AddressHandle | null;
}

/**
 * Projects the binding-behavior `astBind(...)` handoff that changes a binding's later source-evaluation scope.
 *
 * `astEvaluate(...)` unwraps binding behaviors and does not connectably evaluate their arguments. The state binding
 * behavior is special because its `bind(...)` calls `binding.useScope(createStateBindingScope(...))`, so subsequent
 * source reads happen against the store-backed scope rather than the original instruction scope.
 */
@auLink('runtime:astBind')
export class RuntimeBindingExpressionScopeProjector {
  private readonly stateScopes: StateBindingScopeProjector;

  constructor(
    readonly kernel: KernelSourceFileReadView,
    readonly expressionWorld: CheckerExpressionTypeWorld,
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
  ) {
    this.stateScopes = new StateBindingScopeProjector(
      kernel,
      expressionWorld.stateStores,
      expressionWorld.projector,
    );
  }

  project(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): RuntimeBindingExpressionScopeProjection {
    return this.projectAstBindEffects(
      unwrapExpressionAstNodeParens(input.expression),
      input.scope,
      input.localKey,
      input.sourceAddressHandle,
      input.bindingProductHandle,
    );
  }

  projectSourceExpressions(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): readonly RuntimeBindingExpressionScopeProjection[] {
    const expression = unwrapExpressionAstNodeParens(input.expression);
    if (expression.$kind !== 'Interpolation') {
      return [this.project(input)];
    }
    return expression.expressions.map((part, index) =>
      this.project({
        ...input,
        expression: part,
        localKey: `${input.localKey}:interpolation-part:${index}`,
      })
    );
  }

  /** Whether the rendered binding completed `astBind(...)` and can enter source evaluation. */
  sourceEvaluationReachability(
    bindingProductHandle: ProductHandle,
  ): RuntimeExpressionResourcePhaseReachability {
    return this.expressionResourcePlan.readSourceEvaluationReachability(bindingProductHandle);
  }

  private projectAstBindEffects(
    expression: ExpressionAstNode,
    scope: BindingScope | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    bindingProductHandle: ProductHandle,
  ): RuntimeBindingExpressionScopeProjection {
    const unwrapped = unwrapExpressionAstNodeParens(expression);
    if (unwrapped.$kind === 'ValueConverter') {
      const projectedInput = this.projectAstBindEffects(
        unwrapped.expression,
        scope,
        `${localKey}:value-converter:${unwrapped.name.name}`,
        sourceAddressHandle,
        bindingProductHandle,
      );
      return new RuntimeBindingExpressionScopeProjection(
        new ValueConverterExpression(
          unwrapped.span,
          projectedInput.expression as IsValueConverter,
          unwrapped.name,
          unwrapped.args,
        ),
        projectedInput.scope,
        projectedInput.openReason,
      );
    }
    if (unwrapped.$kind !== 'BindingBehavior') {
      return new RuntimeBindingExpressionScopeProjection(unwrapped, scope, null);
    }

    const planEntry = this.expressionResourcePlan.readBindingBehaviorEntry(
      unwrapped,
      bindingProductHandle,
    );
    const reached = planEntry != null
      && planEntry.bindReachability === RuntimeExpressionResourceBindReachability.Reached
      && planEntry.issue == null;
    if (planEntry == null && unwrapped.name.name === STATE_BINDING_BEHAVIOR_NAME) {
      return new RuntimeBindingExpressionScopeProjection(
        unwrapped.expression,
        null,
        'The state binding behavior did not retain an expression-resource plan entry for this rendered binding.',
      );
    }
    if (
      planEntry?.builtInResource?.name === BuiltInBindingBehaviorName.State
      && !reached
    ) {
      return new RuntimeBindingExpressionScopeProjection(
        unwrapped.expression,
        null,
        'The state binding behavior did not reach its source-scope handoff for this rendered binding.',
      );
    }
    const behaviorScope = reached && planEntry.builtInResource?.name === BuiltInBindingBehaviorName.State
      ? this.projectStateBindingBehaviorScope(unwrapped, scope, localKey, sourceAddressHandle)
      : new RuntimeBindingExpressionScopeProjection(unwrapped.expression, scope, null);
    const projectedConverter = reached
      ? this.expressionResourcePlan.readProjectedConverterForBindingBehavior(
          unwrapped,
          bindingProductHandle,
        )
      : null;
    if (projectedConverter != null) {
      const projectedInput = this.projectAstBindEffects(
        unwrapped.expression,
        behaviorScope.scope,
        `${localKey}:behavior:${unwrapped.name.name}:value-converter-input`,
        sourceAddressHandle,
        bindingProductHandle,
      );
      return new RuntimeBindingExpressionScopeProjection(
        new ValueConverterExpression(
          projectedConverter.expression.span,
          projectedInput.expression as IsValueConverter,
          projectedConverter.expression.name,
          projectedConverter.expression.args,
        ),
        projectedInput.scope,
        behaviorScope.openReason ?? projectedInput.openReason,
      );
    }
    const projectedInner = this.projectAstBindEffects(
      unwrapped.expression,
      behaviorScope.scope,
      `${localKey}:behavior:${unwrapped.name.name}`,
      sourceAddressHandle,
      bindingProductHandle,
    );
    return new RuntimeBindingExpressionScopeProjection(
      projectedInner.expression,
      projectedInner.scope,
      behaviorScope.openReason ?? projectedInner.openReason,
    );
  }

  private projectStateBindingBehaviorScope(
    expression: ExpressionAstNode & { readonly $kind: 'BindingBehavior' },
    scope: BindingScope | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeBindingExpressionScopeProjection {
    if (scope == null) {
      return new RuntimeBindingExpressionScopeProjection(
        expression.expression,
        null,
        'A previous state binding behavior did not produce a store-backed binding scope.',
      );
    }
    const stateScope = this.stateScopes.scopeForBindingBehavior(
      expression,
      scope,
      `${localKey}:state-binding-behavior:${expression.span.start}:${expression.span.end}`,
      sourceAddressHandle,
    );
    return new RuntimeBindingExpressionScopeProjection(
      expression.expression,
      stateScope.scope,
      stateScope.openReason,
    );
  }
}

/** True when the binding source can change Scope during `astBind(...)` under the modeled semantic-runtime rules. */
export function runtimeBindingExpressionUsesModeledScopeChangingBindingBehavior(
  expression: ExpressionAstNode,
): boolean {
  const unwrapped = unwrapExpressionAstNodeParens(expression);
  if (unwrapped.$kind === 'Interpolation') {
    return unwrapped.expressions.some(runtimeBindingExpressionUsesModeledScopeChangingBindingBehavior);
  }
  let current: ExpressionAstNode = unwrapped;
  while (current.$kind === 'BindingBehavior') {
    if (current.name.name === STATE_BINDING_BEHAVIOR_NAME) {
      return true;
    }
    current = unwrapExpressionAstNodeParens(current.expression);
  }
  return false;
}
