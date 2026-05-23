import type { BindingScope } from '../configuration/scope.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import {
  expressionProductHandlesForInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';

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
  return resource.compilation.compiledTemplate.instructions.find((candidate) =>
    expressionProductHandlesForInstruction(candidate).includes(expressionParse.productHandle)
  ) ?? null;
}

export function bindingScopeForTemplateExpressionParse(
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionParse: TemplateExpressionParse,
): BindingScope | null {
  const instruction = templateInstructionForExpressionParse(resource, expressionParse);
  if (instruction == null) {
    return null;
  }
  return resource.runtimeAnalysis.scopes.instructionScopes.find((candidate) =>
    candidate.instructionProductHandle === instruction.productHandle
  )?.scope ?? null;
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
