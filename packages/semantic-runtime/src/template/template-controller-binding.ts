import {
  expressionProductHandleForBinding,
  isRuntimeExpressionBinding,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import {
  HydrateTemplateControllerInstruction,
} from './instruction-ir.js';
import {
  templateControllerValueExpressionProductHandle,
} from './template-controller-value.js';

/**
 * Finds the runtime expression binding that supplies a template-controller value property in one render context.
 */
export function templateControllerRuntimeValueBinding(
  store: ProductDetailReadView,
  runtimeRendering: RuntimeRenderingEmission,
  instruction: HydrateTemplateControllerInstruction,
  controller: RuntimeControllerFrame | null,
): RuntimeExpressionBinding | null {
  const expressionProductHandle = templateControllerValueExpressionProductHandle(store, instruction);
  if (expressionProductHandle == null) {
    return null;
  }
  const bindings = runtimeRendering.readBindingsForExpressionProduct(expressionProductHandle)
    .filter(isRuntimeExpressionBinding)
    .filter((binding) => expressionProductHandleForBinding(binding) === expressionProductHandle)
    .filter((binding) => controller == null
      || runtimeRendering.requireRenderContextForBinding(binding.productHandle).targetController.productHandle
        === controller.productHandle);
  return bindings.length === 1 ? bindings[0]! : null;
}
