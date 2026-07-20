import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import { bootWorkspace } from '../src/boot/boot-workspace.js';
import {
  StaticProjectEvaluationPass,
  type StaticProjectEvaluationResult,
} from '../src/evaluation/project-evaluation.js';
import { EvaluationCompletionKind } from '../src/evaluation/completion.js';
import type { StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import {
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
} from '../src/evaluation/invocation.js';
import { StaticModuleGraphEvaluator } from '../src/evaluation/module-evaluator.js';
import { buildEvaluationModuleGraph } from '../src/evaluation/module-host.js';
import {
  EvaluationOpenSeam,
  EvaluationOpenSeamKind,
} from '../src/evaluation/seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationPromiseSettlementKind,
  EvaluationValueKind,
} from '../src/evaluation/values.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('project static evaluation', () => {
  test('evaluates shared dependencies in one project identity domain', () => {
    const root = temporaryProject({
      'entry-a.ts': [
        "import { shared } from './shared';",
        'export const fromA = shared;',
      ].join('\n'),
      'entry-b.ts': [
        "import { shared } from './shared';",
        'export const fromB = shared;',
      ].join('\n'),
      'shared.ts': [
        "import './missing';",
        'export const shared = { marker: true };',
      ].join('\n'),
    });
    const project = bootWorkspace({
      rootDir: root,
      storeKey: 'test:project-evaluation-shared-identity',
      projects: [{
        projectKey: 'shared-identity',
        rootDir: root,
        sourceFiles: [
          { path: 'entry-a.ts' },
          { path: 'entry-b.ts' },
          { path: 'shared.ts' },
        ],
      }],
    }).projects[0];
    if (project == null) {
      throw new Error('Expected one booted project.');
    }

    const evaluation = new StaticProjectEvaluationPass().evaluate(project);
    const fromA = evaluatedBinding(evaluation, 'entry-a.ts', 'fromA');
    const fromB = evaluatedBinding(evaluation, 'entry-b.ts', 'fromB');
    const shared = evaluatedBinding(evaluation, 'shared.ts', 'shared');
    const sharedSource = evaluation.readEvaluatedSources()
      .find((candidate) => candidate.admission.path === 'shared.ts');

    expect(fromA).toBe(shared);
    expect(fromB).toBe(shared);
    expect(evaluation.readEvaluatedSources()
      .filter((candidate) => candidate.admission.path === 'shared.ts')).toHaveLength(1);
    expect(evaluation.readUnresolvedModules()).toHaveLength(1);
    expect(path.basename(evaluation.readUnresolvedModules()[0]!.fromModuleKey)).toBe('shared.ts');
    expect(sharedSource?.origins.map((origin) => [origin.kind, path.basename(origin.entryModuleKey)]))
      .toEqual([
        ['module-graph-dependency', 'entry-a.ts'],
        ['module-graph-dependency', 'entry-b.ts'],
        ['static-evaluation-root', 'shared.ts'],
      ]);
  });

  test('retains project-level module linkage openings', () => {
    const root = temporaryProject({
      'entry.ts': [
        "import { child } from './child';",
        'export const root = { child };',
      ].join('\n'),
      'child.ts': [
        "import { root } from './entry';",
        'export const child = { root };',
      ].join('\n'),
    });
    const project = bootWorkspace({
      rootDir: root,
      storeKey: 'test:project-evaluation-open-linkage',
      projects: [{
        projectKey: 'open-linkage',
        rootDir: root,
        sourceFiles: [
          { path: 'entry.ts' },
          { path: 'child.ts' },
        ],
      }],
    }).projects[0];
    if (project == null) {
      throw new Error('Expected one booted project.');
    }

    const evaluation = new StaticProjectEvaluationPass().evaluate(project);

    expect(evaluation.graphOpenValues.map((value) => value.reason)).toEqual(expect.arrayContaining([
      expect.stringContaining('Circular module evaluation reached'),
    ]));
    expect(evaluation.forkSession().graphOpenValues).toEqual(evaluation.graphOpenValues);
  });

  test('propagates a dependency throw before executing an importing module body', () => {
    const root = temporaryProject({
      'entry.ts': [
        "import { state } from './dependency';",
        'state.importerReached = true;',
        "export const entryMarker = 'unreachable';",
      ].join('\n'),
      'dependency.ts': [
        'export const state = { importerReached: false };',
        "throw 'dependency failure';",
      ].join('\n'),
    });
    const project = bootWorkspace({
      rootDir: root,
      storeKey: 'test:project-evaluation-dependency-completion',
      projects: [{
        projectKey: 'dependency-completion',
        rootDir: root,
        sourceFiles: [
          { path: 'entry.ts' },
          { path: 'dependency.ts' },
        ],
      }],
    }).projects[0];
    if (project == null) {
      throw new Error('Expected one booted project.');
    }

    const evaluation = new StaticProjectEvaluationPass().evaluate(project);
    const entry = evaluation.readEvaluatedSources().find((candidate) => candidate.admission.path === 'entry.ts');
    const dependency = evaluation.readEvaluatedSources().find((candidate) => candidate.admission.path === 'dependency.ts');
    expect(dependency?.evaluation.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'dependency failure' }),
    }));
    expect(entry?.evaluation.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'dependency failure' }),
    }));
    expect(entry?.evaluation.environment.readValue('entryMarker')).toBeNull();
    const state = dependency?.evaluation.environment.readValue('state') ?? null;
    expect(state?.kind === EvaluationValueKind.Object
      ? state.properties.get('importerReached')?.value
      : null).toEqual(expect.objectContaining({
        kind: EvaluationValueKind.Boolean,
        value: false,
      }));
  });

  test.each([
    ['side-effect imports', "import './bad';\nimport './later';"],
    ['named imports', "import { bad } from './bad';\nimport { later } from './later';"],
    ['namespace imports', "import * as bad from './bad';\nimport * as later from './later';"],
    ['re-exports', "export { bad } from './bad';\nexport * from './later';"],
  ])('stops dependency scheduling after the first abrupt %s edge', (_label, dependencyEdges) => {
    const result = evaluateModuleGraph({
      'entry.ts': `${dependencyEdges}\nexport const entryMarker = 'unreachable';`,
      'bad.ts': "export const bad = 'bad';\nthrow 'dependency failure';",
      'later.ts': "export const later = 'later';",
    });
    const entry = result.modules.get('entry.ts');
    const bad = result.modules.get('bad.ts');

    expect(bad?.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'dependency failure' }),
    }));
    expect(entry?.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'dependency failure' }),
    }));
    expect(entry?.environment.readValue('entryMarker')).toBeNull();
    expect(result.modules.has('later.ts')).toBe(false);
  });

  test('propagates CommonJS module throws synchronously through caller try/catch', () => {
    const result = evaluateModuleGraph({
      'entry.ts': [
        "let observed = 'before';",
        'try {',
        "  const loaded = require('./bad');",
        '  observed = loaded.marker;',
        '} catch (error) {',
        '  observed = error;',
        '}',
        "export const after = 'after';",
      ].join('\n'),
      'bad.ts': [
        "module.exports = { marker: 'partial' };",
        "throw 'require failure';",
      ].join('\n'),
    });
    const entry = result.modules.get('entry.ts');

    expect(result.modules.get('bad.ts')?.completion.kind).toBe(EvaluationCompletionKind.Throw);
    expect(entry?.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(entry?.environment.readValue('observed')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'require failure',
    }));
    expect(entry?.environment.readValue('after')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'after',
    }));
  });

  test('retains failed dynamic import rejection without running its unmatched fulfillment handler', () => {
    const result = evaluateModuleGraph({
      'entry.ts': [
        'let fulfilled = false;',
        "import('./bad').then(() => { fulfilled = true; });",
        "export const after = 'after';",
      ].join('\n'),
      'bad.ts': "throw 'dynamic failure';",
    });
    const entry = result.modules.get('entry.ts');

    expect(result.modules.get('bad.ts')?.completion.kind).toBe(EvaluationCompletionKind.Throw);
    expect(entry?.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(entry?.environment.readValue('fulfilled')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Boolean,
      value: false,
    }));
    expect(entry?.environment.readValue('after')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'after',
    }));
    const reaction = entry?.invocations.find((invocation) => invocation.node.getText().includes('.then('));
    expect(reaction?.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Normal,
      value: expect.objectContaining({
        kind: EvaluationValueKind.Promise,
        settlement: expect.objectContaining({
          kind: EvaluationPromiseSettlementKind.Rejected,
          evidence: expect.objectContaining({
            value: expect.objectContaining({ value: 'dynamic failure' }),
          }),
        }),
      }),
    }));
    expect(result.openValues).toEqual([]);
  });

  test('does not execute module edges found only inside an unreachable branch', () => {
    const result = evaluateModuleGraph({
      'entry.ts': [
        'if (false) {',
        "  require('./required');",
        "  import('./imported');",
        '}',
        "export const after = 'after';",
      ].join('\n'),
      'required.ts': "throw 'unreachable require';",
      'imported.ts': "throw 'unreachable import';",
    });

    expect(result.modules.get('entry.ts')?.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(result.modules.has('required.ts')).toBe(false);
    expect(result.modules.has('imported.ts')).toBe(false);
  });

  test('captures live lexical bindings for functions, object methods, and class methods', () => {
    const root = temporaryProject({
      'entry.ts': [
        "let current = 'before';",
        'const readCurrent = () => current;',
        'const registry = {',
        '  read() { return current; },',
        '  self() { return registry; },',
        '};',
        'class Reader {',
        '  read() { return current; }',
        '}',
        'const reader = new Reader();',
        'export const before = [readCurrent(), registry.read(), reader.read()];',
        "current = 'after';",
        'export const after = [readCurrent(), registry.read(), reader.read()];',
        'export const self = registry.self();',
      ].join('\n'),
    });
    const project = bootWorkspace({
      rootDir: root,
      storeKey: 'test:project-evaluation-live-closures',
      projects: [{
        projectKey: 'live-closures',
        rootDir: root,
        sourceFiles: [{ path: 'entry.ts' }],
      }],
    }).projects[0];
    if (project == null) {
      throw new Error('Expected one booted project.');
    }

    const evaluation = new StaticProjectEvaluationPass().evaluate(project);
    const before = evaluatedBinding(evaluation, 'entry.ts', 'before');
    const after = evaluatedBinding(evaluation, 'entry.ts', 'after');
    const registry = evaluatedBinding(evaluation, 'entry.ts', 'registry');
    const self = evaluatedBinding(evaluation, 'entry.ts', 'self');

    expect(before.kind).toBe(EvaluationValueKind.Array);
    expect(after.kind).toBe(EvaluationValueKind.Array);
    expect(before.kind === EvaluationValueKind.Array
      ? before.elements.map((element) => element.value.kind === EvaluationValueKind.String ? element.value.value : null)
      : []).toEqual(['before', 'before', 'before']);
    expect(after.kind === EvaluationValueKind.Array
      ? after.elements.map((element) => element.value.kind === EvaluationValueKind.String ? element.value.value : null)
      : []).toEqual(['after', 'after', 'after']);
    expect(self).toBe(registry);
  });

  test('assembles module namespaces with re-export identity, ambiguity, closure, and namespace ordering', () => {
    const root = temporaryProject({
      'entry.ts': [
        "import * as sourceFirst from './source';",
        "import * as sourceSecond from './source';",
        "import * as duplicate from './duplicate';",
        "import * as ambiguous from './ambiguous';",
        "import * as sameValueConflict from './same-value-conflict';",
        "import * as cycle from './cycle-a';",
        'export const duplicateNamespace = duplicate;',
        'export const sameSourceNamespace = sourceFirst === sourceSecond;',
        'export const sameReExportedNamespace = sourceFirst === ambiguous.sourceNamespace;',
        'export const ambiguousNamespace = ambiguous;',
        'export const sameValueConflictNamespace = sameValueConflict;',
        'export const cycleNamespace = cycle;',
      ].join('\n'),
      'source.ts': [
        "export const shared = { marker: 'shared' };",
        "export default { marker: 'default' };",
      ].join('\n'),
      'same.ts': "export { shared } from './source';",
      'star-a.ts': "export * from './source';",
      'star-b.ts': "export * from './same';",
      'duplicate.ts': [
        "export * from './star-a';",
        "export * from './star-b';",
      ].join('\n'),
      'conflict.ts': "export const shared = { marker: 'conflict' };",
      'shared-value.ts': "export const sharedValue = { marker: 'same-value' };",
      'same-value-a.ts': [
        "import { sharedValue } from './shared-value';",
        'export const collision = sharedValue;',
      ].join('\n'),
      'same-value-b.ts': [
        "import { sharedValue } from './shared-value';",
        'export const collision = sharedValue;',
      ].join('\n'),
      'same-value-conflict.ts': [
        "export * from './same-value-a';",
        "export * from './same-value-b';",
      ].join('\n'),
      'ambiguous.ts': [
        "export { shared as renamed } from './source';",
        "export * as sourceNamespace from './source';",
        "export * from './star-a';",
        "export * from './conflict';",
      ].join('\n'),
      'cycle-a.ts': [
        "export const a = 'a';",
        "export * from './cycle-b';",
      ].join('\n'),
      'cycle-b.ts': [
        "export const b = 'b';",
        "export * from './cycle-a';",
      ].join('\n'),
    });
    const project = bootWorkspace({
      rootDir: root,
      storeKey: 'test:project-evaluation-module-namespace',
      projects: [{
        projectKey: 'module-namespace',
        rootDir: root,
        sourceFiles: [
          { path: 'entry.ts' },
          { path: 'source.ts' },
          { path: 'same.ts' },
          { path: 'star-a.ts' },
          { path: 'star-b.ts' },
          { path: 'duplicate.ts' },
          { path: 'conflict.ts' },
          { path: 'shared-value.ts' },
          { path: 'same-value-a.ts' },
          { path: 'same-value-b.ts' },
          { path: 'same-value-conflict.ts' },
          { path: 'ambiguous.ts' },
          { path: 'cycle-a.ts' },
          { path: 'cycle-b.ts' },
        ],
      }],
    }).projects[0];
    if (project == null) {
      throw new Error('Expected one booted project.');
    }

    const evaluation = new StaticProjectEvaluationPass().evaluate(project);
    const duplicate = evaluatedBinding(evaluation, 'entry.ts', 'duplicateNamespace');
    const sameSourceNamespace = evaluatedBinding(evaluation, 'entry.ts', 'sameSourceNamespace');
    const sameReExportedNamespace = evaluatedBinding(evaluation, 'entry.ts', 'sameReExportedNamespace');
    const ambiguous = evaluatedBinding(evaluation, 'entry.ts', 'ambiguousNamespace');
    const sameValueConflict = evaluatedBinding(evaluation, 'entry.ts', 'sameValueConflictNamespace');
    const cycle = evaluatedBinding(evaluation, 'entry.ts', 'cycleNamespace');
    const shared = evaluatedBinding(evaluation, 'source.ts', 'shared');

    expect(duplicate.kind).toBe(EvaluationValueKind.ModuleNamespace);
    expect(sameSourceNamespace.kind === EvaluationValueKind.Boolean ? sameSourceNamespace.value : null).toBe(true);
    expect(sameReExportedNamespace.kind === EvaluationValueKind.Boolean ? sameReExportedNamespace.value : null).toBe(true);
    expect(duplicate.kind === EvaluationValueKind.ModuleNamespace
      ? [...duplicate.exportEntries.keys()]
      : []).toEqual(['shared']);
    expect(duplicate.kind === EvaluationValueKind.ModuleNamespace
      ? duplicate.exportEntries.get('shared')?.value
      : null).toBe(shared);
    expect(duplicate.kind === EvaluationValueKind.ModuleNamespace
      ? duplicate.mayHaveUnknownExports
      : true).toBe(false);

    expect(ambiguous.kind).toBe(EvaluationValueKind.ModuleNamespace);
    expect(ambiguous.kind === EvaluationValueKind.ModuleNamespace
      ? [...ambiguous.exportEntries.keys()]
      : []).toEqual(['renamed', 'sourceNamespace']);
    expect(ambiguous.kind === EvaluationValueKind.ModuleNamespace
      ? ambiguous.exportEntries.get('renamed')?.value
      : null).toBe(shared);
    expect(ambiguous.kind === EvaluationValueKind.ModuleNamespace
      ? ambiguous.mayHaveUnknownExports
      : false).toBe(true);

    expect(sameValueConflict.kind).toBe(EvaluationValueKind.ModuleNamespace);
    expect(sameValueConflict.kind === EvaluationValueKind.ModuleNamespace
      ? [...sameValueConflict.exportEntries.keys()]
      : []).toEqual([]);
    expect(sameValueConflict.kind === EvaluationValueKind.ModuleNamespace
      ? sameValueConflict.mayHaveUnknownExports
      : false).toBe(true);
    const nestedNamespace = ambiguous.kind === EvaluationValueKind.ModuleNamespace
      ? ambiguous.exportEntries.get('sourceNamespace')?.value ?? null
      : null;
    expect(nestedNamespace?.kind).toBe(EvaluationValueKind.ModuleNamespace);
    expect(nestedNamespace?.kind === EvaluationValueKind.ModuleNamespace
      ? [...nestedNamespace.exportEntries.keys()]
      : []).toEqual(['default', 'shared']);

    expect(cycle.kind).toBe(EvaluationValueKind.ModuleNamespace);
    expect(cycle.kind === EvaluationValueKind.ModuleNamespace
      ? [...cycle.exportEntries.keys()]
      : []).toEqual(['a', 'b']);
    expect(cycle.kind === EvaluationValueKind.ModuleNamespace
      ? cycle.mayHaveUnknownExports
      : true).toBe(false);
  });

  test('preserves causal value pressure across imports, re-exports, and namespace reads', () => {
    const evaluation = evaluateModuleGraph({
      'entry.ts': [
        "import { candidate } from './source';",
        "import { renamed } from './barrel';",
        "import * as namespace from './barrel';",
        "export const direct = candidate ? 'trusted' : 'fallback';",
        "export const reexported = renamed ? 'trusted' : 'fallback';",
        "export const namespaced = namespace.renamed ? 'trusted' : 'fallback';",
      ].join('\n'),
      'source.ts': 'export const candidate = pressure(true);',
      'barrel.ts': "export { candidate as renamed } from './source';",
    }, pressureRuntimeHost);
    const entry = evaluation.modules.get('entry.ts');

    for (const name of ['candidate', 'renamed', 'direct', 'reexported', 'namespaced']) {
      const binding = entry?.environment.readBinding(name) ?? null;
      expect(binding?.state).toBe('open');
      expect(binding?.openSeams.map((seam) => seam.summary)).toEqual([
        'pressure(true) retained a best-known value.',
      ]);
    }
    expect(entry?.environment.readValue('direct')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(entry?.environment.readValue('reexported')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(entry?.environment.readValue('namespaced')?.kind).toBe(EvaluationValueKind.Unknown);
  });

  test('preserves causal value pressure through CommonJS exports and require destructuring', () => {
    const evaluation = evaluateModuleGraph({
      'entry.ts': [
        "const { candidate } = require('./source');",
        "export const result = candidate ? 'trusted' : 'fallback';",
      ].join('\n'),
      'source.ts': 'exports.candidate = pressure(true);',
    }, pressureRuntimeHost);
    const entry = evaluation.modules.get('entry.ts');

    expect(entry?.environment.readBinding('candidate')?.openSeams.map((seam) => seam.summary)).toEqual([
      'pressure(true) retained a best-known value.',
    ]);
    expect(entry?.environment.readValue('result')?.kind).toBe(EvaluationValueKind.Unknown);
  });
});

function temporaryProject(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-ls-project-evaluation-'));
  temporaryRoots.push(root);
  for (const [fileName, sourceText] of Object.entries(files)) {
    writeFileSync(path.join(root, fileName), sourceText, 'utf8');
  }
  return root;
}

function evaluatedBinding(
  project: StaticProjectEvaluationResult,
  sourcePath: string,
  bindingName: string,
) {
  const source = project.readEvaluatedSources().find((candidate) => candidate.admission.path === sourcePath);
  const value = source?.evaluation.environment.readValue(bindingName) ?? null;
  if (value == null) {
    throw new Error(`Expected evaluated binding ${sourcePath}:${bindingName}.`);
  }
  return value;
}

function evaluateModuleGraph(
  files: Readonly<Record<string, string>>,
  runtimeHost?: StaticEvaluationRuntimeHost,
) {
  const sources = new Map(Object.entries(files).map(([moduleKey, text]) => [
    moduleKey,
    ts.createSourceFile(moduleKey, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  ] as const));
  const build = buildEvaluationModuleGraph('entry.ts', {
    readSourceFile: (moduleKey) => sources.get(moduleKey) ?? null,
    resolveModuleSpecifier: (fromModuleKey, moduleSpecifier) => {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromModuleKey), moduleSpecifier));
      return [base, `${base}.ts`, `${base}/index.ts`]
        .find((candidate) => sources.has(candidate)) ?? null;
    },
  });
  return new StaticModuleGraphEvaluator(build.graph, undefined, runtimeHost).evaluate('entry.ts');
}

const pressureRuntimeHost: StaticEvaluationRuntimeHost = {
  resolveIdentifier: (identifier) => identifier.text === 'pressure'
    ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'test:pressure', identifier)
    : null,
  evaluateInvocation: (frame) => {
    if (
      frame.kind !== StaticInvocationKind.Call
      || !ts.isCallExpression(frame.node)
      || frame.thisValue !== null
      || frame.callee.openSeams.length > 0
      || frame.callee.value.kind !== EvaluationValueKind.BoundaryValue
      || frame.callee.value.boundaryKind !== EvaluationBoundaryKind.HostEnvironment
      || frame.callee.value.path !== 'test:pressure'
    ) {
      return StaticInvocationNotApplicable;
    }
    const argument = frame.argumentList.exactEvidence()?.[0];
    if (argument == null) {
      throw new Error('The pressure test intrinsic requires one argument.');
    }
    return staticInvocationValue(argument.value, [new EvaluationOpenSeam(
      EvaluationOpenSeamKind.DynamicCall,
      `${frame.node.getText(frame.node.getSourceFile())} retained a best-known value.`,
      frame.node,
      frame.moduleKey,
      [],
    )]);
  },
};
