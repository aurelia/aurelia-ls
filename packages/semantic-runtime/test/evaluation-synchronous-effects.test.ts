import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { aureliaConfigurationEvaluationPolicy } from '../src/configuration/evaluation-policy.js';
import {
  aureliaExternalEvaluationValueResolver,
  aureliaStaticEvaluationRuntimeHost,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../src/evaluation/evaluator.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { staticInvocationValue } from '../src/evaluation/invocation.js';
import { EvaluationImportEntry, EvaluationImportKind } from '../src/evaluation/module-graph.js';
import { delegateStaticEvaluationRuntimeHost } from '../src/evaluation/runtime-host.js';
import {
  StaticEvaluationBranchMode,
  StaticEvaluationPolicy,
} from '../src/evaluation/policy.js';
import { EvaluationOpenSeamKind } from '../src/evaluation/seams.js';
import { EvaluationValueEvidence } from '../src/evaluation/value-pressure.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';

describe('closed synchronous evaluator effects', () => {
  test.each([
    ['boundary call', 'function hook(node) { node.remove(); return false; }'],
    ['boundary construction', 'function hook(node) { new node.Widget(); return false; }'],
    ['nested async call', 'async function later() { return false; } function hook() { later(); return false; }'],
    ['async callback', 'function hook() { [1].map(async value => value); return false; }'],
    ['discarded Promise rejection', 'function hook() { Promise.reject("failed"); return false; }'],
    ['thenable assimilation', 'function hook(node) { Promise.resolve({ then() { node(); } }); return false; }'],
  ])('retains %s pressure even when its result is discarded', (_label, source) => {
    const result = invoke(source, { argument: boundary() });
    expect(result.value).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Boolean, value: false }));
    expect(result.auditOpenSeams.length).toBeGreaterThan(0);
  });

  test('does not interpret an async root as a completed synchronous invocation', () => {
    const source = 'async function hook() { return false; }';
    expect(invoke(source).auditOpenSeams.some(seam => seam.seamKind === EvaluationOpenSeamKind.DynamicCall)).toBe(true);
    const ordinary = invoke(source, { strict: false });
    expect(ordinary.value?.kind).toBe(EvaluationValueKind.Promise);
    expect(ordinary.auditOpenSeams).toEqual([]);
  });

  test.each(['node.tagName', 'node["tagName"]'])('retains a discarded opaque read: %s', expression => {
    const result = invoke(`function hook(node) { const unused = ${expression}; return false; }`, { argument: boundary() });
    expect(result.value).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Boolean, value: false }));
    expect(result.auditOpenSeams.length).toBeGreaterThan(0);
  });

  test('retains skipped imported-object write pressure under the existing configuration policy', () => {
    const state = new EvaluationObjectValue(new Map([
      ['count', new EvaluationObjectProperty('count', new EvaluationNumberValue(0), null, EvaluationObjectPropertyState.Closed)],
    ]), false);
    const source = 'import { state } from "./state"; function hook() { state.count = 1; return false; }';
    const imports = new Map([['state', new EvaluationValueEvidence(state, [])]]);
    const result = invoke(source, { imports, policy: aureliaConfigurationEvaluationPolicy });
    expect(result.value).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Boolean, value: false }));
    expect(result.mutationCount).toBe(0);
    expect(result.auditOpenSeams.some(seam => seam.seamKind === EvaluationOpenSeamKind.DynamicMutation)).toBe(true);
    expect(state.properties.get('count')?.value).toEqual(expect.objectContaining({ value: 0 }));
    expect(invoke(source, { imports, policy: aureliaConfigurationEvaluationPolicy, strict: false }).auditOpenSeams).toEqual([]);
  });

  test.each(['node();', 'new node();'])('does not invoke a domain host to assess %s', body => {
    let dispatches = 0;
    const runtimeHost: StaticEvaluationRuntimeHost = {
      isCallableExternallyOwned: () => false,
      evaluateInvocation() {
        dispatches++;
        return staticInvocationValue(EvaluationUndefined);
      },
    };
    const source = `function hook(node) { ${body} return false; }`;
    const strict = invoke(source, { runtimeHost, argument: boundary() });
    expect(dispatches).toBe(0);
    expect(strict.auditOpenSeams.length).toBeGreaterThan(0);
    const ordinary = invoke(source, { runtimeHost, argument: boundary(), strict: false });
    expect(dispatches).toBe(1);
    expect(ordinary.auditOpenSeams).toEqual([]);
  });

  test.each([
    ['plain', {}],
    ['Aurelia', aureliaStaticEvaluationRuntimeHost],
  ] as const)('keeps source helpers and intrinsic callbacks in the %s host without demanding dead effects', (_name, runtimeHost) => {
    const result = invoke([
      'function twice(value) { return value * 2; }',
      'function hook(node) {',
      '  if (false) { node.remove(); }',
      '  const values = [1, 2].map(twice);',
      '  return values[0] === 2 && values[1] === 4;',
      '}',
    ].join('\n'), { argument: boundary(), runtimeHost });
    expect(result.value).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Boolean, value: true }));
    expect(result.auditOpenSeams).toEqual([]);
    expect(result.mutationCount).toBe(0);
  });

  test('rejects a host-owned callable as a direct target after graph isolation', () => {
    const factory = frameworkFactory();
    const session = new StaticEvaluationSessionFork(aureliaStaticEvaluationRuntimeHost);
    const runtimeHost = session.forkRuntimeHost(aureliaStaticEvaluationRuntimeHost);
    const isolated = session.forkValue(factory);
    expect(runtimeHost.isCallableExternallyOwned?.(isolated)).toBe(true);
    const result = new StaticEvaluator(undefined, runtimeHost, { requireClosedSynchronousEffects: true })
      .evaluateFunctionValue(isolated, isolated.declaration, isolated.environment.moduleKey, []);
    expect(result.auditOpenSeams.some(seam => seam.summary.includes('Host-owned callable'))).toBe(true);
  });

  test.each(['node();', 'node.call(null);', '[1].map(node);'])('rejects host placeholder source through %s', body => {
    const result = invoke(`function hook(node) { ${body} return false; }`, {
      runtimeHost: aureliaStaticEvaluationRuntimeHost,
      argument: frameworkFactory(),
    });
    expect(result.auditOpenSeams.some(seam => seam.summary.includes('Host-owned callable'))).toBe(true);
  });

  test('does not inherit a negative ownership claim past an unclassified delegated dispatcher', () => {
    let dispatches = 0;
    const runtimeHost = delegateStaticEvaluationRuntimeHost(aureliaStaticEvaluationRuntimeHost, () => {
      dispatches++;
      return staticInvocationValue(EvaluationUndefined);
    });
    const result = invoke('function hook() { return false; }', { runtimeHost });
    expect(dispatches).toBe(0);
    expect(result.auditOpenSeams.some(seam => seam.summary.includes('Host-owned callable'))).toBe(true);
  });

  test.each(['require("./module");', 'import("./module");'])('does not load modules while assessing %s', body => {
    let loads = 0;
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveCommonJsRequire() { loads++; return null; },
      resolveDynamicImport() { loads++; return EvaluationUndefined; },
    };
    const result = invoke(`function hook() { ${body} return false; }`, { runtimeHost });
    expect(loads).toBe(0);
    expect(result.auditOpenSeams.some(seam => seam.seamKind === EvaluationOpenSeamKind.DynamicImport)).toBe(true);
  });

  test('continues to account for writes performed by ordinary source functions', () => {
    const result = invoke('let count = 0; function hook() { count++; return false; }');
    expect(result.value).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Boolean, value: false }));
    expect(result.mutationCount).toBe(1);
  });

  test.each([
    '@decorate class Local {}',
    'class Local { @decorate value; }',
    'class Local { constructor(@decorate value) {} }',
  ])('rejects local decorator effects without invoking domain metadata: %s', declaration => {
    let observations = 0;
    const result = invoke(`function hook() { ${declaration} return false; }`, {
      runtimeHost: { observeClassValue() { observations++; } },
    });
    expect(observations).toBe(0);
    expect(result.auditOpenSeams.some(seam => seam.summary.includes('decorator effects'))).toBe(true);
  });

  test('retains ordinary local class execution without domain metadata observation', () => {
    let observations = 0;
    const result = invoke('function hook() { class Local { value() { return false; } } return new Local().value(); }', {
      runtimeHost: { observeClassValue() { observations++; } },
    });
    expect(observations).toBe(0);
    expect(result.auditOpenSeams).toEqual([]);
    expect(result.value).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Boolean, value: false }));
  });
});

function boundary(): EvaluationBoundaryValue {
  return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'compiler-node');
}

function frameworkFactory() {
  const source = ts.createSourceFile('framework-factory.ts', [
    'import { DI } from "@aurelia/kernel";',
    'const factory = DI.createContainer;',
  ].join('\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declaration = source.statements.find(ts.isImportDeclaration)!;
  const bindings = declaration.importClause!.namedBindings! as ts.NamedImports;
  const di = aureliaExternalEvaluationValueResolver.resolveImportValue(source.fileName, new EvaluationImportEntry(
    EvaluationImportKind.Named, '@aurelia/kernel', 'DI', 'DI', bindings.elements[0]!,
  ));
  if (di == null) throw new Error('Expected the framework DI import.');
  const result = new StaticEvaluator(undefined, aureliaStaticEvaluationRuntimeHost).evaluateSourceFile(
    source, source.fileName, new Map([['DI', new EvaluationValueEvidence(di, [])]]),
  );
  const factory = result.environment.readValue('factory');
  if (factory?.kind !== EvaluationValueKind.Function) throw new Error('Expected the framework createContainer callable.');
  return factory;
}

function invoke(
  text: string,
  options: {
    readonly strict?: boolean;
    readonly argument?: EvaluationValue;
    readonly runtimeHost?: StaticEvaluationRuntimeHost;
    readonly policy?: StaticEvaluationPolicy;
    readonly imports?: ReadonlyMap<string, EvaluationValueEvidence>;
  } = {},
) {
  const source = ts.createSourceFile('synchronous-effects.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const policy = options.policy ?? new StaticEvaluationPolicy();
  const runtimeHost = options.runtimeHost ?? {};
  const module = new StaticEvaluator(policy, runtimeHost).evaluateSourceFile(source, source.fileName, options.imports);
  const fn = module.environment.readValue('hook');
  if (fn?.kind !== EvaluationValueKind.Function) throw new Error('Expected one source-owned hook function.');
  return new StaticEvaluator(
    new StaticEvaluationPolicy(policy.expressionStatementPolicies, policy.guardrails, StaticEvaluationBranchMode.PathProvenEffects),
    runtimeHost,
    { requireClosedSynchronousEffects: options.strict ?? true },
  ).evaluateFunctionValue(fn, fn.declaration, source.fileName, options.argument == null ? [] : [options.argument]);
}
