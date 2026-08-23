import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import type { StaticProjectEvaluationSourceResult } from '../src/evaluation/project-evaluation.js';
import { SourceFileRole } from '../src/kernel/address.js';
import { clearTypeSystemCompilerHostSourceFileCache } from '../src/type-system/compiler-host-source-file-cache.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';
import { canonicalTypeSystemPath } from '../src/type-system/source-file-path.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('type-system Program parse options', () => {
  test('applies forced module detection without mutating the evaluator carrier', async () => {
    const root = temporaryRoot();
    const sourcePath = path.join(root, 'src', 'script.ts');
    writeJson(path.join(root, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        moduleDetection: 'Force',
      },
      files: ['src/script.ts'],
    });
    writeText(sourcePath, 'const forcedModuleMarker = true;\n');

    const { evaluatedSource, typeSystem } = await buildTypeSystem(root, [
      { path: 'src/script.ts', role: SourceFileRole.AppSource },
    ], sourcePath);
    const programSource = typeSystem.readProgramSourceFileByHostPath(sourcePath);

    expect(programSource).not.toBeNull();
    expect(programSource).not.toBe(evaluatedSource.sourceFile);
    expect(ts.isExternalModule(programSource!)).toBe(true);
    expect(ts.isExternalModule(evaluatedSource.sourceFile)).toBe(false);
    expect(typeSystem.readProgramNode(evaluatedSource.sourceFile.statements[0]!))
      .toBe(programSource!.statements[0]);
    expect(typeSystem.readEvaluatedNode(programSource!.statements[0]!))
      .toBe(evaluatedSource.sourceFile.statements[0]);
  }, 30_000);

  test('remaps resolved-signature reads into the Program epoch and refuses foreign calls', async () => {
    const root = temporaryRoot();
    const sourcePath = path.join(root, 'src', 'calls.ts');
    writeJson(path.join(root, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        moduleDetection: 'Force',
      },
      files: ['src/calls.ts'],
    });
    writeText(sourcePath, [
      'export function choose(value: string): string;',
      'export function choose(value: number): number;',
      'export function choose(value: string | number): string | number { return value; }',
      "export const selected = choose('text');",
      '',
    ].join('\n'));

    const { evaluatedSource, typeSystem } = await buildTypeSystem(root, [
      { path: 'src/calls.ts', role: SourceFileRole.AppSource },
    ], sourcePath);
    const evaluatedCall = firstCallExpression(evaluatedSource.sourceFile);
    const programCall = typeSystem.readProgramNode(evaluatedCall);
    const candidates: ts.Signature[] = [];
    const resolved = typeSystem.readProgramResolvedSignature(evaluatedCall, candidates);

    expect(programCall).not.toBe(evaluatedCall);
    expect(resolved).not.toBeNull();
    expect(candidates).toHaveLength(2);
    expect(typeSystem.checker.signatureToString(resolved!)).toBe('(value: string): string');

    const foreignSource = ts.createSourceFile(
      path.join(root, 'src', 'foreign.ts'),
      "choose('text');\n",
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const foreignCandidates: ts.Signature[] = [];
    expect(typeSystem.readProgramResolvedSignature(firstCallExpression(foreignSource), foreignCandidates)).toBeNull();
    expect(foreignCandidates).toEqual([]);
  }, 30_000);

  test('keeps NodeNext parse modes on separate Program carriers', async () => {
    const root = temporaryRoot();
    const esmPath = path.join(root, 'src', 'esm.ts');
    const commonJsPath = path.join(root, 'src', 'common.cts');
    writeJson(path.join(root, 'package.json'), {
      name: '@fixture/program-parse-options',
      private: true,
      type: 'module',
    });
    writeJson(path.join(root, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
      },
      files: ['src/esm.ts', 'src/common.cts'],
    });
    writeText(esmPath, 'const esmMarker = true;\n');
    writeText(commonJsPath, 'const commonJsMarker = true;\n');

    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: `test:type-system-program-parse-options:nodenext:${path.basename(root)}`,
      projects: [{
        projectKey: 'program-parse-options-nodenext',
        rootDir: root,
        sourceFiles: [
          { path: 'src/esm.ts', role: SourceFileRole.AppSource },
          { path: 'src/common.cts', role: SourceFileRole.AppSource },
        ],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    const evaluation = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
    ).readBaseline();
    const evaluatedEsm = evaluatedSourceAt(evaluation.readEvaluatedSources(), esmPath);
    const evaluatedCommonJs = evaluatedSourceAt(evaluation.readEvaluatedSources(), commonJsPath);
    const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);
    const programEsm = typeSystem.readProgramSourceFileByHostPath(esmPath);
    const programCommonJs = typeSystem.readProgramSourceFileByHostPath(commonJsPath);

    expect(programEsm).not.toBeNull();
    expect(programCommonJs).not.toBeNull();
    expect(programEsm).not.toBe(evaluatedEsm.sourceFile);
    expect(programCommonJs).not.toBe(evaluatedCommonJs.sourceFile);
    expect(programEsm!.impliedNodeFormat).toBe(ts.ModuleKind.ESNext);
    expect(programCommonJs!.impliedNodeFormat).toBe(ts.ModuleKind.CommonJS);
    expect(evaluatedEsm.sourceFile.impliedNodeFormat).toBe(ts.ModuleKind.ESNext);
    expect(evaluatedCommonJs.sourceFile.impliedNodeFormat).toBe(ts.ModuleKind.CommonJS);
    expect(typeSystem.readProgramSourceFileByModuleKey(evaluatedEsm.moduleKey)).toBe(programEsm);
    expect(typeSystem.readProgramSourceFileByModuleKey(evaluatedCommonJs.moduleKey)).toBe(programCommonJs);
    expect(typeSystem.readProgramNode(evaluatedEsm.sourceFile.statements[0]!))
      .toBe(programEsm!.statements[0]);
    expect(typeSystem.readProgramNode(evaluatedCommonJs.sourceFile.statements[0]!))
      .toBe(programCommonJs!.statements[0]);
  }, 30_000);

  test('separates shared dependency carriers by effective module-detection policy', async () => {
    clearTypeSystemCompilerHostSourceFileCache('all');
    try {
      const root = temporaryRoot();
      const legacyRoot = path.join(root, 'legacy-app');
      const forceRoot = path.join(root, 'force-app');
      const dependencyRoot = path.join(root, 'node_modules', '@fixture', 'parse-policy');
      const dependencyDeclarationPath = path.join(dependencyRoot, 'index.d.ts');
      const dependencySourcePath = path.join(dependencyRoot, 'plain.ts');
      const dependencyJsxSourcePath = path.join(dependencyRoot, 'plain.tsx');

      writeJson(path.join(dependencyRoot, 'package.json'), {
        name: '@fixture/parse-policy',
        version: '1.0.0',
        type: 'commonjs',
        types: 'index.d.ts',
      });
      writeText(dependencyDeclarationPath, [
        '/// <reference path="./plain.ts" />',
        '/// <reference path="./plain.tsx" />',
        'export interface ParsePolicyMarker {}',
        '',
      ].join('\n'));
      writeText(dependencySourcePath, 'const dependencyScriptMarker = true;\n');
      writeText(dependencyJsxSourcePath, 'const dependencyJsxMarker = <div />;\n');
      writeParsePolicyApp(legacyRoot, 'Legacy');
      writeParsePolicyApp(forceRoot, 'Force');

      const legacy = await buildTypeSystem(legacyRoot, [
        { path: 'src/main.ts', role: SourceFileRole.AppSource },
      ], path.join(legacyRoot, 'src', 'main.ts'));
      const legacyDependencySource = legacy.typeSystem.program.getSourceFile(dependencySourcePath);
      expect(legacyDependencySource).not.toBeUndefined();
      expect(ts.isExternalModule(legacyDependencySource!)).toBe(false);

      const forced = await buildTypeSystem(forceRoot, [
        { path: 'src/main.ts', role: SourceFileRole.AppSource },
      ], path.join(forceRoot, 'src', 'main.ts'));
      const forcedDependencySource = forced.typeSystem.program.getSourceFile(dependencySourcePath);
      expect(forcedDependencySource).not.toBeUndefined();
      expect(forcedDependencySource).not.toBe(legacyDependencySource);
      expect(ts.isExternalModule(forcedDependencySource!)).toBe(true);
      expect(forced.typeSystem.profile.hostSourceFileCache.misses).toBeGreaterThan(0);
      expect(forced.typeSystem.profile.hostSourceFileCache.writes).toBeGreaterThan(0);

      const classicJsxRoot = path.join(root, 'classic-jsx-app');
      const automaticJsxRoot = path.join(root, 'automatic-jsx-app');
      writeParsePolicyApp(classicJsxRoot, 'Auto', 'react');
      writeParsePolicyApp(automaticJsxRoot, 'Auto', 'react-jsx');
      const classicJsx = await buildTypeSystem(classicJsxRoot, [
        { path: 'src/main.ts', role: SourceFileRole.AppSource },
      ], path.join(classicJsxRoot, 'src', 'main.ts'));
      const classicJsxDependencySource = classicJsx.typeSystem.program.getSourceFile(dependencyJsxSourcePath);
      expect(classicJsxDependencySource).not.toBeUndefined();
      expect(ts.isExternalModule(classicJsxDependencySource!)).toBe(false);

      const automaticJsx = await buildTypeSystem(automaticJsxRoot, [
        { path: 'src/main.ts', role: SourceFileRole.AppSource },
      ], path.join(automaticJsxRoot, 'src', 'main.ts'));
      const automaticJsxDependencySource = automaticJsx.typeSystem.program.getSourceFile(dependencyJsxSourcePath);
      expect(automaticJsxDependencySource).not.toBeUndefined();
      expect(automaticJsxDependencySource).not.toBe(classicJsxDependencySource);
      expect(ts.isExternalModule(automaticJsxDependencySource!)).toBe(true);
    } finally {
      clearTypeSystemCompilerHostSourceFileCache('all');
    }
  }, 30_000);
});

function writeParsePolicyApp(
  root: string,
  moduleDetection: 'Legacy' | 'Auto' | 'Force',
  jsx?: 'react' | 'react-jsx',
): void {
  writeJson(path.join(root, 'package.json'), {
    name: `@fixture/${moduleDetection.toLowerCase()}-app`,
    private: true,
    type: 'module',
  });
  writeJson(path.join(root, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      moduleDetection,
      ...(jsx == null ? {} : { jsx }),
    },
    files: ['src/main.ts'],
  });
  writeText(path.join(root, 'src', 'main.ts'), [
    "import type { ParsePolicyMarker } from '@fixture/parse-policy';",
    'export const marker: ParsePolicyMarker = {};',
    '',
  ].join('\n'));
}

async function buildTypeSystem(
  root: string,
  sourceFiles: readonly { readonly path: string; readonly role: SourceFileRole }[],
  expectedSourcePath: string,
): Promise<{
  readonly evaluatedSource: StaticProjectEvaluationSourceResult;
  readonly typeSystem: ReturnType<TypeSystemProjectBuilder['build']>;
}> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    storeKey: `test:type-system-program-parse-options:${path.basename(root)}`,
    projects: [{
      projectKey: 'program-parse-options',
      rootDir: root,
      sourceFiles,
    }],
  });
  const project = runtime.workspace.projects[0]!;
  const evaluation = runtime.projectEvaluations.acquire(
    project,
    aureliaAppProjectEvaluationProfile,
  ).readBaseline();
  return {
    evaluatedSource: evaluatedSourceAt(evaluation.readEvaluatedSources(), expectedSourcePath),
    typeSystem: new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation),
  };
}

function evaluatedSourceAt(
  sources: readonly StaticProjectEvaluationSourceResult[],
  fileName: string,
): StaticProjectEvaluationSourceResult {
  const normalized = canonicalTypeSystemPath(fileName);
  const source = sources.find((candidate) =>
    canonicalTypeSystemPath(candidate.sourceFile.fileName) === normalized
  );
  expect(source).not.toBeUndefined();
  return source!;
}

function firstCallExpression(sourceFile: ts.SourceFile): ts.CallExpression {
  let call: ts.CallExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (call != null) {
      return;
    }
    if (ts.isCallExpression(node)) {
      call = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (call == null) {
    throw new Error(`Expected one call expression in ${sourceFile.fileName}.`);
  }
  return call;
}

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-type-system-program-parse-'));
  temporaryRoots.push(root);
  return root;
}

function writeText(fileName: string, text: string): void {
  mkdirSync(path.dirname(fileName), { recursive: true });
  writeFileSync(fileName, text, 'utf8');
}

function writeJson(fileName: string, value: unknown): void {
  writeText(fileName, `${JSON.stringify(value, null, 2)}\n`);
}
