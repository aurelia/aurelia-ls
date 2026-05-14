import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';

export interface TemplateControllerValueTarget {
  readonly name: string;
  readonly sourceAddressHandle: AddressHandle | null;
}

export function templateControllerValueExpressionProductHandle(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): ProductHandle | null {
  for (const productHandle of instruction.bindingInstructionProductHandles) {
    const binding = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (binding instanceof PropertyBindingInstruction && binding.targetProperty === 'value') {
      return binding.expressionProductHandle;
    }
    if (binding instanceof InterpolationInstruction && binding.target === 'value') {
      return binding.expressionProductHandles[0] ?? null;
    }
  }
  return null;
}

export function templateControllerValueTarget(
  store: KernelStore,
  instruction: HydrateTemplateControllerInstruction,
): TemplateControllerValueTarget | null {
  const productHandle = templateControllerValueExpressionProductHandle(store, instruction);
  const parse = productHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
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
