import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  aureliaExternalEvaluationValueResolver,
  aureliaStaticEvaluationRuntimeHost,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import {
  StaticEvaluationAmbientGlobalDeclarations,
  withStaticEvaluationAmbientGlobals,
} from '../src/evaluation/ambient-globals.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { StaticDataSnapshotPool } from '../src/evaluation/data-snapshot.js';
import { StaticEvaluator, type StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import { StaticInvocationNotApplicable } from '../src/evaluation/invocation.js';
import { readEvaluationModuleRecord } from '../src/evaluation/module-graph.js';
import type { StaticModuleExternalValueResolver } from '../src/evaluation/module-evaluator.js';
import {
  delegateStaticEvaluationRuntimeHost,
  graphIsolatedStaticEvaluationRuntimeHost,
  staticEvaluationRuntimeHostCanShareSnapshotValue,
} from '../src/evaluation/runtime-host.js';
import { EvaluationValueEvidence } from '../src/evaluation/value-pressure.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';
import { ResourceConventionToolingEvaluationContext } from '../src/resources/resource-convention-transform-admission.js';

const snapshotShapes = [
  ['object', 'object'],
  ['array', 'object'],
  ['object', 'array'],
  ['array', 'array'],
] as const;

describe('runtime-host snapshot eligibility', () => {
  test('requires an explicit proof when a host transfers metadata', () => {
    const value = new EvaluationObjectValue(new Map(), false, null);
    expect(staticEvaluationRuntimeHostCanShareSnapshotValue({}, value)).toBe(true);
    expect(staticEvaluationRuntimeHostCanShareSnapshotValue({ transferValueMetadata() {} }, value)).toBe(false);
    expect(staticEvaluationRuntimeHostCanShareSnapshotValue({ canShareSnapshotValue: () => false }, value)).toBe(false);
    expect(staticEvaluationRuntimeHostCanShareSnapshotValue({
      transferValueMetadata() {},
      canShareSnapshotValue: () => true,
    }, value)).toBe(true);
  });

  test('preserves metadata vetoes and later metadata changes through layered hosts', () => {
    const tagged = new WeakSet<EvaluationValue>();
    const metadataOwner: StaticEvaluationRuntimeHost = {
      transferValueMetadata(source, target) {
        if (tagged.has(source)) tagged.add(target);
      },
      canShareSnapshotValue: (value) => !tagged.has(value),
    };
    const base: StaticEvaluationRuntimeHost = {
      ...metadataOwner,
      graphIsolatedBranchOperations: metadataOwner,
    };
    const layered = withStaticEvaluationAmbientGlobals(
      delegateStaticEvaluationRuntimeHost(base, () => StaticInvocationNotApplicable),
      new StaticEvaluationAmbientGlobalDeclarations(new Set()),
    );
    const branch = graphIsolatedStaticEvaluationRuntimeHost(layered)!;
    const session = new StaticEvaluationSessionFork(layered).forkRuntimeHost(layered);
    const value = new EvaluationObjectValue(new Map(), false, null);
    for (const host of [base, layered, branch, session]) {
      expect(staticEvaluationRuntimeHostCanShareSnapshotValue(host, value)).toBe(true);
    }
    tagged.add(value);
    for (const host of [base, layered, branch, session]) {
      expect(staticEvaluationRuntimeHostCanShareSnapshotValue(host, value)).toBe(false);
    }
  });

  test('admits plain Aurelia app data while excluding framework and registration metadata', () => {
    const result = evaluateWithImports([
      "import { Aurelia } from 'aurelia';",
      "import { StandardConfiguration, DefaultResources, AppTask } from '@aurelia/runtime-html';",
      "import { Registration, DI, aliasedResourcesRegistry, last, inject, resolve, DefaultResolver } from '@aurelia/kernel';",
      "import { StateDefaultConfiguration } from '@aurelia/state';",
      'const plain = { items: [{ id: 1 }] };',
      'const array = [plain];',
      "const registration = Registration.instance('key', plain);",
      'const task = AppTask.creating(() => plain);',
      'const registry = aliasedResourcesRegistry([], {});',
      'const container = DI.createContainer();',
      'const facade = new Aurelia(container);',
      "const key = DI.createInterface('key', builder => builder.instance(plain));",
      "const resolver = last('key');",
      "const decorator = inject('key');",
      '@inject(plain) class Component {}',
      'const defaultResolver = DefaultResolver.singleton;',
    ], aureliaStaticEvaluationRuntimeHost, aureliaExternalEvaluationValueResolver);
    for (const name of ['plain', 'array']) {
      expect(staticEvaluationRuntimeHostCanShareSnapshotValue(result.runtimeHost, requireBinding(result, name)), name)
        .toBe(true);
    }
    for (const name of [
      'Aurelia', 'StandardConfiguration', 'DefaultResources', 'AppTask', 'StateDefaultConfiguration',
      'registration', 'task', 'registry', 'container', 'facade', 'key', 'resolver',
      'inject', 'resolve', 'decorator', 'Component', 'defaultResolver',
    ]) {
      expect(staticEvaluationRuntimeHostCanShareSnapshotValue(result.runtimeHost, requireBinding(result, name)), name)
        .toBe(false);
    }
  });

  test('retains the Aurelia metadata veto after values pass through an analysis session', () => {
    const original = evaluateWithImports([
      "import { AppTask } from 'aurelia';",
      "import { Registration, DI } from '@aurelia/kernel';",
      'const data = { items: [1, 2] };',
      "const registration = Registration.instance('key', data);",
      'const task = AppTask.creating(() => data);',
      "const key = DI.createInterface('key', builder => builder.instance(data));",
    ], aureliaStaticEvaluationRuntimeHost, aureliaExternalEvaluationValueResolver);
    const fork = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    for (const name of ['registration', 'task', 'key']) {
      const value = requireBinding(fork, name);
      expect(value, name).not.toBe(requireBinding(original, name));
      expect(staticEvaluationRuntimeHostCanShareSnapshotValue(fork.runtimeHost, value), name).toBe(false);
    }
    expect(staticEvaluationRuntimeHostCanShareSnapshotValue(fork.runtimeHost, requireBinding(fork, 'data'))).toBe(true);
  });

  test('excludes convention-plugin factories and plugin results while admitting their ordinary options', () => {
    const context = new ResourceConventionToolingEvaluationContext();
    const original = evaluateWithImports([
      "import aurelia from '@aurelia/vite-plugin';",
      "import { defineConfig } from 'vite';",
      "const options = { include: ['src/**'] };",
      'const plugin = aurelia(options);',
      'const config = defineConfig({ plugins: [plugin] });',
      "const commonjs = require('@aurelia/vite-plugin');",
    ], context.runtimeHost, context.externalValueResolver);
    const fork = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    for (const result of [original, fork]) {
      expect(staticEvaluationRuntimeHostCanShareSnapshotValue(result.runtimeHost, requireBinding(result, 'options')))
        .toBe(true);
      for (const name of ['aurelia', 'defineConfig', 'plugin', 'commonjs']) {
        expect(staticEvaluationRuntimeHostCanShareSnapshotValue(result.runtimeHost, requireBinding(result, name)), name)
          .toBe(false);
      }
      expect(context.readPlugin(requireBinding(result, 'plugin'))).not.toBeNull();
    }
  });

  test.each(snapshotShapes)('does not attach future source metadata to %s snapshots containing %s children', (containerKind, childKind) => {
    const { metadata, host } = metadataHost();
    const child = dataWithNumber(1, childKind);
    const root = dataWithChild(child, containerKind);
    const pool = new StaticDataSnapshotPool();
    const fork = new StaticEvaluationSessionFork(host, 'complete', pool);
    const history = fork.forkValue(root);
    expect(pool.createdStateCount).toBe(2);
    metadata.set(child, objectWithNumber(2));

    const historicalChild = dataChild(history);
    expect(metadata.has(historicalChild)).toBe(false);
    expect(fork.forkValue(child)).toBe(historicalChild);
    expect(metadata.has(historicalChild)).toBe(false);
    expect(readNumber(historicalChild)).toBe(1);
  });

  test.each(snapshotShapes)('captures metadata attached to a materialized %s snapshot\'s %s child', (containerKind, childKind) => {
    const { metadata, host } = metadataHost();
    const history = new StaticEvaluationSessionFork(host, 'complete', new StaticDataSnapshotPool())
      .forkValue(dataWithChild(dataWithNumber(1, childKind), containerKind));
    const historicalChild = dataChild(history);
    const hidden = objectWithNumber(2);
    metadata.set(historicalChild, hidden);

    const replay = new StaticEvaluationSessionFork(host).forkValue(history);
    hidden.properties.set('number', numberProperty(3));
    const capturedHidden = metadata.get(dataChild(replay));
    expect(capturedHidden).toBeDefined();
    expect(capturedHidden).not.toBe(hidden);
    expect(readNumber(capturedHidden!)).toBe(2);
  });

  test.each(snapshotShapes)('captures destination-host metadata for %s snapshots containing %s children', (containerKind, childKind) => {
    const { metadata, host } = metadataHost();
    const history = new StaticEvaluationSessionFork({}, 'complete', new StaticDataSnapshotPool())
      .forkValue(dataWithChild(dataWithNumber(1, childKind), containerKind));
    const historicalChild = dataChild(history);
    const hidden = objectWithNumber(2);
    metadata.set(historicalChild, hidden);

    const replay = new StaticEvaluationSessionFork(host).forkValue(history);
    hidden.properties.set('number', numberProperty(3));
    const capturedHidden = metadata.get(dataChild(replay));
    expect(capturedHidden).toBeDefined();
    expect(readNumber(capturedHidden!)).toBe(2);
  });
});

function metadataHost() {
  const metadata = new WeakMap<EvaluationValue, EvaluationObjectValue>();
  const host: StaticEvaluationRuntimeHost = {
    canShareSnapshotValue: (value) => !metadata.has(value),
    transferValueMetadata(source, target, transfer) {
      const hidden = metadata.get(source);
      if (hidden != null) metadata.set(target, transfer.forkValue(hidden));
    },
  };
  return { metadata, host };
}

function numberProperty(number: number): EvaluationObjectProperty {
  return new EvaluationObjectProperty('number', new EvaluationNumberValue(number), null, EvaluationObjectPropertyState.Closed);
}

function objectWithNumber(number: number): EvaluationObjectValue {
  return new EvaluationObjectValue(new Map([['number', numberProperty(number)]]), false, null);
}

type SnapshotData = EvaluationObjectValue | EvaluationArrayValue;

function dataWithNumber(number: number, kind: 'object' | 'array'): SnapshotData {
  return kind === 'object'
    ? objectWithNumber(number)
    : new EvaluationArrayValue([new EvaluationArrayElement(new EvaluationNumberValue(number), null)]);
}

function dataWithChild(child: SnapshotData, kind: 'object' | 'array'): SnapshotData {
  return kind === 'array'
    ? new EvaluationArrayValue([new EvaluationArrayElement(child, null)])
    : new EvaluationObjectValue(new Map([
      ['child', new EvaluationObjectProperty('child', child, null, EvaluationObjectPropertyState.Closed)],
    ]), false, null);
}

function dataChild(value: SnapshotData): SnapshotData {
  const child = value.kind === EvaluationValueKind.Object
    ? value.properties.get('child')!.value
    : value.elements[0]!.value;
  expect([EvaluationValueKind.Object, EvaluationValueKind.Array]).toContain(child.kind);
  return child as SnapshotData;
}

function readNumber(value: SnapshotData): number {
  const number = value.kind === EvaluationValueKind.Object
    ? value.properties.get('number')!.value
    : value.elements[0]!.value;
  expect(number.kind).toBe(EvaluationValueKind.Number);
  return (number as EvaluationNumberValue).value;
}

function evaluateWithImports(
  lines: readonly string[],
  runtimeHost: StaticEvaluationRuntimeHost,
  resolver: StaticModuleExternalValueResolver,
) {
  const source = ts.createSourceFile('src/snapshot-host.ts', lines.join('\n'), ts.ScriptTarget.Latest, true);
  const imports = new Map<string, EvaluationValueEvidence>();
  for (const entry of readEvaluationModuleRecord(source).imports) {
    if (entry.localName == null) continue;
    const value = resolver.resolveImportValue(source.fileName, entry);
    expect(value, entry.localName).not.toBeNull();
    imports.set(entry.localName, new EvaluationValueEvidence(value!, []));
  }
  return new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source, source.fileName, imports);
}

function requireBinding(result: ReturnType<typeof evaluateWithImports>, name: string): EvaluationValue {
  const value = result.environment.readValue(name);
  expect(value, name).not.toBeNull();
  expect(value?.kind, name).not.toBe(EvaluationValueKind.Unknown);
  expect(value?.kind, name).not.toBe(EvaluationValueKind.Undefined);
  return value!;
}
