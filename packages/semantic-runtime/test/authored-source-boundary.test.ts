import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  createSemanticRuntime,
  SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeProjectInputHost,
} from '../src/index.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe('authored source boundaries', () => {
  test('exclude nested workspace roots from discovery and tsconfig roots without denying dependency reads', async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'aurelia-source-boundary-'));
    temporaryRoots.push(workspaceRoot);
    const disabledRoot = path.join(workspaceRoot, 'packages', 'disabled');
    const enabledRoot = path.join(workspaceRoot, 'packages', 'enabled');
    const mainFile = path.join(workspaceRoot, 'src', 'main.ts');
    const disabledFile = path.join(disabledRoot, 'src', 'dependency.ts');
    const enabledFile = path.join(enabledRoot, 'src', 'index.ts');

    await writeWorkspaceFile(workspaceRoot, 'package.json', JSON.stringify({ name: 'workspace' }));
    await writeWorkspaceFile(workspaceRoot, 'tsconfig.json', JSON.stringify({
      compilerOptions: { module: 'esnext', moduleResolution: 'bundler' },
      include: ['src/**/*.ts', 'packages/**/*.ts'],
    }));
    await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      "import { dependency } from '../packages/disabled/src/dependency.js';\nexport const value = dependency;\n",
    );
    await writeWorkspaceFile(disabledRoot, 'package.json', JSON.stringify({ name: 'disabled' }));
    await writeWorkspaceFile(disabledRoot, 'tsconfig.json', JSON.stringify({ include: ['src/**/*.ts'] }));
    await writeWorkspaceFile(disabledRoot, 'src/dependency.ts', 'export const dependency = 1;\n');
    await writeWorkspaceFile(enabledRoot, 'package.json', JSON.stringify({ name: 'enabled' }));
    await writeWorkspaceFile(enabledRoot, 'tsconfig.json', JSON.stringify({ include: ['src/**/*.ts'] }));
    await writeWorkspaceFile(enabledRoot, 'src/index.ts', 'export const enabled = true;\n');

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      excludedWorkspaceRoots: [disabledRoot],
    });
    const projectRoots = runtime.workspace.projects.map((project) => path.normalize(project.rootDir));
    expect(projectRoots).toEqual([path.normalize(enabledRoot), path.normalize(workspaceRoot)].sort());

    const workspaceProject = runtime.workspace.projects.find((project) => project.rootDir === workspaceRoot)!;
    expect(workspaceProject.authoredSources.contains(mainFile)).toBe(true);
    expect(workspaceProject.authoredSources.contains(disabledFile)).toBe(false);
    expect(workspaceProject.authoredSources.contains(enabledFile)).toBe(false);
    expect(workspaceProject.sourceFiles.some((source) => source.path.includes('packages/disabled/'))).toBe(false);
    expect(workspaceProject.sourceFiles.some((source) => source.path.includes('packages/enabled/'))).toBe(false);
    expect(workspaceProject.compilerOptions.rootFileNames).not.toContain(disabledFile);
    expect(workspaceProject.compilerOptions.rootFileNames).not.toContain(enabledFile);
    expect(workspaceProject.inputGeneration.host.readFile(disabledFile)).toBe('export const dependency = 1;\n');

    const explicitRuntime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{
        rootDir: workspaceRoot,
        excludedSourceRoots: [disabledRoot],
        sourceFiles: [
          { path: 'src/main.ts' },
          { path: 'packages/disabled/src/dependency.ts' },
        ],
      }],
    });
    expect(explicitRuntime.workspace.projects[0]?.sourceFiles.map((source) => path.normalize(source.path))).toEqual([
      path.normalize('src/main.ts'),
    ]);
  });

  test('uses the supplied project-input host for workspace topology and source admission', async () => {
    const workspaceRoot = path.resolve('C:/virtual-aurelia-workspace');
    const mainFile = path.join(workspaceRoot, 'src', 'main.ts');
    const host = new VirtualProjectInputHost(workspaceRoot, {
      'package.json': JSON.stringify({ name: 'virtual-app', dependencies: { aurelia: '2.0.0' } }),
      'tsconfig.json': JSON.stringify({ include: ['src/**/*.ts'] }),
      'src/main.ts': 'export class MyApp {}\n',
    });

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(host),
    });

    expect(runtime.workspace.projects).toHaveLength(1);
    expect(runtime.workspace.projects[0]?.compilerOptions.rootFileNames).toEqual([mainFile]);
    expect(runtime.workspace.projects[0]?.sourceFiles.map((source) => path.normalize(source.path))).toContain(
      path.normalize('src/main.ts'),
    );
  });
});

class VirtualProjectInputHost implements SemanticRuntimeProjectInputHost {
  private readonly files = new Map<string, string>();
  private readonly directories = new Set<string>();

  constructor(rootDir: string, files: Readonly<Record<string, string>>) {
    const root = path.normalize(rootDir);
    this.directories.add(root);
    for (const [relativePath, text] of Object.entries(files)) {
      const fileName = path.normalize(path.resolve(root, relativePath));
      this.files.set(fileName, text);
      for (let directory = path.dirname(fileName); directory.startsWith(root); directory = path.dirname(directory)) {
        this.directories.add(directory);
        if (directory === root) break;
      }
    }
  }

  readFile(fileName: string): string | undefined {
    return this.files.get(path.normalize(fileName));
  }

  fileExists(fileName: string): boolean {
    return this.files.has(path.normalize(fileName));
  }

  readDirectory(directoryName: string): readonly string[] {
    const directory = path.normalize(directoryName);
    return [...new Set([
      ...[...this.files.keys()].filter((entry) => path.dirname(entry) === directory).map((entry) => path.basename(entry)),
      ...[...this.directories].filter((entry) => path.dirname(entry) === directory).map((entry) => path.basename(entry)),
    ])].sort((left, right) => left.localeCompare(right));
  }

  directoryExists(directoryName: string): boolean {
    return this.directories.has(path.normalize(directoryName));
  }

  realpath(fileName: string): string {
    return path.normalize(fileName);
  }

  matchFiles(rootDir: string, extensions: readonly string[] = []): readonly string[] {
    const root = path.normalize(rootDir);
    return [...this.files.keys()]
      .filter((fileName) => fileName.startsWith(`${root}${path.sep}`))
      .filter((fileName) => extensions.length === 0 || extensions.some((extension) => fileName.endsWith(extension)))
      .sort((left, right) => left.localeCompare(right));
  }
}

async function writeWorkspaceFile(rootDir: string, relativePath: string, text: string): Promise<void> {
  const fileName = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fileName), { recursive: true });
  await writeFile(fileName, text, 'utf8');
}
