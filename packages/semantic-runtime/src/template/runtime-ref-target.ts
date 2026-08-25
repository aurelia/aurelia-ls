import type { RuntimeSourceOperation } from './runtime-binding.js';
import { RuntimeBindingSourceOperationKind } from './runtime-binding.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import type { HtmlNodeReference } from './html-ir.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';

/** Resolve a named ref operation to the same-node resource controller selected by runtime rendering. */
export function namedRefTargetController(
  rendering: RuntimeRenderingEmission,
  operation: RuntimeSourceOperation,
): RuntimeControllerFrame | null {
  if (
    operation.operationKind !== RuntimeBindingSourceOperationKind.RefAssignTarget
    || !isNamedResourceRefTarget(operation.targetName)
    || operation.targetControllerProductHandle == null
  ) {
    return null;
  }
  return rendering.controllers.find((controller) =>
    controller.productHandle === operation.targetControllerProductHandle
  ) ?? null;
}

/** Authorable ref targets proven by the hydration instructions for one host node. */
export function runtimeRefTargetNames(
  instructions: readonly TemplateInstruction[],
  refHost: HtmlNodeReference,
): readonly string[] {
  const names = new Set<string>(['element']);
  for (const instruction of instructions) {
    if (!sameHtmlNodeReference(instruction.node, refHost)) {
      continue;
    }
    if (instruction instanceof HydrateAttributeInstruction && instruction.definitionProductHandle != null) {
      names.add(instruction.resourceName);
      continue;
    }
    if (instruction instanceof HydrateElementInstruction && instruction.definitionProductHandle != null) {
      names.add('controller');
      names.add('component');
      names.add(instruction.elementName);
    }
  }
  return [...names];
}

export function hasSameNodeCustomAttributeHydration(
  instructions: readonly TemplateInstruction[],
  refHost: HtmlNodeReference,
  attributeName: string,
): boolean {
  return instructions.some((instruction) =>
    instruction instanceof HydrateAttributeInstruction
    && instruction.resourceName === attributeName
    && instruction.definitionProductHandle != null
    && sameHtmlNodeReference(instruction.node, refHost)
  );
}

/** Select the resource instruction reached by runtime named-ref precedence on one host node. */
export function runtimeNamedRefResourceInstruction(
  instructions: readonly TemplateInstruction[],
  refHost: HtmlNodeReference,
  targetName: string,
): HydrateAttributeInstruction | HydrateElementInstruction | null {
  const attribute = instructions.find((instruction): instruction is HydrateAttributeInstruction =>
    instruction instanceof HydrateAttributeInstruction
    && instruction.resourceName === targetName
    && instruction.definitionProductHandle != null
    && sameHtmlNodeReference(instruction.node, refHost)
  ) ?? null;
  if (attribute != null) {
    return attribute;
  }
  return instructions.find((instruction): instruction is HydrateElementInstruction =>
    instruction instanceof HydrateElementInstruction
    && instruction.elementName === targetName
    && instruction.definitionProductHandle != null
    && sameHtmlNodeReference(instruction.node, refHost)
  ) ?? null;
}

export function hasSameNodeCustomElementHydration(
  instructions: readonly TemplateInstruction[],
  refHost: HtmlNodeReference,
  elementName: string | null = null,
): boolean {
  return instructions.some((instruction) =>
    instruction instanceof HydrateElementInstruction
    && (elementName == null || instruction.elementName === elementName)
    && instruction.definitionProductHandle != null
    && sameHtmlNodeReference(instruction.node, refHost)
  );
}

export function sameHtmlNodeReference(left: HtmlNodeReference, right: HtmlNodeReference): boolean {
  if (left.productHandle != null && right.productHandle != null) {
    return left.productHandle === right.productHandle;
  }
  if (left.identityHandle != null && right.identityHandle != null) {
    return left.identityHandle === right.identityHandle;
  }
  return left === right;
}

function isNamedResourceRefTarget(targetName: string): boolean {
  switch (targetName) {
    case 'element':
    case 'controller':
    case 'component':
    case 'view':
      return false;
    default:
      return true;
  }
}
