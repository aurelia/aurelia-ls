import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import type { EvaluationBinding } from '../src/evaluation/environment.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../src/evaluation/evaluator.js';
import { StaticEvaluationExpressionReader } from '../src/evaluation/expression-reader.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../src/evaluation/seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationNumberValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';

describe('static evaluator value pressure', () => {
  test('retains causal pressure on addressable slots without contaminating siblings', () => {
    const source = sourceFile([
      'const objectValue = { closed: 1, pressured: pressure(2) };',
      'const arrayValue = [3, pressure(4)];',
      'class Example {',
      '  closed = 5;',
      '  pressured = pressure(6);',
      '}',
      'const instanceValue = new Example();',
      'const directValue = pressure(7);',
      'const { closed: objectClosed, pressured: objectPressured } = objectValue;',
      'const [arrayClosed, arrayPressured] = arrayValue;',
      'const directAlias = directValue;',
    ]);
    const evaluation = new StaticEvaluator(undefined, pressureRuntimeHost).evaluateSourceFile(source);
    const objectValue = requireValueKind(evaluation.environment.readValue('objectValue'), EvaluationValueKind.Object);
    const arrayValue = requireValueKind(evaluation.environment.readValue('arrayValue'), EvaluationValueKind.Array);
    const instanceValue = requireValueKind(evaluation.environment.readValue('instanceValue'), EvaluationValueKind.Instance);

    expect(seamSummaries(objectValue.properties.get('closed')?.openSeams ?? [])).toEqual([]);
    expect(seamSummaries(objectValue.properties.get('pressured')?.openSeams ?? [])).toEqual([
      'pressure(2) retained a best-known value.',
    ]);
    expect(seamSummaries(arrayValue.elements[0]?.openSeams ?? [])).toEqual([]);
    expect(seamSummaries(arrayValue.elements[1]?.openSeams ?? [])).toEqual([
      'pressure(4) retained a best-known value.',
    ]);
    expect(instanceValue.constructionOpenSeams).toEqual([]);
    expect(seamSummaries(instanceValue.properties.get('closed')?.openSeams ?? [])).toEqual([]);
    expect(seamSummaries(instanceValue.properties.get('pressured')?.openSeams ?? [])).toEqual([
      'pressure(6) retained a best-known value.',
    ]);

    expect(bindingSeamSummaries(evaluation.environment.readBinding('directValue'))).toEqual([
      'pressure(7) retained a best-known value.',
    ]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('objectClosed'))).toEqual([]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('objectPressured'))).toEqual([
      'pressure(2) retained a best-known value.',
    ]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('arrayClosed'))).toEqual([]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('arrayPressured'))).toEqual([
      'pressure(4) retained a best-known value.',
    ]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('directAlias'))).toEqual([
      'pressure(7) retained a best-known value.',
    ]);

    const session = new StaticEvaluationSessionFork(evaluation.runtimeHost).forkModuleEvaluation(evaluation);
    expect(bindingSeamSummaries(session.environment.readBinding('directValue'))).toEqual([
      'pressure(7) retained a best-known value.',
    ]);
    expect(seamSummaries(
      requireValueKind(session.environment.readValue('objectValue'), EvaluationValueKind.Object)
        .properties.get('pressured')?.openSeams ?? [],
    )).toEqual(['pressure(2) retained a best-known value.']);
  });

  test('reports only pressure causal to an expression result while retaining complete module evidence', () => {
    const source = sourceFile([
      'const objectValue = { closed: 1, pressured: pressure(2) };',
      'const laterClosed = objectValue.closed;',
      'const laterPressured = objectValue.pressured;',
      'const inlineClosed = ({ closed: 3, pressured: pressure(4) }).closed;',
      'const inlinePressured = ({ closed: 5, pressured: pressure(6) }).pressured;',
      'const directValue = pressure(7);',
      'const directAlias = directValue;',
    ]);
    const evaluation = new StaticEvaluator(undefined, pressureRuntimeHost).evaluateSourceFile(source);
    const reader = new StaticEvaluationExpressionReader(
      evaluation.environment,
      evaluation.moduleKey,
      evaluation.policy,
      evaluation.runtimeHost,
    );

    expect(readInitializerSeams(reader, source, 'laterClosed')).toEqual([]);
    expect(readInitializerSeams(reader, source, 'laterPressured')).toEqual([
      'pressure(2) retained a best-known value.',
    ]);
    expect(readInitializerSeams(reader, source, 'inlineClosed')).toEqual([]);
    expect(readInitializerSeams(reader, source, 'inlinePressured')).toEqual([
      'pressure(6) retained a best-known value.',
    ]);
    expect(readInitializerSeams(reader, source, 'directAlias')).toEqual([
      'pressure(7) retained a best-known value.',
    ]);

    expect(seamSummaries(evaluation.openSeams)).toEqual([
      'pressure(2) retained a best-known value.',
      'pressure(2) retained a best-known value.',
      'pressure(4) retained a best-known value.',
      'pressure(6) retained a best-known value.',
      'pressure(6) retained a best-known value.',
      'pressure(7) retained a best-known value.',
      'pressure(7) retained a best-known value.',
    ]);
  });

  test('does not execute retained candidates as branch conditions or getters', () => {
    const source = sourceFile([
      'const holder = { candidate: pressure(1) };',
      "const branchResult = holder.candidate ? 'trusted' : 'fallback';",
      'class Example {',
      '  constructor() { pressure(2); }',
      '  get value() { return sideEffect(); }',
      '}',
      'const getterResult = new Example().value;',
    ]);
    let sideEffectCalls = 0;
    const evaluation = new StaticEvaluator(undefined, runtimeHost({
      sideEffect: (call) => {
        sideEffectCalls++;
        return new EvaluationNumberValue(3, call);
      },
    })).evaluateSourceFile(source);

    expect(evaluation.environment.readValue('branchResult')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('branchResult'))).toEqual([
      'pressure(1) retained a best-known value.',
    ]);
    expect(evaluation.environment.readValue('getterResult')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('getterResult'))).toEqual([
      'pressure(2) retained a best-known value.',
    ]);
    expect(sideEffectCalls).toBe(0);
  });

  test('keeps unknown computed class fields in shape pressure without contaminating later exact fields', () => {
    const source = sourceFile([
      'class Shape {',
      '  [dynamicKey()] = 1;',
      '  stable = 2;',
      '}',
      'const instance = new Shape();',
      'const stableResult = instance.stable;',
      'const missingResult = instance.missing;',
    ]);
    const evaluation = new StaticEvaluator(undefined, runtimeHost({
      dynamicKey: (call) => new EvaluationBoundaryValue(
        EvaluationBoundaryKind.HostEnvironment,
        'dynamicKey()',
        call,
      ),
    })).evaluateSourceFile(source);
    const instance = requireValueKind(evaluation.environment.readValue('instance'), EvaluationValueKind.Instance);
    const stable = requireValueKind(evaluation.environment.readValue('stableResult'), EvaluationValueKind.Number);

    expect(instance.mayHaveUnknownProperties).toBe(true);
    expect(seamSummaries(instance.shapeOpenSeams)).toEqual([
      'Computed property name did not reduce to a string or number key.',
    ]);
    expect(instance.properties.get('stable')?.openSeams).toEqual([]);
    expect(stable.value).toBe(2);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('stableResult'))).toEqual([]);
    expect(evaluation.environment.readValue('missingResult')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('missingResult'))).toEqual([
      'Computed property name did not reduce to a string or number key.',
    ]);
  });

  test('preserves pressure through call frames without contaminating unrelated returns', () => {
    const source = sourceFile([
      'function identity(value) { return value; }',
      'function ignore(value) { return 9; }',
      'const returned = identity(pressure(1));',
      'const ignored = ignore(pressure(2));',
      "const returnedBranch = returned ? 'trusted' : 'fallback';",
      "const ignoredBranch = ignored ? 'trusted' : 'fallback';",
    ]);
    const evaluation = new StaticEvaluator(undefined, pressureRuntimeHost).evaluateSourceFile(source);

    expect(bindingSeamSummaries(evaluation.environment.readBinding('returned'))).toEqual([
      'pressure(1) retained a best-known value.',
    ]);
    expect(evaluation.environment.readValue('returnedBranch')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('ignored'))).toEqual([]);
    expect(requireValueKind(evaluation.environment.readValue('ignoredBranch'), EvaluationValueKind.String).value).toBe('trusted');
  });

  test('preserves thrown-value pressure through catch bindings', () => {
    const source = sourceFile([
      'let caught;',
      'try {',
      '  throw pressure(1);',
      '} catch (error) {',
      '  caught = error;',
      '}',
      "const caughtBranch = caught ? 'trusted' : 'fallback';",
    ]);
    const evaluation = new StaticEvaluator(undefined, pressureRuntimeHost).evaluateSourceFile(source);

    expect(bindingSeamSummaries(evaluation.environment.readBinding('caught'))).toEqual([
      'pressure(1) retained a best-known value.',
    ]);
    expect(evaluation.environment.readValue('caughtBranch')?.kind).toBe(EvaluationValueKind.Unknown);
  });
});

const pressureRuntimeHost = runtimeHost({});

function runtimeHost(
  calls: Readonly<Record<string, (call: ts.CallExpression) => EvaluationValue>>,
): StaticEvaluationRuntimeHost {
  return {
    evaluateCallExpression: (call, environment, moduleKey, depth, host) => {
      if (!ts.isIdentifier(call.expression)) {
        return null;
      }
      if (call.expression.text === 'pressure') {
        const argument = call.arguments[0];
        if (argument == null) {
          throw new Error('The pressure test intrinsic requires one argument.');
        }
        const value = host.evaluateExpression(argument, environment, moduleKey, depth + 1);
        host.open(
          EvaluationOpenSeamKind.DynamicCall,
          `${call.getText(call.getSourceFile())} retained a best-known value.`,
          call,
          moduleKey,
          [],
        );
        return value;
      }
      return calls[call.expression.text]?.(call) ?? null;
    },
  };
}

function sourceFile(lines: readonly string[]): ts.SourceFile {
  return ts.createSourceFile(
    'src/value-pressure.ts',
    lines.join('\n'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function readInitializerSeams(
  reader: StaticEvaluationExpressionReader,
  source: ts.SourceFile,
  name: string,
): readonly string[] {
  const declaration = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === name);
  if (declaration?.initializer == null) {
    throw new Error(`Expected variable '${name}' to have an initializer.`);
  }
  return seamSummaries(reader.evaluateExpression(declaration.initializer).openSeams);
}

function seamSummaries(seams: readonly EvaluationOpenSeam[]): readonly string[] {
  return seams.map((seam) => seam.summary);
}

function bindingSeamSummaries(binding: EvaluationBinding | null): readonly string[] {
  return seamSummaries(binding?.openSeams ?? []);
}

function requireValueKind<TKind extends EvaluationValueKind>(
  value: EvaluationValue | null,
  kind: TKind,
): Extract<EvaluationValue, { readonly kind: TKind }> {
  if (value?.kind !== kind) {
    throw new Error(`Expected evaluation value ${kind}, received ${value?.kind ?? 'absent'}.`);
  }
  return value as Extract<EvaluationValue, { readonly kind: TKind }>;
}
