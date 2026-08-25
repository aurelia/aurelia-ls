import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticRuntimeProjectInputAuthority,
} from '../src/index.js';
import { bootWorkspace } from '../src/boot/boot-workspace.js';
import { KernelStore } from '../src/kernel/store.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe('boot project discovery', () => {
  test('boots every exact project marker once and gives every nested boundary its own frame', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', JSON.stringify({ name: 'workspace' }));
    await writeWorkspaceFile(workspaceRoot, 'src/root.ts', 'export const root = true;\n');

    const packageOnlyRoot = path.join(workspaceRoot, 'projects', 'package-only');
    const packageNativeRoot = path.join(workspaceRoot, 'projects', 'package-native');
    const tsconfigOnlyRoot = path.join(workspaceRoot, 'projects', 'tsconfig-only');
    const jsconfigOnlyRoot = path.join(workspaceRoot, 'projects', 'jsconfig-only');
    const nativeOnlyRoot = path.join(workspaceRoot, 'projects', 'native-only');
    const everyMarkerRoot = path.join(workspaceRoot, 'projects', 'every-marker');
    const nestedRoot = path.join(packageNativeRoot, 'examples', 'nested');

    await writeWorkspaceFile(packageOnlyRoot, 'package.json', JSON.stringify({ name: 'package-only' }));
    const packageOnlySource = await writeWorkspaceFile(
      packageOnlyRoot,
      'src/index.js',
      'export const packageOnly = true;\n',
    );

    await writeWorkspaceFile(packageNativeRoot, 'package.json', JSON.stringify({ name: 'package-native' }));
    await writeWorkspaceFile(packageNativeRoot, 'aurelia.project.json', '{"version":1}');
    const packageNativeSource = await writeWorkspaceFile(
      packageNativeRoot,
      'src/index.js',
      'export const packageNative = true;\n',
    );

    await writeWorkspaceFile(tsconfigOnlyRoot, 'tsconfig.json', '{"include":["src/**/*.ts"]}');
    const tsconfigOnlySource = await writeWorkspaceFile(
      tsconfigOnlyRoot,
      'src/index.ts',
      'export const tsconfigOnly = true;\n',
    );

    await writeWorkspaceFile(jsconfigOnlyRoot, 'jsconfig.json', '{"include":["src/**/*.js"]}');
    const jsconfigOnlySource = await writeWorkspaceFile(
      jsconfigOnlyRoot,
      'src/index.js',
      'export const jsconfigOnly = true;\n',
    );

    await writeWorkspaceFile(nativeOnlyRoot, 'aurelia.project.json', '{"version":');
    const nativeOnlySource = await writeWorkspaceFile(
      nativeOnlyRoot,
      'src/index.ts',
      'export const nativeOnly = true;\n',
    );

    await writeWorkspaceFile(everyMarkerRoot, 'package.json', JSON.stringify({ name: 'every-marker' }));
    await writeWorkspaceFile(everyMarkerRoot, 'tsconfig.json', '{"include":["src/**/*.ts"]}');
    await writeWorkspaceFile(everyMarkerRoot, 'jsconfig.json', '{"include":["src/**/*.js"]}');
    await writeWorkspaceFile(everyMarkerRoot, 'aurelia.project.json', '{"version":1}');
    const everyMarkerSource = await writeWorkspaceFile(
      everyMarkerRoot,
      'src/index.ts',
      'export const everyMarker = true;\n',
    );

    await writeWorkspaceFile(nestedRoot, 'aurelia.project.json', '{"version":1}');
    const nestedSource = await writeWorkspaceFile(
      nestedRoot,
      'src/index.ts',
      'export const nested = true;\n',
    );

    const directoryMarkerRoot = path.join(workspaceRoot, 'projects', 'directory-markers');
    for (const marker of ['package.json', 'tsconfig.json', 'jsconfig.json', 'aurelia.project.json']) {
      await mkdir(path.join(directoryMarkerRoot, marker), { recursive: true });
    }
    const directoryMarkerSource = await writeWorkspaceFile(
      directoryMarkerRoot,
      'src/index.ts',
      'export const directoryMarkersAreNotFiles = true;\n',
    );

    const runtime = await createSemanticRuntime({ workspaceRoot });
    expect(projectRoots(runtime)).toEqual(normalizedSorted([
      workspaceRoot,
      packageOnlyRoot,
      packageNativeRoot,
      tsconfigOnlyRoot,
      jsconfigOnlyRoot,
      nativeOnlyRoot,
      everyMarkerRoot,
      nestedRoot,
    ]));

    for (const [projectRoot, sourceFile] of [
      [packageOnlyRoot, packageOnlySource],
      [packageNativeRoot, packageNativeSource],
      [tsconfigOnlyRoot, tsconfigOnlySource],
      [jsconfigOnlyRoot, jsconfigOnlySource],
      [nativeOnlyRoot, nativeOnlySource],
      [everyMarkerRoot, everyMarkerSource],
      [nestedRoot, nestedSource],
    ] as const) {
      expect(authoredProjectRootsFor(runtime, sourceFile)).toEqual([path.normalize(projectRoot)]);
    }
    expect(authoredProjectRootsFor(runtime, directoryMarkerSource)).toEqual([path.normalize(workspaceRoot)]);
    expect(projectForRoot(runtime, nativeOnlyRoot).projectConfiguration.diagnostics).not.toHaveLength(0);
    expect(projectForRoot(runtime, packageNativeRoot).compilerOptions.configFilePath).toBeNull();

    expect(projectForRoot(runtime, everyMarkerRoot).admissionOrigins).toEqual([
      markerOrigin('package-json-marker', everyMarkerRoot, 'package.json'),
      markerOrigin('tsconfig-json-marker', everyMarkerRoot, 'tsconfig.json'),
      markerOrigin('jsconfig-json-marker', everyMarkerRoot, 'jsconfig.json'),
      markerOrigin('aurelia-project-json-marker', everyMarkerRoot, 'aurelia.project.json'),
    ]);
    expect(projectForRoot(runtime, packageNativeRoot).admissionOrigins).toEqual([
      markerOrigin('package-json-marker', packageNativeRoot, 'package.json'),
      markerOrigin('aurelia-project-json-marker', packageNativeRoot, 'aurelia.project.json'),
    ]);
    expect(projectForRoot(runtime, nativeOnlyRoot).admissionOrigins).toEqual([
      markerOrigin('aurelia-project-json-marker', nativeOnlyRoot, 'aurelia.project.json'),
    ]);

    const summary = runtime.summary({ projectPage: { size: 20 } });
    expect(summary.value.projects.find((project) => path.normalize(project.rootDir) === path.normalize(everyMarkerRoot))
      ?.admissionOrigins).toEqual(projectForRoot(runtime, everyMarkerRoot).admissionOrigins);
  });

  test('publishes one project-root provenance envelope over exact marker addresses', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"provenance-app"}');
    await writeWorkspaceFile(workspaceRoot, 'tsconfig.json', '{}');
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');

    const runtime = await createSemanticRuntime({ workspaceRoot });
    const project = projectForRoot(runtime, workspaceRoot);
    const provenance = runtime.workspace.store.read(project.admissionProvenanceHandle);
    expect(provenance?.kind).toBe('provenance-record');
    if (provenance?.kind !== 'provenance-record') {
      throw new Error('Expected project-root admission provenance.');
    }
    expect(provenance.evidenceHandles).toHaveLength(project.admissionOrigins.length);
    for (const [index, origin] of project.admissionOrigins.entries()) {
      const evidence = runtime.workspace.store.read(provenance.evidenceHandles[index]!);
      expect(evidence).toMatchObject({
        kind: 'evidence-record',
        evidenceKind: 'source-observation',
        roles: ['admission'],
      });
      if (evidence?.kind !== 'evidence-record' || !('sourceFilePath' in origin)) {
        throw new Error('Expected marker admission evidence.');
      }
      const markerAdmission = project.sourceFiles.find((source) =>
        canonicalPath(path.resolve(project.rootDir, source.path)) === canonicalPath(origin.sourceFilePath));
      expect(markerAdmission).toBeDefined();
      expect(evidence.addressHandle).toBe(markerAdmission?.addressHandle);
    }
  });

  test('merges policy and marker origins without duplicating equivalent hints or marker observations', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"multi-origin-app"}');
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projectRootHints: ['.', workspaceRoot, '.'],
    });
    const project = projectForRoot(runtime, workspaceRoot);
    expect(project.admissionOrigins).toEqual([
      { kind: 'host-project-root-hint' },
      markerOrigin('package-json-marker', workspaceRoot, 'package.json'),
    ]);

    const provenance = runtime.workspace.store.read(project.admissionProvenanceHandle);
    expect(evidenceRecordsForProvenance(runtime, provenance)).toEqual([
      expect.objectContaining({ evidenceKind: 'external', addressHandle: null }),
      expect.objectContaining({ evidenceKind: 'source-observation' }),
    ]);
  });

  test('rejects same-store project-key reuse when a policy origin belongs to a different root', async () => {
    const workspaceRoot = await createWorkspace();
    const firstRoot = path.join(workspaceRoot, 'first');
    const secondRoot = path.join(workspaceRoot, 'second');
    await Promise.all([
      mkdir(firstRoot, { recursive: true }),
      mkdir(secondRoot, { recursive: true }),
    ]);
    const store = new KernelStore('project-root-admission-root-identity');
    const projectInputAuthority = new SemanticRuntimeProjectInputAuthority();

    bootWorkspace({
      rootDir: workspaceRoot,
      store,
      projects: [{ projectKey: 'same-project', rootDir: firstRoot, sourceFiles: [] }],
      projectInputAuthority,
    });
    expect(() => bootWorkspace({
      rootDir: workspaceRoot,
      store,
      projects: [{ projectKey: 'same-project', rootDir: secondRoot, sourceFiles: [] }],
      projectInputAuthority,
    })).toThrow("Kernel store already contains a different project-root admission for 'same-project'");
  });

  test('reads jsconfig roots and gives same-root tsconfig precedence without invalid-config fallback', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', JSON.stringify({ name: 'workspace' }));

    const jsconfigRoot = path.join(workspaceRoot, 'projects', 'jsconfig');
    const jsconfigSource = await writeWorkspaceFile(
      jsconfigRoot,
      'src/included.js',
      'export const included = true;\n',
    );
    await writeWorkspaceFile(jsconfigRoot, 'src/excluded.js', 'export const excluded = true;\n');
    await writeWorkspaceFile(jsconfigRoot, 'jsconfig.json', JSON.stringify({
      compilerOptions: { checkJs: true },
      include: ['src/included.js'],
    }));

    const bothRoot = path.join(workspaceRoot, 'projects', 'both');
    const tsconfigSource = await writeWorkspaceFile(
      bothRoot,
      'src/from-tsconfig.ts',
      'export const fromTsconfig = true;\n',
    );
    await writeWorkspaceFile(bothRoot, 'src/from-jsconfig.js', 'export const fromJsconfig = true;\n');
    await writeWorkspaceFile(bothRoot, 'tsconfig.json', '{"include":["src/from-tsconfig.ts"]}');
    await writeWorkspaceFile(bothRoot, 'jsconfig.json', '{"include":["src/from-jsconfig.js"]}');

    const invalidTsconfigRoot = path.join(workspaceRoot, 'projects', 'invalid-tsconfig');
    await writeWorkspaceFile(invalidTsconfigRoot, 'src/from-jsconfig.js', 'export const fromJsconfig = true;\n');
    await writeWorkspaceFile(invalidTsconfigRoot, 'tsconfig.json', '{');
    await writeWorkspaceFile(invalidTsconfigRoot, 'jsconfig.json', '{"include":["src/from-jsconfig.js"]}');

    const runtime = await createSemanticRuntime({ workspaceRoot });
    const jsconfigProject = projectForRoot(runtime, jsconfigRoot);
    expect(path.normalize(jsconfigProject.compilerOptions.configFilePath!))
      .toBe(path.normalize(path.join(jsconfigRoot, 'jsconfig.json')));
    expect(jsconfigProject.compilerOptions.options).toMatchObject({
      allowJs: true,
      checkJs: true,
      maxNodeModuleJsDepth: 2,
    });
    expect(normalizedSorted(jsconfigProject.compilerOptions.rootFileNames ?? [])).toEqual([
      path.normalize(jsconfigSource),
    ]);

    const bothProject = projectForRoot(runtime, bothRoot);
    expect(path.normalize(bothProject.compilerOptions.configFilePath!))
      .toBe(path.normalize(path.join(bothRoot, 'tsconfig.json')));
    expect(normalizedSorted(bothProject.compilerOptions.rootFileNames ?? [])).toEqual([
      path.normalize(tsconfigSource),
    ]);

    const invalidTsconfigProject = projectForRoot(runtime, invalidTsconfigRoot);
    expect(path.normalize(invalidTsconfigProject.compilerOptions.configFilePath!))
      .toBe(path.normalize(path.join(invalidTsconfigRoot, 'tsconfig.json')));
    expect(invalidTsconfigProject.compilerOptions.diagnostics).not.toHaveLength(0);
    expect(invalidTsconfigProject.compilerOptions.rootFileNames).toBeNull();
  });

  test('keeps the existing discovery envelope and lets explicit modes override automatic marker discovery', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', JSON.stringify({ name: 'workspace' }));
    const nativeRoot = path.join(workspaceRoot, 'projects', 'native');
    const excludedRoot = path.join(workspaceRoot, 'projects', 'excluded');
    const prunedRoot = path.join(workspaceRoot, 'dist', 'nested');
    await writeWorkspaceFile(nativeRoot, 'aurelia.project.json', '{"version":1}');
    await writeWorkspaceFile(excludedRoot, 'aurelia.project.json', '{"version":1}');
    await writeWorkspaceFile(prunedRoot, 'aurelia.project.json', '{"version":1}');

    const discovered = await createSemanticRuntime({
      workspaceRoot,
      excludedWorkspaceRoots: [excludedRoot],
    });
    expect(projectRoots(discovered)).toEqual(normalizedSorted([workspaceRoot, nativeRoot]));

    const prunedAsWorkspace = await createSemanticRuntime({ workspaceRoot: prunedRoot });
    expect(projectRoots(prunedAsWorkspace)).toEqual([path.normalize(prunedRoot)]);
    expect(prunedAsWorkspace.workspace.projects[0]?.projectConfiguration.exists).toBe(true);

    const singleRoot = await createSemanticRuntime({
      workspaceRoot,
      projectDiscovery: 'single-root',
    });
    expect(projectRoots(singleRoot)).toEqual([path.normalize(workspaceRoot)]);
    expect(singleRoot.workspace.projects[0]?.projectConfiguration.exists).toBe(false);

    const explicit = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    expect(projectRoots(explicit)).toEqual([path.normalize(workspaceRoot)]);
    expect(explicit.workspace.projects[0]?.projectConfiguration.exists).toBe(false);
  });

  test('merges existing host root hints into discovery without surrendering fallback or exclusion authority', async () => {
    const workspaceRoot = await createWorkspace();
    const fallbackSource = await writeWorkspaceFile(
      workspaceRoot,
      'src/root.ts',
      'export const root = true;\n',
    );
    const markerlessRoot = path.join(workspaceRoot, 'dist', 'markerless-app');
    const markerlessSource = await writeWorkspaceFile(
      markerlessRoot,
      'src/main.ts',
      'export const markerless = true;\n',
    );
    const prunedChildRoot = path.join(markerlessRoot, 'packages', 'child');
    await writeWorkspaceFile(prunedChildRoot, 'package.json', '{"name":"pruned-child"}');
    const prunedChildSource = await writeWorkspaceFile(
      prunedChildRoot,
      'src/main.ts',
      'export const prunedChild = true;\n',
    );
    const deepRoot = path.join(workspaceRoot, 'deep', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight');
    const deepSource = await writeWorkspaceFile(
      deepRoot,
      'src/main.ts',
      'export const deep = true;\n',
    );
    const deepChildRoot = path.join(deepRoot, 'packages', 'child');
    await writeWorkspaceFile(deepChildRoot, 'tsconfig.json', '{}');
    const deepChildSource = await writeWorkspaceFile(
      deepChildRoot,
      'src/main.ts',
      'export const deepChild = true;\n',
    );
    const excludedRoot = path.join(workspaceRoot, 'disabled');
    await writeWorkspaceFile(excludedRoot, 'src/main.ts', 'export const disabled = true;\n');

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projectRootHints: [
        path.relative(workspaceRoot, markerlessRoot),
        markerlessRoot,
        deepRoot,
        excludedRoot,
      ],
      excludedWorkspaceRoots: [excludedRoot],
    });

    expect(projectRoots(runtime)).toEqual(normalizedSorted([
      workspaceRoot,
      markerlessRoot,
      prunedChildRoot,
      deepRoot,
      deepChildRoot,
    ]));
    expect(authoredProjectRootsFor(runtime, fallbackSource)).toEqual([path.normalize(workspaceRoot)]);
    expect(authoredProjectRootsFor(runtime, markerlessSource)).toEqual([path.normalize(markerlessRoot)]);
    expect(authoredProjectRootsFor(runtime, prunedChildSource)).toEqual([path.normalize(prunedChildRoot)]);
    expect(authoredProjectRootsFor(runtime, deepSource)).toEqual([path.normalize(deepRoot)]);
    expect(authoredProjectRootsFor(runtime, deepChildSource)).toEqual([path.normalize(deepChildRoot)]);

    expect(projectForRoot(runtime, workspaceRoot).admissionOrigins).toEqual([
      { kind: 'workspace-root-fallback' },
    ]);
    expect(projectForRoot(runtime, markerlessRoot).admissionOrigins).toEqual([
      { kind: 'host-project-root-hint' },
    ]);
    expect(projectForRoot(runtime, prunedChildRoot).admissionOrigins).toEqual([
      markerOrigin('package-json-marker', prunedChildRoot, 'package.json', markerlessRoot),
    ]);
    expect(projectForRoot(runtime, deepRoot).admissionOrigins).toEqual([
      { kind: 'host-project-root-hint' },
    ]);
    expect(projectForRoot(runtime, deepChildRoot).admissionOrigins).toEqual([
      markerOrigin('tsconfig-json-marker', deepChildRoot, 'tsconfig.json', deepRoot),
    ]);

    const fallbackProvenance = runtime.workspace.store.read(
      projectForRoot(runtime, workspaceRoot).admissionProvenanceHandle,
    );
    const hintProvenance = runtime.workspace.store.read(
      projectForRoot(runtime, markerlessRoot).admissionProvenanceHandle,
    );
    expect(evidenceRecordsForProvenance(runtime, fallbackProvenance)).toEqual([
      expect.objectContaining({ evidenceKind: 'semantic-observation', addressHandle: null }),
    ]);
    expect(evidenceRecordsForProvenance(runtime, hintProvenance)).toEqual([
      expect.objectContaining({ evidenceKind: 'external', addressHandle: null }),
    ]);
  });

  test('rejects unusable automatic root hints while explicit and single-root inputs remain authoritative', async () => {
    const workspaceRoot = await createWorkspace();
    const markerlessRoot = path.join(workspaceRoot, 'markerless');
    await writeWorkspaceFile(markerlessRoot, 'src/main.ts', 'export const markerless = true;\n');
    const absentRoot = path.join(workspaceRoot, 'absent');
    const outsideRoot = path.join(path.dirname(workspaceRoot), `${path.basename(workspaceRoot)}-outside`);

    await expect(createSemanticRuntime({
      workspaceRoot,
      projectRootHints: [absentRoot],
    })).rejects.toThrow(`Project root hint '${path.resolve(absentRoot)}' does not exist or is not a directory.`);
    await expect(createSemanticRuntime({
      workspaceRoot,
      projectRootHints: [outsideRoot],
    })).rejects.toThrow(`Project root hint '${path.resolve(outsideRoot)}' must be inside semantic-runtime workspace`);

    const singleRoot = await createSemanticRuntime({
      workspaceRoot,
      projectDiscovery: 'single-root',
      projectRootHints: [markerlessRoot],
    });
    expect(projectRoots(singleRoot)).toEqual([path.normalize(workspaceRoot)]);
    expect(singleRoot.workspace.projects[0]?.admissionOrigins).toEqual([{ kind: 'single-root' }]);

    const explicit = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectRootHints: [markerlessRoot],
    });
    expect(projectRoots(explicit)).toEqual([path.normalize(workspaceRoot)]);
    expect(explicit.workspace.projects[0]?.admissionOrigins).toEqual([{ kind: 'explicit-project' }]);

    const sharedAuthority = new SemanticRuntimeProjectInputAuthority();
    const sharedSingleRoot = await createSemanticRuntime({
      workspaceRoot,
      projectDiscovery: 'single-root',
      projectInputAuthority: sharedAuthority,
    });
    const sharedExplicit = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: sharedAuthority,
    });
    expect(sharedSingleRoot.workspace.projects[0]?.admissionProvenanceHandle)
      .toBe(sharedExplicit.workspace.projects[0]?.admissionProvenanceHandle);
    expect(sharedSingleRoot.workspace.projects[0]?.observedRevision)
      .not.toBe(sharedExplicit.workspace.projects[0]?.observedRevision);
  });
});

type OpenRuntime = Awaited<ReturnType<typeof createSemanticRuntime>>;

function projectRoots(runtime: OpenRuntime): readonly string[] {
  return normalizedSorted(runtime.workspace.projects.map((project) => project.rootDir));
}

function authoredProjectRootsFor(runtime: OpenRuntime, sourceFile: string): readonly string[] {
  return runtime.workspace.projects
    .filter((project) => project.authoredSources.contains(sourceFile))
    .map((project) => path.normalize(project.rootDir));
}

function projectForRoot(runtime: OpenRuntime, rootDir: string): OpenRuntime['workspace']['projects'][number] {
  const normalizedRoot = path.normalize(rootDir);
  const project = runtime.workspace.projects.find((candidate) => path.normalize(candidate.rootDir) === normalizedRoot);
  if (project == null) {
    throw new Error(`Expected project root '${normalizedRoot}'.`);
  }
  return project;
}

function normalizedSorted(paths: readonly string[]): readonly string[] {
  return paths.map((entry) => path.normalize(entry)).sort((left, right) => left.localeCompare(right));
}

function markerOrigin(
  kind: 'package-json-marker' | 'tsconfig-json-marker' | 'jsconfig-json-marker' | 'aurelia-project-json-marker',
  rootDir: string,
  fileName: string,
  viaProjectRootHintDir: string | null = null,
) {
  return {
    kind,
    sourceFilePath: path.normalize(path.join(rootDir, fileName)),
    viaProjectRootHintDir: viaProjectRootHintDir == null ? null : path.normalize(viaProjectRootHintDir),
  } as const;
}

function canonicalPath(fileName: string): string {
  return path.resolve(fileName).replace(/\\/g, '/').toLowerCase();
}

function evidenceRecordsForProvenance(
  runtime: OpenRuntime,
  provenance: ReturnType<OpenRuntime['workspace']['store']['read']>,
) {
  if (provenance?.kind !== 'provenance-record') {
    throw new Error('Expected project-root admission provenance.');
  }
  return provenance.evidenceHandles.map((handle) => runtime.workspace.store.read(handle));
}

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'aurelia-project-discovery-'));
  temporaryRoots.push(root);
  return root;
}

async function writeWorkspaceFile(rootDir: string, relativePath: string, text: string): Promise<string> {
  const fileName = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fileName), { recursive: true });
  await writeFile(fileName, text, 'utf8');
  return fileName;
}
