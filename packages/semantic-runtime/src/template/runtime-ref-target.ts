import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import { resolveCheckerDomNodeType } from '../type-system/dom-node-type.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { RuntimeBindingSourceOperationKind, RuntimeBindingTargetKind, type RefBinding, type RuntimeSourceOperation } from './runtime-binding.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import { HtmlElement, type HtmlNodeReference } from './html-ir.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import { RuntimeBindingSourceOperationTarget } from './runtime-controller-bind-publication.js';
import { runtimeBindingTargetController } from './runtime-binding-target-resolution.js';
import { TemplateProductDetails } from './product-details.js';

/** Resolve the value RefBinding writes using the selected render context and the authored host. */
export function resolveRuntimeRefTarget(
  binding: RefBinding,
  rendering: RuntimeRenderingEmission,
  projector: CheckerTypeProjector,
  typeSystem: TypeSystemProject | null,
  localKey: string,
): RuntimeBindingSourceOperationTarget {
  const target = binding.target;
  if (target === 'element') {
    const element = binding.node.productHandle == null ? null
      : projector.publication.readProductDetail(TemplateProductDetails.HtmlNode, binding.node.productHandle);
    if (!(element instanceof HtmlElement)) {
      return RuntimeBindingSourceOperationTarget.open('RefBinding element target did not carry a closed authored HTMLElement target.');
    }
    const type = typeSystem == null ? null : resolveCheckerDomNodeType(
      typeSystem, element.tagName, element.namespace, projector,
      `${localKey}:ref:${binding.productHandle}:element-target-type:observer-locator:target-type`,
      binding.sourceAddressHandle,
    )?.reference ?? null;
    return new RuntimeBindingSourceOperationTarget(RuntimeBindingTargetKind.Node, binding.node, null, type, null);
  }
  if (target === 'view') {
    return RuntimeBindingSourceOperationTarget.open('view.ref is not supported by Aurelia runtime-html.');
  }

  const generic = target === 'component' || target === 'controller';
  const controller = (generic ? runtimeBindingTargetController(rendering, binding) : null)
    ?? refHostController(projector.publication, rendering, binding, generic ? null : target);
  if (controller == null) {
    return RuntimeBindingSourceOperationTarget.open(generic
      ? `RefBinding ${target} target could not find a custom-element controller for the authored node.`
      : `RefBinding named custom-element target '${target}' was not found on the authored node.`);
  }
  return new RuntimeBindingSourceOperationTarget(
    target === 'controller' ? RuntimeBindingTargetKind.Controller : RuntimeBindingTargetKind.ControllerViewModel,
    null, controller.productHandle, target === 'controller' ? null : controller.viewModel?.targetType ?? null, null,
  );
}

function refHostController(
  store: ProductDetailReadView,
  rendering: RuntimeRenderingEmission,
  binding: RefBinding,
  name: string | null,
): RuntimeControllerFrame | null {
  const host = binding.node.productHandle;
  if (host == null) return null;
  const owner = rendering.requireRenderContextForBinding(binding.productHandle).renderingController;
  let element: RuntimeControllerFrame | null = null;
  for (const child of owner.readChildren()) {
    if (child.instructionProductHandle == null) continue;
    const instruction = store.readProductDetail(TemplateProductDetails.Instruction, child.instructionProductHandle);
    if (instruction?.node.productHandle !== host) continue;
    // A named attribute on this host takes precedence over a same-named element.
    if (instruction instanceof HydrateAttributeInstruction && instruction.resourceName === name) return child;
    if (instruction instanceof HydrateElementInstruction) {
      if (name == null) return child;
      if (element == null && (instruction.elementName === name || child.name === name)) element = child;
    }
  }
  return element;
}

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
