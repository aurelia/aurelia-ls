import { describe, expect, test } from 'vitest';

import {
  AccessScopeExpression,
  ArrayBindingPattern,
  BindingPatternHole,
  CallScopeExpression,
  CustomExpression,
  ForOfStatement,
  Identifier,
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

  test('names the iterator binding-pattern representation boundary', () => {
    const result = new ExpressionParser().parse('[item] of items', 'IsIterator');
    expect(result.kind).toBe(ExpressionParseResultKind.IteratorSuccess);
    if (result.kind !== ExpressionParseResultKind.IteratorSuccess) throw new Error('Expected iterator success.');

    const projection = projectRuntimeExpressionAstValue(result.ast);
    expect(projection.state).toBe(RuntimeExpressionAstProjectionState.Pending);
    expect(projection.reasons.map((reason) => reason.reasonKind)).toEqual([
      RuntimeExpressionAstProjectionReasonKind.BindingPatternRepresentationPending,
    ]);
  });

  test('aggregates independent parent and child representation gaps with exact paths', () => {
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
      [RuntimeExpressionAstProjectionReasonKind.BindingPatternRepresentationPending, ['declaration']],
    ]);
  });
});
