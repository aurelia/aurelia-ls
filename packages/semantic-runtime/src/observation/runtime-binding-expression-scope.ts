import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { unwrapExpressionAstNodeParens } from '../expression/parse-result-inspection.js';
import type { AddressHandle } from '../kernel/handles.js';
import { auLink } from '../kernel/au-link.js';
import type { KernelStore } from '../kernel/store.js';
import {
  STATE_BINDING_BEHAVIOR_NAME,
  StateBindingScopeProjector,
} from '../state/state-binding-scope.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';

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
    readonly store: KernelStore,
    readonly expressionWorld: CheckerExpressionTypeWorld,
  ) {
    this.stateScopes = new StateBindingScopeProjector(store, expressionWorld.stateStores);
  }

  project(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): RuntimeBindingExpressionScopeProjection {
    let expression = unwrapExpressionAstNodeParens(input.expression);
    let scope: BindingScope | null = input.scope;
    let openReason: string | null = null;

    while (expression.$kind === 'BindingBehavior') {
      if (expression.name.name === STATE_BINDING_BEHAVIOR_NAME) {
        if (scope == null) {
          openReason ??= 'A previous state binding behavior did not produce a store-backed binding scope.';
        } else {
          const stateScope = this.stateScopes.scopeForBindingBehavior(
            expression,
            scope,
            `${input.localKey}:state-binding-behavior:${expression.span.start}:${expression.span.end}`,
            input.sourceAddressHandle,
          );
          scope = stateScope.scope;
          openReason = stateScope.openReason;
        }
      }
      expression = unwrapExpressionAstNodeParens(expression.expression);
    }

    return new RuntimeBindingExpressionScopeProjection(expression, scope, openReason);
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
}
