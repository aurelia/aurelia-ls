import type { BindingScope } from '../configuration/scope.js';
import type { Container } from '../di/container.js';
import type {
  ExpressionAstNode,
  ValueConverterExpression,
} from '../expression/ast.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type {
  RuntimeExpressionResourcePlan,
  RuntimeValueConverterPlanEntry,
} from '../template/runtime-expression-resource-plan.js';
import { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';
import {
  CheckerExpressionTypeBindingBehaviorEvaluation,
} from '../type-system/expression-type-context.js';
import type { RuntimeExpressionBinding } from './runtime-binding-expression.js';
import {
  type RuntimeBindingExpressionScopeProjectionReader,
} from './runtime-binding-expression-scope.js';
import {
  RuntimeBindingSourceExpressionProjectionKind,
  projectRuntimeBindingSourceExpressionInScope,
  projectRuntimeSourceExpressionWithLifecycle,
  type RuntimeBindingSourceExpressionContextProjection,
} from './runtime-binding-source-expression-context.js';

export interface RuntimeBindingSourceValueContextProjection {
  /** Projected source-value request, or null when the runtime binding source handoff stayed open. */
  readonly context: RuntimeBindingSourceValueEvaluationContext | null;
  /** Reason the source-value request could not be projected through modeled runtime binding semantics. */
  readonly openReason: string | null;
}

export interface RuntimeBindingSourceValueKnownScopeProjectionRequest {
  /** Rendered runtime binding table that owns strict-mode and render-context facts when a binding exists. */
  readonly runtimeBindings: RuntimeRenderingEmission | null;
  /** Source-scope projector that models binding-behavior `bind(...)` handoff before source reads. */
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader | null;
  /** Exact resource-lifecycle plan for a binding-owned source; null only for an ownerless known-scope read. */
  readonly expressionResourcePlan: RuntimeExpressionResourcePlan | null;
  /** Runtime expression binding whose source is being reduced to a static value, if the source is binding-owned. */
  readonly binding: RuntimeExpressionBinding | null;
  /** Parse product for a binding-owned source; null only when the binding has no parsed product or is ownerless. */
  readonly expressionProductHandle: ProductHandle | null;
  /** Exact interpolation-hole index, or null for an aggregate interpolation or ownerless source. */
  readonly expressionChainIndex: number | null;
  /** Binding source expression before runtime source-scope projection. */
  readonly expression: ExpressionAstNode;
  /** Semantic local key for projected source-value products. */
  readonly localKey: string;
  /** Already-proven runtime Scope for this binding source. */
  readonly sourceScope: BindingScope;
  /** Active controller/container visible to `resolve(...)`; undefined means use the evaluator default. */
  readonly activeContainer?: Container | null;
  /** Compiler resource scope visible to resource-backed expression semantics such as value converters. */
  readonly resourceScope?: TemplateResourceScope | null;
}

/** One binding-source value-reduction request over a modeled Scope, optional active DI container, and recursion guard. */
export class RuntimeBindingSourceValueEvaluationContext {
  /** Creates a root source-value request when the caller already owns the exact Aurelia source Scope. */
  static knownScope(
    expression: ExpressionAstNode,
    scope: BindingScope,
    activeContainer: Container | null | undefined = undefined,
    resourceScope: TemplateResourceScope | null = null,
    strictBinding: boolean | null = null,
  ): RuntimeBindingSourceValueEvaluationContext {
    return new RuntimeBindingSourceValueEvaluationContext(
      expression,
      scope,
      activeContainer,
      undefined,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      CheckerExpressionTypeBindingBehaviorEvaluation.AstBindThenEvaluate,
      resourceScope,
      strictBinding,
    );
  }

  /** Creates a source-value request from the binding-owned source-expression lifecycle projection. */
  static fromRuntimeBindingSourceExpressionProjection(
    projection: RuntimeBindingSourceExpressionContextProjection,
  ): RuntimeBindingSourceValueEvaluationContext {
    return new RuntimeBindingSourceValueEvaluationContext(
      projection.expression,
      projection.scope,
      projection.activeContainer,
      undefined,
      projection.bindingExpressionScopes,
      projection.bindingProductHandle,
      projection.expressionProductHandle,
      projection.expressionChainIndex,
      projection.expressionResourcePlan,
      projection.localKey,
      projection.sourceAddressHandle,
      projection.bindingBehavior,
      projection.resourceScope,
      projection.strictBinding,
      projection.sourceEvaluationReachability,
    );
  }

  private constructor(
    /** Aurelia binding-source expression being reduced to a static evaluator value. */
    readonly expression: ExpressionAstNode,
    /** Modeled runtime Scope used for Aurelia source lookup and bound-controller source handoff. */
    readonly scope: BindingScope,
    /** Active controller/container visible to `resolve(...)`; undefined means use the evaluator default. */
    readonly activeContainer: Container | null | undefined = undefined,
    private readonly activeBoundControllerReads: Set<string> = new Set(),
    private readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader | null = null,
    private readonly bindingProductHandle: ProductHandle | null = null,
    private readonly expressionProductHandle: ProductHandle | null = null,
    private readonly expressionChainIndex: number | null = null,
    private readonly expressionResourcePlan: RuntimeExpressionResourcePlan | null = null,
    private readonly localKey: string | null = null,
    private readonly sourceAddressHandle: AddressHandle | null = null,
    private readonly bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation = CheckerExpressionTypeBindingBehaviorEvaluation.AstBindThenEvaluate,
    /** Compiler resource scope visible to resource-backed expression semantics such as value converters. */
    readonly resourceScope: TemplateResourceScope | null = null,
    /** Rendering-controller strict mode passed to Aurelia `astEvaluate` for this source-value request. */
    readonly strictBinding: boolean | null = null,
    /** Whether the rendered binding completed `astBind(...)` far enough to enter source evaluation. */
    readonly sourceEvaluationReachability: RuntimeOperationReachability = RuntimeOperationReachability.Reached,
  ) {}

  /** Returns a child request in the same source-value read chain. */
  child(
    expression: ExpressionAstNode,
    scope: BindingScope = this.scope,
  ): RuntimeBindingSourceValueEvaluationContext {
    return new RuntimeBindingSourceValueEvaluationContext(
      expression,
      scope,
      this.activeContainer,
      this.activeBoundControllerReads,
      this.bindingExpressionScopes,
      this.bindingProductHandle,
      this.expressionProductHandle,
      this.expressionChainIndex,
      this.expressionResourcePlan,
      this.localKey,
      this.sourceAddressHandle,
      this.bindingBehavior,
      this.resourceScope,
      this.strictBinding,
      this.sourceEvaluationReachability,
    );
  }

  /** Returns the same request with an explicit active DI container override. */
  withActiveContainer(activeContainer: Container | null): RuntimeBindingSourceValueEvaluationContext {
    return new RuntimeBindingSourceValueEvaluationContext(
      this.expression,
      this.scope,
      activeContainer,
      this.activeBoundControllerReads,
      this.bindingExpressionScopes,
      this.bindingProductHandle,
      this.expressionProductHandle,
      this.expressionChainIndex,
      this.expressionResourcePlan,
      this.localKey,
      this.sourceAddressHandle,
      this.bindingBehavior,
      this.resourceScope,
      this.strictBinding,
      this.sourceEvaluationReachability,
    );
  }

  /** Returns the same request with the compiler resource scope visible to resource-backed expression semantics. */
  withResourceScope(resourceScope: TemplateResourceScope | null): RuntimeBindingSourceValueEvaluationContext {
    return new RuntimeBindingSourceValueEvaluationContext(
      this.expression,
      this.scope,
      this.activeContainer,
      this.activeBoundControllerReads,
      this.bindingExpressionScopes,
      this.bindingProductHandle,
      this.expressionProductHandle,
      this.expressionChainIndex,
      this.expressionResourcePlan,
      this.localKey,
      this.sourceAddressHandle,
      this.bindingBehavior,
      resourceScope,
      this.strictBinding,
      this.sourceEvaluationReachability,
    );
  }

  /** Returns the container visible to static-evaluator resolve hooks for this request. */
  containerOrDefault(defaultActiveContainer: Container | null): Container | null {
    return this.activeContainer === undefined ? defaultActiveContainer : this.activeContainer;
  }

  /** Whether this request is owned by one rendered binding's exact expression-resource plan. */
  ownsExpressionResourcePlan(): boolean {
    return this.bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstBindThenEvaluate
      && this.bindingProductHandle != null
      && this.expressionResourcePlan != null;
  }

  /** Exact converter application selected for this binding-owned expression, if one was planned. */
  readValueConverterPlanEntry(
    expression: ValueConverterExpression,
  ): RuntimeValueConverterPlanEntry | null {
    if (
      this.bindingProductHandle == null
      || this.expressionProductHandle == null
      || this.expressionResourcePlan == null
    ) {
      return null;
    }
    return this.expressionResourcePlan.readValueConverterEntry(
      this.expressionProductHandle,
      expression,
      this.bindingProductHandle,
    );
  }

  /** Runs a read with a bound-controller value marked active so recursive source values stay explicit. */
  withBoundControllerRead<TValue>(
    key: string,
    recursive: () => TValue,
    read: () => TValue,
  ): TValue {
    if (this.activeBoundControllerReads.has(key)) {
      return recursive();
    }
    this.activeBoundControllerReads.add(key);
    try {
      return read();
    } finally {
      this.activeBoundControllerReads.delete(key);
    }
  }

  /** Applies binding-behavior `astBind(...)` source-scope handoff when this request came from a runtime binding. */
  projectBindingSourceExpression(
    expression: ExpressionAstNode,
  ): {
    readonly expression: ExpressionAstNode;
    readonly scope: BindingScope | null;
    readonly openReason: string | null;
  } | null {
    if (this.bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly) {
      return null;
    }
    return this.projectBindingSourceExpressionWithLifecycle(
      expression,
      `${this.localKey ?? 'binding-source-value'}:${expression.span.start}:${expression.span.end}`,
      this.scope,
      this.bindingBehavior,
      this.sourceAddressHandle,
    );
  }

  /** Projects a source-value child request through the binding lifecycle carried by a parent runtime binding. */
  projectBindingSourceValueContext(
    expression: ExpressionAstNode,
    sourceScope: BindingScope,
    bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader,
    bindingProductHandle: ProductHandle,
    expressionProductHandle: ProductHandle | null,
    expressionChainIndex: number | null,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    strictBinding: boolean | null = this.strictBinding,
    resourceScope: TemplateResourceScope,
    activeContainer: Container | null | undefined = this.activeContainer,
  ): RuntimeBindingSourceValueContextProjection {
    if (bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly) {
      return {
        context: new RuntimeBindingSourceValueEvaluationContext(
          expression,
          sourceScope,
          activeContainer,
          this.activeBoundControllerReads,
          bindingExpressionScopes,
          bindingProductHandle,
          expressionProductHandle,
          expressionChainIndex,
          expressionResourcePlan,
          localKey,
          sourceAddressHandle,
          bindingBehavior,
          resourceScope,
          strictBinding,
          RuntimeOperationReachability.Reached,
        ),
        openReason: null,
      };
    }
    const projected = projectRuntimeSourceExpressionWithLifecycle({
      bindingProductHandle,
      expressionProductHandle,
      expressionChainIndex,
      expressionResourcePlan,
      expression,
      sourceScope,
      resourceScope,
      localKey,
      sourceAddressHandle,
      strictBinding,
      bindingBehavior,
      bindingExpressionScopes,
      activeContainer: activeContainer ?? null,
    });
    if (projected.kind !== RuntimeBindingSourceExpressionProjectionKind.Context) {
      return {
        context: null,
        openReason: projected.openReason
          ?? 'Runtime binding source value read could not project the source-evaluation Scope.',
      };
    }
    return {
      context: new RuntimeBindingSourceValueEvaluationContext(
        projected.expression,
        projected.scope,
        projected.activeContainer,
        this.activeBoundControllerReads,
        bindingExpressionScopes,
        bindingProductHandle,
        expressionProductHandle,
        expressionChainIndex,
        expressionResourcePlan,
        localKey,
        sourceAddressHandle,
        bindingBehavior,
        projected.resourceScope,
        strictBinding,
        projected.sourceEvaluationReachability,
      ),
      openReason: null,
    };
  }

  private projectBindingSourceExpressionWithLifecycle(
    expression: ExpressionAstNode,
    localKey: string,
    scope: BindingScope,
    bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation,
    sourceAddressHandle: AddressHandle | null,
  ): {
    readonly expression: ExpressionAstNode;
    readonly scope: BindingScope | null;
    readonly openReason: string | null;
  } | null {
    if (this.bindingExpressionScopes == null) {
      return null;
    }
    if (this.bindingProductHandle == null) {
      return null;
    }
    if (this.expressionResourcePlan == null) {
      return null;
    }
    if (this.resourceScope == null) {
      return null;
    }
    const projected = projectRuntimeSourceExpressionWithLifecycle({
      bindingProductHandle: this.bindingProductHandle,
      expressionProductHandle: this.expressionProductHandle,
      expressionChainIndex: this.expressionChainIndex,
      expressionResourcePlan: this.expressionResourcePlan,
      expression,
      sourceScope: scope,
      resourceScope: this.resourceScope,
      localKey,
      strictBinding: this.strictBinding,
      bindingBehavior,
      sourceAddressHandle,
      bindingExpressionScopes: this.bindingExpressionScopes,
      activeContainer: this.activeContainer ?? null,
    });
    return projected.kind === RuntimeBindingSourceExpressionProjectionKind.Open
      ? {
          expression,
          scope: null,
          openReason: projected.openReason,
        }
      : {
          expression: projected.expression,
          scope: projected.scope,
          openReason: null,
        };
  }
}

export function sourceValueContextForRuntimeBindingSourceExpressionProjection(
  projection: RuntimeBindingSourceExpressionContextProjection,
): RuntimeBindingSourceValueEvaluationContext {
  return RuntimeBindingSourceValueEvaluationContext.fromRuntimeBindingSourceExpressionProjection(
    projection,
  );
}

/** Projects a known-scope runtime binding source into the value-reduction request Aurelia expression consumers need. */
export function projectRuntimeBindingSourceValueContextInScope(
  input: RuntimeBindingSourceValueKnownScopeProjectionRequest,
): RuntimeBindingSourceValueContextProjection {
  if (input.binding == null) {
    return {
      context: RuntimeBindingSourceValueEvaluationContext.knownScope(
        input.expression,
        input.sourceScope,
        input.activeContainer,
        input.resourceScope ?? null,
      ),
      openReason: null,
    };
  }
  if (
    input.runtimeBindings == null
    || input.bindingExpressionScopes == null
    || input.expressionResourcePlan == null
  ) {
    return {
      context: null,
      openReason: 'Binding-owned source value read did not carry its runtime binding, source-scope, and expression-resource authorities.',
    };
  }
  const projection = projectRuntimeBindingSourceExpressionInScope(
    input.runtimeBindings,
    input.bindingExpressionScopes,
    input.expressionResourcePlan,
    {
      binding: input.binding,
      expressionProductHandle: input.expressionProductHandle,
      expressionChainIndex: input.expressionChainIndex,
      expression: input.expression,
      localKey: input.localKey,
      sourceScope: input.sourceScope,
    },
  );
  if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
    return {
      context: null,
      openReason: projection.openReason,
    };
  }
  return {
    context: sourceValueContextForRuntimeBindingSourceExpressionProjection(
      projection,
    ),
    openReason: null,
  };
}
