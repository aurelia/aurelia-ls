import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import { frameworkTemplateControllerSemanticsForName } from './template-controller-semantics.js';

export function templateControllerValueExpressionProductHandle(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): ProductHandle | null {
  const propertyBinding = templateControllerValuePropertyBinding(store, instruction);
  if (propertyBinding != null) {
    return propertyBinding.expressionProductHandle;
  }
  const valueProperty = templateControllerValueProperty(instruction);
  if (valueProperty == null) {
    return null;
  }
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof InterpolationInstruction && binding.target === valueProperty) {
      return binding.expressionProductHandles[0] ?? null;
    }
  }
  return null;
}

export function templateControllerValuePropertyBinding(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): PropertyBindingInstruction | null {
  const valueProperty = templateControllerValueProperty(instruction);
  if (valueProperty == null) {
    return null;
  }
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof PropertyBindingInstruction && binding.targetProperty === valueProperty) {
      return binding;
    }
  }
  return null;
}

export function templateControllerStaticValue(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): string | null {
  const valueProperty = templateControllerValueProperty(instruction);
  return valueProperty == null
    ? null
    : templateControllerStaticPropertyValue(store, instruction, valueProperty);
}

export function templateControllerStaticPropertyValue(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
  targetProperty: string,
): string | null {
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof SetPropertyInstruction && binding.targetProperty === targetProperty) {
      return binding.value;
    }
  }
  return null;
}

export function staticTemplateControllerBooleanProperty(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
  targetProperty: string,
  fallback: boolean,
): boolean | null {
  let sawTarget = false;
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof SetPropertyInstruction && binding.targetProperty === targetProperty) {
      sawTarget = true;
      return coerceTemplateControllerBoolean(binding.value);
    }
    if (binding instanceof PropertyBindingInstruction && binding.targetProperty === targetProperty) {
      sawTarget = true;
      return null;
    }
  }
  return sawTarget ? null : fallback;
}

export function templateControllerValueProperty(
  instruction: HydrateTemplateControllerInstruction,
): string | null {
  return frameworkTemplateControllerSemanticsForName(instruction.controllerName)?.valueProperty ?? 'value';
}

function coerceTemplateControllerBoolean(value: string): boolean {
  switch (value) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return !!value;
  }
}
