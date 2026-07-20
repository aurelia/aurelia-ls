import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  aureliaExternalEvaluationValueResolver,
  aureliaStaticEvaluationRuntimeHost,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import { EvaluationCompletionKind } from '../src/evaluation/completion.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../src/evaluation/evaluator.js';
import { StaticModuleEvaluationExpressionReader } from '../src/evaluation/expression-reader.js';
import {
  StaticInvocationEvaluationKind,
  StaticInvocationPreparationBoundaryKind,
} from '../src/evaluation/invocation.js';
import { EvaluationOpenSeamKind } from '../src/evaluation/seams.js';
import {
  EvaluationImportEntry,
  EvaluationImportKind,
} from '../src/evaluation/module-graph.js';
import { EvaluationValueEvidence } from '../src/evaluation/value-pressure.js';
import {
  EvaluationArrayValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';

describe('static evaluator invocation semantics', () => {
  test.each([
    ['plain runtime host', {}],
    ['Aurelia runtime host', aureliaStaticEvaluationRuntimeHost],
  ] as const)('evaluates receiver, getter, arguments, and body once in order with the %s', (_label, runtimeHost) => {
    const result = evaluate([
      'const events = [];',
      'class Target {',
      "  tag = 'target';",
      '  get method() {',
      "    events.push('getter');",
      '    return function(value) {',
      "      events.push('body:' + this.tag + ':' + value);",
      '      return value;',
      '    };',
      '  }',
      '}',
      'const target = new Target();',
      'function receiver() {',
      "  events.push('receiver');",
      '  return target;',
      '}',
      'function argument() {',
      "  events.push('argument');",
      "  return 'value';",
      '}',
      'const answer = receiver().method(argument());',
    ], runtimeHost);

    expect(result.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(arrayPrimitiveValues(result.environment.readValue('events'))).toEqual([
      'receiver',
      'getter',
      'argument',
      'body:target:value',
    ]);
    expect(result.environment.readValue('answer')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'value',
    }));
  });

  test('preserves the reference receiver through dot, element, and transparent call-target wrappers', () => {
    const result = evaluate([
      'const target = {',
      '  base: 10,',
      '  add(value) { return this.base + value; },',
      '};',
      'const dot = target.add(1);',
      "const element = target['add'](2);",
      'const parenthesized = (target.add)(3);',
      'const asserted = (target.add as (value: number) => number)(4);',
      'const nonNull = target.add!(5);',
    ]);

    expect(numberValue(result, 'dot')).toBe(11);
    expect(numberValue(result, 'element')).toBe(12);
    expect(numberValue(result, 'parenthesized')).toBe(13);
    expect(numberValue(result, 'asserted')).toBe(14);
    expect(numberValue(result, 'nonNull')).toBe(15);
  });

  test('propagates optional-chain short circuit until a real expression boundary', () => {
    const result = evaluate([
      'const events = [];',
      'function argument(label) { events.push(label); return label; }',
      'function key() { events.push("key"); return "method"; }',
      'function pressuredNil() { unresolvedReceiverEffect(); return null; }',
      'const nil = null;',
      'const holder = { nil };',
      'const direct = nil?.method(argument("direct"));',
      'const optionalCallee = holder.nil?.(argument("callee"));',
      'const continuation = nil?.method.deep(argument("continuation"));',
      'const element = nil?.[key()](argument("element"));',
      'const nestedCall = nil?.method()();',
      'const grouped = (nil?.method)(argument("grouped"));',
      'const regroupedOptional = (nil?.method)?.(argument("regrouped"));',
      'const pressured = pressuredNil()?.method(argument("pressured"));',
    ]);

    for (const name of ['direct', 'optionalCallee', 'continuation', 'element', 'nestedCall', 'regroupedOptional']) {
      expect(result.environment.readValue(name)?.kind, name).toBe(EvaluationValueKind.Undefined);
    }
    expect(result.environment.readValue('pressured')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readValue('grouped')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(arrayPrimitiveValues(result.environment.readValue('events'))).toEqual(['grouped']);
    expect(result.openSeams.length).toBeGreaterThan(0);
  });

  test('evaluates arguments before reporting a known non-callable or non-constructable target', () => {
    const result = evaluate([
      'const events = [];',
      'function argument(label) { events.push(label); return label; }',
      'const direct = (1)(argument("direct"));',
      'const member = ({ value: 1 }).value(argument("member"));',
      'const constructed = new (1 as any)(argument("construct"));',
    ]);

    expect(arrayPrimitiveValues(result.environment.readValue('events'))).toEqual([
      'direct',
      'member',
      'construct',
    ]);
    for (const name of ['direct', 'member', 'constructed']) {
      expect(result.environment.readValue(name)?.kind, name).toBe(EvaluationValueKind.Unknown);
    }
  });

  test('dispatches from evaluated identity so local shadows and custom methods win over intrinsic spelling', () => {
    const result = evaluate([
      'function String(value) { return value + 1; }',
      'class Array {',
      '  constructor(value) { this.value = value; }',
      '}',
      'const custom = {',
      '  map(value) { return value + 2; },',
      '  call(value) { return value + 3; },',
      '};',
      'const stringResult = String(10);',
      'const arrayResult = new Array(20).value;',
      'const mapResult = custom.map(30);',
      'const callResult = custom.call(40);',
    ]);

    expect(numberValue(result, 'stringResult')).toBe(11);
    expect(numberValue(result, 'arrayResult')).toBe(20);
    expect(numberValue(result, 'mapResult')).toBe(32);
    expect(numberValue(result, 'callResult')).toBe(43);
  });

  test('stops before arguments on receiver/getter failure and before dispatch after an argument failure', () => {
    const receiverFailure = evaluate([
      'const events = [];',
      'function argument() { events.push("argument"); }',
      'function receiver() { events.push("receiver"); throw "receiver failed"; }',
      'receiver().method(argument());',
    ]);
    expect(receiverFailure.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ value: 'receiver failed' }),
    }));
    expect(arrayPrimitiveValues(receiverFailure.environment.readValue('events'))).toEqual(['receiver']);

    const getterFailure = evaluate([
      'const events = [];',
      'function argument() { events.push("argument"); }',
      'class Target { get method() { events.push("getter"); throw "getter failed"; } }',
      'const target = new Target();',
      'target.method(argument());',
    ]);
    expect(getterFailure.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ value: 'getter failed' }),
    }));
    expect(arrayPrimitiveValues(getterFailure.environment.readValue('events'))).toEqual(['getter']);

    const argumentFailure = evaluate([
      'const events = [];',
      'function first() { events.push("first"); throw "argument failed"; }',
      'function later() { events.push("later"); }',
      'function body() { events.push("body"); }',
      'body(first(), later());',
    ]);
    expect(argumentFailure.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ value: 'argument failed' }),
    }));
    expect(arrayPrimitiveValues(argumentFailure.environment.readValue('events'))).toEqual(['first']);
  });

  test('retains only calls that reach the post-argument invocation point', () => {
    const result = evaluate([
      'let count = 0;',
      'function argument() { count++; return count; }',
      'function identity(value) { return value; }',
      'const nil = null;',
      'const skipped = nil?.method(argument());',
      'const reached = identity(argument());',
    ]);
    const callTexts = result.invocations.map((invocation) => invocation.node.getText(invocation.node.getSourceFile()));

    expect(callTexts).toEqual(['argument()', 'identity(argument())']);
    expect(numberValue(result, 'count')).toBe(1);
    expect(numberValue(result, 'reached')).toBe(1);
    expect(result.environment.readValue('skipped')?.kind).toBe(EvaluationValueKind.Undefined);
  });

  test('reads call-time result and nested argument evidence without replaying source effects', () => {
    const result = evaluate([
      'const events = [];',
      "let selected = { marker: 'before' };",
      'function consume(options) { events.push("consume"); return options.value.marker; }',
      'const answer = consume({ value: selected });',
      "selected = { marker: 'after' };",
    ]);
    const invocation = result.invocations.find((candidate) =>
      candidate.node.getText(candidate.node.getSourceFile()) === 'consume({ value: selected })'
    );
    if (invocation == null || !ts.isCallExpression(invocation.node)) {
      throw new Error('Expected the consume(...) invocation occurrence.');
    }
    const argument = invocation.node.arguments[0];
    if (argument == null || !ts.isObjectLiteralExpression(argument)) {
      throw new Error('Expected the consume(...) options object.');
    }
    const selected = argument.properties.find(ts.isPropertyAssignment)?.initializer;
    if (selected == null) {
      throw new Error('Expected the nested selected expression.');
    }
    const reader = new StaticModuleEvaluationExpressionReader(result);

    expect(reader.evaluateExpression(invocation.node).value).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'before',
    }));
    expect(objectStringProperty(reader.evaluateExpression(selected).value, 'marker')).toBe('before');
    expect(arrayPrimitiveValues(result.environment.readValue('events'))).toEqual(['consume']);
  });

  test('retains authored spread evidence separately from expanded runtime positions', () => {
    const result = evaluate([
      'function count(...values) { return values.length; }',
      'let values = [1, 2];',
      'const answer = count(...values);',
      'values = [3];',
    ]);
    const invocation = result.invocations.find((candidate) =>
      candidate.node.getText(candidate.node.getSourceFile()) === 'count(...values)'
    );
    if (invocation == null || !ts.isCallExpression(invocation.node)) {
      throw new Error('Expected the count(...values) invocation occurrence.');
    }
    const spread = invocation.node.arguments[0];
    if (spread == null || !ts.isSpreadElement(spread)) {
      throw new Error('Expected one spread argument.');
    }
    const read = new StaticModuleEvaluationExpressionReader(result).evaluateExpression(spread.expression);

    expect(arrayPrimitiveValues(read.value)).toEqual([1, 2]);
    expect(invocation.argumentList.authoredArguments).toHaveLength(1);
    expect(invocation.argumentList.elements).toHaveLength(2);
  });

  test('retains constructor completion and argument evidence before later reassignment', () => {
    const result = evaluate([
      'class Target { constructor(marker) { this.marker = marker; } }',
      "let marker = 'before';",
      'const target = new Target(marker);',
      "marker = 'after';",
    ]);
    const invocation = result.invocations.find((candidate) => ts.isNewExpression(candidate.node));
    if (invocation == null || !ts.isNewExpression(invocation.node)) {
      throw new Error('Expected the Target construction occurrence.');
    }
    const marker = invocation.node.arguments?.[0];
    if (marker == null) {
      throw new Error('Expected the constructor marker argument.');
    }
    const reader = new StaticModuleEvaluationExpressionReader(result);

    expect(objectStringProperty(reader.evaluateExpression(invocation.node).value, 'marker')).toBe('before');
    expect(reader.evaluateExpression(marker).value).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'before',
    }));
  });

  test('keeps a repeated source invocation open instead of selecting its last execution', () => {
    const result = evaluate([
      'function identity(value) { return value; }',
      'for (const value of [1, 2]) { identity(value); }',
    ]);
    const invocations = result.invocations.filter((candidate) =>
      candidate.node.getText(candidate.node.getSourceFile()) === 'identity(value)'
    );
    expect(invocations).toHaveLength(2);

    const read = new StaticModuleEvaluationExpressionReader(result).evaluateExpression(invocations[0]!.node);
    expect(read.value).toBeNull();
    expect(read.openSeams).toEqual([
      expect.objectContaining({ seamKind: EvaluationOpenSeamKind.InvocationSourceRead }),
    ]);
  });

  test('does not execute an open-qualified call or constructor candidate', () => {
    const result = evaluate([
      'const events = [];',
      'function argument(label) { events.push(label); return label; }',
      'function pressuredFunction() { unresolvedFunctionSource(); return function() { events.push("body"); }; }',
      'function pressuredClass() { unresolvedClassSource(); return class { constructor() { events.push("constructor"); } }; }',
      'const callable = pressuredFunction();',
      'const constructable = pressuredClass();',
      'const called = callable(argument("call-argument"));',
      'const constructed = new constructable(argument("construct-argument"));',
    ]);

    expect(arrayPrimitiveValues(result.environment.readValue('events'))).toEqual([
      'call-argument',
      'construct-argument',
    ]);
    expect(result.environment.readValue('called')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readValue('constructed')?.kind).toBe(EvaluationValueKind.Unknown);
  });

  test('does not publish an invocation or later argument effects after an open spread expression', () => {
    const result = evaluate([
      'const events = [];',
      'function pressuredSpread() { unresolvedSpreadSource(); return [1]; }',
      'let target = { marker: "before", invoke() { events.push("body"); } };',
      'const answer = target.invoke(...pressuredSpread(), events.push("later"));',
      'target = { marker: "after", invoke() {} };',
    ]);
    const callTexts = result.invocations.map((invocation) => invocation.node.getText(invocation.node.getSourceFile()));
    const boundary = result.invocationEvaluations.find((evaluation) =>
      evaluation.node.getText(evaluation.node.getSourceFile())
        === 'target.invoke(...pressuredSpread(), events.push("later"))'
    );
    if (boundary == null || boundary.evaluationKind !== StaticInvocationEvaluationKind.PreparationBoundary) {
      throw new Error('Expected the target.invoke(...) argument-list preparation boundary.');
    }
    const receiver = boundary.reference.receiverNode;
    if (receiver == null) {
      throw new Error('Expected retained receiver evidence for the blocked invocation.');
    }

    expect(arrayPrimitiveValues(result.environment.readValue('events'))).toEqual([]);
    expect(result.environment.readValue('answer')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(callTexts).not.toContain('target.invoke(...pressuredSpread(), events.push("later"))');
    expect(boundary.boundaryKind).toBe(StaticInvocationPreparationBoundaryKind.ArgumentListOpen);
    expect(boundary.argumentList.authoredArguments).toHaveLength(1);
    expect(objectStringProperty(
      new StaticModuleEvaluationExpressionReader(result).evaluateExpression(receiver).value,
      'marker',
    )).toBe('before');
  });

  test('leaves ambient resolve open outside a modeled DI activation even when an ordinary method supplies this', () => {
    const source = ts.createSourceFile(
      'src/evaluation-aurelia-resolve-boundary.ts',
      [
        "import { resolve } from '@aurelia/kernel';",
        "class Service { marker = 'service'; }",
        'class Caller { invoke() { return resolve(Service); } }',
        'const answer = new Caller().invoke();',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const importBinding = source.statements
      .filter(ts.isImportDeclaration)[0]
      ?.importClause?.namedBindings;
    if (importBinding == null || !ts.isNamedImports(importBinding)) {
      throw new Error('Expected one named resolve import.');
    }
    const resolveValue = aureliaExternalEvaluationValueResolver.resolveImportValue(
      source.fileName,
      new EvaluationImportEntry(
        EvaluationImportKind.Named,
        '@aurelia/kernel',
        'resolve',
        'resolve',
        importBinding.elements[0]!,
      ),
    );
    if (resolveValue == null) {
      throw new Error('Expected Aurelia resolve to have an evaluator identity.');
    }

    const result = new StaticEvaluator(undefined, aureliaStaticEvaluationRuntimeHost).evaluateSourceFile(
      source,
      source.fileName,
      new Map([['resolve', new EvaluationValueEvidence(resolveValue, [])]]),
    );

    expect(result.environment.readValue('answer')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.openSeams.map((seam) => seam.summary)).toContain(
      'Aurelia resolve(...) requires an active modeled DI container.',
    );
  });
});

function evaluate(
  lines: readonly string[],
  runtimeHost: StaticEvaluationRuntimeHost = {},
) {
  const source = ts.createSourceFile(
    'src/evaluation-invocation-semantics.ts',
    lines.join('\n'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
}

function numberValue(
  result: ReturnType<typeof evaluate>,
  name: string,
): number {
  const value = result.environment.readValue(name);
  expect(value?.kind, name).toBe(EvaluationValueKind.Number);
  return (value as Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Number }>).value;
}

function arrayPrimitiveValues(value: EvaluationValue | null): unknown[] {
  expect(value?.kind).toBe(EvaluationValueKind.Array);
  const array = value as EvaluationArrayValue;
  return Array.from({ length: array.exactLength ?? array.elements.length }, (_, index) => {
    const element = array.elementAtRuntimeIndex(index);
    if (element == null || element.value.kind === EvaluationValueKind.Undefined) {
      return undefined;
    }
    if (
      element.value.kind === EvaluationValueKind.Number
      || element.value.kind === EvaluationValueKind.String
      || element.value.kind === EvaluationValueKind.Boolean
    ) {
      return element.value.value;
    }
    return element.value.kind;
  });
}

function objectStringProperty(value: EvaluationValue | null, name: string): string | null {
  if (value?.kind !== EvaluationValueKind.Object && value?.kind !== EvaluationValueKind.Instance) {
    return null;
  }
  const property = value.properties.get(name)?.value;
  return property?.kind === EvaluationValueKind.String ? property.value : null;
}
