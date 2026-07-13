import type { KernelStore } from '../kernel/store.js';
import { HtmlElement } from './html-ir.js';
import { TemplateProductDetails } from './product-details.js';
import {
  InterpolationBinding,
  PropertyBinding,
  RuntimeBindingTarget,
  RuntimeBindingTargetKind,
  SpreadValueBinding,
  type RuntimeBinding,
} from './runtime-binding.js';
import type { RuntimeBindingRenderContext } from './runtime-rendered-instruction-recorder.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';

/** Controller selected by renderer context as the runtime target of one binding. */
export function runtimeBindingTargetController(
  runtimeRendering: RuntimeRenderingEmission,
  binding: RuntimeBinding,
): RuntimeControllerFrame | null {
  return targetControllerForContext(runtimeRendering.readRenderContextForBinding(binding.productHandle));
}

/** Target object visible to behavior bind and ordinary target-access selection. */
export function runtimeBindingAccessTarget(
  store: KernelStore,
  binding: RuntimeBinding,
  targetController: RuntimeControllerFrame | null,
): RuntimeBindingTarget {
  if ((binding instanceof PropertyBinding
    || binding instanceof InterpolationBinding
    || binding instanceof SpreadValueBinding)
    && targetController != null) {
    return new RuntimeBindingTarget(
      RuntimeBindingTargetKind.ControllerViewModel,
      null,
      targetController.productHandle,
      targetController.viewModel?.targetType ?? null,
      null,
      null,
    );
  }

  const element = htmlElementForBinding(store, binding);
  if (element == null) {
    return new RuntimeBindingTarget(
      RuntimeBindingTargetKind.Unknown,
      null,
      null,
      null,
      null,
      null,
    );
  }

  return new RuntimeBindingTarget(
    RuntimeBindingTargetKind.Node,
    binding.node,
    null,
    null,
    element.tagName,
    element.namespace,
  );
}

function targetControllerForContext(
  context: RuntimeBindingRenderContext | null,
): RuntimeControllerFrame | null {
  return context == null || context.targetController.productHandle === context.renderingController.productHandle
    ? null
    : context.targetController;
}

function htmlElementForBinding(
  store: KernelStore,
  binding: RuntimeBinding,
): HtmlElement | null {
  if (binding.node.productHandle == null) {
    return null;
  }
  const node = store.productDetails.read(TemplateProductDetails.HtmlNode, binding.node.productHandle);
  return node instanceof HtmlElement ? node : null;
}
