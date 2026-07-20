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
      'Computed property name did not reduce to a primitive property key.',
    ]);
    expect(instance.properties.get('stable')?.openSeams).toEqual([]);
    expect(stable.value).toBe(2);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('stableResult'))).toEqual([]);
    expect(evaluation.environment.readValue('missingResult')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('missingResult'))).toEqual([
      'Computed property name did not reduce to a primitive property key.',
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

  test('localizes intrinsic callback pressure to the result slots that retain it', () => {
    const source = sourceFile([
      'const mappedIdentity = [pressure(1), 2].map((value) => value);',
      'const mappedIgnored = [pressure(3), 4].map(() => 9);',
      'const mappedCreated = [1, 2].map((value) => value === 1 ? pressure(value) : value);',
      'const filteredOpen = [1].filter(() => pressure(true));',
      'const reducedIgnored = [pressure(5), 6].reduce((accumulator) => accumulator, 7);',
      'const shortCircuited = [1, pressure(8)].some((value) => value === 1);',
    ]);
    const evaluation = new StaticEvaluator(undefined, pressureRuntimeHost).evaluateSourceFile(source);
    const mappedIdentity = requireValueKind(
      evaluation.environment.readValue('mappedIdentity'),
      EvaluationValueKind.Array,
    );
    const mappedIgnored = requireValueKind(
      evaluation.environment.readValue('mappedIgnored'),
      EvaluationValueKind.Array,
    );
    const mappedCreated = requireValueKind(
      evaluation.environment.readValue('mappedCreated'),
      EvaluationValueKind.Array,
    );
    const filteredOpen = requireValueKind(
      evaluation.environment.readValue('filteredOpen'),
      EvaluationValueKind.Array,
    );

    expect(seamSummaries(mappedIdentity.elements[0]?.openSeams ?? [])).toEqual([
      'pressure(1) retained a best-known value.',
    ]);
    expect(mappedIdentity.elements[1]?.openSeams).toEqual([]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('mappedIdentity'))).toEqual([]);

    expect(mappedIgnored.elements.map((element) => seamSummaries(element.openSeams))).toEqual([[], []]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('mappedIgnored'))).toEqual([]);

    expect(seamSummaries(mappedCreated.elements[0]?.openSeams ?? [])).toEqual([
      'pressure(value) retained a best-known value.',
    ]);
    expect(mappedCreated.elements[1]?.openSeams).toEqual([]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('mappedCreated'))).toEqual([]);

    expect(seamSummaries(filteredOpen.extentOpenSeams)).toEqual([
      'pressure(true) retained a best-known value.',
    ]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('filteredOpen'))).toEqual([]);
    expect(seamSummaries(evaluation.openSeams)).not.toContain(
      'Array.filter result membership depended on an open predicate.',
    );

    expect(requireValueKind(
      evaluation.environment.readValue('reducedIgnored'),
      EvaluationValueKind.Number,
    ).value).toBe(7);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('reducedIgnored'))).toEqual([]);
    expect(requireValueKind(
      evaluation.environment.readValue('shortCircuited'),
      EvaluationValueKind.Boolean,
    ).value).toBe(true);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('shortCircuited'))).toEqual([]);
  });

  test('spends array element evidence only at the scalar reads and mutations that use it', () => {
    const source = sourceFile([
      'const selected = [pressure(1), 2].at(0);',
      'const definiteIncludes = [pressure(3), 4].includes(4);',
      'const openIncludes = [pressure(5), 6].includes(7);',
      'const definiteIndex = [8, pressure(9)].indexOf(8);',
      'const openIndex = [pressure(10), 11].indexOf(11);',
      "const joined = [pressure(12), 13].join(',');",
      'const pushed = [];',
      'const pushedLength = pushed.push(pressure(14));',
      'const popped = pushed.pop();',
      'const filled = [15, 16, 17];',
      'const fillResult = filled.fill(pressure(18), 1, 3);',
      'const replaced = [19, 20].with(1, pressure(21));',
      'const concatenated = [22].concat(pressure(23));',
      'const reordered = [pressure(24), 25].toSorted();',
      'const reorderedLength = reordered.length;',
    ]);
    const evaluation = new StaticEvaluator(undefined, pressureRuntimeHost).evaluateSourceFile(source);

    expect(bindingSeamSummaries(evaluation.environment.readBinding('selected'))).toEqual([
      'pressure(1) retained a best-known value.',
    ]);
    expect(requireValueKind(
      evaluation.environment.readValue('definiteIncludes'),
      EvaluationValueKind.Boolean,
    ).value).toBe(true);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('definiteIncludes'))).toEqual([]);
    expect(evaluation.environment.readValue('openIncludes')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('openIncludes'))).toEqual([
      'pressure(5) retained a best-known value.',
    ]);
    expect(requireValueKind(
      evaluation.environment.readValue('definiteIndex'),
      EvaluationValueKind.Number,
    ).value).toBe(0);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('definiteIndex'))).toEqual([]);
    expect(evaluation.environment.readValue('openIndex')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('openIndex'))).toEqual([
      'pressure(10) retained a best-known value.',
    ]);
    expect(evaluation.environment.readValue('joined')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('joined'))).toEqual([
      'pressure(12) retained a best-known value.',
    ]);

    expect(requireValueKind(
      evaluation.environment.readValue('pushedLength'),
      EvaluationValueKind.Number,
    ).value).toBe(1);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('pushedLength'))).toEqual([]);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('popped'))).toEqual([
      'pressure(14) retained a best-known value.',
    ]);
    expect(requireValueKind(evaluation.environment.readValue('pushed'), EvaluationValueKind.Array).elements).toEqual([]);

    const filled = requireValueKind(evaluation.environment.readValue('filled'), EvaluationValueKind.Array);
    expect(filled).toBe(evaluation.environment.readValue('fillResult'));
    expect(filled.mayHaveUnknownElements).toBe(false);
    expect(filled.mayHaveUnknownOrder).toBe(false);
    expect(filled.elements.map((element) => seamSummaries(element.openSeams))).toEqual([
      [],
      ['pressure(18) retained a best-known value.'],
      ['pressure(18) retained a best-known value.'],
    ]);
    const replaced = requireValueKind(evaluation.environment.readValue('replaced'), EvaluationValueKind.Array);
    expect(replaced.elements.map((element) => seamSummaries(element.openSeams))).toEqual([
      [],
      ['pressure(21) retained a best-known value.'],
    ]);
    const concatenated = requireValueKind(evaluation.environment.readValue('concatenated'), EvaluationValueKind.Array);
    expect(seamSummaries(concatenated.elements[1]?.openSeams ?? [])).toEqual([
      'pressure(23) retained a best-known value.',
    ]);
    expect(seamSummaries(concatenated.extentOpenSeams)).toEqual([
      'pressure(23) retained a best-known value.',
    ]);
    expect(seamSummaries(concatenated.elementOpenSeams)).toEqual([
      'pressure(23) retained a best-known value.',
    ]);
    const reordered = requireValueKind(evaluation.environment.readValue('reordered'), EvaluationValueKind.Array);
    expect(reordered.mayHaveUnknownElements).toBe(false);
    expect(reordered.mayHaveUnknownOrder).toBe(true);
    expect(seamSummaries(reordered.orderOpenSeams)).toEqual([
      'pressure(24) retained a best-known value.',
    ]);
    expect(requireValueKind(
      evaluation.environment.readValue('reorderedLength'),
      EvaluationValueKind.Number,
    ).value).toBe(2);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('reorderedLength'))).toEqual([]);
  });

  test('does not let pressured array controls choose callbacks, ranges, arity, or predicate outcomes', () => {
    const source = sourceFile([
      'const callbackRuns = [];',
      'const receiverRuns = [];',
      'function mapper(value) { callbackRuns.push(value); return value; }',
      'const pressuredMap = [1].map(pressure(mapper));',
      'const pressuredSort = [2, 1].toSorted(pressure((left, right) => { callbackRuns.push(left); return left - right; }));',
      'const spreadPressuredSort = [...pressuredSort];',
      'const spreadPressuredSortLength = spreadPressuredSort.length;',
      'const flattenedPressuredSort = [pressuredSort].flat();',
      'const flatMappedPressuredSort = [0].flatMap(() => pressuredSort);',
      'const enumeratedPressuredSort = Object.values(pressuredSort);',
      'const enumeratedPressuredSortLength = enumeratedPressuredSort.length;',
      'const pressuredReceiver = pressure([1, 2]);',
      'const pressuredReceiverMap = pressuredReceiver.map((value) => { receiverRuns.push(value); return value; });',
      'const pressuredFrom = Array.from(pressuredReceiver, (value) => { receiverRuns.push(value); return value; });',
      'const pressuredMutation = pressure([3, 4]);',
      'const pressuredFill = pressuredMutation.fill(9);',
      'const pressuredIsArray = Array.isArray(pressure([5]));',
      'const filled = [3, 4];',
      'const fillResult = filled.fill(9, pressure(0), 1);',
      'const sparseFilled = [, 4];',
      'const sparseFillResult = sparseFilled.fill(9, pressure(0), 1);',
      'const flattened = [pressure([5, 6])].flat();',
      'const mappedFlattened = flattened.map((value) => value);',
      'const found = [pressure(7)].find((value) => value);',
      'const pressuredSlice = [1, 2].slice(pressure(0), 1);',
      'const splicedControl = [1, 2];',
      'const pressuredSplice = splicedControl.splice(pressure(0), 1);',
      'const mutableOrder = [2, 1];',
      'mutableOrder.sort((left, right) => pressure(left - right));',
      'const openPop = mutableOrder.pop();',
      'const openPopLength = mutableOrder.length;',
      'const openPushLength = mutableOrder.push(3);',
      'const orderOpenReversed = pressuredSort.toReversed();',
    ]);
    const evaluation = new StaticEvaluator(undefined, pressureRuntimeHost).evaluateSourceFile(source);
    const callbackRuns = requireValueKind(evaluation.environment.readValue('callbackRuns'), EvaluationValueKind.Array);
    const receiverRuns = requireValueKind(evaluation.environment.readValue('receiverRuns'), EvaluationValueKind.Array);
    const filled = requireValueKind(evaluation.environment.readValue('filled'), EvaluationValueKind.Array);
    const flattened = requireValueKind(evaluation.environment.readValue('flattened'), EvaluationValueKind.Array);
    const sparseFilled = requireValueKind(evaluation.environment.readValue('sparseFilled'), EvaluationValueKind.Array);
    const splicedControl = requireValueKind(evaluation.environment.readValue('splicedControl'), EvaluationValueKind.Array);
    const mutableOrder = requireValueKind(evaluation.environment.readValue('mutableOrder'), EvaluationValueKind.Array);
    const pressuredMutation = requireValueKind(
      evaluation.environment.readValue('pressuredMutation'),
      EvaluationValueKind.Array,
    );

    expect(callbackRuns.elements).toEqual([]);
    expect(receiverRuns.elements).toEqual([]);
    expect(evaluation.environment.readValue('pressuredMap')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(requireValueKind(
      evaluation.environment.readValue('pressuredSort'),
      EvaluationValueKind.Array,
    ).mayHaveUnknownOrder).toBe(true);
    const spreadPressuredSort = requireValueKind(
      evaluation.environment.readValue('spreadPressuredSort'),
      EvaluationValueKind.Array,
    );
    expect(spreadPressuredSort.exactLength).toBe(2);
    expect(spreadPressuredSort.mayHaveUnknownElements).toBe(false);
    expect(spreadPressuredSort.mayHaveUnknownOrder).toBe(true);
    expect(requireValueKind(
      evaluation.environment.readValue('spreadPressuredSortLength'),
      EvaluationValueKind.Number,
    ).value).toBe(2);
    for (const name of ['flattenedPressuredSort', 'flatMappedPressuredSort']) {
      const flattened = requireValueKind(evaluation.environment.readValue(name), EvaluationValueKind.Array);
      expect(flattened.exactLength, name).toBe(2);
      expect(flattened.mayHaveUnknownElements, name).toBe(false);
      expect(flattened.mayHaveUnknownOrder, name).toBe(true);
    }
    const enumeratedPressuredSort = requireValueKind(
      evaluation.environment.readValue('enumeratedPressuredSort'),
      EvaluationValueKind.Array,
    );
    expect(enumeratedPressuredSort.exactLength).toBe(2);
    expect(enumeratedPressuredSort.mayHaveUnknownElements).toBe(true);
    expect(enumeratedPressuredSort.mayHaveUnknownOrder).toBe(true);
    expect(requireValueKind(
      evaluation.environment.readValue('enumeratedPressuredSortLength'),
      EvaluationValueKind.Number,
    ).value).toBe(2);
    expect(evaluation.environment.readValue('pressuredReceiverMap')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(evaluation.environment.readValue('pressuredFrom')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(evaluation.environment.readValue('pressuredFill')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(evaluation.environment.readValue('pressuredIsArray')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(pressuredMutation.elements.map((element) => element.value)).toEqual([
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 3 }),
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 4 }),
    ]);
    expect(evaluation.environment.readValue('fillResult')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(filled.elements.map((element) => element.value)).toEqual([
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 3 }),
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 4 }),
    ]);
    expect(evaluation.environment.readValue('sparseFillResult')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(sparseFilled.mayHaveUnknownElements).toBe(true);
    expect(flattened.mayHaveUnknownElements).toBe(true);
    expect(flattened.elements).toHaveLength(1);
    expect(evaluation.environment.readValue('mappedFlattened')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(bindingSeamSummaries(evaluation.environment.readBinding('found'))).toContain(
      'pressure(7) retained a best-known value.',
    );
    expect(evaluation.environment.readValue('pressuredSlice')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(evaluation.environment.readValue('pressuredSplice')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(splicedControl.exactLength).toBeNull();
    expect(splicedControl.mayHaveUnknownElements).toBe(true);
    expect(evaluation.environment.readValue('openPop')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(requireValueKind(evaluation.environment.readValue('openPopLength'), EvaluationValueKind.Number).value).toBe(1);
    expect(requireValueKind(evaluation.environment.readValue('openPushLength'), EvaluationValueKind.Number).value).toBe(2);
    expect(mutableOrder.elements.some((element) =>
      element.value.kind === EvaluationValueKind.Number && element.value.value === 3
    )).toBe(true);
    const orderOpenReversed = requireValueKind(
      evaluation.environment.readValue('orderOpenReversed'),
      EvaluationValueKind.Array,
    );
    expect(orderOpenReversed.exactLength).toBe(2);
    expect(orderOpenReversed.elements).toHaveLength(2);
    expect(orderOpenReversed.mayHaveUnknownElements).toBe(false);
    expect(orderOpenReversed.mayHaveUnknownOrder).toBe(true);
  });

  test('keeps sparse-array extent and authored element positions exact', () => {
    const evaluation = new StaticEvaluator().evaluateSourceFile(sourceFile([
      'const sparse = [, 8];',
      'const length = sparse.length;',
      'const firstAuthored = sparse[1];',
    ]));

    expect(requireValueKind(evaluation.environment.readValue('length'), EvaluationValueKind.Number).value).toBe(2);
    expect(evaluation.environment.readValue('firstAuthored')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 8,
    }));
  });

  test('retains a causal order seam when default sort coercion cannot close', () => {
    const evaluation = new StaticEvaluator().evaluateSourceFile(sourceFile([
      'const sorted = [{ value: 2 }, { value: 1 }].toSorted();',
      'const length = sorted.length;',
    ]));
    const sorted = requireValueKind(evaluation.environment.readValue('sorted'), EvaluationValueKind.Array);

    expect(sorted.exactLength).toBe(2);
    expect(sorted.mayHaveUnknownOrder).toBe(true);
    expect(seamSummaries(sorted.orderOpenSeams)).toEqual([
      'Array.sort default comparison depended on unmodeled primitive coercion.',
    ]);
    expect(requireValueKind(evaluation.environment.readValue('length'), EvaluationValueKind.Number).value).toBe(2);
  });

  test('preserves object enumeration pressure as result-array membership evidence', () => {
    let initializerCalls = 0;
    const evaluation = new StaticEvaluator(undefined, runtimeHost({
      initializer: (call) => {
        initializerCalls++;
        return new EvaluationNumberValue(2, call);
      },
    })).evaluateSourceFile(sourceFile([
      "const source = { stable: 1, [pressure('dynamic')]: initializer() };",
      'const values = Object.values(source);',
      'const length = values.length;',
    ]));
    const values = requireValueKind(evaluation.environment.readValue('values'), EvaluationValueKind.Array);

    expect(values.exactLength).toBeNull();
    expect(values.mayHaveUnknownElements).toBe(true);
    expect(initializerCalls).toBe(1);
    expect(seamSummaries(values.extentOpenSeams)).toContain(
      "pressure('dynamic') retained a best-known value.",
    );
    expect(evaluation.environment.readValue('length')?.kind).toBe(EvaluationValueKind.Unknown);
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
