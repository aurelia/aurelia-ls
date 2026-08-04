import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/index.js';

const temporaryRoots: string[] = [];

afterAll(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('project compiler options', () => {
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
