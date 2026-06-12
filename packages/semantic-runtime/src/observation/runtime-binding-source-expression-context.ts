import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { unwrapExpressionAstNodeParens } from '../expression/parse-result-inspection.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import {
  CheckerExpressionTypeEvaluationContext,
  CheckerExpressionTypeBindingBehaviorEvaluation,
  checkerExpressionTypeRuntimeContext,
  type CheckerExpressionTypeEvaluationRuntimeContext,
} from '../type-system/expression-type-context.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import {
  RuntimeBindingKind,
  TranslationBinding,
} from '../template/runtime-binding.js';
import type { RuntimeExpressionBinding } from './runtime-binding-expression.js';
import type { RuntimeInstructionScopeLookup } from './runtime-binding-expression.js';
import {
  RuntimeBindingExpressionScopeProjector,
} from './runtime-binding-expression-scope.js';

export const enum RuntimeBindingSourceExpressionProjectionKind {
  /** The binding source expression has a modeled runtime Scope and can be passed to expression consumers. */
  Context = 'context',
  /** The binding source expression could not be tied to the Scope Aurelia will use at runtime. */
  Open = 'open',
}

export interface RuntimeBindingSourceExpressionContextProjection {
  readonly kind: RuntimeBindingSourceExpressionProjectionKind.Context;
  /** Binding source expression after bind-time scope-changing behavior handoff has been applied. */
  readonly expression: ExpressionAstNode;
  /** Runtime Scope that Aurelia will use for this source expression. */
  readonly scope: BindingScope;
  /** Source-scope projector that owns later nested binding-behavior handoffs for this expression read. */
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
  /** Rendering-controller strict mode passed into Aurelia `astEvaluate` / `astAssign`. */
  readonly strictBinding: boolean | null;
  /** Authored source address for the owning runtime binding. */
  readonly sourceAddressHandle: AddressHandle | null;
  /** Local key used as the root for projected TypeChecker expression products. */
  readonly localKey: string;
  /** Whether the owning runtime binding applies binding-behavior bind side effects before source evaluation. */
  readonly bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation;
}

export interface RuntimeBindingSourceExpressionOpenProjection {
  readonly kind: RuntimeBindingSourceExpressionProjectionKind.Open;
  /** Reason this binding expression cannot be evaluated against a modeled runtime Scope. */
  readonly openReason: string;
  /** Rendering-controller strict mode, when known even though the source scope stayed open. */
  readonly strictBinding: boolean | null;
}

export type RuntimeBindingSourceExpressionProjection =
  | RuntimeBindingSourceExpressionContextProjection
  | RuntimeBindingSourceExpressionOpenProjection;

export interface RuntimeBindingSourceExpressionProjectionRequest {
  readonly binding: RuntimeExpressionBinding;
  readonly expression: ExpressionAstNode;
  readonly localKey: string;
  readonly sourceScope?: BindingScope | null;
}

export interface RuntimeBindingSourceExpressionKnownScopeProjectionRequest {
  /** Runtime binding whose strict mode and binding-behavior lifecycle shape the source read. */
  readonly binding: RuntimeExpressionBinding;
  /** Binding source expression before lifecycle-specific scope projection. */
  readonly expression: ExpressionAstNode;
  /** Semantic local key for projected TypeChecker/source-value products. */
  readonly localKey: string;
  /** Already-proven runtime Scope for this source expression. */
  readonly sourceScope: BindingScope;
}

export interface RuntimeSourceExpressionLifecycleProjectionRequest {
  /** Binding source expression before lifecycle-specific scope projection. */
  readonly expression: ExpressionAstNode;
  /** Already-proven runtime Scope for this source expression. */
  readonly sourceScope: BindingScope;
  /** Semantic local key for projected TypeChecker/source-value products. */
  readonly localKey: string;
  /** Authored source address for the owning runtime expression. */
  readonly sourceAddressHandle: AddressHandle | null;
  /** Rendering-controller strict mode passed into Aurelia `astEvaluate` / `astAssign`. */
  readonly strictBinding: boolean | null;
  /** Whether the owner applies binding-behavior bind side effects before source evaluation. */
  readonly bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation;
  /** Source-scope projector that owns binding-behavior `bind(...)` handoff for this read chain. */
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
}

/** Projects a runtime binding source into the exact Scope/strict context used by Aurelia expression consumers. */
export class RuntimeBindingSourceExpressionContextProjector {
  constructor(
    private readonly runtimeBindings: RuntimeRenderingEmission,
    private readonly instructionScopes: RuntimeInstructionScopeLookup,
    private readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
  ) {}

  projectSource(
    input: RuntimeBindingSourceExpressionProjectionRequest,
  ): RuntimeBindingSourceExpressionProjection {
    const strictBinding = this.strictBinding(input.binding);
    const bindingBehavior = bindingBehaviorEvaluationForRuntimeBindingSource(input.binding);
    const instructionScope = input.sourceScope
      ?? this.instructionScopes.scopeForBinding(this.runtimeBindings, input.binding);
    if (instructionScope == null) {
      return {
        kind: RuntimeBindingSourceExpressionProjectionKind.Open,
        openReason: 'Runtime binding did not have an unambiguous instruction Scope for source expression evaluation.',
        strictBinding,
      };
    }
    return projectRuntimeSourceExpressionWithLifecycle({
      expression: input.expression,
      sourceScope: instructionScope,
      localKey: input.localKey,
      sourceAddressHandle: input.binding.sourceAddressHandle,
      strictBinding,
      bindingBehavior,
      bindingExpressionScopes: this.bindingExpressionScopes,
    });
  }

  projectSourceExpressions(
    input: RuntimeBindingSourceExpressionProjectionRequest,
  ): readonly RuntimeBindingSourceExpressionProjection[] {
    const strictBinding = this.strictBinding(input.binding);
    const bindingBehavior = bindingBehaviorEvaluationForRuntimeBindingSource(input.binding);
    const instructionScope = input.sourceScope
      ?? this.instructionScopes.scopeForBinding(this.runtimeBindings, input.binding);
    if (instructionScope == null) {
      return [{
        kind: RuntimeBindingSourceExpressionProjectionKind.Open,
        openReason: 'Runtime binding did not have an unambiguous instruction Scope for source expression evaluation.',
        strictBinding,
      }];
    }
    return projectRuntimeSourceExpressionsWithLifecycle({
      expression: input.expression,
      sourceScope: instructionScope,
      localKey: input.localKey,
      sourceAddressHandle: input.binding.sourceAddressHandle,
      strictBinding,
      bindingBehavior,
      bindingExpressionScopes: this.bindingExpressionScopes,
    });
  }

  private strictBinding(
    binding: RuntimeExpressionBinding,
  ): boolean | null {
    return this.runtimeBindings.readRenderContextForBinding(binding.productHandle)?.renderingController.strict ?? null;
  }
}

/** Projects one runtime binding source when the caller already owns the exact source Scope. */
export function projectRuntimeBindingSourceExpressionInScope(
  runtimeBindings: RuntimeRenderingEmission,
  bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
  input: RuntimeBindingSourceExpressionKnownScopeProjectionRequest,
): RuntimeBindingSourceExpressionProjection {
  return projectRuntimeSourceExpressionWithLifecycle({
    expression: input.expression,
    sourceScope: input.sourceScope,
    localKey: input.localKey,
    sourceAddressHandle: input.binding.sourceAddressHandle,
    strictBinding: runtimeBindings.readRenderContextForBinding(input.binding.productHandle)?.renderingController.strict ?? null,
    bindingBehavior: bindingBehaviorEvaluationForRuntimeBindingSource(input.binding),
    bindingExpressionScopes,
  });
}

/** Projects all evaluated source expressions, including interpolation holes, for a known source Scope. */
export function projectRuntimeBindingSourceExpressionsInScope(
  runtimeBindings: RuntimeRenderingEmission,
  bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
  input: RuntimeBindingSourceExpressionKnownScopeProjectionRequest,
): readonly RuntimeBindingSourceExpressionProjection[] {
  return projectRuntimeSourceExpressionsWithLifecycle({
    expression: input.expression,
    sourceScope: input.sourceScope,
    localKey: input.localKey,
    sourceAddressHandle: input.binding.sourceAddressHandle,
    strictBinding: runtimeBindings.readRenderContextForBinding(input.binding.productHandle)?.renderingController.strict ?? null,
    bindingBehavior: bindingBehaviorEvaluationForRuntimeBindingSource(input.binding),
    bindingExpressionScopes,
  });
}

/** Converts a projected runtime binding source into the evaluator mode Aurelia will use for that source read. */
function runtimeContextForRuntimeBindingSourceExpressionProjection(
  projection: RuntimeBindingSourceExpressionContextProjection,
  connectable: boolean,
): CheckerExpressionTypeEvaluationRuntimeContext {
  return checkerExpressionTypeRuntimeContext(connectable, projection.strictBinding, projection.bindingBehavior);
}

export function checkerContextForRuntimeBindingSourceExpressionProjection(
  projection: RuntimeBindingSourceExpressionContextProjection,
  connectable: boolean,
  contextualType: CheckerTypeReference | null = null,
  localSuffix: string | null = null,
): CheckerExpressionTypeEvaluationContext {
  return CheckerExpressionTypeEvaluationContext.knownScope(
    projection.expression,
    projection.scope,
    localSuffix == null ? projection.localKey : `${projection.localKey}:${localSuffix}`,
    projection.sourceAddressHandle,
    contextualType,
    runtimeContextForRuntimeBindingSourceExpressionProjection(projection, connectable),
  );
}

/** Binding-behavior evaluation lifecycle used by Aurelia for a rendered runtime binding source. */
export function bindingBehaviorEvaluationForRuntimeBindingSource(
  binding: RuntimeExpressionBinding,
): CheckerExpressionTypeBindingBehaviorEvaluation {
  return binding instanceof TranslationBinding && binding.bindingKind === RuntimeBindingKind.Translation
    ? CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly
    : CheckerExpressionTypeBindingBehaviorEvaluation.AstBindThenEvaluate;
}

export function projectRuntimeSourceExpressionWithLifecycle(
  input: RuntimeSourceExpressionLifecycleProjectionRequest,
): RuntimeBindingSourceExpressionProjection {
  const projected = input.bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstBindThenEvaluate
    ? input.bindingExpressionScopes.project({
      expression: input.expression,
      scope: input.sourceScope,
      localKey: `${input.localKey}:runtime-expression-scope`,
      sourceAddressHandle: input.sourceAddressHandle,
    })
    : {
      expression: input.expression,
      scope: input.sourceScope,
      openReason: null,
    };
  if (projected.scope == null) {
    return {
      kind: RuntimeBindingSourceExpressionProjectionKind.Open,
      openReason: projected.openReason
        ?? 'Runtime binding source expression did not project to a modeled source-evaluation Scope.',
      strictBinding: input.strictBinding,
    };
  }
  return {
    kind: RuntimeBindingSourceExpressionProjectionKind.Context,
    expression: projected.expression,
    scope: projected.scope,
    strictBinding: input.strictBinding,
    sourceAddressHandle: input.sourceAddressHandle,
    localKey: input.localKey,
    bindingBehavior: input.bindingBehavior,
    bindingExpressionScopes: input.bindingExpressionScopes,
  };
}

export function projectRuntimeSourceExpressionsWithLifecycle(
  input: RuntimeSourceExpressionLifecycleProjectionRequest,
): readonly RuntimeBindingSourceExpressionProjection[] {
  if (input.bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly) {
    return evaluateOnlySourceExpressions(input.expression).map((expression, index) => ({
      kind: RuntimeBindingSourceExpressionProjectionKind.Context,
      expression,
      scope: input.sourceScope,
      strictBinding: input.strictBinding,
      sourceAddressHandle: input.sourceAddressHandle,
      localKey: index === 0 ? input.localKey : `${input.localKey}:expression:${index}`,
      bindingBehavior: input.bindingBehavior,
      bindingExpressionScopes: input.bindingExpressionScopes,
    }));
  }
  return input.bindingExpressionScopes.projectSourceExpressions({
    expression: input.expression,
    scope: input.sourceScope,
    localKey: `${input.localKey}:runtime-expression-scope`,
    sourceAddressHandle: input.sourceAddressHandle,
  }).map((projected, index) => projected.scope == null
    ? {
        kind: RuntimeBindingSourceExpressionProjectionKind.Open,
        openReason: projected.openReason
          ?? 'Runtime binding source expression did not project to a modeled source-evaluation Scope.',
        strictBinding: input.strictBinding,
      }
    : {
        kind: RuntimeBindingSourceExpressionProjectionKind.Context,
        expression: projected.expression,
        scope: projected.scope,
        strictBinding: input.strictBinding,
        sourceAddressHandle: input.sourceAddressHandle,
        localKey: index === 0 ? input.localKey : `${input.localKey}:expression:${index}`,
        bindingBehavior: input.bindingBehavior,
        bindingExpressionScopes: input.bindingExpressionScopes,
      });
}

function evaluateOnlySourceExpressions(
  expression: ExpressionAstNode,
): readonly ExpressionAstNode[] {
  const unwrapped = unwrapEvaluateOnlyExpression(expression);
  return unwrapped.$kind === 'Interpolation'
    ? unwrapped.expressions.map(unwrapEvaluateOnlyExpression)
    : [unwrapped];
}

function unwrapEvaluateOnlyExpression(
  expression: ExpressionAstNode,
): ExpressionAstNode {
  let current = unwrapExpressionAstNodeParens(expression);
  while (current.$kind === 'BindingBehavior') {
    current = unwrapExpressionAstNodeParens(current.expression);
  }
  return current;
}
