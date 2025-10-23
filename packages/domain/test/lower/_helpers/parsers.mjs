import { DI } from "@aurelia/kernel";
import { ExpressionParser } from "@aurelia/expression-parser";
import {
  DotSeparatedAttributePattern,
  EventAttributePattern,
  RefAttributePattern,
  AtPrefixedTriggerAttributePattern,
  ColonPrefixedBindAttributePattern,
  IAttributeParser,
} from "@aurelia/template-compiler";

export function getAureliaParsers() {
  const container = DI.createContainer().register(
    DotSeparatedAttributePattern,
    EventAttributePattern,
    RefAttributePattern,
    AtPrefixedTriggerAttributePattern,
    ColonPrefixedBindAttributePattern
  );
  const attrParser = container.get(IAttributeParser);
  const exprParser = container.get(ExpressionParser);
  return { attrParser, exprParser };
}
