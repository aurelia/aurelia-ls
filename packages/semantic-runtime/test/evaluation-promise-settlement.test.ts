import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { EvaluationBindingKind } from '../src/evaluation/environment.js';
import { StaticEvaluator } from '../src/evaluation/evaluator.js';
import {
  EvaluationArrayValue,
  EvaluationNumberValue,
  EvaluationPromiseSettlement,
  EvaluationPromiseSettlementKind,
  EvaluationPromiseValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';
import { EvaluationValueEvidence } from '../src/evaluation/value-pressure.js';

describe('static Promise settlement', () => {
  test('retains fulfilled and rejected settlement evidence independently', () => {
    const result = evaluate([
      'const fulfilled = Promise.resolve(1);',
      "const rejected = Promise.reject('failure');",
    ]);

    expect(promiseValue(result.environment.readValue('fulfilled')).settlement).toEqual(expect.objectContaining({
      kind: EvaluationPromiseSettlementKind.Fulfilled,
      evidence: expect.objectContaining({
        value: expect.objectContaining({ kind: EvaluationValueKind.Number, value: 1 }),
        openSeams: [],
      }),
    }));
    expect(promiseValue(result.environment.readValue('rejected')).settlement).toEqual(expect.objectContaining({
      kind: EvaluationPromiseSettlementKind.Rejected,
      evidence: expect.objectContaining({
        value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'failure' }),
        openSeams: [],
      }),
    }));
  });

  test('passes settlement through absent or definitely non-callable reactions', () => {
    const result = evaluate([
      "const rejected = Promise.reject('failure');",
      'const rejectedAfterThen = rejected.then();',
      'const fulfilledAfterCatch = Promise.resolve(1).catch(null);',
      'const fulfilledAfterFinally = Promise.resolve(2).finally(undefined);',
      'const fulfilledAfterClass = Promise.resolve(3).then(class Handler {});',
    ]);

    expect(promiseValue(result.environment.readValue('rejectedAfterThen')).settlement.kind)
      .toBe(EvaluationPromiseSettlementKind.Rejected);
    expect(promiseValue(result.environment.readValue('fulfilledAfterCatch')).settlement).toEqual(expect.objectContaining({
      kind: EvaluationPromiseSettlementKind.Fulfilled,
      evidence: expect.objectContaining({ value: expect.objectContaining({ value: 1 }) }),
    }));
    expect(promiseValue(result.environment.readValue('fulfilledAfterFinally')).settlement).toEqual(expect.objectContaining({
      kind: EvaluationPromiseSettlementKind.Fulfilled,
      evidence: expect.objectContaining({ value: expect.objectContaining({ value: 2 }) }),
    }));
    expect(promiseValue(result.environment.readValue('fulfilledAfterClass')).settlement).toEqual(expect.objectContaining({
      kind: EvaluationPromiseSettlementKind.Fulfilled,
      evidence: expect.objectContaining({ value: expect.objectContaining({ value: 3 }) }),
    }));
  });

  test('preserves an open source settlement when no handler can execute', () => {
    const source = sourceFile([
      "import { promise } from './input';",
      'const afterThen = promise.then(undefined, null);',
      'const afterCatch = promise.catch(0);',
    ]);
    const promise = EvaluationPromiseValue.open(
      new EvaluationValueEvidence(new EvaluationNumberValue(1, source), []),
      source,
    );
    const result = new StaticEvaluator().evaluateSourceFile(
      source,
      source.fileName,
      new Map([['promise', new EvaluationValueEvidence(promise, [])]]),
    );

    expect(promiseValue(result.environment.readValue('afterThen')).settlement).toBe(promise.settlement);
    expect(promiseValue(result.environment.readValue('afterCatch')).settlement).toBe(promise.settlement);
  });

  test('does not execute callable reactions in the synchronous module graph', () => {
    const result = evaluate([
      'const events = [];',
      'const answer = Promise.resolve(1).then((value) => {',
      "  events.push('reaction');",
      '  return value + 1;',
      '});',
      "events.push('module');",
    ]);

    expect(arrayPrimitiveValues(result.environment.readValue('events'))).toEqual(['module']);
    expect(promiseValue(result.environment.readValue('answer')).settlement.kind)
      .toBe(EvaluationPromiseSettlementKind.Open);
    expect(result.invocations.map((invocation) => invocation.node.getText())).not.toContain("events.push('reaction')");
  });

  test('keeps async-function settlement open until an async execution lane exists', () => {
    const result = evaluate([
      'async function load() { return 1; }',
      'const answer = load();',
    ]);

    expect(promiseValue(result.environment.readValue('answer')).settlement.kind)
      .toBe(EvaluationPromiseSettlementKind.Open);
  });

  test('preserves settlement selection, evidence, and aliasing across session forks', () => {
    const source = sourceFile(['const retained = {};']);
    const original = new StaticEvaluator().evaluateSourceFile(source, source.fileName);
    const retained = original.environment.readValue('retained');
    if (retained == null) {
      throw new Error('Expected the retained fixture value.');
    }
    const fulfilled = EvaluationPromiseValue.fromSettlement(
      new EvaluationPromiseSettlement(
        EvaluationPromiseSettlementKind.Fulfilled,
        new EvaluationValueEvidence(retained, []),
      ),
      source,
    );
    original.environment.initializeBinding(
      'promise',
      fulfilled,
      EvaluationBindingKind.Const,
      false,
      source,
      [],
    );

    const fork = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const forkedRetained = fork.environment.readValue('retained');
    const forkedPromise = promiseValue(fork.environment.readValue('promise'));

    expect(forkedPromise).not.toBe(fulfilled);
    expect(forkedPromise.settlement.kind).toBe(EvaluationPromiseSettlementKind.Fulfilled);
    expect(forkedPromise.settlement.evidence.value).toBe(forkedRetained);
    expect(forkedPromise.settlement.evidence.value).not.toBe(retained);
  });

  test('retains pressured settlement candidates without treating them as closed fulfillment', () => {
    const source = sourceFile(['const value = 1;']);
    const candidate = new EvaluationNumberValue(1, source);
    const promise = EvaluationPromiseValue.fromSettlement(
      new EvaluationPromiseSettlement(
        EvaluationPromiseSettlementKind.Open,
        new EvaluationValueEvidence(candidate, []),
      ),
      source,
    );

    expect(promise.settlement.evidence.value).toBe(candidate);
    expect(promise.settlement.kind).toBe(EvaluationPromiseSettlementKind.Open);
  });
});

function evaluate(lines: readonly string[]) {
  const source = sourceFile(lines);
  return new StaticEvaluator().evaluateSourceFile(source, source.fileName);
}

function sourceFile(lines: readonly string[]): ts.SourceFile {
  return ts.createSourceFile(
    'src/promise-settlement.ts',
    lines.join('\n'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function promiseValue(value: EvaluationValue | null): EvaluationPromiseValue {
  if (value?.kind !== EvaluationValueKind.Promise) {
    throw new Error(`Expected a Promise value, received ${value?.kind ?? 'null'}.`);
  }
  return value;
}

function arrayPrimitiveValues(value: EvaluationValue | null): readonly (number | string)[] {
  if (value?.kind !== EvaluationValueKind.Array) {
    throw new Error(`Expected an array value, received ${value?.kind ?? 'null'}.`);
  }
  return (value as EvaluationArrayValue).elements.map((element) => {
    if (element.value.kind === EvaluationValueKind.Number || element.value.kind === EvaluationValueKind.String) {
      return element.value.value;
    }
    throw new Error(`Expected a primitive array element, received ${element.value.kind}.`);
  });
}
