import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SourceFileRole, SourceSpanAddress, SourceSpanRole } from '../src/kernel/address.js';
import {
  ComputationCommitState,
  ComputationLifecycleRegistry,
} from '../src/kernel/computation-lifecycle.js';
import {
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
} from '../src/kernel/project-input.js';
import { KernelPublicationPlan } from '../src/kernel/publication.js';
import { KernelStore, KernelStoreBatch } from '../src/kernel/store.js';
import { TypeSystemProgramSourceAuthority } from '../src/type-system/program-source-authority.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('TypeSystem program-source retention', () => {
  test('preserves shared identities borrowed by an active project and forgets retired path loci', () => {
    const store = new KernelStore('type-system-program-source-active-project-retention');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const sources = new TypeSystemProgramSourceAuthority(store, lifecycle, 'workspace');
    const sharedPath = path.resolve('node_modules/shared/index.d.ts');
    const retiredPath = path.resolve('node_modules/retired/index.d.ts');
    const activePath = path.resolve('node_modules/active/index.d.ts');

    const retiredGeneration = sources.forProjectGeneration('retired-project', 'generation:retired');
    const activeGeneration = sources.forProjectGeneration('active-project', 'generation:active');
    const sharedFromRetiredProject = retiredGeneration.sourceFile(
      store,
      'retired-project',
      sharedPath,
      SourceFileRole.Declaration,
    );
    const sharedFromActiveProject = activeGeneration.sourceFile(
      store,
      'active-project',
      sharedPath,
      SourceFileRole.Declaration,
    );
    const retired = retiredGeneration.sourceFile(
      store,
      'retired-project',
      retiredPath,
      SourceFileRole.Declaration,
    );
    const active = activeGeneration.sourceFile(
      store,
      'active-project',
      activePath,
      SourceFileRole.Declaration,
    );

    expect(sharedFromActiveProject.address).toBe(sharedFromRetiredProject.address);
    expect(sources.readProgramSourceEntryCount()).toBe(3);
    expect(lifecycle.readEntryCount()).toBe(3);

    expect(sources.compactForActiveGenerations([activeGeneration.borrowerKey])).toMatchObject({
      retiredEntries: 1,
      retainedReferencedEntries: 0,
      remainingEntries: 2,
    });
    expect(sources.readProgramSourceEntryCount()).toBe(2);
    expect(lifecycle.readEntryCount()).toBe(2);
    expect(store.read(retired.address.handle)).toBeNull();
    expect(store.read(sharedFromActiveProject.address.handle)).toBe(sharedFromActiveProject.address);
    expect(store.read(active.address.handle)).toBe(active.address);
    expect(activeGeneration.sourceFile(
      store,
      'active-project',
      sharedPath,
      SourceFileRole.Declaration,
    ).address).toBe(sharedFromActiveProject.address);

    expect(sources.compactForActiveGenerations([])).toMatchObject({
      retiredEntries: 2,
      retainedReferencedEntries: 0,
      remainingEntries: 0,
    });
    expect(sources.readProgramSourceEntryCount()).toBe(0);
    expect(lifecycle.readEntryCount()).toBe(0);
    expect(store.read(sharedFromActiveProject.address.handle)).toBeNull();
    expect(store.read(active.address.handle)).toBeNull();

    const reopened = sources.forProjectGeneration('next-analysis-project', 'generation:next').sourceFile(
      store,
      'next-analysis-project',
      sharedPath,
      SourceFileRole.Declaration,
    );
    expect(reopened.address).not.toBe(sharedFromActiveProject.address);
    expect(reopened.address.handle).toBe(sharedFromActiveProject.address.handle);
  });

  test('bounds dependency paths across sustained Program replacement while the logical project stays active', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'aurelia-ls-program-source-generation-churn-'));
    const sourcePath = path.join(root, 'entry.ts');
    try {
      writeFileSync(sourcePath, 'export const revision = 0;', 'utf8');
      const runtime = await createSemanticRuntime({
        workspaceRoot: root,
        storeKey: `test:type-system-program-source-generation-churn:${path.basename(root)}`,
        projects: [{
          projectKey: 'app',
          rootDir: root,
          sourceFiles: [{ path: 'entry.ts', role: SourceFileRole.AppSource }],
        }],
      });
      let activeComputationLoci: number | null = null;

      for (let revision = 0; revision < 24; revision += 1) {
        if (revision > 0) {
          writeFileSync(sourcePath, `export const revision = ${revision};`, 'utf8');
          runtime.workspace.projectInputAuthority.advance([new SemanticRuntimeProjectInputChange(
            SemanticRuntimeProjectInputChangeKind.FileValue,
            sourcePath,
          )]);
        }
        const app = await runtime.openApp({ projectKey: 'app' });
        const typeSystem = app.emission.typeSystem;
        typeSystem.programSources.sourceFile(
          runtime.workspace.store,
          'app',
          path.join(root, 'node_modules', `.dependency-revision-${revision}`, 'index.d.ts'),
          SourceFileRole.Declaration,
        );

        expect(runtime.frameworkSupport.readProgramSourceEntryCount()).toBe(1);
        activeComputationLoci ??= runtime.computationLifecycle.readEntryCount();
        expect(runtime.computationLifecycle.readEntryCount()).toBe(activeComputationLoci);
      }

      expect(runtime.typeSystemProjects.readEntryCount()).toBe(1);
      runtime.sessionAnalysisCacheClear();
      expect(runtime.frameworkSupport.readProgramSourceEntryCount()).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);

  test('bounds dependency-path and computation-locus churn at session analysis-cache clear', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/computed-decorator-contexts');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:type-system-program-source-session-compaction',
    });
    const projectKey = runtime.workspace.projects[0]!.projectKey;
    const baselineComputationLoci = runtime.computationLifecycle.readEntryCount();
    const baselineKernelRecords = runtime.workspace.store.readTelemetrySnapshot({
      includeBreakdowns: false,
    }).totalRecords;
    const churnPaths = Array.from({ length: 128 }, (_, index) =>
      path.join(fixtureRoot, 'node_modules', `.dependency-revision-${index}`, 'index.d.ts')
    );

    for (const dependencyPath of churnPaths) {
      runtime.frameworkSupport.sourceFile(
        runtime.workspace.store,
        projectKey,
        dependencyPath,
        SourceFileRole.Declaration,
      );
    }
    expect(runtime.frameworkSupport.readProgramSourceEntryCount()).toBe(churnPaths.length);
    expect(runtime.computationLifecycle.readEntryCount()).toBe(baselineComputationLoci + churnPaths.length);

    runtime.sessionAnalysisCacheClear();

    expect(runtime.frameworkSupport.readProgramSourceEntryCount()).toBe(0);
    expect(runtime.computationLifecycle.readEntryCount()).toBe(baselineComputationLoci);
    expect(runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false }).totalRecords)
      .toBe(baselineKernelRecords);
  });

  test('forgets a checker source whose publication was already withdrawn by an enclosing store lifetime', () => {
    const store = new KernelStore('type-system-program-source-prior-store-disposal');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const sources = new TypeSystemProgramSourceAuthority(store, lifecycle, 'workspace');
    const analysisMarker = store.markLifetime();
    const source = sources.sourceFile(
      store,
      'app',
      path.resolve('node_modules/typescript/lib/lib.es5.d.ts'),
      SourceFileRole.Declaration,
    );

    store.disposeSince(analysisMarker);
    expect(store.read(source.address.handle)).toBeNull();
    expect(sources.readProgramSourceEntryCount()).toBe(1);
    expect(lifecycle.readEntryCount()).toBe(1);

    expect(sources.compactForActiveGenerations([])).toMatchObject({
      retiredEntries: 1,
      retainedReferencedEntries: 0,
      remainingEntries: 0,
    });
    expect(sources.readProgramSourceEntryCount()).toBe(0);
    expect(lifecycle.readEntryCount()).toBe(0);
  });

  test('keeps app replacement successful while another active reader retains an obsolete checker source', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'aurelia-ls-program-source-active-reader-'));
    const sourcePath = path.join(root, 'entry.ts');
    try {
      writeFileSync(sourcePath, 'export const revision = 0;', 'utf8');
      const runtime = await createSemanticRuntime({
        workspaceRoot: root,
        storeKey: `test:type-system-program-source-active-reader:${path.basename(root)}`,
        projects: [{
          projectKey: 'app',
          rootDir: root,
          sourceFiles: [{ path: 'entry.ts', role: SourceFileRole.AppSource }],
        }],
      });
      const firstApp = await runtime.openApp({ projectKey: 'app' });
      const source = firstApp.emission.typeSystem.programSources.sourceFile(
        runtime.workspace.store,
        'app',
        path.join(root, 'node_modules/dependency/index.d.ts'),
        SourceFileRole.Declaration,
      );
      const reader = runtime.computationLifecycle.begin({
        kind: 'program-source-reader',
        reconciliationKey: 'active-reader',
        summary: 'Active declaration span that structurally borrows a checker-only source.',
      });
      reader.publish(new KernelPublicationPlan(new KernelStoreBatch([
        new SourceSpanAddress(
          runtime.workspace.store.handles.address('program-source-reader:span'),
          source.address.handle,
          0,
          1,
          SourceSpanRole.Name,
        ),
      ], 'program-source-reader')));
      expect(reader.commit().state).toBe(ComputationCommitState.Committed);
      const readerAuthority = runtime.computationLifecycle.admitCommittedGeneration(
        reader.computationId,
        reader.runSequence,
        'program-source-reader',
      );

      writeFileSync(sourcePath, 'export const revision = 1;', 'utf8');
      runtime.workspace.projectInputAuthority.advance([new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        sourcePath,
      )]);
      await expect(runtime.openApp({ projectKey: 'app' })).resolves.toBeDefined();
      expect(runtime.typeSystemProjects.compactProgramSources()).toMatchObject({
        retiredEntries: 0,
        retainedReferencedEntries: 1,
        remainingEntries: 1,
      });
      expect(runtime.workspace.store.read(source.address.handle)).toBe(source.address);

      expect(runtime.computationLifecycle.retireCommittedGeneration(
        readerAuthority.computationId,
        readerAuthority.runSequence,
      )).toBe(true);
      expect(runtime.typeSystemProjects.compactProgramSources()).toMatchObject({
        retiredEntries: 1,
        retainedReferencedEntries: 0,
        remainingEntries: 0,
      });
      expect(runtime.workspace.store.read(source.address.handle)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
