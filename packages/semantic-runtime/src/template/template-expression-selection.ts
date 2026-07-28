import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { expressionSourceSpansEqual } from '../expression/source-span.js';
import { ExpressionParseResultInspector } from '../expression/parse-result-inspection.js';
import { sourceSpanContainsOffset } from '../kernel/address.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import { sourceSpanAddressForAddress } from '../kernel/source-address.js';
import type { KernelStore, KernelStoreReadView } from '../kernel/store.js';
import {
  instructionScopeLookup,
  isRuntimeExpressionBinding,
  type RuntimeInstructionScopeLookup,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import {
  bindingBehaviorEvaluationForRuntimeBindingSource,
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
  type RuntimeBindingSourceExpressionContextProjection,
} from '../observation/runtime-binding-source-expression-context.js';
import { CheckerExpressionTypeBindingBehaviorEvaluation } from '../type-system/expression-type-context.js';
import {
  RuntimeExpressionAccessOwnerKind,
  RuntimeExpressionOperationKind,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import type { TemplateResourceScope } from './compiler-world.js';
import { bindingExpressionAstForProductAtOffset } from './expression-parse-product.js';
import {
  expressionProductHandlesForInstruction,
  MultiAttrInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';
import type { TemplateExpressionParse } from './value-site.js';
import {
  resourceLocalAuthoredTemplateExpressionParses,
} from './runtime-resource-ownership.js';
import {
  templateScopeCanEvaluateSourceScope,
  templateScopesHaveEquivalentEvaluationContext,
} from './template-scope-replay.js';

export const enum RuntimeBindingSourceContextProjectionSelectionKind {
  /** All candidate runtime bindings converged to one source-context projection. */
  Context = 'context',
  /** Runtime binding candidates did not provide one deterministic source-context projection. */
  Open = 'open',
}

export interface RuntimeBindingSourceContextProjectionSelection {
  readonly kind: RuntimeBindingSourceContextProjectionSelectionKind.Context;
  /** Deterministic source-context projection shared by the candidate runtime bindings. */
  readonly projection: RuntimeBindingSourceExpressionContextProjection;
}

export interface RuntimeBindingSourceContextProjectionOpenSelection {
  readonly kind: RuntimeBindingSourceContextProjectionSelectionKind.Open;
  /** Why the runtime binding candidates could not select one source-context projection. */
  readonly openReason: string;
}

export type RuntimeBindingSourceContextProjectionSelectionResult =
  | RuntimeBindingSourceContextProjectionSelection
  | RuntimeBindingSourceContextProjectionOpenSelection;

export const enum RuntimeBindingSourceEnvironmentSelectionKind {
  /** Runtime binding candidates converged to one source Scope and compiler resource scope. */
  Context = 'context',
  /** Runtime binding candidates did not provide one deterministic source environment. */
  Open = 'open',
}

export interface RuntimeBindingSourceEnvironmentSelection {
  readonly kind: RuntimeBindingSourceEnvironmentSelectionKind.Context;
  readonly scope: BindingScope;
  readonly resourceScope: TemplateResourceScope;
  /** Lifecycle projection when the cursor has a complete expression AST. */
  readonly sourceProjection: RuntimeBindingSourceExpressionContextProjection | null;
}

export interface RuntimeBindingSourceEnvironmentOpenSelection {
  readonly kind: RuntimeBindingSourceEnvironmentSelectionKind.Open;
  readonly openReason: string;
}

export type RuntimeBindingSourceEnvironmentSelectionResult =
  | RuntimeBindingSourceEnvironmentSelection
  | RuntimeBindingSourceEnvironmentOpenSelection;

/**
 * Shared selection helpers for consumers that need to move from compiler-owned template products to runtime scope
 * products. Cursor inquiries, diagnostics, and TypeScript overlays should agree here instead of rediscovering the
 * expression-to-instruction-to-scope path locally.
 */
/** Compiler-front-door and recursive aggregate-render instructions available while analyzing one resource. */
function templateInstructionsInRuntimeAnalysis(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateInstruction[] {
  return [
    ...resource.compilation.compiledTemplate.instructions,
    ...resource.runtimeAnalysis.runtimeRendering.dynamicInstructions,
  ];
}

export function templateInstructionForExpressionParse(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
): TemplateInstruction | null {
  return templateInstructionForExpressionProductHandle(resource, expressionParse.productHandle);
}

/**
 * Authored expression parses whose exact product handles survived compiler assembly into an effective instruction.
 *
 * This is deliberately site-granular: aggregate `needsCompile` state cannot distinguish valid siblings from an
 * opaque `processContent` subtree in the same template.
 */
export function resourceLocalEffectiveTemplateExpressionParses(
  store: KernelStoreReadView & ProductDetailReadView,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateExpressionParse[] {
  return resourceLocalAuthoredTemplateExpressionParses(store, resource).filter((parse) =>
    templateInstructionForExpressionParse(resource, parse) != null
  );
}

export function templateInstructionForExpressionProductHandle(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
): TemplateInstruction | null {
  return templateInstructionsInRuntimeAnalysis(resource).find((candidate) =>
    expressionProductHandlesForInstruction(candidate).includes(expressionProductHandle)
  ) ?? null;
}

export function runtimeExpressionBindingsForTemplateExpressionProductHandle(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
): readonly RuntimeExpressionBinding[] {
  return resource.runtimeAnalysis.runtimeRendering
    .readBindingsForExpressionProduct(expressionProductHandle)
    .filter(isRuntimeExpressionBinding);
}

/** Runtime bindings for one expression product that can be evaluated from the ambient materialized scope. */
export function runtimeExpressionBindingsForTemplateExpressionProductHandleInScope(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
  scope: BindingScope,
  instructionScopes: RuntimeInstructionScopeLookup = instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes),
): readonly RuntimeExpressionBinding[] {
  const instruction = templateInstructionForExpressionProductHandle(resource, expressionProductHandle);
  if (instruction == null) {
    return [];
  }
  return runtimeExpressionBindingsForTemplateExpressionProductHandle(resource, expressionProductHandle)
    .filter((binding) =>
      bindingSourceScopeMatches(
        scope,
        instructionScopes.scopeForInstruction(
          instruction.productHandle,
          resource.runtimeAnalysis.runtimeRendering
            .requireRenderContextForBinding(binding.productHandle)
            .sourceController.productHandle,
        ),
      )
    );
}

export function runtimeExpressionBindingsForTemplateExpressionParse(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
): readonly RuntimeExpressionBinding[] {
  return runtimeExpressionBindingsForTemplateExpressionProductHandle(resource, expressionParse.productHandle);
}

/** Selects the exact runtime source environment even while an in-progress expression has no AST yet. */
export function bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
  offset: number,
  ambientScope: BindingScope | null = null,
): RuntimeBindingSourceEnvironmentSelectionResult {
  const expression = bindingExpressionAstForProductAtOffset(store, expressionParse.productHandle, offset)
    ?? ExpressionParseResultInspector.memberOwnerAtOffset(expressionParse.result, offset);
  const bindings = ambientScope == null
    ? runtimeExpressionBindingsForTemplateExpressionParse(resource, expressionParse)
    : runtimeExpressionBindingsForTemplateExpressionParseInScope(resource, expressionParse, ambientScope);
  if (expression == null) {
    return selectRuntimeBindingSourceEnvironment(
      resource,
      expressionParse,
      bindings,
      ambientScope,
    );
  }
  const sourceExpressions = new RuntimeBindingSourceExpressionContextProjector(
    resource.runtimeAnalysis.runtimeRendering,
    instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes),
    resource.runtimeAnalysis.scopes.bindingExpressionScopes,
  );
  const accessUses = runtimeExpressionAccessUsesForTemplateExpressionAtOffset(
    store,
    resource,
    expressionParse.productHandle,
    offset,
  );
  const accessUseOwnsSourceEnvironment = accessUses.some((accessUse) =>
    bindingBehaviorEvaluationForRuntimeExpressionAccessUse(accessUse) != null
  );
  const selection = accessUseOwnsSourceEnvironment
    ? selectRuntimeExpressionAccessUseSourceContextProjection({
        resource,
        accessUses,
        expression,
        localKey: `template-expression-selection:${expressionParse.productHandle}:access-use-source-scope`,
        sourceExpressions,
      })
    : selectRuntimeBindingSourceContextProjection({
        bindings,
        expression,
        localKey: `template-expression-selection:${expressionParse.productHandle}:source-scope`,
        sourceExpressions,
        bindingBehaviorForBinding: (binding) => bindingBehaviorEvaluationForTemplateExpression(
          resource,
          expressionParse.productHandle,
          binding,
        ),
      });
  return selection.kind === RuntimeBindingSourceContextProjectionSelectionKind.Open
    ? {
        kind: RuntimeBindingSourceEnvironmentSelectionKind.Open,
        openReason: selection.openReason,
      }
    : {
        kind: RuntimeBindingSourceEnvironmentSelectionKind.Context,
        scope: selection.projection.scope,
        resourceScope: selection.projection.resourceScope,
        sourceProjection: selection.projection,
      };
}

function selectRuntimeBindingSourceEnvironment(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
  bindings: readonly RuntimeExpressionBinding[],
  ambientScope: BindingScope | null,
): RuntimeBindingSourceEnvironmentSelectionResult {
  const instruction = templateInstructionForExpressionParse(resource, expressionParse);
  if (instruction == null) {
    return {
      kind: RuntimeBindingSourceEnvironmentSelectionKind.Open,
      openReason: 'Template expression did not retain an effective runtime instruction.',
    };
  }
  const instructionScopes = instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes);
  const candidates = bindings.flatMap((binding) => {
    const renderContext = resource.runtimeAnalysis.runtimeRendering.requireRenderContextForBinding(
      binding.productHandle,
    );
    const scope = ambientScope ?? instructionScopes.scopeForInstruction(
      instruction.productHandle,
      renderContext.sourceController.productHandle,
    );
    return scope == null
      ? []
      : [{
          scope,
          resourceScope: renderContext.resourceScope,
          strictBinding: renderContext.renderingController.strict,
        }];
  });
  if (candidates.length !== bindings.length || candidates.length === 0) {
    return {
      kind: RuntimeBindingSourceEnvironmentSelectionKind.Open,
      openReason: 'Runtime binding candidates did not retain a complete source environment.',
    };
  }
  const first = candidates[0]!;
  const divergent = candidates.find((candidate) =>
    !templateScopesHaveEquivalentEvaluationContext(first.scope, candidate.scope)
    || first.resourceScope.identityHandle !== candidate.resourceScope.identityHandle
    || first.strictBinding !== candidate.strictBinding
  );
  return divergent == null
    ? {
        kind: RuntimeBindingSourceEnvironmentSelectionKind.Context,
        scope: first.scope,
        resourceScope: first.resourceScope,
        sourceProjection: null,
      }
    : {
        kind: RuntimeBindingSourceEnvironmentSelectionKind.Open,
        openReason: 'Runtime binding candidates have multiple distinct source environments for this expression site.',
      };
}

export function selectRuntimeBindingSourceContextProjection(
  input: {
    readonly bindings: readonly RuntimeExpressionBinding[];
    readonly expression: ExpressionAstNode;
    readonly localKey: string;
    readonly sourceExpressions: RuntimeBindingSourceExpressionContextProjector;
    readonly bindingBehaviorForBinding: (
      binding: RuntimeExpressionBinding,
    ) => CheckerExpressionTypeBindingBehaviorEvaluation;
  },
): RuntimeBindingSourceContextProjectionSelectionResult {
  const projections: RuntimeBindingSourceExpressionContextProjection[] = [];
  let openReason: string | null = null;
  for (const binding of input.bindings) {
    const projection = input.sourceExpressions.projectSourceWithBindingBehavior(
      {
        binding,
        expression: input.expression,
        localKey: input.localKey,
      },
      input.bindingBehaviorForBinding(binding),
    );
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      openReason ??= projection.openReason;
      continue;
    }
    projections.push(projection);
  }
  return selectConvergedRuntimeBindingSourceContextProjection(projections, openReason);
}

function selectRuntimeExpressionAccessUseSourceContextProjection(
  input: {
    readonly resource: TemplateResourceRuntimeAnalysisEmission;
    readonly accessUses: readonly RuntimeExpressionAccessUse[];
    readonly expression: ExpressionAstNode;
    readonly localKey: string;
    readonly sourceExpressions: RuntimeBindingSourceExpressionContextProjector;
  },
): RuntimeBindingSourceContextProjectionSelectionResult {
  const projections: RuntimeBindingSourceExpressionContextProjection[] = [];
  let openReason: string | null = null;
  const scopes = input.resource.runtimeAnalysis.scopes.readScopes();
  for (const accessUse of input.accessUses) {
    if (accessUse.ownerKind !== RuntimeExpressionAccessOwnerKind.Binding) {
      openReason ??= 'Template expression access use is not owned by a runtime binding.';
      continue;
    }
    const binding = input.resource.runtimeAnalysis.runtimeRendering.readBinding(accessUse.ownerProductHandle);
    const sourceScope = accessUse.scopeProductHandle == null
      ? null
      : scopes.find((scope) => scope.productHandle === accessUse.scopeProductHandle) ?? null;
    if (binding == null || !isRuntimeExpressionBinding(binding) || sourceScope == null) {
      openReason ??= 'Runtime expression access use did not retain its binding-owned source environment.';
      continue;
    }
    const bindingBehavior = bindingBehaviorEvaluationForRuntimeExpressionAccessUse(accessUse);
    if (bindingBehavior == null) {
      openReason ??= `Runtime expression operation '${accessUse.operationKind}' has no cursor source-context projection.`;
      continue;
    }
    const projection = input.sourceExpressions.projectSourceWithBindingBehavior(
      {
        binding,
        expression: input.expression,
        localKey: input.localKey,
        sourceScope,
      },
      bindingBehavior,
    );
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      openReason ??= projection.openReason;
      continue;
    }
    projections.push(projection);
  }
  return selectConvergedRuntimeBindingSourceContextProjection(projections, openReason);
}

function selectConvergedRuntimeBindingSourceContextProjection(
  projections: readonly RuntimeBindingSourceExpressionContextProjection[],
  openReason: string | null,
): RuntimeBindingSourceContextProjectionSelectionResult {
  const first = projections[0] ?? null;
  if (first == null) {
    return {
      kind: RuntimeBindingSourceContextProjectionSelectionKind.Open,
      openReason: openReason
        ?? 'Runtime binding source expression did not have any source-context projection candidates.',
    };
  }

  if (openReason != null) {
    return {
      kind: RuntimeBindingSourceContextProjectionSelectionKind.Open,
      openReason: `Runtime binding source expression had both closed and open source-context projections: ${openReason}`,
    };
  }

  const divergent = projections.find((projection) =>
    !runtimeBindingSourceContextProjectionsMatch(first, projection)
  );
  if (divergent != null) {
    return {
      kind: RuntimeBindingSourceContextProjectionSelectionKind.Open,
      openReason: 'Runtime binding source expression has multiple distinct source-context projections for this expression site.',
    };
  }

  return {
    kind: RuntimeBindingSourceContextProjectionSelectionKind.Context,
    projection: first,
  };
}

export function runtimeExpressionAccessUsesForTemplateExpressionAtOffset(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
  offset: number,
): readonly RuntimeExpressionAccessUse[] {
  const accessUses = runtimeExpressionAccessUsesForTemplateExpression(
    resource,
    expressionProductHandle,
  )
    .filter((accessUse) => accessUse.nameSourceAddressHandle != null);
  const selected = accessUses.filter((accessUse) => {
    const source = sourceSpanAddressForAddress(store, accessUse.nameSourceAddressHandle);
    return source != null && sourceSpanContainsOffset(source, offset);
  });
  return selected.length > 0 ? selected : accessUses;
}

/** Runtime access occurrences owned by one effective template expression product. */
export function runtimeExpressionAccessUsesForTemplateExpression(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
): readonly RuntimeExpressionAccessUse[] {
  return resource.runtimeAnalysis.expressionAccessUses
    .readAccessUsesForExpressionProduct(expressionProductHandle)
    .filter((accessUse) => accessUse.ownerKind === RuntimeExpressionAccessOwnerKind.Binding);
}

function bindingBehaviorEvaluationForRuntimeExpressionAccessUse(
  accessUse: RuntimeExpressionAccessUse,
): CheckerExpressionTypeBindingBehaviorEvaluation | null {
  switch (accessUse.operationKind) {
    // Repeat invokes astEvaluate directly for key/contextual expressions; these authored accesses belong to the
    // repeated-item Scope but never enter the iterator binding's astBind lifecycle.
    case RuntimeExpressionOperationKind.RepeatKey:
    case RuntimeExpressionOperationKind.RepeatContextual:
      return CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly;
    default:
      return null;
  }
}

export function bindingBehaviorEvaluationForTemplateExpression(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
  binding: RuntimeExpressionBinding,
): CheckerExpressionTypeBindingBehaviorEvaluation {
  const instruction = templateInstructionForExpressionProductHandle(resource, expressionProductHandle);
  return instruction instanceof MultiAttrInstruction
    ? CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly
    : bindingBehaviorEvaluationForRuntimeBindingSource(binding);
}

/** Runtime bindings for one template expression parse that can be evaluated from the ambient materialized scope. */
export function runtimeExpressionBindingsForTemplateExpressionParseInScope(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
  scope: BindingScope,
  instructionScopes: RuntimeInstructionScopeLookup = instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes),
): readonly RuntimeExpressionBinding[] {
  return runtimeExpressionBindingsForTemplateExpressionProductHandleInScope(
    resource,
    expressionParse.productHandle,
    scope,
    instructionScopes,
  );
}

export function bindingScopeForTemplateExpressionParse(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
): BindingScope | null {
  const scopes = bindingScopesForTemplateExpressionParse(resource, expressionParse);
  const first = scopes[0] ?? null;
  return first != null && scopes.every((scope) =>
    templateScopesHaveEquivalentEvaluationContext(first, scope)
  )
    ? first
    : null;
}

export function bindingScopesForTemplateExpressionParse(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
): readonly BindingScope[] {
  const instruction = templateInstructionForExpressionParse(resource, expressionParse);
  if (instruction == null) {
    return [];
  }
  return uniqueBindingScopes(
    resource.runtimeAnalysis.scopes.instructionScopes
      .filter((candidate) =>
        candidate.instructionProductHandle === instruction.productHandle
      )
      .map((candidate) => candidate.scope),
  );
}

export function templateInstructionForProductHandle(
  resource: TemplateResourceRuntimeAnalysisEmission,
  productHandle: ProductHandle,
): TemplateInstruction | null {
  return templateInstructionsInRuntimeAnalysis(resource).find((candidate) =>
    candidate.productHandle === productHandle
  ) ?? null;
}

export function templateScopeRangeAddressHandle(
  resource: TemplateResourceRuntimeAnalysisEmission,
  scope: BindingScope,
): AddressHandle | null {
  const ownerProductHandle = scope.bindingContext.ownerProductHandle;
  if (ownerProductHandle == null) {
    return scope.sourceAddressHandle;
  }

  const effect = resource.runtimeAnalysis.runtimeRendering.scopeEffects.find((candidate) =>
    candidate.productHandle === ownerProductHandle
  ) ?? null;
  const controller = resource.runtimeAnalysis.runtimeRendering.controllers.find((candidate) =>
    candidate.productHandle === ownerProductHandle
  ) ?? null;
  const instructionProductHandle = effect?.ownerInstructionProductHandle
    ?? controller?.instructionProductHandle
    ?? null;
  if (instructionProductHandle == null) {
    return scope.sourceAddressHandle;
  }
  const instruction = templateInstructionForProductHandle(resource, instructionProductHandle);
  const nodeProductHandle = instruction == null ? null : instructionNodeProductHandle(instruction);
  const node = nodeProductHandle == null
    ? null
    : resource.compilation.html.nodes.find((candidate) => candidate.productHandle === nodeProductHandle) ?? null;
  return node?.sourceAddressHandle ?? scope.sourceAddressHandle;
}

function instructionNodeProductHandle(
  instruction: TemplateInstruction,
): ProductHandle | null {
  return 'node' in instruction ? instruction.node.productHandle : null;
}

function uniqueBindingScopes(
  scopes: readonly BindingScope[],
): readonly BindingScope[] {
  const seen = new Set<ProductHandle>();
  const result: BindingScope[] = [];
  for (const scope of scopes) {
    if (seen.has(scope.productHandle)) {
      continue;
    }
    seen.add(scope.productHandle);
    result.push(scope);
  }
  return result;
}

function bindingSourceScopeMatches(
  ambientScope: BindingScope,
  sourceScope: BindingScope | null,
): boolean {
  return sourceScope != null && templateScopeCanEvaluateSourceScope(ambientScope, sourceScope);
}

function runtimeBindingSourceContextProjectionsMatch(
  left: RuntimeBindingSourceExpressionContextProjection,
  right: RuntimeBindingSourceExpressionContextProjection,
): boolean {
  return templateScopesHaveEquivalentEvaluationContext(left.scope, right.scope)
    && templateScopesHaveEquivalentEvaluationContext(left.bindScope, right.bindScope)
    && left.resourceScope.identityHandle === right.resourceScope.identityHandle
    && left.strictBinding === right.strictBinding
    && left.sourceAddressHandle === right.sourceAddressHandle
    && left.localKey === right.localKey
    && left.bindingBehavior === right.bindingBehavior
    && left.sourceEvaluationReachability === right.sourceEvaluationReachability
    && left.expression.$kind === right.expression.$kind
    && expressionSourceSpansEqual(left.expression.span, right.expression.span)
    && left.authoredExpression.$kind === right.authoredExpression.$kind
    && expressionSourceSpansEqual(left.authoredExpression.span, right.authoredExpression.span);
}
