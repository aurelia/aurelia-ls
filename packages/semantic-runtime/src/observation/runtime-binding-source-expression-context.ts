import type { BindingScope } from '../configuration/scope.js';
import type { Container } from '../di/container.js';
import type {
  BindingBehaviorExpression,
  ExpressionAstNode,
  ValueConverterExpression,
} from '../expression/ast.js';
import { unwrapExpressionAstNodeParens } from '../expression/parse-result-inspection.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
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
  type RuntimeBindingExpressionScopeProjectionReader,
} from './runtime-binding-expression-scope.js';
import { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';

export const enum RuntimeBindingSourceExpressionProjectionKind {
  /** The binding source expression has a modeled runtime Scope and can be passed to expression consumers. */
  Context = 'context',
  /** The binding source expression could not be tied to the Scope Aurelia will use at runtime. */
  Open = 'open',
}

export interface RuntimeBindingSourceExpressionContextProjection {
  readonly kind: RuntimeBindingSourceExpressionProjectionKind.Context;
  /** Authored expression before binding-behavior bind-time scope handoff strips wrappers. */
  readonly authoredExpression: ExpressionAstNode;
  /** Instruction Scope passed to binding-behavior arguments during `astBind`. */
  readonly bindScope: BindingScope;
  /** Binding source expression after bind-time scope-changing behavior handoff has been applied. */
  readonly expression: ExpressionAstNode;
  /** Runtime Scope that Aurelia will use for this source expression. */
  readonly scope: BindingScope;
  /** Exact rendered binding whose bind-time resource plan produced this source context. */
  readonly bindingProductHandle: ProductHandle;
  /** Compiler resource scope that lowered the runtime binding owning this source expression. */
  readonly resourceScope: TemplateResourceScope;
  /** Active runtime container visible to source-expression DI and binding-behavior handoff. */
  readonly activeContainer: Container | null;
  /** Source-scope projector that owns later nested binding-behavior handoffs for this expression read. */
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader;
  /** Rendering-controller strict mode passed into Aurelia `astEvaluate` / `astAssign`. */
  readonly strictBinding: boolean | null;
  /** Authored source address for the owning runtime binding. */
  readonly sourceAddressHandle: AddressHandle | null;
  /** Local key used as the root for projected TypeChecker expression products. */
  readonly localKey: string;
  /** Whether the owning runtime binding applies binding-behavior bind side effects before source evaluation. */
  readonly bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation;
  /** Whether the binding completed `astBind(...)` far enough to enter source evaluation. */
  readonly sourceEvaluationReachability: RuntimeOperationReachability;
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
  /** Exact rendered binding whose bind-time resource plan owns this source expression. */
  readonly bindingProductHandle: ProductHandle;
  /** Binding source expression before lifecycle-specific scope projection. */
  readonly expression: ExpressionAstNode;
  /** Already-proven runtime Scope for this source expression. */
  readonly sourceScope: BindingScope;
  /** Compiler resource scope visible to resource-backed expression semantics. */
  readonly resourceScope: TemplateResourceScope;
  /** Active runtime container visible to source-expression DI and binding-behavior handoff. */
  readonly activeContainer: Container | null;
  /** Semantic local key for projected TypeChecker/source-value products. */
  readonly localKey: string;
  /** Authored source address for the owning runtime expression. */
  readonly sourceAddressHandle: AddressHandle | null;
  /** Rendering-controller strict mode passed into Aurelia `astEvaluate` / `astAssign`. */
  readonly strictBinding: boolean | null;
  /** Whether the owner applies binding-behavior bind side effects before source evaluation. */
  readonly bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation;
  /** Source-scope projector that owns binding-behavior `bind(...)` handoff for this read chain. */
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader;
}

/** Projects a runtime binding source into the exact Scope/strict context used by Aurelia expression consumers. */
export class RuntimeBindingSourceExpressionContextProjector {
  constructor(
    private readonly runtimeBindings: RuntimeRenderingEmission,
    private readonly instructionScopes: RuntimeInstructionScopeLookup,
    private readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader,
  ) {}

  projectSource(
    input: RuntimeBindingSourceExpressionProjectionRequest,
  ): RuntimeBindingSourceExpressionProjection {
    return this.projectSourceWithBindingBehavior(
      input,
      bindingBehaviorEvaluationForRuntimeBindingSource(input.binding),
    );
  }

  projectSourceWithBindingBehavior(
    input: RuntimeBindingSourceExpressionProjectionRequest,
    bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation,
  ): RuntimeBindingSourceExpressionProjection {
    const renderContext = this.runtimeBindings.requireRenderContextForBinding(input.binding.productHandle);
    const strictBinding = renderContext.renderingController.strict;
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
      bindingProductHandle: input.binding.productHandle,
      expression: input.expression,
      sourceScope: instructionScope,
      resourceScope: renderContext.resourceScope,
      activeContainer: renderContext.requireActiveContainer(),
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
    return this.projectSourceExpressionsWithBindingBehavior(
      input,
      bindingBehaviorEvaluationForRuntimeBindingSource(input.binding),
    );
  }

  projectSourceExpressionsWithBindingBehavior(
    input: RuntimeBindingSourceExpressionProjectionRequest,
    bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation,
  ): readonly RuntimeBindingSourceExpressionProjection[] {
    const renderContext = this.runtimeBindings.requireRenderContextForBinding(input.binding.productHandle);
    const strictBinding = renderContext.renderingController.strict;
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
      bindingProductHandle: input.binding.productHandle,
      expression: input.expression,
      sourceScope: instructionScope,
      resourceScope: renderContext.resourceScope,
      activeContainer: renderContext.requireActiveContainer(),
      localKey: input.localKey,
      sourceAddressHandle: input.binding.sourceAddressHandle,
      strictBinding,
      bindingBehavior,
      bindingExpressionScopes: this.bindingExpressionScopes,
    });
  }

}

/** Projects one runtime binding source when the caller already owns the exact source Scope. */
export function projectRuntimeBindingSourceExpressionInScope(
  runtimeBindings: RuntimeRenderingEmission,
  bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader,
  input: RuntimeBindingSourceExpressionKnownScopeProjectionRequest,
): RuntimeBindingSourceExpressionProjection {
  const renderContext = runtimeBindings.requireRenderContextForBinding(input.binding.productHandle);
  return projectRuntimeSourceExpressionWithLifecycle({
    bindingProductHandle: input.binding.productHandle,
    expression: input.expression,
    sourceScope: input.sourceScope,
    resourceScope: renderContext.resourceScope,
    activeContainer: renderContext.requireActiveContainer(),
    localKey: input.localKey,
    sourceAddressHandle: input.binding.sourceAddressHandle,
    strictBinding: renderContext.renderingController.strict,
    bindingBehavior: bindingBehaviorEvaluationForRuntimeBindingSource(input.binding),
    bindingExpressionScopes,
  });
}

/** Projects all evaluated source expressions, including interpolation holes, for a known source Scope. */
export function projectRuntimeBindingSourceExpressionsInScope(
  runtimeBindings: RuntimeRenderingEmission,
  bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader,
  input: RuntimeBindingSourceExpressionKnownScopeProjectionRequest,
): readonly RuntimeBindingSourceExpressionProjection[] {
  const renderContext = runtimeBindings.requireRenderContextForBinding(input.binding.productHandle);
  return projectRuntimeSourceExpressionsWithLifecycle({
    bindingProductHandle: input.binding.productHandle,
    expression: input.expression,
    sourceScope: input.sourceScope,
    resourceScope: renderContext.resourceScope,
    activeContainer: renderContext.requireActiveContainer(),
    localKey: input.localKey,
    sourceAddressHandle: input.binding.sourceAddressHandle,
    strictBinding: renderContext.renderingController.strict,
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

/** Creates the non-connectable original-scope context Aurelia uses for binding-behavior arguments at bind time. */
export function checkerContextForRuntimeBindingBehaviorArguments(
  projection: RuntimeBindingSourceExpressionContextProjection,
  contextualType: CheckerTypeReference | null = null,
  localSuffix: string | null = null,
): CheckerExpressionTypeEvaluationContext {
  return CheckerExpressionTypeEvaluationContext.knownScope(
    projection.authoredExpression,
    projection.bindScope,
    localSuffix == null ? projection.localKey : `${projection.localKey}:${localSuffix}`,
    projection.sourceAddressHandle,
    contextualType,
    checkerExpressionTypeRuntimeContext(
      false,
      projection.strictBinding,
      CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly,
    ),
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
      bindingProductHandle: input.bindingProductHandle,
      expression: input.expression,
      scope: input.sourceScope,
      localKey: `${input.localKey}:runtime-expression-scope`,
      sourceAddressHandle: input.sourceAddressHandle,
      resourceScope: input.resourceScope,
      activeContainer: input.activeContainer,
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
    authoredExpression: input.expression,
    bindScope: input.sourceScope,
    expression: projected.expression,
    scope: projected.scope,
    bindingProductHandle: input.bindingProductHandle,
    resourceScope: input.resourceScope,
    activeContainer: input.activeContainer,
    strictBinding: input.strictBinding,
    sourceAddressHandle: input.sourceAddressHandle,
    localKey: input.localKey,
    bindingBehavior: input.bindingBehavior,
    bindingExpressionScopes: input.bindingExpressionScopes,
    sourceEvaluationReachability: input.bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly
      ? RuntimeOperationReachability.Reached
      : input.bindingExpressionScopes.sourceEvaluationReachability(input.bindingProductHandle),
  };
}

export function projectRuntimeSourceExpressionsWithLifecycle(
  input: RuntimeSourceExpressionLifecycleProjectionRequest,
): readonly RuntimeBindingSourceExpressionProjection[] {
  const authoredParts = runtimeBindingSourceExpressionParts(input.expression);
  if (input.bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly) {
    return authoredParts.map((expression, index) => ({
      kind: RuntimeBindingSourceExpressionProjectionKind.Context,
      authoredExpression: expression,
      bindScope: input.sourceScope,
      expression,
      scope: input.sourceScope,
      bindingProductHandle: input.bindingProductHandle,
      resourceScope: input.resourceScope,
      activeContainer: input.activeContainer,
      strictBinding: input.strictBinding,
      sourceAddressHandle: input.sourceAddressHandle,
      localKey: index === 0 ? input.localKey : `${input.localKey}:expression:${index}`,
      bindingBehavior: input.bindingBehavior,
      bindingExpressionScopes: input.bindingExpressionScopes,
      sourceEvaluationReachability: RuntimeOperationReachability.Reached,
    }));
  }
  return input.bindingExpressionScopes.projectSourceExpressions({
    bindingProductHandle: input.bindingProductHandle,
    expression: input.expression,
    scope: input.sourceScope,
    localKey: `${input.localKey}:runtime-expression-scope`,
    sourceAddressHandle: input.sourceAddressHandle,
    resourceScope: input.resourceScope,
    activeContainer: input.activeContainer,
  }).map((projected, index) => projected.scope == null
    ? {
        kind: RuntimeBindingSourceExpressionProjectionKind.Open,
        openReason: projected.openReason
          ?? 'Runtime binding source expression did not project to a modeled source-evaluation Scope.',
        strictBinding: input.strictBinding,
      }
    : {
        kind: RuntimeBindingSourceExpressionProjectionKind.Context,
        authoredExpression: authoredParts[index] ?? input.expression,
        bindScope: input.sourceScope,
        expression: projected.expression,
        scope: projected.scope,
        bindingProductHandle: input.bindingProductHandle,
        resourceScope: input.resourceScope,
        activeContainer: input.activeContainer,
        strictBinding: input.strictBinding,
        sourceAddressHandle: input.sourceAddressHandle,
        localKey: index === 0 ? input.localKey : `${input.localKey}:expression:${index}`,
        bindingBehavior: input.bindingBehavior,
        bindingExpressionScopes: input.bindingExpressionScopes,
        sourceEvaluationReachability: input.bindingExpressionScopes.sourceEvaluationReachability(
          input.bindingProductHandle,
        ),
      });
}

export function runtimeBindingSourceExpressionParts(
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
