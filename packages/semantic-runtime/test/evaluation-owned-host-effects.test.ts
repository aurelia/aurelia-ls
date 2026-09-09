import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { ThrowEvaluationCompletion } from '../src/evaluation/completion.js';
import { StaticEvaluator, StaticEvaluationRuntimeValueResult, type StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import { evaluateStaticCallableCompletion, StaticCallableCompletionKind, StaticCallableTarget } from '../src/evaluation/function-execution.js';
import { StaticInvocationNotApplicable, staticInvocationValue } from '../src/evaluation/invocation.js';
import { EvaluationIteratorStep, EvaluationIteratorStepKind } from '../src/evaluation/iterator-projection.js';
import { StaticEvaluationPolicy } from '../src/evaluation/policy.js';
import { EvaluationOpenSeamKind } from '../src/evaluation/seams.js';
import {
  EvaluationArrayElement, EvaluationBoundaryKind, EvaluationBoundaryValue, EvaluationStringValue,
  EvaluationUndefined, EvaluationValueKind,
} from '../src/evaluation/values.js';

describe('consumer-owned synchronous evaluator host operations', () => {
  test.each([
    'node.id = "changed"; return node.id === "changed";',
    'node["id"] = "changed"; return node["id"] === "changed";',
    'const { id } = node; return id === "initial";',
    'const alias = node; alias.setAttribute("id", "changed"); return node.id === "changed";',
    '["changed"].forEach(value => node.setAttribute("id", value)); return node.id === "changed";',
    'node.id += "-changed"; return node.id === "initial-changed";',
  ])('executes owned reads, writes and calls: %s', body => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate(`function hook(node) { ${body} }`);
    expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
    expect(result.evaluation?.value).toMatchObject({ kind: EvaluationValueKind.Boolean, value: true });
    expect(result.evaluation?.mutationCount).toBe(0);
    expect(fixture.ambientCalls).toBe(0);
  });

  test.each(['node.unknown', 'node["unknown"]', 'node.unknown = 1', 'node.unknown()'])('retains the reached unsupported operation at its source: %s', operation => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate(`function hook(node) { ${operation}; return false; }`);
    expect(result.kind).toBe(StaticCallableCompletionKind.Open);
    const seam = result.evaluation?.auditOpenSeams.find(candidate => candidate.summary.includes('Unsupported owned member'));
    expect(seam).toBeDefined();
    expect(seam?.node?.getText()).toContain('node');
    expect(fixture.ambientCalls).toBe(0);
  });

  test('discards owner-staged effects when the whole invocation remains open', () => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate('function hook(node) { node.id = "changed"; node.unknown(); return false; }');
    expect(result.kind).toBe(StaticCallableCompletionKind.Open);
    fixture.publish(result.kind);
    expect(fixture.published).toBe('initial');
    expect(fixture.pending).toBe('changed');
  });

  test('publishes only an explicitly completed owner transaction', () => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate('function hook(node) { node.id = "changed"; return false; }');
    expect(fixture.published).toBe('initial');
    fixture.publish(result.kind);
    expect(fixture.published).toBe('changed');
  });

  test('retains actual abrupt completion separately from unsupported operations', () => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate('function hook(node) { node.fail; return false; }');
    expect(result.kind).toBe(StaticCallableCompletionKind.Abrupt);
    expect(result.evaluation?.abruptCompletion?.value).toMatchObject({ value: 'InvalidStateError' });
  });

  test('does not require capabilities for unreachable operations', () => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate('function hook(node) { if (false) node.unknown(); return false; }');
    expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
  });

  test.each([
    ['get()[key()] = rhs()', ['receiver', 'key', 'rhs']],
    ['get()[key()] += rhs()', ['receiver', 'key', 'rhs']],
  ])('prepares the assignment reference once in JavaScript order: %s', (assignment, order) => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate(`function hook(node) {
      const get = () => { node.setAttribute('id', 'receiver'); return node; };
      const key = () => { node.setAttribute('id', 'key'); return 'id'; };
      const rhs = () => { node.setAttribute('id', 'rhs'); return 'written'; };
      ${assignment}; return false;
    }`);
    expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
    expect(fixture.callValues).toEqual(order);
  });

  test.each(['const { unknown } = node;', 'const [first] = node;', 'const [...rest] = node;', 'const { ...rest } = node;'])('does not erase unsupported destructuring effects: %s', statement => {
    const fixture = new OwnedHost();
    expect(fixture.evaluate(`function hook(node) { ${statement} return false; }`).kind).toBe(StaticCallableCompletionKind.Open);
  });

  test.each([
    'let flag = false; function hook() { return flag; }',
    'const settings = { flag: false }; function hook() { return settings.flag; }',
    'function decision() { return false; } function hook() { return decision(); } export function change() { decision = () => true; }',
    'let flag; function hook() { return typeof flag === "undefined" ? false : true; }',
    'let flag = false; function hook() { const local = { flag }; return local.flag; }',
  ])('refuses captured mutable inputs independently of synchronous effects: %s', source => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate(source, true);
    expect(result.kind).toBe(StaticCallableCompletionKind.Open);
    expect(result.evaluation?.auditOpenSeams.some(seam => seam.summary.includes('Captured'))).toBe(true);
    expect(fixture.evaluate(source, false).kind).toBe(StaticCallableCompletionKind.Normal);
  });

  test('permits primitive const captures and invocation-local parameters', () => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate('const id = "changed"; function hook(node) { const local = id; node.id = local; return false; }', true);
    expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
    expect(fixture.pending).toBe('changed');
  });

  test('admits local counters, arrays and records while retaining mutation accounting', () => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate(`function hook(node) {
      const entries = []; const record = { count: 0 };
      for (let i = 0; i < 3; i++) { entries.push(i); record.count++; }
      node.id = entries.join('-'); return record.count === 3;
    }`, true);
    expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
    expect(result.evaluation?.value).toMatchObject({ value: true });
    expect(result.evaluation?.mutationCount).toBeGreaterThan(0);
    expect(result.evaluation?.localMutationCount).toBe(result.evaluation?.mutationCount);
    expect(fixture.pending).toBe('0-1-2');
  });

  test.each([
    'let count = 0; function hook() { count++; return false; }',
    'const record = { count: 0 }; function hook() { record.count++; return false; }',
    'const entries = []; function hook() { entries.push(1); return false; }',
  ])('does not admit a captured write as local computation: %s', source => {
    const fixture = new OwnedHost();
    const result = fixture.evaluate(source);
    expect(result.kind).toBe(StaticCallableCompletionKind.Open);
    expect(result.evaluation!.mutationCount).toBeGreaterThan(result.evaluation!.localMutationCount);
  });

  test.each([
    ['for (const value of node.items) node.setAttribute("id", value);', ['a', 'c']],
    ['Array.from(node.items, value => node.setAttribute("id", value));', ['a', 'c']],
    ['Array.from(node.items).forEach(value => node.setAttribute("id", value));', ['a', 'b', 'c']],
    ['[...node.items].forEach(value => node.setAttribute("id", value));', ['a', 'b', 'c']],
  ])('preserves live iteration versus copied snapshots: %s', (body, values) => {
    const fixture = new OwnedHost();
    fixture.shiftOnFirstCall = true;
    const result = fixture.evaluate(`function hook(node) { ${body} return false; }`, true);
    expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
    expect(fixture.callValues).toEqual(values);
  });

  test('uses the same owned iterable for argument spread', () => {
    const fixture = new OwnedHost();
    fixture.entries = ['id', 'changed'];
    const result = fixture.evaluate('function hook(node) { node.setAttribute(...node.items); return false; }', true);
    expect(result.kind).toBe(StaticCallableCompletionKind.Normal);
    expect(fixture.pending).toBe('changed');
  });

  test.each(['return this.flag;', 'return "flag" in this;', 'return Object.keys(this).length === 1;', 'const { ...copy } = this; return "flag" in copy;'])('refuses captured receiver state before arbitrary use: %s', body => {
    const source = ts.createSourceFile('owned-host.ts', `class Gate { static flag = false; static hook() { ${body} } }`, ts.ScriptTarget.Latest, true);
    const policy = new StaticEvaluationPolicy();
    const module = new StaticEvaluator(policy).evaluateSourceFile(source, source.fileName);
    const receiver = module.environment.readValue('Gate');
    if (receiver?.kind !== EvaluationValueKind.Class) throw new Error('Expected Gate class.');
    const method = receiver.properties.get('hook')?.value;
    if (method?.kind !== EvaluationValueKind.Function) throw new Error('Expected hook method.');
    const result = evaluateStaticCallableCompletion(new StaticCallableTarget(method, policy, {}, [], receiver), [], null, { requireStableCapturedInputs: true });
    expect(result.kind).toBe(StaticCallableCompletionKind.Open);
    expect(result.evaluation?.auditOpenSeams.some(seam => seam.summary.includes('captured mutable'))).toBe(true);
  });

  test.each([
    'const target = { flag: false }; Object.assign(target, { flag: true }); return target.flag;',
    'const target = { flag: false }; Object.freeze(target); target.flag = true; return target.flag;',
    'class Local { static field = 1; static method() {} } return Object.keys(Local).join(",");',
    'class Local { static get value() { return 1; } } return Object.values(Local).length;',
    'class Local { result = false; set flag(v) { this.result = true; } } const x = new Local(); x.flag = true; return x.result;',
    'class Local { get flag() { return false; } } const x = new Local(); x.flag = true; return x.flag;',
  ])('refuses transfer-only intrinsic models rather than publishing an incorrect exact result: %s', body => {
    const fixture = new OwnedHost();
    expect(fixture.evaluate(`function hook() { ${body} }`, true).kind).toBe(StaticCallableCompletionKind.Open);
  });
});

class OwnedHost {
  readonly node = new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'owned-node');
  readonly setAttribute = new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'owned-node.setAttribute');
  readonly items = new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'owned-node.items');
  entries = ['a', 'b', 'c'];
  shiftOnFirstCall = false;
  pending = 'initial';
  published = 'initial';
  ambientCalls = 0;
  readonly callValues: string[] = [];

  readonly host: StaticEvaluationRuntimeHost = {
    isCallableExternallyOwned: () => false,
    evaluateInvocation: () => {
      this.ambientCalls++;
      return staticInvocationValue(EvaluationUndefined);
    },
    closedOperations: {
      openIterator: source => {
        if (source !== this.items) return null;
        let index = 0;
        return {
          next: () => index < this.entries.length
            ? new EvaluationIteratorStep(EvaluationIteratorStepKind.Value, new EvaluationArrayElement(new EvaluationStringValue(this.entries[index++]!), null))
            : new EvaluationIteratorStep(EvaluationIteratorStepKind.Done),
        };
      },
      readProperty: (receiver, name, node, moduleKey, host) => {
        if (receiver !== this.node) return null;
        if (name === 'id') return new StaticEvaluationRuntimeValueResult(new EvaluationStringValue(this.pending), null);
        if (name === 'items') return new StaticEvaluationRuntimeValueResult(this.items, null);
        if (name === 'setAttribute') return new StaticEvaluationRuntimeValueResult(this.setAttribute, null);
        if (name === 'fail') return new StaticEvaluationRuntimeValueResult(null, new ThrowEvaluationCompletion(new EvaluationStringValue('InvalidStateError'), []));
        return new StaticEvaluationRuntimeValueResult(host.unknown(`Unsupported owned member '${name}'.`, node, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression), null);
      },
      writeProperty: (receiver, name, value, node, moduleKey, host) => {
        if (receiver !== this.node) return null;
        if (name === 'id' && value.value.kind === EvaluationValueKind.String) {
          this.pending = value.value.value;
          return new StaticEvaluationRuntimeValueResult(EvaluationUndefined, null);
        }
        return new StaticEvaluationRuntimeValueResult(host.unknown(`Unsupported owned member '${name}'.`, node, moduleKey, EvaluationOpenSeamKind.DynamicMutation), null);
      },
      evaluateInvocation: (frame, host) => {
        if (frame.callee.value !== this.setAttribute) return StaticInvocationNotApplicable;
        const [name, value] = frame.argumentList.elements.map(element => element.value);
        if (frame.thisValue?.value !== this.node || name?.kind !== EvaluationValueKind.String || name.value !== 'id' || value?.kind !== EvaluationValueKind.String) {
          return staticInvocationValue(host.unknown('Invalid owned setAttribute invocation.', frame.node, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall));
        }
        this.pending = value.value;
        this.callValues.push(value.value);
        if (this.shiftOnFirstCall && this.callValues.length === 1) this.entries.shift();
        return staticInvocationValue(EvaluationUndefined);
      },
    },
  };

  evaluate(text: string, stable = false) {
    const source = ts.createSourceFile('owned-host.ts', text, ts.ScriptTarget.Latest, true);
    const policy = new StaticEvaluationPolicy();
    const module = new StaticEvaluator(policy, this.host).evaluateSourceFile(source, source.fileName);
    const fn = module.environment.readValue('hook');
    if (fn?.kind !== EvaluationValueKind.Function) throw new Error('Expected hook function.');
    return evaluateStaticCallableCompletion(new StaticCallableTarget(fn, policy, this.host), [this.node], null, { requireStableCapturedInputs: stable });
  }

  publish(kind: StaticCallableCompletionKind) {
    if (kind === StaticCallableCompletionKind.Normal) this.published = this.pending;
  }
}
