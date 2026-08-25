import { describe, expect, it } from 'vitest';
import { ExpressionParser } from '../src/expression/expression-parser.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';
import { admitRepeatObjectBindingPattern } from '../src/expression/repeat-object-binding-pattern.js';
import { normalizeLetBindingTarget } from '../src/template/attribute-mapper.js';

describe('RC2 template language alignment', () => {
  it('admits shallow repeat object bindings and retains source-key to local mapping', () => {
    const result = new ExpressionParser().parse(
      `{ id, name: label, 'role-name': roleName, 0: first } of items`,
      'IsIterator',
    );
    expect(result.kind).toBe(ExpressionParseResultKind.IteratorSuccess);
    if (result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      throw new Error(`Expected iterator success, got ${result.kind}`);
    }
    expect(result.ast.declaration.$kind).toBe('ObjectBindingPattern');
    if (result.ast.declaration.$kind !== 'ObjectBindingPattern') {
      throw new Error('Expected object binding pattern');
    }
    expect(admitRepeatObjectBindingPattern(result.ast.declaration)).toEqual({
      admitted: true,
      sourceKeys: ['id', 'name', 'role-name', 0],
      localNames: ['id', 'label', 'roleName', 'first'],
    });
  });

  it.each([
    '{ id, id } of items',
    '{ id: value, name: value } of items',
    '{ id: $index } of items',
    '{ id: $item } of items',
    '{ id: constructor } of items',
    '{ id: __proto__ } of items',
    '{ id: target.member } of items',
    '{ id: target[0] } of items',
    '{ id: compute() } of items',
    '{ id: target = fallback } of items',
    '{ user: { name } } of items',
    '{ pair: [key, value] } of items',
  ])('rejects unsupported repeat object binding %s with AUR0177', (source) => {
    const result = new ExpressionParser().parse(source, 'IsIterator');
    expect(result.kind).toBe(ExpressionParseResultKind.CompleteInputParseError);
    if (result.kind === ExpressionParseResultKind.CompleteInputParseError) {
      expect(result.frameworkErrorCode).toBe('AUR0177');
    }
  });

  it.each([
    '{ id name } of items',
    '{ id: value name: other } of items',
  ])('keeps missing object-binding separators on AUR0167 for %s', (source) => {
    const result = new ExpressionParser().parse(source, 'IsIterator');
    expect(result.kind).toBe(ExpressionParseResultKind.CompleteInputParseError);
    if (result.kind === ExpressionParseResultKind.CompleteInputParseError) {
      expect(result.frameworkErrorCode).toBe('AUR0167');
    }
  });

  it('keeps object rest on the RC2 AUR0164 grammar rejection', () => {
    const result = new ExpressionParser().parse('{ id, ...rest } of items', 'IsIterator');
    expect(result.kind).toBe(ExpressionParseResultKind.CompleteInputParseError);
    if (result.kind === ExpressionParseResultKind.CompleteInputParseError) {
      expect(result.frameworkErrorCode).toBe('AUR0164');
    }
  });

  it('normalizes let targets without treating underscores as word boundaries', () => {
    expect(normalizeLetBindingTarget('my_prop')).toBe('my_prop');
    expect(normalizeLetBindingTarget('my_prop--name')).toBe('my_propName');
    expect(normalizeLetBindingTarget('_first-name')).toBe('_firstName');
    expect(normalizeLetBindingTarget('my_prop-2')).toBe('my_prop2');
    expect(normalizeLetBindingTarget('plain-name')).toBe('plainName');
  });
});
