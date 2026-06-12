import type { BindingScope } from '../configuration/scope.js';
import type {
  ExpressionAstNode,
  IsValueConverter,
} from '../expression/ast.js';
import { ValueConverterExpression } from '../expression/ast.js';
import {
  bindingBehaviorProjectsThroughValueConverter,
  bindingBehaviorValueConverterProjection,
} from '../expression/binding-behavior-bind-effects.js';
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
    return this.projectAstBindEffects(
      unwrapExpressionAstNodeParens(input.expression),
      input.scope,
      input.localKey,
      input.sourceAddressHandle,
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

  private projectAstBindEffects(
    expression: ExpressionAstNode,
    scope: BindingScope | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeBindingExpressionScopeProjection {
    const unwrapped = unwrapExpressionAstNodeParens(expression);
    if (unwrapped.$kind === 'ValueConverter') {
      const projectedInput = this.projectAstBindEffects(
        unwrapped.expression,
        scope,
        `${localKey}:value-converter:${unwrapped.name.name}`,
        sourceAddressHandle,
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

    const behaviorScope = unwrapped.name.name === STATE_BINDING_BEHAVIOR_NAME
      ? this.projectStateBindingBehaviorScope(unwrapped, scope, localKey, sourceAddressHandle)
      : new RuntimeBindingExpressionScopeProjection(unwrapped.expression, scope, null);
    if (bindingBehaviorProjectsThroughValueConverter(unwrapped)) {
      const projectedInput = this.projectAstBindEffects(
        unwrapped.expression,
        behaviorScope.scope,
        `${localKey}:behavior:${unwrapped.name.name}:value-converter-input`,
        sourceAddressHandle,
      );
      return new RuntimeBindingExpressionScopeProjection(
        bindingBehaviorValueConverterProjection(unwrapped, projectedInput.expression as IsValueConverter),
        projectedInput.scope,
        behaviorScope.openReason ?? projectedInput.openReason,
      );
    }
    const projectedInner = this.projectAstBindEffects(
      unwrapped.expression,
      behaviorScope.scope,
      `${localKey}:behavior:${unwrapped.name.name}`,
      sourceAddressHandle,
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
