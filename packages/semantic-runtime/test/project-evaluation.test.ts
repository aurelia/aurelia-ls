import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { bootWorkspace } from '../src/boot/boot-workspace.js';
import {
  StaticProjectEvaluationPass,
  type StaticProjectEvaluationResult,
} from '../src/evaluation/project-evaluation.js';
import { EvaluationValueKind } from '../src/evaluation/values.js';

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
        "import * as duplicate from './duplicate';",
        "import * as ambiguous from './ambiguous';",
        "import * as sameValueConflict from './same-value-conflict';",
        "import * as cycle from './cycle-a';",
        'export const duplicateNamespace = duplicate;',
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
    const ambiguous = evaluatedBinding(evaluation, 'entry.ts', 'ambiguousNamespace');
    const sameValueConflict = evaluatedBinding(evaluation, 'entry.ts', 'sameValueConflictNamespace');
    const cycle = evaluatedBinding(evaluation, 'entry.ts', 'cycleNamespace');
    const shared = evaluatedBinding(evaluation, 'source.ts', 'shared');

    expect(duplicate.kind).toBe(EvaluationValueKind.ModuleNamespace);
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
