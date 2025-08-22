import { DI } from "@aurelia/kernel";
import { ExpressionParser } from "@aurelia/expression-parser";
import {
  DotSeparatedAttributePattern,
  EventAttributePattern,
  RefAttributePattern,
  AtPrefixedTriggerAttributePattern,
  ColonPrefixedBindAttributePattern,
  IAttributeParser as AttrParserKey,
} from "@aurelia/template-compiler";

import type {
  IAttributeParser,
  IExpressionParser,
} from "../compiler/phases/10-lower/lower.js";

/**
 * Construct Aurelia's parsers via DI and adapt them to the lowerer's contracts.
 * We cast ExpressionParser to our local IExpressionParser (the method surface matches).
 */
export function getAureliaParsers(): { attrParser: IAttributeParser; exprParser: IExpressionParser } {
  const container = DI.createContainer().register(
    DotSeparatedAttributePattern,
    EventAttributePattern,
    RefAttributePattern,
    AtPrefixedTriggerAttributePattern,
    ColonPrefixedBindAttributePattern,
  );

  const attrParser = container.get(AttrParserKey) as unknown as IAttributeParser;
  const exprParser = container.get(ExpressionParser) as unknown as IExpressionParser;

  return { attrParser, exprParser };
}
