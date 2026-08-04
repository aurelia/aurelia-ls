import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import {
  StaticProjectEvaluationResult,
  StaticProjectEvaluationSourceResult,
} from '../src/evaluation/project-evaluation.js';
import { SourceFileRole, SourceLanguage } from '../src/kernel/address.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';
import { canonicalTypeSystemPath } from '../src/type-system/source-file-path.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('type-system root admission', () => {
  test('keeps graph-only app sources as roots without promoting in-boundary external sources', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'aurelia-type-system-roots-'));
    temporaryRoots.push(root);
    const mainFile = path.join(root, 'src/main.ts');
    const graphOnlyFile = path.join(root, 'src/graph-only.ts');
    const externalFile = path.join(root, 'src/external.ts');
    mkdirSync(path.dirname(mainFile), { recursive: true });
    writeFileSync(mainFile, 'export const main = true;\n', 'utf8');
    writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
      },
      files: ['src/main.ts'],
    }), 'utf8');

    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: `test:type-system-root-admission:${path.basename(root)}`,
      projects: [{
        projectKey: 'root-admission-project',
        rootDir: root,
        sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    const baseline = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
    ).readBaseline();
    const anchor = baseline.readEvaluatedSources()[0]!;
    const supplementalSource = (
      fileName: string,
      projectPath: string,
      role: SourceFileRole,
    ): StaticProjectEvaluationSourceResult => new StaticProjectEvaluationSourceResult(
      {
        ...anchor.admission,
        path: projectPath,
        language: SourceLanguage.TypeScript,
        role,
      },
      fileName,
      ts.createSourceFile(fileName, 'export const value = true;\n', ts.ScriptTarget.ES2022, true),
      anchor.evaluation,
      [],
    );
    const evaluation = new StaticProjectEvaluationResult(
      project,
      [
        ...baseline.sources,
        supplementalSource(graphOnlyFile, 'src/graph-only.ts', SourceFileRole.AppSource),
        supplementalSource(externalFile, 'src/external.ts', SourceFileRole.ExternalSource),
      ],
      baseline.evaluationOrderModuleKeys,
      baseline.profile,
      baseline.graphOpenValues,
    );

    const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);
    const roots = new Set(typeSystem.program.getRootFileNames().map(canonicalTypeSystemPath));

    expect(roots).toContain(canonicalTypeSystemPath(mainFile));
    expect(roots).toContain(canonicalTypeSystemPath(graphOnlyFile));
    expect(roots).not.toContain(canonicalTypeSystemPath(externalFile));
    expect(typeSystem.readProgramSourceFileByHostPath(graphOnlyFile)).not.toBeNull();
    expect(typeSystem.readProgramSourceFileByHostPath(externalFile)).toBeNull();
  }, 30_000);
});
