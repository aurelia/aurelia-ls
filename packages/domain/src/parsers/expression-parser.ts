import { DI } from "@aurelia/kernel";
import { ExpressionParser } from "@aurelia/expression-parser";

import type {
  IExpressionParser,
} from "../compiler/phases/10-lower/lower.js";

/**
 * Construct Aurelia's expression parser via DI.
 */
export function getExpressionParser(): IExpressionParser {
  const container = DI.createContainer()
  const exprParser = container.get(ExpressionParser) as unknown as IExpressionParser;

  return exprParser;
}
