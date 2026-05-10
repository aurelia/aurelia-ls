import type { BindingScope } from '../configuration/scope.js';
import type { ProductHandle } from '../kernel/handles.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
  PropertyBinding,
  RefBinding,
  SpreadValueBinding,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import type {
  TemplateInstructionScopeApplication,
} from '../template/template-controller-scope-materializer.js';

export type RuntimeExpressionBinding =
  | PropertyBinding
  | AttributeBinding
  | InterpolationBinding
  | ContentBinding
  | RefBinding
  | SpreadValueBinding;

export function isRuntimeExpressionBinding(
  binding: RuntimeBinding,
): binding is RuntimeExpressionBinding {
  return binding instanceof PropertyBinding
    || binding instanceof AttributeBinding
    || binding instanceof InterpolationBinding
    || binding instanceof ContentBinding
    || binding instanceof RefBinding
    || binding instanceof SpreadValueBinding;
}

export function expressionProductHandleForBinding(
  binding: RuntimeExpressionBinding,
): ProductHandle | null {
  if (binding instanceof InterpolationBinding) {
    return binding.expressionProductHandles[0] ?? null;
  }
  return binding.expressionProductHandle;
}

export function instructionScopeMap(
  applications: readonly TemplateInstructionScopeApplication[],
): ReadonlyMap<ProductHandle, BindingScope> {
  const result = new Map<ProductHandle, BindingScope>();
  for (const application of applications) {
    if (!result.has(application.instructionProductHandle)) {
      result.set(application.instructionProductHandle, application.scope);
    }
  }
  return result;
}
