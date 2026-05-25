import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import {
  bindingExpressionAstForParseAtOffset,
  runtimeAcceptedBindingExpressionAstForParse,
  runtimeAssignmentTargetAstForParse,
} from './expression-parse-projection.js';
import { TemplateProductDetails } from './product-details.js';
import type { TemplateExpressionParse } from './value-site.js';

/** Reads a materialized template expression parse without re-declaring the product-detail key at each consumer. */
export function readTemplateExpressionParse(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): TemplateExpressionParse | null {
  return expressionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
}

/** Reads the runtime-accepted binding AST for a materialized expression product. */
export function bindingExpressionAstForProduct(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): ExpressionAstNode | null {
  const parse = readTemplateExpressionParse(store, expressionProductHandle);
  return parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
}

/** Reads the cursor-active runtime binding expression for a materialized expression product. */
export function bindingExpressionAstForProductAtOffset(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
  offset: number,
): ExpressionAstNode | null {
  const parse = readTemplateExpressionParse(store, expressionProductHandle);
  return parse == null ? null : bindingExpressionAstForParseAtOffset(parse, offset);
}

/** Reads the runtime assignment target AST for a materialized expression product. */
export function runtimeAssignmentTargetAstForProduct(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): ExpressionAstNode | null {
  const parse = readTemplateExpressionParse(store, expressionProductHandle);
  return parse == null ? null : runtimeAssignmentTargetAstForParse(parse);
}
