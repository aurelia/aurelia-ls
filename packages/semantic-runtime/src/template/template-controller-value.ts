import type { ProductHandle } from '../kernel/handles.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';

/** Only a known case value can exclude all its represented types from a later branch. */
export function templateControllerCaseHasExactMatchDomain(
  store: ProductDetailReadView,
  instruction: HydrateTemplateControllerInstruction,
): boolean {
  if (templateControllerStaticValue(store, instruction) != null) return true;
  const binding = templateControllerValuePropertyBinding(store, instruction);
  const parse = binding?.expressionProductHandle == null ? null
    : store.readProductDetail(TemplateProductDetails.ExpressionParse, binding.expressionProductHandle);
  let value = parse == null ? null : completedTemplateExpressionAstForParse(parse);
  while (value?.$kind === 'Paren') value = value.expression;
  return value?.$kind === 'PrimitiveLiteral'
    || (value?.$kind === 'ArrayLiteral' && value.elements.every(element => element.$kind === 'PrimitiveLiteral'));
}

export function templateControllerValueExpressionProductHandle(
  store: ProductDetailReadView,
  instruction: HydrateTemplateControllerInstruction,
): ProductHandle | null {
  const propertyBinding = templateControllerValuePropertyBinding(store, instruction);
  if (propertyBinding != null) {
    return propertyBinding.expressionProductHandle;
  }
  const valueProperty = templateControllerValueProperty(store, instruction);
  if (valueProperty == null) {
    return null;
  }
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof InterpolationInstruction && binding.target === valueProperty) {
      return binding.expressionProductHandles[0] ?? null;
    }
  }
  return null;
}

export function templateControllerValuePropertyBinding(
  store: ProductDetailReadView,
  instruction: HydrateTemplateControllerInstruction,
): PropertyBindingInstruction | null {
  const valueProperty = templateControllerValueProperty(store, instruction);
  if (valueProperty == null) {
    return null;
  }
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof PropertyBindingInstruction && binding.targetProperty === valueProperty) {
      return binding;
    }
  }
  return null;
}

export function templateControllerStaticValue(
  store: ProductDetailReadView,
  instruction: HydrateTemplateControllerInstruction,
): string | null {
  const valueProperty = templateControllerValueProperty(store, instruction);
  return valueProperty == null
    ? null
    : templateControllerStaticPropertyValue(store, instruction, valueProperty);
}

export function templateControllerStaticPropertyValue(
  store: ProductDetailReadView,
  instruction: HydrateTemplateControllerInstruction,
  targetProperty: string,
): string | null {
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof SetPropertyInstruction && binding.targetProperty === targetProperty) {
      return binding.value;
    }
  }
  return null;
}

export function staticTemplateControllerBooleanProperty(
  store: ProductDetailReadView,
  instruction: HydrateTemplateControllerInstruction,
  targetProperty: string,
  fallback: boolean,
): boolean | null {
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof SetPropertyInstruction && binding.targetProperty === targetProperty) {
      return coerceTemplateControllerBoolean(binding.value);
    }
    if ((binding instanceof PropertyBindingInstruction && binding.targetProperty === targetProperty)
      || (binding instanceof InterpolationInstruction && binding.target === targetProperty)) {
      return null;
    }
  }
  return fallback;
}

export function templateControllerValueProperty(
  store: ProductDetailReadView,
  instruction: HydrateTemplateControllerInstruction,
): string | null {
  const definition = instruction.definitionProductHandle == null
    ? null
    : store.readProductDetail(ResourceProductDetails.Definition, instruction.definitionProductHandle);
  return definition instanceof CustomAttributeDefinition && definition.isTemplateController
    ? definition.defaultProperty
    : null;
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
