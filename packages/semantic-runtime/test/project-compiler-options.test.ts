import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { afterAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/index.js';
import { manifestWorkspacesIncludeProject } from '../src/boot/host-files.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

const temporaryRoots: string[] = [];

afterAll(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('project compiler options', () => {
  test('inherits workspace dependencies only for npm workspace members', () => {
    const manifestRoot = path.resolve('workspace');
    const members = (workspaces: string[]) => ['packages/lib', 'packages/nested/lib', 'packages/extras'].filter(key =>
      manifestWorkspacesIncludeProject({ workspaces }, manifestRoot, path.join(manifestRoot, key)));
    expect(members(['packages/**/lib', 'packages/extras'])).toHaveLength(3);
    expect(members(['packages/{lib,extras}'])).toEqual(['packages/lib', 'packages/extras']);
    expect(members(['packages/*', '!packages/extras', 'packages/*/lib'])).toEqual(['packages/lib', 'packages/nested/lib']);
    expect(members(['packages/*', '!packages/extras', './packages/extras/'])).toEqual(['packages/lib', 'packages/extras']);
  });

  test('does not turn ambient ancestor workspaces or Aurelia checkouts into implicit path mappings', async () => {
    const workspaceRoot = await temporaryRoot();
    const projectRoot = path.join(workspaceRoot, 'packages/app');
    const unrelatedPackageRoot = path.join(workspaceRoot, 'packages/unrelated');
    const frameworkPackageRoot = path.join(workspaceRoot, 'aurelia/packages/kernel');

    await writeJson(path.join(workspaceRoot, 'package.json'), {
      private: true,
      workspaces: ['packages/*'],
    });
    await writeFile(path.join(workspaceRoot, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    await writeProject(projectRoot, '@fixture/app');
    await writeProject(unrelatedPackageRoot, '@fixture/unrelated');
    await writeProject(frameworkPackageRoot, '@aurelia/kernel');
    await mkdir(path.join(frameworkPackageRoot, 'dist/types'), { recursive: true });
    await writeFile(path.join(frameworkPackageRoot, 'dist/types/index.d.ts'), 'export {};\n');

    const runtime = await createSemanticRuntime({ workspaceRoot: projectRoot });
    const project = runtime.workspace.projects[0];
    expect(project).toBeDefined();
    expect(project?.compilerOptions.options.baseUrl).toBeUndefined();
    expect(project?.compilerOptions.options.paths).toBeUndefined();

    const readKeys = project?.compilerOptions.readRegisteredInputs().map((read) => read.readKey) ?? [];
    expect(readKeys.some((key) => key.includes('/packages/unrelated'))).toBe(false);
    expect(readKeys.some((key) => key.includes('/aurelia/'))).toBe(false);
    expect(readKeys.some((key) => key.endsWith('/pnpm-workspace.yaml'))).toBe(false);
  });

  test('preserves authored TypeScript path mappings without adding fallback aliases', async () => {
    const projectRoot = await temporaryRoot();
    await mkdir(path.join(projectRoot, 'src'), { recursive: true });
    await writeJson(path.join(projectRoot, 'package.json'), {
      name: '@fixture/configured-app',
      private: true,
    });
    await writeJson(path.join(projectRoot, 'tsconfig.json'), {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@fixture/*': ['src/*'],
        },
      },
      include: ['src'],
    });
    await writeFile(path.join(projectRoot, 'src/index.ts'), 'export {};\n');

    const runtime = await createSemanticRuntime({ workspaceRoot: projectRoot });
    const project = runtime.workspace.projects[0];
    expect(path.normalize(project?.compilerOptions.options.baseUrl ?? '')).toBe(path.normalize(projectRoot));
    expect(project?.compilerOptions.options.paths).toEqual({
      '@fixture/*': ['src/*'],
    });
  });

  test('uses the referenced project of each importing file for both checker and evaluator resolution', async () => {
    const root = await temporaryRoot();
    const sides = ['left', 'right'];
    await mkdir(path.join(root, 'src'));
    await writeJson(path.join(root, 'tsconfig.json'), {
      files: [],
      references: [{ path: './tsconfig.group.json' }],
    });
    await writeJson(path.join(root, 'tsconfig.group.json'), {
      files: [],
      references: sides.map(side => ({ path: './tsconfig.' + side + '.json' })),
    });
    for (const side of sides) {
      await writeFile(path.join(root, 'src', side + '.ts'), "import { marker } from '@model'; export const captured = marker;");
      await writeFile(path.join(root, 'src', side + '-model.ts'), "export const marker = '" + side + "' as const;");
      await writeJson(path.join(root, 'tsconfig.' + side + '.json'), {
        compilerOptions: { moduleResolution: 'Bundler', paths: { '@model': ['./src/' + side + '-model.ts'] } },
        files: ['src/' + side + '.ts', 'src/' + side + '-model.ts'],
      });
    }
    const runtime = await createSemanticRuntime({ workspaceRoot: root });
    try {
      const project = runtime.workspace.projects[0]!;
      const evaluation = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile).readBaseline();
      const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);
      for (const side of sides) {
        const relative = 'src/' + side + '.ts';
        const configured = project.compilerOptions.optionsForFile(path.join(root, relative));
        expect(path.normalize(String(configured.configFilePath))).toBe(path.join(root, 'tsconfig.' + side + '.json'));
        const source = typeSystem.readProgramSourceFileByProjectPath(relative)!;
        const statement = source.statements.find(ts.isVariableStatement)!;
        const type = typeSystem.readProgramTypeAtLocation(statement.declarationList.declarations[0]!.name)!;
        expect(typeSystem.checker.typeToString(type)).toBe(JSON.stringify(side));
        const evaluated = evaluation.readEvaluatedSources().find(item => item.admission.path === relative);
        expect(evaluated?.evaluation.environment.readValue('captured')).toMatchObject({ value: side });
      }
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  });
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'aurelia-project-compiler-options-'));
  temporaryRoots.push(root);
  return root;
}

async function writeProject(root: string, name: string): Promise<void> {
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeJson(path.join(root, 'package.json'), { name, private: true });
  await writeJson(path.join(root, 'tsconfig.json'), {
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'Bundler',
    },
    include: ['src'],
  });
  await writeFile(path.join(root, 'src/index.ts'), 'export {};\n');
}

async function writeJson(fileName: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(fileName), { recursive: true });
  await writeFile(fileName, `${JSON.stringify(value, null, 2)}\n`);
}
