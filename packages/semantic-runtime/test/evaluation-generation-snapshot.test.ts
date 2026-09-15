import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import { bootWorkspace } from '../src/boot/boot-workspace.js';
import { readPristineObjectSnapshotView } from '../src/evaluation/data-snapshot.js';
import type { StaticModuleEvaluationResult } from '../src/evaluation/module-evaluation-result.js';
import { StaticModuleGraphEvaluator } from '../src/evaluation/module-evaluator.js';
import { buildEvaluationModuleGraph } from '../src/evaluation/module-host.js';
import { StaticProjectEvaluationPass, type StaticProjectEvaluationResult } from '../src/evaluation/project-evaluation.js';
import {
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('evaluation generation snapshot ownership', () => {
  test('shares unchanged imported state across modules and preserves history across a later module mutation', () => {
    const helper = [
      "import { catalogue } from './data';",
      'export function lookup() { return catalogue.item.count; }',
      'export const result = lookup();',
    ].join('\n');
    const modules = evaluateGraph({
      'entry.ts': "import './before-a'; import './before-b'; import './mutate'; import './after';",
      'data.ts': 'export const catalogue = { item: { count: 1 } };',
      'before-a.ts': helper,
      'before-b.ts': helper,
      'mutate.ts': "import { catalogue } from './data'; catalogue.item.count = 2;",
      'after.ts': helper,
    });
    const beforeA = capturedCatalogue(modules.get('before-a.ts')!);
    const beforeB = capturedCatalogue(modules.get('before-b.ts')!);
    const after = capturedCatalogue(modules.get('after.ts')!);
    expect(beforeA).not.toBe(beforeB);
    expect(snapshotRecord(beforeA)).toBe(snapshotRecord(beforeB));
    expect(snapshotRecord(after)).not.toBe(snapshotRecord(beforeA));
    expect(count(beforeA)).toBe(1);
    expect(count(beforeB)).toBe(1);
    expect(count(after)).toBe(2);

    const live = object(modules.get('data.ts')!.environment.readValue('catalogue'));
    for (const moduleName of ['before-a.ts', 'before-b.ts', 'mutate.ts', 'after.ts']) {
      expect(modules.get(moduleName)!.environment.readValue('catalogue')).toBe(live);
    }
    setCount(beforeA, 8);
    expect(count(beforeB)).toBe(1);
    expect(count(after)).toBe(2);
    expect(count(live)).toBe(2);
  });

  test('shares final module data across complete sessions while isolating writes and retaining imported aliases', () => {
    const project = evaluateProject({
      'entry.ts': "import { catalogue } from './data'; export const alias = catalogue.item;",
      'data.ts': 'export const catalogue = { item: { count: 1 } };',
    });
    const first = project.forkSession();
    const second = project.forkSession();
    const firstData = object(binding(first, 'data.ts', 'catalogue'));
    const secondData = object(binding(second, 'data.ts', 'catalogue'));
    expect(firstData).not.toBe(secondData);
    expect(snapshotRecord(firstData)).toBe(snapshotRecord(secondData));
    expect(binding(first, 'entry.ts', 'catalogue')).toBe(firstData);
    expect(binding(first, 'entry.ts', 'alias')).toBe(child(firstData));
    expect(binding(second, 'entry.ts', 'alias')).toBe(child(secondData));

    setCount(firstData, 9);
    expect(count(firstData)).toBe(9);
    expect(count(secondData)).toBe(1);
    expect(count(object(binding(project, 'data.ts', 'catalogue')))).toBe(1);
    const nested = first.forkSession();
    const nestedData = object(binding(nested, 'data.ts', 'catalogue'));
    expect(count(nestedData)).toBe(9);
    expect(binding(nested, 'entry.ts', 'alias')).toBe(child(nestedData));
    setCount(nestedData, 10);
    expect(count(firstData)).toBe(9);
  });

  test('carries module snapshot storage into full project forks and starts fresh storage on reevaluation', () => {
    const files = {
      'entry.ts': [
        "import { catalogue } from './data';",
        'function lookup() { return catalogue.item.count; }',
        'export const result = lookup();',
      ].join('\n'),
      'data.ts': 'export const catalogue = { item: { count: 1 } };',
    };
    const pass = new StaticProjectEvaluationPass();
    const root = temporaryProject(files);
    const boot = () => bootWorkspace({ rootDir: root, storeKey: 'snapshot-generation', projects: [{
      projectKey: 'app', rootDir: root, sourceFiles: Object.keys(files).map((sourcePath) => ({ path: sourcePath })),
    }] }).projects[0]!;
    const first = pass.evaluate(boot());
    const historical = capturedCatalogue(source(first, 'entry.ts'));
    const firstSession = first.forkSession();
    expect(snapshotRecord(object(binding(firstSession, 'data.ts', 'catalogue')))).toBe(snapshotRecord(historical));

    writeFileSync(path.join(root, 'data.ts'), 'export const catalogue = { item: { count: 4 } };', 'utf8');
    const second = pass.evaluate(boot());
    const secondSession = second.forkSession();
    const current = object(binding(secondSession, 'data.ts', 'catalogue'));
    expect(snapshotRecord(current)).not.toBe(snapshotRecord(historical));
    expect(count(current)).toBe(4);
    expect(count(historical)).toBe(1);
    expect(count(object(binding(firstSession, 'data.ts', 'catalogue')))).toBe(1);
  });
});

function evaluateGraph(files: Readonly<Record<string, string>>) {
  const sources = new Map(Object.entries(files).map(([key, text]) => [
    key, ts.createSourceFile(key, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  ]));
  const build = buildEvaluationModuleGraph('entry.ts', {
    readSourceFile: (key) => sources.get(key) ?? null,
    resolveModuleSpecifier: (from, specifier) => {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
      return [base, `${base}.ts`].find((key) => sources.has(key)) ?? null;
    },
  });
  return new StaticModuleGraphEvaluator(build.graph).evaluate('entry.ts').modules;
}

function evaluateProject(files: Readonly<Record<string, string>>): StaticProjectEvaluationResult {
  const root = temporaryProject(files);
  const project = bootWorkspace({ rootDir: root, storeKey: 'snapshot-generation', projects: [{
    projectKey: 'app', rootDir: root, sourceFiles: Object.keys(files).map((sourcePath) => ({ path: sourcePath })),
  }] }).projects[0]!;
  return new StaticProjectEvaluationPass().evaluate(project);
}

function temporaryProject(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-ls-generation-snapshot-'));
  temporaryRoots.push(root);
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(root, name), text, 'utf8');
  return root;
}

function source(project: StaticProjectEvaluationResult, sourcePath: string): StaticModuleEvaluationResult {
  const result = project.readEvaluatedSources().find((candidate) => candidate.admission.path === sourcePath);
  if (result == null) throw new Error(`Missing module ${sourcePath}.`);
  return result.evaluation;
}

function binding(project: StaticProjectEvaluationResult, sourcePath: string, name: string): EvaluationValue | null {
  return source(project, sourcePath).environment.readValue(name);
}

function capturedCatalogue(module: StaticModuleEvaluationResult): EvaluationObjectValue {
  const call = module.invocations.find((invocation) => invocation.node.getText() === 'lookup()');
  const fn = call?.callee.value;
  if (fn?.kind !== EvaluationValueKind.Function) throw new Error('Missing lookup invocation.');
  return object(fn.environment.readValue('catalogue'));
}

function object(value: EvaluationValue | null | undefined): EvaluationObjectValue {
  if (value?.kind !== EvaluationValueKind.Object) throw new Error('Expected object.');
  return value;
}

function child(value: EvaluationObjectValue): EvaluationObjectValue {
  return object(value.properties.get('item')?.value);
}

function count(value: EvaluationObjectValue): number {
  const countValue = child(value).properties.get('count')?.value;
  if (countValue?.kind !== EvaluationValueKind.Number) throw new Error('Expected count.');
  return countValue.value;
}

function setCount(value: EvaluationObjectValue, next: number): void {
  child(value).properties.set('count', new EvaluationObjectProperty(
    'count', new EvaluationNumberValue(next), null, EvaluationObjectPropertyState.Closed,
  ));
}

function snapshotRecord(value: EvaluationObjectValue) {
  const view = readPristineObjectSnapshotView(value);
  if (view == null) throw new Error('Expected lazy snapshot view.');
  return view.snapshot;
}
