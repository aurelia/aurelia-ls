import type {
  BindingBehaviorExpression,
  IsValueConverter,
} from './ast.js';
import { ValueConverterExpression } from './ast.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';

/** True for binding behaviors whose framework `bind(...)` inserts their same-named value converter into the AST. */
export function bindingBehaviorProjectsThroughValueConverter(
  expression: BindingBehaviorExpression,
): boolean {
  return expression.expression.$kind !== 'ValueConverter'
    && i18nValueConverterBindingBehaviorNames.has(expression.name.name);
}

/** Synthesize the value-converter expression that Aurelia i18n binding behaviors write into the binding AST. */
export function bindingBehaviorValueConverterProjection(
  expression: BindingBehaviorExpression,
  input: IsValueConverter = expression.expression as IsValueConverter,
): ValueConverterExpression {
  return new ValueConverterExpression(
    expression.span,
    input,
    expression.name,
    expression.args,
  );
}

const i18nValueConverterBindingBehaviorNames: ReadonlySet<string> = new Set([
  BuiltInBindingBehaviorName.Translation,
  BuiltInBindingBehaviorName.DateFormat,
  BuiltInBindingBehaviorName.NumberFormat,
  BuiltInBindingBehaviorName.RelativeTime,
]);
