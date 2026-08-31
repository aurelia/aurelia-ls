import { describe, expect, test } from 'vitest';

import {
  AccessScopeExpression,
  ArrayBindingPattern,
  BindingIdentifier,
  BindingPatternHole,
  CallScopeExpression,
  CustomExpression,
  ForOfStatement,
  Identifier,
  ObjectBindingPattern,
  ObjectBindingPatternProperty,
} from '../src/expression/ast.js';
import { ExpressionParser } from '../src/expression/expression-parser.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';
import {
  projectRuntimeExpressionAstValue,
  RuntimeExpressionAstProjectionReasonKind,
  RuntimeExpressionAstProjectionState,
} from '../src/expression/runtime-ast-value.js';
import { SourceSpan } from '../src/expression/source-span.js';
import { runtimeAcceptedBindingExpressionAstForResult } from '../src/template/expression-parse-projection.js';

describe('runtime expression AST value projection', () => {
  test.each([
    ['message', 'IsProperty', {
      $kind: 'AccessScope',
      name: 'message',
      ancestor: 0,
    }],
    ['submit()', 'IsFunction', {
      $kind: 'CallScope',
      name: 'submit',
      args: [],
      ancestor: 0,
      optional: false,
    }],
    ['true', 'IsProperty', {
      $kind: 'PrimitiveLiteral',
      value: true,
    }],
    ['${hey}', 'Interpolation', {
      $kind: 'Interpolation',
      isMulti: false,
      firstExpression: { $kind: 'AccessScope', name: 'hey', ancestor: 0 },
      parts: ['', ''],
      expressions: [{ $kind: 'AccessScope', name: 'hey', ancestor: 0 }],
    }],
  ] as const)('projects current compiler wire expression %s', (source, entry, expected) => {
    const result = new ExpressionParser().parse(source, entry);
    const ast = runtimeAcceptedBindingExpressionAstForResult(result);
    if (ast == null) throw new Error(`Expected runtime-accepted AST for '${source}'.`);
    const projection = projectRuntimeExpressionAstValue(ast);

    expect(projection.state).toBe(RuntimeExpressionAstProjectionState.Exact);
    expect(projection.value).toEqual(expected);
    expect(JSON.stringify(projection.value)).not.toContain('span');
    expect(JSON.stringify(projection.value)).not.toContain('authoredScopePath');
  });

  test('unwraps parser parentheses while preserving runtime member and call fields', () => {
    const result = new ExpressionParser().parse('(owner?.run(value))', 'IsFunction');
    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) throw new Error('Expected expression success.');

    const projection = projectRuntimeExpressionAstValue(result.ast);
    expect(projection).toMatchObject({
      state: RuntimeExpressionAstProjectionState.Exact,
      value: {
        $kind: 'CallMember',
        name: 'run',
        optionalMember: true,
        optionalCall: false,
      },
    });
  });

  test('materializes the current framework tagged-template raw field and preserves explicit raw strings', () => {
    const result = new ExpressionParser().parse('tag`line\\n${value}`', 'IsFunction');
    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess || result.ast.$kind !== 'TaggedTemplate') {
      throw new Error('Expected tagged-template expression success.');
    }
    expect(result.ast.cooked.raw).toBeUndefined();

    const currentFramework = projectRuntimeExpressionAstValue(result.ast);
    expect(currentFramework.state).toBe(RuntimeExpressionAstProjectionState.Exact);
    expect(currentFramework.value?.$kind).toBe('TaggedTemplate');
    if (currentFramework.value?.$kind !== 'TaggedTemplate') throw new Error('Expected projected tagged template.');
    expect([...currentFramework.value.cooked]).toEqual(['line\n', '']);
    expect(currentFramework.value.cooked.raw).toEqual(['line\n', '']);

    result.ast.cooked.raw = ['line\\n', ''];
    const explicitRaw = projectRuntimeExpressionAstValue(result.ast);
    if (explicitRaw.value?.$kind !== 'TaggedTemplate') throw new Error('Expected explicit-raw tagged template.');
    expect(explicitRaw.value.cooked.raw).toEqual(['line\\n', '']);
  });

  test.each([
    ['(fn)()', { $kind: 'CallScope', name: 'fn', ancestor: 0, optional: false }],
    ['(obj.fn)()', { $kind: 'CallMember', name: 'fn', optionalMember: false, optionalCall: false }],
    ['(obj[key])()', { $kind: 'CallFunction', optional: false, func: { $kind: 'AccessKeyed' } }],
    ['((value) => value)()', { $kind: 'CallFunction', optional: false, func: { $kind: 'ArrowFunction' } }],
    ['(Array)()', { $kind: 'CallGlobal', name: 'Array', args: [] }],
    ['(Array)?.()', { $kind: 'CallFunction', optional: true, func: { $kind: 'AccessGlobal', name: 'Array' } }],
  ] as const)('canonicalizes parenthesized callee %s to RC2 runtime call shape', (source, expected) => {
    const result = new ExpressionParser().parse(source, 'IsFunction');
    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) throw new Error('Expected expression success.');

    const projection = projectRuntimeExpressionAstValue(result.ast);
    expect(projection.state).toBe(RuntimeExpressionAstProjectionState.Exact);
    expect(projection.value).toMatchObject(expected);
  });

  test.each(['Array()', 'Array?.()'])('keeps direct global call optional intent unresolved for %s', (source) => {
    const result = new ExpressionParser().parse(source, 'IsFunction');
    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) throw new Error('Expected expression success.');

    const projection = projectRuntimeExpressionAstValue(result.ast);
    expect(projection.state).toBe(RuntimeExpressionAstProjectionState.Pending);
    expect(projection.reasons.map((reason) => reason.reasonKind)).toEqual([
      RuntimeExpressionAstProjectionReasonKind.GlobalCallOptionalIntentUnavailable,
    ]);
  });

  test('keeps semantic-only optional scope intent and behavior-bearing custom expressions pending', () => {
    const span = new SourceSpan(0, 5);
    const optionalScope = projectRuntimeExpressionAstValue(new AccessScopeExpression(
      span,
      new Identifier(span, 'value'),
      0,
      null,
      true,
    ));
    const custom = projectRuntimeExpressionAstValue(new CustomExpression(span, 'opaque'));

    expect(optionalScope.state).toBe(RuntimeExpressionAstProjectionState.Pending);
    expect(optionalScope.reasons.map((reason) => reason.reasonKind)).toEqual([
      RuntimeExpressionAstProjectionReasonKind.OptionalScopeAccessUnsupported,
    ]);
    expect(custom.state).toBe(RuntimeExpressionAstProjectionState.Pending);
    expect(custom.reasons.map((reason) => reason.reasonKind)).toEqual([
      RuntimeExpressionAstProjectionReasonKind.CustomExpressionBehaviorPending,
    ]);
  });

  test.each([
    [
      '[key, product] of productEntries',
      'productEntries',
      [['key', 0], ['product', 1]],
    ],
    [
      '[tripleKey, , tripleProduct] of productTriples',
      'productTriples',
      [['tripleKey', 0], ['tripleProduct', 2]],
    ],
    [
      '[compactKey, compactProduct]of productEntries',
      'productEntries',
      [['compactKey', 0], ['compactProduct', 1]],
    ],
  ] as const)('projects admitted array repeat declaration %s to the RC2 assignment wire', (source, iterable, locals) => {
    const result = new ExpressionParser().parse(source, 'IsIterator');
    expect(result.kind).toBe(ExpressionParseResultKind.IteratorSuccess);
    if (result.kind !== ExpressionParseResultKind.IteratorSuccess) throw new Error('Expected iterator success.');

    const projection = projectRuntimeExpressionAstValue(result.ast);
    expect(projection.state).toBe(RuntimeExpressionAstProjectionState.Exact);
    expect(projection.value).toStrictEqual({
      $kind: 'ForOfStatement',
      declaration: {
        $kind: 'ArrayDestructuring',
        list: locals.map(([name, index]) => rc2ArrayDestructuringLeaf(name, index)),
        source: undefined,
        initializer: undefined,
      },
      iterable: { $kind: 'AccessScope', name: iterable, ancestor: 0 },
      semiIdx: -1,
    });
  });

  test('projects admitted object repeat aliases and source keys to the RC2 binding-pattern wire', () => {
    const result = new ExpressionParser().parse(
      `{ id, name: label, 'role-name': roleName, 0: first } of items`,
      'IsIterator',
    );
    expect(result.kind).toBe(ExpressionParseResultKind.IteratorSuccess);
    if (result.kind !== ExpressionParseResultKind.IteratorSuccess) throw new Error('Expected iterator success.');

    const projection = projectRuntimeExpressionAstValue(result.ast);
    expect(projection.state).toBe(RuntimeExpressionAstProjectionState.Exact);
    expect(projection.reasons).toEqual([]);
    expect(projection.value).toStrictEqual({
      $kind: 'ForOfStatement',
      declaration: {
        $kind: 'ObjectBindingPattern',
        keys: ['id', 'name', 'role-name', 0],
        values: [
          { $kind: 'AccessScope', name: 'id', ancestor: 0 },
          { $kind: 'AccessScope', name: 'label', ancestor: 0 },
          { $kind: 'AccessScope', name: 'roleName', ancestor: 0 },
          { $kind: 'AccessScope', name: 'first', ancestor: 0 },
        ],
      },
      iterable: { $kind: 'AccessScope', name: 'items', ancestor: 0 },
      semiIdx: -1,
    });
  });

  test('keeps binding-pattern nodes pending outside their admitted ForOf wire', () => {
    const result = new ExpressionParser().parse('[item] of items', 'IsIterator');
    expect(result.kind).toBe(ExpressionParseResultKind.IteratorSuccess);
    if (result.kind !== ExpressionParseResultKind.IteratorSuccess) throw new Error('Expected iterator success.');

    const projection = projectRuntimeExpressionAstValue(result.ast.declaration);
    expect(projection.state).toBe(RuntimeExpressionAstProjectionState.Pending);
    expect(projection.reasons.map((reason) => reason.reasonKind)).toEqual([
      RuntimeExpressionAstProjectionReasonKind.BindingPatternRepresentationPending,
    ]);
  });

  test('keeps richer manually constructed iterator patterns pending at their exact pattern path', () => {
    const span = new SourceSpan(0, 5);
    const item = new BindingIdentifier(span, new Identifier(span, 'item'));
    const iterable = new AccessScopeExpression(span, new Identifier(span, 'items'), 0, null, false);
    const nestedArray = new ForOfStatement(
      span,
      new ArrayBindingPattern(span, [new ArrayBindingPattern(span, [item])]),
      iterable,
      -1,
    );
    const nestedObject = new ForOfStatement(
      span,
      new ObjectBindingPattern(span, [
        new ObjectBindingPatternProperty('value', new ArrayBindingPattern(span, [item])),
      ]),
      iterable,
      -1,
    );

    expect(projectRuntimeExpressionAstValue(nestedArray).reasons.map((reason) => [reason.reasonKind, reason.path]))
      .toEqual([[RuntimeExpressionAstProjectionReasonKind.BindingPatternRepresentationPending, ['declaration', 'elements', 0]]]);
    expect(projectRuntimeExpressionAstValue(nestedObject).reasons.map((reason) => [reason.reasonKind, reason.path]))
      .toEqual([[RuntimeExpressionAstProjectionReasonKind.BindingPatternRepresentationPending, ['declaration']]]);
  });

  test('aggregates independent child gaps without retaining a closed array-pattern reason', () => {
    const span = new SourceSpan(0, 5);
    const identifier = new Identifier(span, 'value');
    const call = new CallScopeExpression(
      span,
      identifier,
      [new CustomExpression(span, 'opaque')],
      0,
      false,
      null,
      true,
    );
    const iterator = new ForOfStatement(
      span,
      new ArrayBindingPattern(span, [new BindingPatternHole(span)]),
      new AccessScopeExpression(span, identifier, 0, null, true),
      0,
    );

    expect(projectRuntimeExpressionAstValue(call).reasons.map((reason) => [reason.reasonKind, reason.path])).toEqual([
      [RuntimeExpressionAstProjectionReasonKind.CustomExpressionBehaviorPending, ['args', 0]],
      [RuntimeExpressionAstProjectionReasonKind.OptionalAncestorCallAccessUnsupported, []],
    ]);
    expect(projectRuntimeExpressionAstValue(iterator).reasons.map((reason) => [reason.reasonKind, reason.path])).toEqual([
      [RuntimeExpressionAstProjectionReasonKind.OptionalScopeAccessUnsupported, ['iterable']],
    ]);
  });
});

function rc2ArrayDestructuringLeaf(name: string, index: number): object {
  const bindingContext = { $kind: 'AccessThis', ancestor: 0 };
  return {
    $kind: 'DestructuringAssignmentLeaf',
    target: {
      $kind: 'AccessMember',
      accessGlobal: false,
      object: bindingContext,
      name,
      optional: false,
    },
    source: {
      $kind: 'AccessKeyed',
      accessGlobal: false,
      object: bindingContext,
      key: { $kind: 'PrimitiveLiteral', value: index },
      optional: false,
    },
    initializer: undefined,
  };
}
