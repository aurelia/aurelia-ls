import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  instructionScopeLookup,
  isRuntimeExpressionBinding,
  type RuntimeInstructionScopeLookup,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import {
  RuntimeBindingExpressionScopeProjector,
} from '../observation/runtime-binding-expression-scope.js';
import {
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
  type RuntimeBindingSourceExpressionContextProjection,
} from '../observation/runtime-binding-source-expression-context.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { bindingExpressionAstForProductAtOffset } from './expression-parse-product.js';
import { expressionProductHandlesForRuntimeBinding } from './runtime-binding-expression-products.js';
import {
  expressionProductHandlesForInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';
import { templateScopeCanEvaluateSourceScope } from './template-scope-replay.js';

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

/**
 * Shared selection helpers for consumers that need to move from compiler-owned template products to runtime scope
 * products. Cursor inquiries, diagnostics, and TypeScript overlays should agree here instead of rediscovering the
 * expression-to-instruction-to-scope path locally.
 */
export function templateExpressionParsesForResource(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateExpressionParse[] {
  return [
    ...resource.compilation.bindingCommandLowering.expressionParses,
    ...resource.compilation.valueSites.parses,
  ];
}

export function templateValueSitesForResource(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateValueSite[] {
  return [
    ...resource.compilation.bindingCommandLowering.valueSites,
    ...resource.compilation.valueSites.sites,
  ];
}

export function templateInstructionForExpressionParse(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
): TemplateInstruction | null {
  return templateInstructionForExpressionProductHandle(resource, expressionParse.productHandle);
}

export function templateInstructionForExpressionProductHandle(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
): TemplateInstruction | null {
  return resource.compilation.compiledTemplate.instructions.find((candidate) =>
    expressionProductHandlesForInstruction(candidate).includes(expressionProductHandle)
  ) ?? null;
}

export function runtimeExpressionBindingsForTemplateExpressionProductHandle(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
): readonly RuntimeExpressionBinding[] {
  const instruction = templateInstructionForExpressionProductHandle(resource, expressionProductHandle);
  if (instruction == null) {
    return [];
  }
  return resource.runtimeAnalysis.runtimeRendering
    .readBindingsForInstruction(instruction.productHandle)
    .filter(isRuntimeExpressionBinding)
    .filter((binding) =>
      expressionProductHandlesForRuntimeBinding(binding).includes(expressionProductHandle)
    );
}

/** Runtime bindings for one expression product that can be evaluated from the ambient materialized scope. */
export function runtimeExpressionBindingsForTemplateExpressionProductHandleInScope(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionProductHandle: ProductHandle,
  scope: BindingScope,
  instructionScopes: RuntimeInstructionScopeLookup = instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes),
): readonly RuntimeExpressionBinding[] {
  return runtimeExpressionBindingsForTemplateExpressionProductHandle(resource, expressionProductHandle)
    .filter((binding) =>
      bindingSourceScopeMatches(
        scope,
        instructionScopes.scopeForBinding(resource.runtimeAnalysis.runtimeRendering, binding),
      )
    );
}

export function runtimeExpressionBindingsForTemplateExpressionParse(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
): readonly RuntimeExpressionBinding[] {
  return runtimeExpressionBindingsForTemplateExpressionProductHandle(resource, expressionParse.productHandle);
}

/** Projects the runtime binding source context for a cursor expression, optionally narrowed by ambient template scope. */
export function bindingSourceContextProjectionForTemplateExpressionParseAtOffset(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionWorld: CheckerExpressionTypeWorld,
  expressionParse: TemplateExpressionParse,
  offset: number,
  ambientScope: BindingScope | null = null,
): RuntimeBindingSourceExpressionContextProjection | null {
  const expression = bindingExpressionAstForProductAtOffset(store, expressionParse.productHandle, offset);
  if (expression == null) {
    return null;
  }
  const bindings = ambientScope == null
    ? runtimeExpressionBindingsForTemplateExpressionParse(resource, expressionParse)
    : runtimeExpressionBindingsForTemplateExpressionParseInScope(resource, expressionParse, ambientScope);
  const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(store, expressionWorld);
  const selection = selectRuntimeBindingSourceContextProjection({
    bindings,
    expression,
    localKey: `template-expression-selection:${expressionParse.productHandle}:source-scope`,
    sourceScope: ambientScope,
    sourceExpressions: new RuntimeBindingSourceExpressionContextProjector(
      resource.runtimeAnalysis.runtimeRendering,
      instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes),
      bindingExpressionScopes,
    ),
  });
  return selection.kind === RuntimeBindingSourceContextProjectionSelectionKind.Context
    ? selection.projection
    : null;
}

export function selectRuntimeBindingSourceContextProjection(
  input: {
    readonly bindings: readonly RuntimeExpressionBinding[];
    readonly expression: ExpressionAstNode;
    readonly localKey: string;
    readonly sourceScope?: BindingScope | null;
    readonly sourceExpressions: RuntimeBindingSourceExpressionContextProjector;
  },
): RuntimeBindingSourceContextProjectionSelectionResult {
  const projections: RuntimeBindingSourceExpressionContextProjection[] = [];
  let openReason: string | null = null;
  for (const binding of input.bindings) {
    const projection = input.sourceExpressions.projectSource({
      binding,
      expression: input.expression,
      localKey: input.localKey,
      sourceScope: input.sourceScope,
    });
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      openReason ??= projection.openReason;
      continue;
    }
    projections.push(projection);
  }

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
  return scopes.length === 1
    ? scopes[0]!
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
  return resource.compilation.compiledTemplate.instructions.find((candidate) =>
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
  return left.scope.productHandle === right.scope.productHandle
    && left.strictBinding === right.strictBinding
    && left.sourceAddressHandle === right.sourceAddressHandle
    && left.localKey === right.localKey
    && left.bindingBehavior === right.bindingBehavior
    && left.expression.$kind === right.expression.$kind
    && expressionSpansMatch(left.expression, right.expression);
}

function expressionSpansMatch(
  left: ExpressionAstNode,
  right: ExpressionAstNode,
): boolean {
  return left.span.start === right.span.start
    && left.span.end === right.span.end
    && left.span.file?.id === right.span.file?.id;
}
