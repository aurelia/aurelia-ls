import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { StaticEvaluator, type StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import { staticLexicalReferences } from '../src/evaluation/lexical-references.js';
import type { StaticModuleEvaluationResult } from '../src/evaluation/module-evaluation-result.js';
import {
  EvaluationValueKind,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../src/evaluation/values.js';

describe('invocation snapshot lexical retention', () => {
  test('retains call history without copying unrelated module data for every call', () => {
    const run = (records: number, declaration: string) => {
      let transfers = 0;
      const result = evaluate([
        `const unrelated = [${Array.from({ length: records }, (_, index) => `{ index: ${index} }`).join(',')}];`,
        declaration,
        ...Array.from({ length: 24 }, (_, index) => `identity(${index});`),
      ], { transferValueMetadata: () => { transfers += 1; } });
      expect(result.invocations).toHaveLength(24);
      for (const invocation of result.invocations) {
        const callee = requireKind(invocation.callee.value, EvaluationValueKind.Function);
        expect(callee.environment.readValue('unrelated')).toBeNull();
      }
      const original = requireKind(result.environment.readValue('unrelated'), EvaluationValueKind.Array);
      expect(original.elements).toHaveLength(records);
      const invocationTransfers = transfers;
      // Explicit module forks continue to own the complete module, including non-callable data.
      const complete = new StaticEvaluationSessionFork(result.runtimeHost).forkModuleEvaluation(result);
      expect(requireKind(complete.environment.readValue('unrelated'), EvaluationValueKind.Array).elements)
        .toHaveLength(records);
      return invocationTransfers;
    };
    for (const declaration of [
      'function identity(value) { return value; }',
      'function identity(unrelated) { return unrelated; }',
      'function identity(value) { return value.unrelated; }',
    ]) {
      expect(run(1_000, declaration)).toBe(run(10, declaration));
    }
  });

  test('captures transitive closures and default arguments at each invocation boundary', () => {
    const result = evaluate([
      'const state = { value: 1 };',
      'const alias = state;',
      'function leaf(value = alias.value) { return value; }',
      'function outer() { return leaf(); }',
      'outer();',
      'state.value = 7;',
      'outer();',
    ]);
    const calls = result.invocations.filter((entry) => entry.node.getText() === 'outer()');
    expect(calls).toHaveLength(2);
    const first = requireKind(calls[0]!.callee.value, EvaluationValueKind.Function);
    const second = requireKind(calls[1]!.callee.value, EvaluationValueKind.Function);
    expect(invoke(first)).toMatchObject({ kind: EvaluationValueKind.Number, value: 1 });
    expect(invoke(second)).toMatchObject({ kind: EvaluationValueKind.Number, value: 7 });
  });

  test('preserves shared cells, object aliases, and mutual recursion across captured functions', () => {
    const result = evaluate([
      'const state = { value: 1 };',
      'const alias = state;',
      'function first() { return alias.value + second(false); }',
      'function second(recurse) { return recurse ? first() : state.value; }',
      'first();',
      'state.value = 9;',
    ]);
    const call = result.invocations.find((entry) => entry.node.getText() === 'first()' && ts.isExpressionStatement(entry.node.parent));
    expect(call).toBeDefined();
    const first = requireKind(call!.callee.value, EvaluationValueKind.Function);
    const second = requireKind(first.environment.readValue('second'), EvaluationValueKind.Function);
    expect(second.environment).toBe(first.environment);
    expect(first.environment.readValue('alias')).toBe(second.environment.readValue('state'));
    expect(invoke(first)).toMatchObject({ kind: EvaluationValueKind.Number, value: 2 });
  });

  test('retains lexical shadowing and nested captures in returned function snapshots', () => {
    const result = evaluate([
      'let shared = 100;',
      'let offset = 1;',
      'function create(shared) { return (value = shared) => value + offset; }',
      'const fn = create(2);',
      'shared = 200;',
      'offset = 7;',
    ]);
    const completion = result.invocations.find((entry) => entry.node.getText() === 'create(2)')!.completion;
    expect(completion.kind).toBe('normal');
    if (completion.kind !== 'normal') throw new Error('Expected returned function.');
    const snapshot = requireKind(completion.value, EvaluationValueKind.Function);
    expect(invoke(snapshot)).toMatchObject({ kind: EvaluationValueKind.Number, value: 3 });
    expect(invoke(requireKind(result.environment.readValue('fn'), EvaluationValueKind.Function)))
      .toMatchObject({ kind: EvaluationValueKind.Number, value: 9 });
  });

  test('keeps argument, receiver, and completion mutation history independent', () => {
    const result = evaluate([
      'const value = { count: 1 };',
      'const receiver = { update(item) { item.count = item.count + 1; return item; } };',
      'receiver.update(value);',
      'receiver.update(value);',
    ]);
    const calls = result.invocations.filter((entry) => entry.node.getText() === 'receiver.update(value)');
    expect(calls).toHaveLength(2);
    expect(calls.map((entry) => requireKind(entry.argumentList.elements[0]!.value, EvaluationValueKind.Object)
      .properties.get('count')!.value)).toMatchObject([{ value: 1 }, { value: 2 }]);
    expect(calls.map((entry) => {
      if (entry.completion.kind !== 'normal') throw new Error('Expected normal completion.');
      return requireKind(entry.completion.value, EvaluationValueKind.Object).properties.get('count')!.value;
    })).toMatchObject([{ value: 2 }, { value: 3 }]);
    expect(calls[0]!.thisValue!.value).not.toBe(calls[1]!.thisValue!.value);
  });

  test('retains class heritage, inherited state, and field initializer captures', () => {
    const result = evaluate([
      'const baseState = { value: 3 };',
      'const childState = { value: 5 };',
      'class Base { static answer = baseState; read() { return baseState.value; } }',
      'class Child extends Base { value = childState.value; }',
      'function hold(value) { return value; }',
      'hold(Child);',
      'baseState.value = 7;',
      'childState.value = 9;',
    ]);
    const call = result.invocations.find((entry) => entry.node.getText() === 'hold(Child)')!;
    const child = requireKind(call.argumentList.elements[0]!.value, EvaluationValueKind.Class);
    const base = child.baseClass!;
    const baseState = requireKind(base.environment.readValue('baseState'), EvaluationValueKind.Object);
    expect(baseState.properties.get('value')!.value).toMatchObject({ value: 3 });
    expect(base.properties.get('answer')!.value).toBe(baseState);
    const instance = new StaticEvaluator().evaluateClassValueInstantiation(child, result.moduleKey, child.declaration).value;
    expect(requireKind(instance, EvaluationValueKind.Instance).properties.get('value')!.value).toMatchObject({ value: 5 });
  });

  test('scans runtime heritage, computed names, decorators and nested bodies while skipping type syntax', () => {
    const source = ts.createSourceFile('references.ts', [
      '@decorate(Dependency)',
      'class Example extends factory(Base) {',
      '  [fieldName]: TypeOnly = state;',
      '  method(value = fallback) { return () => this.value + captured; }',
      '}',
    ].join('\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const names = staticLexicalReferences(source.statements[0]!).names;
    for (const name of ['decorate', 'Dependency', 'factory', 'Base', 'fieldName', 'state', 'fallback', 'captured']) {
      expect(names.has(name), name).toBe(true);
    }
    expect(names.has('TypeOnly')).toBe(false);
  });

  test('preserves evaluator default-parameter and catch-admission dependencies', () => {
    const result = evaluate([
      'const data = 10;',
      'function defaulted(data = data) { return data; }',
      'function caught() { try { throw 2; } catch (data) { return data; } }',
      'defaulted();',
      'caught();',
    ]);
    for (const name of ['defaulted()', 'caught()']) {
      const call = result.invocations.find((entry) => entry.node.getText() === name)!;
      const fn = requireKind(call.callee.value, EvaluationValueKind.Function);
      expect(fn.environment.readValue('data')).toMatchObject({ value: 10 });
      if (call.completion.kind !== 'normal') throw new Error('Expected normal completion.');
      expect(invoke(fn)?.kind).toBe(call.completion.value.kind);
    }
  });

  test('preserves lexical this in returned arrows and captures shorthand/computed-property reads', () => {
    const result = evaluate([
      'const key = "computed";',
      'let answer = 3;',
      'const owner = { value: 2, create() { return () => ({ [key]: this.value + answer, answer }); } };',
      'owner.create();',
      'owner.value = 9;',
      'answer = 7;',
    ]);
    const call = result.invocations.find((entry) => entry.node.getText() === 'owner.create()')!;
    if (call.completion.kind !== 'normal') throw new Error('Expected returned arrow.');
    const fn = requireKind(call.completion.value, EvaluationValueKind.Function);
    const value = requireKind(invoke(fn), EvaluationValueKind.Object);
    expect(value.properties.get('computed')!.value).toMatchObject({ value: 5 });
    expect(value.properties.get('answer')!.value).toMatchObject({ value: 3 });
    expect(fn.environment.readValue('this')).toMatchObject({ kind: EvaluationValueKind.Object });
  });

  test('preserves implicit links between lazily materialized CommonJS module and exports', () => {
    for (const lines of [
      ['exports.value = 1;', 'function read() { return module.exports.value; }'],
      ['const module = { exports: { value: 1 } };', 'function read() { return exports.value; }'],
    ]) {
      const result = evaluate([...lines, 'read();']);
      const call = result.invocations.find((entry) => entry.node.getText() === 'read()')!;
      expect(invoke(requireKind(call.callee.value, EvaluationValueKind.Function)))
        .toMatchObject({ kind: EvaluationValueKind.Number, value: 1 });
    }
  });
});

function evaluate(lines: readonly string[], host?: StaticEvaluationRuntimeHost): StaticModuleEvaluationResult {
  const source = ts.createSourceFile('snapshot.ts', lines.join('\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return new StaticEvaluator(undefined, host).evaluateSourceFile(source);
}

function invoke(fn: EvaluationFunctionValue): EvaluationValue | null {
  return new StaticEvaluator(undefined, undefined, { captureExecutionTopology: false })
    .evaluateFunctionValue(fn, fn.declaration, fn.environment.moduleKey, []).value;
}

function requireKind<TKind extends EvaluationValueKind>(
  value: EvaluationValue | null,
  kind: TKind,
): Extract<EvaluationValue, { readonly kind: TKind }> {
  if (value?.kind !== kind) throw new Error(`Expected ${kind}, got ${value?.kind ?? 'null'}.`);
  return value as Extract<EvaluationValue, { readonly kind: TKind }>;
}
