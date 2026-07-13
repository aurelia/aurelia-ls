import type { RuntimeSourceOperation } from './runtime-binding.js';
import { RuntimeBindingSourceOperationKind } from './runtime-binding.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
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
