import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { afterAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/index.js';
import { manifestWorkspacesIncludeProject } from '../src/boot/host-files.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';
import { readTypeSystemProjectDiagnostics, readTypeSystemProjectSourceDiagnostics } from '../src/type-system/diagnostics.js';

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

  test('a nested config inheriting a broad include cannot override the actual parent config of a sibling file', async () => {
    const root = await temporaryRoot();
    const nested = path.join(root, 'src/feature');
    await mkdir(nested, { recursive: true });
    await writeProject(root, 'nested-compiler-scope');
    await writeFile(path.join(root, 'vite.config.ts'), "import aurelia from '@aurelia/vite-plugin'; export default {plugins:[aurelia()]};");
    await writeFile(path.join(root, 'src/outer.ts'), 'export const outer = 1;');
    await writeFile(path.join(nested, 'inner.ts'), 'export const inner = 1;');
    await writeJson(path.join(root, 'tsconfig.json'), { compilerOptions: { strict: false }, include: ['src'] });
    await writeJson(path.join(nested, 'tsconfig.json'), { extends: '../../tsconfig.json', compilerOptions: { strict: true } });
    const runtime = await createSemanticRuntime({ workspaceRoot: root });
    try {
      expect(runtime.workspace.projects).toHaveLength(1);
      const config = runtime.workspace.projects[0]!.compilerOptions;
      expect(config.optionsForFile(path.join(root, 'src/outer.ts')).strict).toBe(false);
      expect(config.optionsForFile(path.join(nested, 'inner.ts')).strict).toBe(true);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  });

  test('attributes a referenced checker’s option diagnostic to its own configuration', async () => {
    const root = await temporaryRoot();
    const good = 'tsconfig.app.json';
    const invalid = 'tsconfig.tool.json';
    await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src/model.ts'), 'export const model = 1;');
    await writeFile(path.join(root, 'vite.config.ts'), 'export default {};');
    await writeJson(path.join(root, 'tsconfig.json'), { files: [], references: [{ path: './' + good }, { path: './' + invalid }] });
    await writeJson(path.join(root, good), { compilerOptions: { module: 'ESNext' }, files: ['src/model.ts'] });
    await writeJson(path.join(root, invalid), {
      compilerOptions: { module: 'ESNext', moduleResolution: 'NodeNext' },
      files: ['vite.config.ts'],
    });
    const runtime = await createSemanticRuntime({ workspaceRoot: root });
    try {
      const project = runtime.workspace.projects[0]!;
      const evaluation = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile).readBaseline();
      const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);
      const select = (name: string) => readTypeSystemProjectSourceDiagnostics(typeSystem, name).filter(row => row.code === 5110);
      expect(select(good)).toHaveLength(0);
      expect(select(invalid)).toHaveLength(1);
      expect(readTypeSystemProjectDiagnostics(typeSystem).filter(row => row.code === 5110)).toHaveLength(1);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
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
    await writeFile(path.join(root, 'src/right-globals.d.ts'), 'declare const rightOnly: number;');
    for (const side of sides) {
      await writeFile(path.join(root, 'src', side + '.ts'), "import { marker } from '@model'; export const captured = marker; export const useGlobal = rightOnly;");
      await writeFile(path.join(root, 'src', side + '-model.ts'), "export const marker = '" + side + "' as const;");
      await writeJson(path.join(root, 'tsconfig.' + side + '.json'), {
        compilerOptions: { moduleResolution: 'Bundler', paths: { '@model': ['./src/' + side + '-model.ts'] } },
        files: ['src/' + side + '.ts', 'src/' + side + '-model.ts', ...(side === 'right' ? ['src/right-globals.d.ts'] : [])],
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
        const scoped = typeSystem.forSourceFile(path.join(root, relative));
        const source = scoped.readProgramSourceFileByProjectPath(relative)!;
        const statement = source.statements.find(ts.isVariableStatement)!;
        const type = scoped.readProgramTypeAtLocation(statement.declarationList.declarations[0]!.name)!;
        expect(scoped.checker.typeToString(type)).toBe(JSON.stringify(side));
        const sourceDiagnostics = readTypeSystemProjectSourceDiagnostics(typeSystem, relative);
        expect(sourceDiagnostics.filter(row => row.code === 2304)).toHaveLength(side === 'left' ? 1 : 0);
        const evaluated = evaluation.readEvaluatedSources().find(item => item.admission.path === relative);
        expect(evaluated?.evaluation.environment.readValue('captured')).toMatchObject({ value: side });
      }
      expect(readTypeSystemProjectDiagnostics(typeSystem).filter(row => row.code === 2304)).toHaveLength(1);
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
