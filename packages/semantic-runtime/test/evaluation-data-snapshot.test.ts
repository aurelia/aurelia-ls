import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { StaticDataSnapshotPool, dataSnapshotIndex, readPristineObjectSnapshotView } from '../src/evaluation/data-snapshot.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { EvaluationBindingKind } from '../src/evaluation/environment.js';
import { StaticEvaluator, type StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import { isStaticInvocationOccurrence } from '../src/evaluation/invocation.js';
import { EvaluationOpenSeam, EvaluationOpenSeamKind } from '../src/evaluation/seams.js';
import { evaluationValuesShareLineage } from '../src/evaluation/value-relation.js';
import {
  EvaluationNumberValue,
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyPresence,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';

describe('shared data snapshot histories', () => {
  test('retains deep state captured before the first historical read', () => {
    const child = object({ count: number(1) });
    const live = object({ child });
    const pool = new StaticDataSnapshotPool();
    const before = snapshot(live, pool);
    child.properties.set('count', property('count', number(2)));
    const after = snapshot(live, pool);

    expect(readNumber(readObject(before, 'child'), 'count')).toBe(1);
    expect(readNumber(readObject(after, 'child'), 'count')).toBe(2);
    expect(readNumber(child, 'count')).toBe(2);
  });

  test('captures a changed nested view even when the parent collection has no edits', () => {
    const live = object({ child: object({ count: number(1) }) });
    const first = snapshot(live);
    const child = readObject(first, 'child');
    child.properties.set('count', property('count', number(7)));
    expect(readPristineObjectSnapshotView(first)).toBeNull();

    const second = new StaticEvaluationSessionFork({}).forkValue(first);
    expect(readNumber(readObject(second, 'child'), 'count')).toBe(7);
    readObject(second, 'child').properties.set('count', property('count', number(8)));
    expect(readNumber(child, 'count')).toBe(7);
    expect(readNumber(readObject(live, 'child'), 'count')).toBe(1);
  });

  test.each(['child-first', 'parent-first'] as const)('preserves aliases when materializing %s', (order) => {
    const child = object({ count: number(1) });
    const live = object({ left: child, right: child });
    const fork = new StaticEvaluationSessionFork({}, 'complete', new StaticDataSnapshotPool());
    const firstRead = fork.forkValue(order === 'child-first' ? child : live);
    const parent = order === 'parent-first' ? firstRead : fork.forkValue(live);
    const childView = order === 'child-first' ? firstRead : fork.forkValue(child);

    expect(readObject(parent, 'left')).toBe(childView);
    expect(readObject(parent, 'right')).toBe(childView);
    expect(fork.sourceValue(childView)).toBe(child);
  });

  test('preserves immediate parent lineage for descendants first read after a second fork', () => {
    const live = object({ child: object({ count: number(1) }) });
    const firstFork = new StaticEvaluationSessionFork({}, 'complete', new StaticDataSnapshotPool());
    const first = firstFork.forkValue(live);
    const secondFork = new StaticEvaluationSessionFork({});
    const second = secondFork.forkValue(first);
    const secondChild = readObject(second, 'child');
    const firstChild = readObject(first, 'child');

    expect(secondFork.sourceValue(second)).toBe(first);
    expect(secondFork.sourceValue(secondChild)).toBe(firstChild);
    expect(firstFork.sourceValue(firstChild)).toBe(readObject(live, 'child'));
    expect(secondChild).not.toBe(firstChild);
    expect(evaluationValuesShareLineage(secondChild, firstChild)).toBe(true);
  });

  test('isolates equal historical occurrences through a complete session fork and replay', () => {
    const source = sourceFile([
      'const registry = { child: { count: 1 } };',
      'function read() { return registry.child.count; }',
      'read();',
      'read();',
    ].join('\n'));
    const original = new StaticEvaluator().evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const calls = session.invocationEvaluations.filter((event) =>
      isStaticInvocationOccurrence(event) && event.node.getText() === 'read()');
    expect(calls).toHaveLength(2);
    const firstCallable = requireFunction(calls[0]!.callee.value);
    const secondCallable = requireFunction(calls[1]!.callee.value);
    const firstRegistry = requireObject(firstCallable.environment.readValue('registry'));
    const secondRegistry = requireObject(secondCallable.environment.readValue('registry'));
    expect(firstRegistry).not.toBe(secondRegistry);
    expect(evaluationValuesShareLineage(firstRegistry, secondRegistry)).toBe(true);
    readObject(firstRegistry, 'child').properties.set('count', property('count', number(4)));

    const firstReplay = new StaticEvaluator().evaluateFunctionValue(firstCallable, firstCallable.declaration, source.fileName, []);
    const secondReplay = new StaticEvaluator().evaluateFunctionValue(secondCallable, secondCallable.declaration, source.fileName, []);
    expect(firstReplay.value).toMatchObject({ kind: EvaluationValueKind.Number, value: 4 });
    expect(secondReplay.value).toMatchObject({ kind: EvaluationValueKind.Number, value: 1 });
    expect(readNumber(readObject(requireObject(original.environment.readValue('registry')), 'child'), 'count')).toBe(1);
  });

  test('keeps untouched occurrences lazy after another occurrence changes and the complete module is forked again', () => {
    const source = sourceFile([
      'const registry = { child: { count: 1 } };',
      'function read() { return registry.child.count; }',
      'read();',
      'read();',
    ].join('\n'));
    const original = new StaticEvaluator().evaluateSourceFile(source);
    const first = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const firstCalls = first.invocationEvaluations.filter((event) =>
      isStaticInvocationOccurrence(event) && event.node.getText() === 'read()');
    const changed = requireObject(requireFunction(firstCalls[0]!.callee.value).environment.readValue('registry'));
    const untouched = requireObject(requireFunction(firstCalls[1]!.callee.value).environment.readValue('registry'));
    expect(readPristineObjectSnapshotView(changed)).not.toBeNull();
    expect(readPristineObjectSnapshotView(untouched)).not.toBeNull();
    readObject(changed, 'child').properties.set('count', property('count', number(7)));
    expect(readPristineObjectSnapshotView(untouched)).not.toBeNull();

    const second = new StaticEvaluationSessionFork(first.runtimeHost).forkModuleEvaluation(first);
    const secondCalls = second.invocationEvaluations.filter((event) =>
      isStaticInvocationOccurrence(event) && event.node.getText() === 'read()');
    const changedAgain = requireObject(requireFunction(secondCalls[0]!.callee.value).environment.readValue('registry'));
    const untouchedAgain = requireObject(requireFunction(secondCalls[1]!.callee.value).environment.readValue('registry'));
    expect(readPristineObjectSnapshotView(untouchedAgain)).not.toBeNull();
    expect(readNumber(readObject(changedAgain, 'child'), 'count')).toBe(7);
    expect(readNumber(readObject(untouchedAgain, 'child'), 'count')).toBe(1);
    expect(untouchedAgain).not.toBe(untouched);
  });

  test.each([false, true])('retains a mutated imported child alias when the parent was previously read: %s', (readParentFirst) => {
    const host: StaticEvaluationRuntimeHost = {};
    const sourceChild = snapshot(object({ count: number(1) }), new StaticDataSnapshotPool(), host);
    const fork = new StaticEvaluationSessionFork(host, 'complete', new StaticDataSnapshotPool());
    const importedChild = fork.forkValue(sourceChild);
    const parent = fork.forkValue(object({ child: sourceChild }));
    if (readParentFirst) expect(readObject(parent, 'child')).toBe(importedChild);
    importedChild.properties.set('count', property('count', number(7)));

    const nextFork = new StaticEvaluationSessionFork(host);
    const nextParent = nextFork.forkValue(parent);
    importedChild.properties.set('count', property('count', number(9)));
    expect(readNumber(readObject(nextParent, 'child'), 'count')).toBe(7);
    expect(readObject(parent, 'child')).toBe(importedChild);
    expect(readNumber(readObject(parent, 'child'), 'count')).toBe(9);
    expect(nextFork.sourceValue(readObject(nextParent, 'child'))).toBe(importedChild);
    expect(readNumber(sourceChild, 'count')).toBe(1);
  });

  test('uses the earlier parent state when its live child is directly forked only after mutation', () => {
    const host: StaticEvaluationRuntimeHost = {};
    const liveChild = object({ count: number(1) });
    const fork = new StaticEvaluationSessionFork(host, 'complete', new StaticDataSnapshotPool());
    const parent = fork.forkValue(object({ child: liveChild }));
    liveChild.properties.set('count', property('count', number(7)));
    const child = fork.forkValue(liveChild);
    expect(readNumber(child, 'count')).toBe(1);
    expect(readObject(parent, 'child')).toBe(child);
    const next = new StaticEvaluationSessionFork(host).forkValue(parent);
    expect(readNumber(readObject(next, 'child'), 'count')).toBe(1);
    expect(readNumber(liveChild, 'count')).toBe(7);
  });

  test('links a child imported after its still-unread parent', () => {
    const host: StaticEvaluationRuntimeHost = {};
    const sourceParent = snapshot(object({ child: object({ count: number(1) }) }), new StaticDataSnapshotPool(), host);
    const fork = new StaticEvaluationSessionFork(host);
    const parent = fork.forkValue(sourceParent);
    const sourceChild = readObject(sourceParent, 'child');
    const child = fork.forkValue(sourceChild);
    child.properties.set('count', property('count', number(7)));
    const next = new StaticEvaluationSessionFork(host).forkValue(parent);
    child.properties.set('count', property('count', number(9)));
    expect(readNumber(readObject(next, 'child'), 'count')).toBe(7);
    expect(readObject(parent, 'child')).toBe(child);
    expect(readNumber(readObject(parent, 'child'), 'count')).toBe(9);
    expect(readNumber(sourceChild, 'count')).toBe(1);
  });

  test('retains an already-mapped child when live state differs during parent capture', () => {
    const host: StaticEvaluationRuntimeHost = {};
    const liveChild = object({ count: number(1) });
    const fork = new StaticEvaluationSessionFork(host, 'complete', new StaticDataSnapshotPool());
    const child = fork.forkValue(liveChild);
    liveChild.properties.set('count', property('count', number(7)));
    const parent = fork.forkValue(object({ child: liveChild }));
    const next = new StaticEvaluationSessionFork(host).forkValue(parent);
    expect(readNumber(readObject(next, 'child'), 'count')).toBe(1);
    expect(readObject(parent, 'child')).toBe(child);
    expect(readNumber(liveChild, 'count')).toBe(7);
  });

  test.each([false, true])('keeps separately imported historical domains independent after live mutation: %s', (mutateLive) => {
    const host: StaticEvaluationRuntimeHost = {};
    const liveChild = object({ count: number(1) });
    const liveParent = object({ child: liveChild });
    const pool = new StaticDataSnapshotPool();
    const sourceA = snapshot(liveParent, pool, host);
    if (mutateLive) liveChild.properties.set('count', property('count', number(2)));
    const sourceB = snapshot(liveParent, pool, host);
    const fork = new StaticEvaluationSessionFork(host);
    const parentA = fork.forkValue(sourceA);
    const parentB = fork.forkValue(sourceB);
    const childB = fork.forkValue(readObject(sourceB, 'child'));
    const childA = fork.forkValue(readObject(sourceA, 'child'));
    expect(readObject(parentA, 'child')).toBe(childA);
    expect(readObject(parentB, 'child')).toBe(childB);
    expect(childA).not.toBe(childB);
    expect(evaluationValuesShareLineage(childA, childB)).toBe(true);
    childA.properties.set('count', property('count', number(7)));
    const nextFork = new StaticEvaluationSessionFork(host);
    const nextA = nextFork.forkValue(parentA);
    const nextB = nextFork.forkValue(parentB);
    expect(readNumber(readObject(nextA, 'child'), 'count')).toBe(7);
    expect(readNumber(readObject(nextB, 'child'), 'count')).toBe(mutateLive ? 2 : 1);
  });

  test('does not capture an unrelated sibling when only a nested view was forked', () => {
    const host: StaticEvaluationRuntimeHost = {};
    const source = snapshot(object({ a: object({ count: number(1) }), b: object({ count: number(2) }) }), new StaticDataSnapshotPool(), host);
    const sourceA = readObject(source, 'a');
    const sourceB = readObject(source, 'b');
    const fork = new StaticEvaluationSessionFork(host);
    const a = fork.forkValue(sourceA);
    sourceB.properties.set('count', property('count', number(9)));
    const b = fork.forkValue(sourceB);
    expect(readNumber(a, 'count')).toBe(1);
    expect(readNumber(b, 'count')).toBe(9);
    expect(fork.sourceValue(b)).toBe(sourceB);
  });

  test.each(['ordinary', 'historical'] as const)('matches eager forks when %s roots arrive between source mutations', (sourceKind) => {
    for (let seed = 1; seed <= 6; seed++) {
      const host: StaticEvaluationRuntimeHost = {};
      const leaves = Array.from({ length: 4 }, (_, index) => object({ count: number(index) }));
      const liveRoot = object({
        left: object({ child: leaves[0]!, alias: leaves[1]! }),
        right: object({ child: leaves[1]!, alias: leaves[2]! }),
        other: leaves[3]!,
      });
      const root = sourceKind === 'ordinary' ? liveRoot : snapshot(liveRoot, new StaticDataSnapshotPool(), host);
      const left = readObject(root, 'left');
      const right = readObject(root, 'right');
      const children = [readObject(left, 'child'), readObject(left, 'alias'), readObject(right, 'alias'), readObject(root, 'other')];
      const sources = [...children, left, right, root];
      // The distinct metadata-free host also prevents pristine historical sources taking the optimized path.
      const eagerFork = new StaticEvaluationSessionFork({});
      const lazyFork = new StaticEvaluationSessionFork(host, 'complete', new StaticDataSnapshotPool());
      const copies: Array<[EvaluationObjectValue, EvaluationObjectValue]> = [];
      let random = seed;
      const next = () => (random = (Math.imul(random, 1664525) + 1013904223) >>> 0);
      for (let step = 0; step < 35; step++) {
        const selected = sources[next() % sources.length]!;
        copies.push([eagerFork.forkValue(selected), lazyFork.forkValue(selected)]);
        const child = children[next() % children.length]!;
        child.properties.set('count', property('count', number(next() % 100)));
        if (step % 3 === 0) left.properties.set('child', property('child', child));
        if (step % 5 === 0) right.properties.set('alias', property('alias', child));
      }
      for (const [eager, lazy] of copies) expect(encodeObjectGraph(lazy)).toEqual(encodeObjectGraph(eager));
    }
  });

  test('reconnects callee captures, receiver and arguments inside one preparation', () => {
    const source = sourceFile([
      'const registry = { child: { count: 1 } };',
      'function read(arg) { return registry.child === this.child && this.child === arg; }',
      'const receiver = { child: registry.child, read };',
      'receiver.read(registry.child);',
    ].join('\n'));
    const evaluation = new StaticEvaluator().evaluateSourceFile(source);
    const call = evaluation.invocationEvaluations.find((event) =>
      isStaticInvocationOccurrence(event) && event.callee.value.kind === EvaluationValueKind.Function
      && event.thisValue?.value.kind === EvaluationValueKind.Object);
    expect(call).toBeDefined();
    if (call == null) throw new Error('Missing prepared function invocation.');
    const callable = requireFunction(call.callee.value);
    const captured = readObject(requireObject(callable.environment.readValue('registry')), 'child');
    expect(readObject(requireObject(call.thisValue?.value), 'child')).toBe(captured);
    expect(call.argumentList.elements[0]!.value).toBe(captured);
  });

  test('joins sibling branch writes into the immediate lazy baseline without changing earlier state', () => {
    const source = sourceFile('const state = { child: { count: 1 } }; const alias = state.child;');
    const original = new StaticEvaluator().evaluateSourceFile(source);
    const fork = new StaticEvaluationSessionFork(original.runtimeHost, 'complete', new StaticDataSnapshotPool());
    const session = fork.forkModuleEvaluation(original);
    const state = requireObject(session.environment.readValue('state'));
    const originalChild = readObject(requireObject(original.environment.readValue('state')), 'child');
    const expressionSource = sourceFile('condition ? (state.child.count = 2) : (state.child.count = 2)');
    session.environment.initializeBinding('condition',
      new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'condition', expressionSource),
      EvaluationBindingKind.Const, false, expressionSource, []);
    const statement = expressionSource.statements[0]!;
    if (!ts.isExpressionStatement(statement)) throw new Error('Expected conditional expression.');
    const result = new StaticEvaluator(session.policy, session.runtimeHost).evaluateExpressionInEnvironment(
      statement.expression, session.environment, source.fileName,
    );

    expect(result.value).toMatchObject({ kind: EvaluationValueKind.Number, value: 2 });
    expect(readNumber(readObject(state, 'child'), 'count')).toBe(2);
    expect(session.environment.readValue('alias')).toBe(readObject(state, 'child'));
    expect(readNumber(originalChild, 'count')).toBe(1);
    expect(fork.sourceValue(readObject(state, 'child'))).toBe(originalChild);
  });

  test('distinguishes equal-but-different child objects when interning state', () => {
    const child = object({ count: number(1) });
    const live = object({ child });
    const pool = new StaticDataSnapshotPool();
    const before = snapshot(live, pool);
    const replacement = object({ count: number(1) });
    live.properties.set('child', property('child', replacement));
    const after = snapshot(live, pool);

    expect(evaluationValuesShareLineage(readObject(before, 'child'), readObject(after, 'child'))).toBe(false);
    expect(readNumber(readObject(before, 'child'), 'count')).toBe(1);
    expect(readNumber(readObject(after, 'child'), 'count')).toBe(1);
  });

  test('reuses exact unchanged state and retains changed order and source descriptors', () => {
    const node1 = sourceFile('const first = 1;').statements[0]!;
    const node2 = sourceFile('const second = 1;').statements[0]!;
    const value = number(1);
    const live = object({ a: value, b: number(2) });
    live.properties.set('a', property('a', value, node1));
    const pool = new StaticDataSnapshotPool();
    const first = pool.capture(live, {});
    expect(pool.capture(live, {})).toBe(first);
    expect(pool.createdStateCount).toBe(1);
    live.properties.set('a', property('a', value, node2));
    const second = pool.capture(live, {});
    expect(second).not.toBe(first);
    const historical = snapshot(live, pool);
    live.properties.delete('a');
    live.properties.set('a', property('a', value, node2));
    const third = pool.capture(live, {});
    expect(third).not.toBe(second);
    expect([...historical.properties.keys()]).toEqual(['a', 'b']);
    expect(historical.properties.get('a')?.node).toBe(node2);
    expect([...snapshot(live, pool).properties.keys()]).toEqual(['b', 'a']);
  });

  test('keeps inherited identity indexes exact across overlapping child graphs', () => {
    const shared = object({ count: number(1) });
    const left = object({ shared });
    const extra = object({ count: number(2) });
    const right = object({ shared, extra });
    const root = object({ left, right, alias: shared });
    const record = new StaticDataSnapshotPool().capture(root, {});
    if (record == null) throw new Error('Expected closed data snapshot.');
    const index = dataSnapshotIndex(record);
    expect(index.size).toBe(5);
    expect(new Set(index.keys())).toEqual(new Set([root, left, right, shared, extra]));
    expect([...index].length).toBe(index.size);
    const leftRecord = index.get(left)!;
    const leftIndex = dataSnapshotIndex(leftRecord);
    expect(leftIndex.size).toBe(2);
    expect(new Set(leftIndex.keys())).toEqual(new Set([left, shared]));
    expect(leftIndex.get(shared)).toBe(index.get(shared));
    expect(leftIndex.get(extra)).toBeUndefined();
    expect(leftIndex.get(root)).toBeUndefined();
  });

  test('preserves live aliases and independent historical states through repeated complete module generations', () => {
    const host: StaticEvaluationRuntimeHost = {};
    const pool = new StaticDataSnapshotPool();
    const original = new StaticEvaluator(undefined, host, {}, pool).evaluateSourceFile(sourceFile([
      'const registry = { child: { count: 1 } };',
      'const alias = registry.child;',
      'function read() { return registry.child.count; }',
      'read();',
      'registry.child.count = 2;',
      'read();',
    ].join('\n')));
    const generations = [original];
    for (let iteration = 0; iteration < 5; iteration++) {
      const previous = generations.at(-1)!;
      const previousState = requireObject(previous.environment.readValue('registry'));
      const expected = readNumber(readObject(previousState, 'child'), 'count');
      const fork = new StaticEvaluationSessionFork(previous.runtimeHost, 'complete', pool);
      const current = fork.forkModuleEvaluation(previous);
      generations.push(current);
      const currentState = requireObject(current.environment.readValue('registry'));
      expect(readNumber(readObject(currentState, 'child'), 'count')).toBe(expected);
      expect(current.environment.readValue('alias')).toBe(readObject(currentState, 'child'));
      expect(fork.sourceValue(readObject(currentState, 'child'))).toBe(readObject(previousState, 'child'));
      readObject(previousState, 'child').properties.set('count', property('count', number(100 + iteration)));
      expect(readNumber(readObject(currentState, 'child'), 'count')).toBe(expected);
      readObject(currentState, 'child').properties.set('count', property('count', number(10 + iteration)));
    }
    for (const generation of generations) {
      const histories = generation.invocationEvaluations.filter((event) =>
        isStaticInvocationOccurrence(event) && event.node.getText() === 'read()');
      expect(histories.map((call) => readNumber(readObject(requireObject(
        requireFunction(call.callee.value).environment.readValue('registry'),
      ), 'child'), 'count'))).toEqual([1, 2]);
    }
  });

  test('retains changed scalar shape and property uncertainty through the copy fallback', () => {
    const node = sourceFile('unknownCall()').statements[0]!;
    const seam = new EvaluationOpenSeam(EvaluationOpenSeamKind.DynamicCall, 'Unknown call.', node, 'snapshot.ts');
    const live = object({ a: number(1) });
    const pool = new StaticDataSnapshotPool();
    const before = snapshot(live, pool);
    live.mayHaveUnknownProperties = true;
    live.retainShapeOpenSeams([seam]);
    live.retainPropertyOrderOpenSeams([seam]);
    live.properties.set('a', new EvaluationObjectProperty('a', number(2), node,
      EvaluationObjectPropertyState.Open, [seam], EvaluationObjectPropertyPresence.Conditional, [seam]));
    const after = snapshot(live, pool);
    expect(readPristineObjectSnapshotView(after)).toBeNull();
    expect(before.mayHaveUnknownProperties).toBe(false);
    expect(readNumber(before, 'a')).toBe(1);
    expect(after.mayHaveUnknownProperties).toBe(true);
    expect(after.shapeOpenSeams).toEqual([seam]);
    expect(after.propertyOrderOpenSeams).toEqual([seam]);
    expect(after.properties.get('a')).toMatchObject({
      state: EvaluationObjectPropertyState.Open,
      presence: EvaluationObjectPropertyPresence.Conditional,
      openSeams: [seam],
      presenceOpenSeams: [seam],
    });
  });

  test('falls back for cycles while preserving a shared acyclic sibling', () => {
    const child = object({ count: number(1) });
    const live = object({ child, alias: child });
    live.properties.set('self', property('self', live));
    const fork = new StaticEvaluationSessionFork({}, 'complete', new StaticDataSnapshotPool());
    const copy = fork.forkValue(live);
    expect(readPristineObjectSnapshotView(copy)).toBeNull();
    expect(readObject(copy, 'self')).toBe(copy);
    expect(readObject(copy, 'child')).toBe(readObject(copy, 'alias'));
    readObject(copy, 'child').properties.set('count', property('count', number(2)));
    expect(readNumber(child, 'count')).toBe(1);
  });

  test('transfers metadata installed on a materialized nested view before a subsequent fork', () => {
    const { host, metadata } = metadataHost();
    const first = snapshot(object({ child: object({ count: number(1) }) }), new StaticDataSnapshotPool(), host);
    const firstChild = readObject(first, 'child');
    metadata.set(firstChild, 'registered');
    expect(readPristineObjectSnapshotView(first)).toBeNull();
    const second = new StaticEvaluationSessionFork(host).forkValue(first);
    expect(metadata.get(readObject(second, 'child'))).toBe('registered');
    expect(readObject(second, 'child')).not.toBe(firstChild);
  });

  test('does not copy metadata added to the live child after its historical capture', () => {
    const { host, metadata } = metadataHost();
    const child = object({ count: number(1) });
    const live = object({ child });
    const pool = new StaticDataSnapshotPool();
    const before = snapshot(live, pool, host);
    metadata.set(child, 'registered-later');
    const after = snapshot(live, pool, host);
    expect(metadata.get(readObject(before, 'child'))).toBeUndefined();
    expect(metadata.get(readObject(after, 'child'))).toBe('registered-later');
  });

  test('preserves default copying when a metadata host supplies no eligibility proof', () => {
    const metadata = new WeakMap<EvaluationValue, string>();
    const host: StaticEvaluationRuntimeHost = {
      transferValueMetadata(source, target) {
        const tag = metadata.get(source);
        if (tag != null) metadata.set(target, tag);
      },
    };
    const live = object({ child: object({ count: number(1) }) });
    const before = snapshot(live, new StaticDataSnapshotPool(), host);
    expect(readPristineObjectSnapshotView(before)).toBeNull();
    metadata.set(readObject(live, 'child'), 'later');
    expect(metadata.get(readObject(before, 'child'))).toBeUndefined();
  });

  test('matches eager historical forks across generated live mutations and aliases', () => {
    for (let seed = 1; seed <= 8; seed++) {
      let random = seed;
      const next = () => (random = (Math.imul(random, 1664525) + 1013904223) >>> 0);
      const children = Array.from({ length: 6 }, (_, index) => object({ count: number(index) }));
      const live = object({ a: children[0]!, b: children[1]!, alias: children[0]! });
      const pool = new StaticDataSnapshotPool();
      const histories: Array<[EvaluationObjectValue, EvaluationObjectValue]> = [];
      for (let step = 0; step < 40; step++) {
        histories.push([new StaticEvaluationSessionFork({}).forkValue(live), snapshot(live, pool)]);
        const target = children[next() % children.length]!;
        switch (next() % 5) {
          case 0:
            target.properties.set('count', property('count', number(next() % 100)));
            break;
          case 1:
            live.properties.set(next() % 2 === 0 ? 'a' : 'b', property('ref', target));
            break;
          case 2:
            live.properties.delete('alias');
            live.properties.set('alias', property('alias', target));
            break;
          case 3:
            target.properties.set('extra', property('extra', number(next() % 100)));
            break;
          case 4:
            target.properties.delete('extra');
            break;
        }
      }
      // Delay every optimized read until all source mutations finish; otherwise a lazy live-state read can hide.
      for (const [eager, lazy] of histories) expect(encodeObjectGraph(lazy)).toEqual(encodeObjectGraph(eager));
    }
  });

  test('preserves sparse array positions and historical object children', () => {
    const child = object({ count: number(1) });
    const liveArray = new EvaluationArrayValue([
      new EvaluationArrayElement(child, null, [], 1),
      new EvaluationArrayElement(child, null, [], 3),
    ], null, EvaluationArrayShape.exact(5));
    const live = object({ items: liveArray });
    const first = snapshot(live);
    child.properties.set('count', property('count', number(7)));
    liveArray.replaceElements([new EvaluationArrayElement(number(2), null)], EvaluationArrayShape.exact(1));
    const historical = first.properties.get('items')!.value;
    if (historical.kind !== EvaluationValueKind.Array) throw new Error('Expected historical array.');
    expect(historical.exactLength).toBe(5);
    expect(historical.elements.map((element) => element.runtimeIndex)).toEqual([1, 3]);
    expect(historical.elements[0]!.value).toBe(historical.elements[1]!.value);
    expect(readNumber(requireObject(historical.elements[0]!.value), 'count')).toBe(1);
  });

  test('matches eager object-array histories through element and nested-object mutations', () => {
    const child = object({ count: number(1) });
    const array = new EvaluationArrayValue([new EvaluationArrayElement(child, null), new EvaluationArrayElement(child, null)]);
    const live = object({ items: array, alias: array, child });
    const pool = new StaticDataSnapshotPool();
    const histories: Array<[EvaluationObjectValue, EvaluationObjectValue]> = [];
    for (let step = 0; step < 35; step++) {
      histories.push([new StaticEvaluationSessionFork({}).forkValue(live), snapshot(live, pool)]);
      child.properties.set('count', property('count', number(step)));
      const elements = [...array.elements];
      if (step % 3 === 0) elements.push(new EvaluationArrayElement(number(step), null));
      else if (step % 3 === 1) elements.reverse();
      else elements.shift();
      array.replaceElements(elements, EvaluationArrayShape.exact(elements.length));
    }
    for (const [eager, lazy] of histories) expect(encodeObjectGraph(lazy)).toEqual(encodeObjectGraph(eager));
  });
});

describe('snapshot property maps', () => {
  test('does not materialize values during key-only reads', () => {
    const { host } = metadataHost();
    let checks = 0;
    const trackedHost: StaticEvaluationRuntimeHost = {
      ...host,
      canShareSnapshotValue(value) { checks++; return host.canShareSnapshotValue!(value); },
    };
    const view = snapshot(object({ a: object({ x: number(1) }), b: object({ x: number(2) }) }), new StaticDataSnapshotPool(), trackedHost);
    expect(readPristineObjectSnapshotView(view)).not.toBeNull();
    checks = 0;
    expect(view.properties.has('a')).toBe(true);
    expect([...view.properties.keys()]).toEqual(['a', 'b']);
    expect(view.properties.size).toBe(2);
    expect(readPristineObjectSnapshotView(view)).not.toBeNull();
    expect(checks).toBe(1);
  });

  test('matches native mutation semantics for in-flight entries and keys iterators', () => {
    for (const iteratorKind of ['entries', 'keys', 'values'] as const) {
      const { native, lazy } = mapPair();
      const nativeIterator = native[iteratorKind]();
      const lazyIterator = lazy[iteratorKind]();
      expect(lazyIterator.next()).toEqual(nativeIterator.next());
      mutatePair(native, lazy, (map) => {
        map.set('b', property('b', number(20)));
        map.delete('c');
        map.set('d', property('d', number(4)));
        map.delete('a');
        map.set('a', property('a', number(10)));
      });
      expect([...lazyIterator]).toEqual([...nativeIterator]);
      expect([...lazy]).toEqual([...native]);
      expect(lazy.size).toBe(native.size);
    }
  });

  test('preserves clear and append behavior while iteration is suspended', () => {
    const { native, lazy } = mapPair();
    const nativeIterator = native.entries();
    const lazyIterator = lazy.entries();
    expect(lazyIterator.next()).toEqual(nativeIterator.next());
    mutatePair(native, lazy, (map) => {
      map.clear();
      map.set('b', property('b', number(20)));
    });
    expect([...lazyIterator]).toEqual([...nativeIterator]);
    mutatePair(native, lazy, (map) => map.set('e', property('e', number(5))));
    expect(lazyIterator.next()).toEqual(nativeIterator.next());
  });

  test('sees appends after clearing an iterator that has not started', () => {
    const { native, lazy } = mapPair();
    const nativeIterator = native.entries();
    const lazyIterator = lazy.entries();
    mutatePair(native, lazy, (map) => {
      map.clear();
      map.set('d', property('d', number(4)));
    });
    expect([...lazyIterator]).toEqual([...nativeIterator]);
  });

  test('provides native forEach callback arguments and observes callback mutations', () => {
    const { native, lazy } = mapPair();
    const context = {};
    const run = (map: Map<string, EvaluationObjectProperty>) => {
      const seen: Array<[string, number]> = [];
      map.forEach(function(this: object, value, key, suppliedMap) {
        expect(this).toBe(context);
        expect(suppliedMap).toBe(map);
        seen.push([key, requireNumber(value.value)]);
        if (seen.length === 1) {
          map.delete('a');
          map.delete('b');
          map.set('a', property('a', number(10)));
          map.set('d', property('d', number(4)));
        }
      }, context);
      return seen;
    };
    expect(run(lazy)).toEqual(run(native));
  });

  test('matches native Maps across deterministic generated mutations and suspended iterators', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { native, lazy } = mapPair();
      let random = seed;
      const next = () => (random = (Math.imul(random, 1664525) + 1013904223) >>> 0);
      const iterators: Array<[MapIterator<[string, EvaluationObjectProperty]>, MapIterator<[string, EvaluationObjectProperty]>]> = [];
      for (let step = 0; step < 80; step++) {
        const operation = next() % 7;
        const key = String.fromCharCode(97 + next() % 6);
        if (operation < 3) {
          const value = property(key, number(next() % 100));
          native.set(key, value);
          lazy.set(key, value);
        } else if (operation === 3) {
          expect(lazy.delete(key)).toBe(native.delete(key));
        } else if (operation === 4) {
          native.clear(); lazy.clear();
        } else if (operation === 5) {
          iterators.push([native.entries(), lazy.entries()]);
        } else {
          for (const [left, right] of iterators) expect(right.next()).toEqual(left.next());
        }
        expect(lazy.size).toBe(native.size);
        expect([...lazy.keys()]).toEqual([...native.keys()]);
        expect([...lazy]).toEqual([...native]);
      }
      for (const [left, right] of iterators) expect([...right]).toEqual([...left]);
    }
  });
});

function sourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile('src/data-snapshot.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function number(value: number): EvaluationNumberValue { return new EvaluationNumberValue(value); }

function property(name: string, value: EvaluationValue, node: ts.Node | null = null): EvaluationObjectProperty {
  return new EvaluationObjectProperty(name, value, node, EvaluationObjectPropertyState.Closed);
}

function object(entries: Record<string, EvaluationValue>): EvaluationObjectValue {
  return new EvaluationObjectValue(new Map(Object.entries(entries).map(([key, value]) => [key, property(key, value)])), false);
}

function snapshot(value: EvaluationObjectValue, pool = new StaticDataSnapshotPool(), host: StaticEvaluationRuntimeHost = {}): EvaluationObjectValue {
  return new StaticEvaluationSessionFork(host, 'complete', pool).forkValue(value);
}

function requireObject(value: EvaluationValue | null | undefined): EvaluationObjectValue {
  if (value?.kind !== EvaluationValueKind.Object) throw new Error(`Expected object, received ${value?.kind}.`);
  return value;
}

function requireFunction(value: EvaluationValue) {
  if (value.kind !== EvaluationValueKind.Function) throw new Error(`Expected function, received ${value.kind}.`);
  return value;
}

function readObject(value: EvaluationObjectValue, key: string): EvaluationObjectValue {
  return requireObject(value.properties.get(key)?.value);
}

function requireNumber(value: EvaluationValue | null | undefined): number {
  if (value?.kind !== EvaluationValueKind.Number) throw new Error(`Expected number, received ${value?.kind}.`);
  return value.value;
}

function readNumber(value: EvaluationObjectValue, key: string): number { return requireNumber(value.properties.get(key)?.value); }

function metadataHost() {
  const metadata = new WeakMap<EvaluationValue, string>();
  const host: StaticEvaluationRuntimeHost = {
    canShareSnapshotValue(value) { return !metadata.has(value); },
    transferValueMetadata(source, target) {
      const tag = metadata.get(source);
      if (tag != null) metadata.set(target, tag);
    },
  };
  return { host, metadata };
}

function mapPair() {
  const source = object({ a: number(1), b: number(2), c: number(3) });
  return { native: new Map(source.properties), lazy: snapshot(source).properties };
}

function mutatePair(
  native: Map<string, EvaluationObjectProperty>,
  lazy: Map<string, EvaluationObjectProperty>,
  mutation: (map: Map<string, EvaluationObjectProperty>) => void,
): void {
  mutation(native);
  mutation(lazy);
}

function encodeObjectGraph(root: EvaluationObjectValue): unknown {
  const ids = new Map<EvaluationValue, number>();
  const encode = (value: EvaluationValue): unknown => {
    if (value.kind === EvaluationValueKind.Number) return { number: value.value };
    if (value.kind !== EvaluationValueKind.Object && value.kind !== EvaluationValueKind.Array) {
      throw new Error(`Unexpected generated kind ${value.kind}.`);
    }
    const existing = ids.get(value);
    if (existing != null) return { ref: existing };
    const id = ids.size;
    ids.set(value, id);
    if (value.kind === EvaluationValueKind.Array) return {
      id,
      exactLength: value.exactLength,
      elements: value.elements.map((element) => [element.runtimeIndex, encode(element.value)]),
    };
    return {
      id,
      properties: [...value.properties].map(([key, entry]) => [key, entry.name, encode(entry.value)]),
    };
  };
  return encode(root);
}
