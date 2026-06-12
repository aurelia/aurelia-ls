import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';
import { readTemplateExpressionParse } from './expression-parse-product.js';
import { frameworkTemplateControllerSemanticsForName } from './template-controller-semantics.js';

export interface TemplateControllerValueTarget {
  readonly name: string;
  readonly sourceAddressHandle: AddressHandle | null;
}

export function templateControllerValueExpressionProductHandle(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): ProductHandle | null {
  const valueProperty = templateControllerValueProperty(instruction);
  if (valueProperty == null) {
    return null;
  }
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof PropertyBindingInstruction && binding.targetProperty === valueProperty) {
      return binding.expressionProductHandle;
    }
    if (binding instanceof InterpolationInstruction && binding.target === valueProperty) {
      return binding.expressionProductHandles[0] ?? null;
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

export function templateControllerValueTarget(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): TemplateControllerValueTarget | null {
  const productHandle = templateControllerValueExpressionProductHandle(store, instruction);
  const parse = readTemplateExpressionParse(store, productHandle);
  const expression = parse == null ? null : completedTemplateExpressionAstForParse(parse);
  const name = expression == null ? null : accessScopeTargetName(expression);
  return name == null
    ? null
    : {
      name,
      sourceAddressHandle: parse?.sourceAddressHandle ?? null,
    };
}

export function accessScopeTargetName(expression: ExpressionAstNode): string | null {
  if (expression.$kind === 'AccessScope' && expression.ancestor === 0) {
    return expression.name.name;
  }
  return expression.$kind === 'Paren'
    ? accessScopeTargetName(expression.expression)
    : null;
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
