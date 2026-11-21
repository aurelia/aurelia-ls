import { expect, test } from 'vitest';
import { ExpressionParser } from '../src/expression/expression-parser.js';
import { collectRuntimeTemplateAccessUseDrafts } from '../src/runtime-expression/template-access-use-collector.js';
import { runtimeAcceptedBindingExpressionAstForResult } from '../src/template/expression-parse-projection.js';

function scopeReads(source: string) {
  const parsed = runtimeAcceptedBindingExpressionAstForResult(new ExpressionParser().parse(source, 'IsProperty'));
  if (parsed == null) throw new Error(`Expected a complete binding expression: ${source}`);
  return collectRuntimeTemplateAccessUseDrafts({ expression: parsed, canUseRuntimeArrayMethod: () => true }).flatMap(use =>
    use.expression.$kind === 'AccessScope' ? [{ name: use.expression.name.name, min: use.minimumExecutions,
      conditions: use.executionQualifiers.map(qualifier => qualifier.kind) }] : []);
}

test('Aurelia evaluates the key before optional access and the argument only after the callable check', () => {
  expect(scopeReads('table?.[key]')).toContainEqual({ name: 'key', min: 'one', conditions: [] });
  expect(scopeReads('table && table[key]')).toContainEqual({ name: 'key', min: 'zero', conditions: ['short-circuit-right-hand-side'] });
  expect(scopeReads('possible(arg)')).toContainEqual({ name: 'arg', min: 'zero', conditions: ['callable-target'] });
});

test('map invokes the first arrow and cannot call a thisArg arrow through an inline arrow callback', () => {
  const reads = scopeReads('items.map(x => x + first, () => second)');
  expect(reads).toContainEqual({ name: 'first', min: 'zero', conditions: ['synchronous-callback'] });
  expect(reads.map(read => read.name)).not.toContain('second');
});
