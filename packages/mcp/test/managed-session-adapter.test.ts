import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SemanticRuntime,
  SemanticSourceWorldCurrentnessKind,
  type SemanticRuntimeSummary,
  type SemanticSourceFilesResult,
} from '@aurelia-ls/semantic-runtime';
import {
  AureliaMcpSemanticRuntimeAdapter,
  projectDetachedAureliaMcpResponse,
} from '../src/runtime-adapter.js';
import {
  SemanticRuntimeSessionRegistry,
  SemanticRuntimeSessionRegistryDisposedError,
  SemanticRuntimeSessionRegistryReentrantOperationError,
  type SemanticRuntimeSessionRegistryOptions,
} from '../src/session-registry.js';
import { projectAureliaMcpToolResult } from '../src/tools.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.resolve(
  packageRoot,
  '../semantic-runtime/fixtures/pressure/app-pattern-convention-minimal-app',
);
const temporaryParent = path.join(packageRoot, '.temp');
const disposables: Array<{ dispose(): Promise<void> }> = [];
const temporaryRoots: string[] = [];
let workspaceRoot = '';

beforeEach(async () => {
  await mkdir(temporaryParent, { recursive: true });
  workspaceRoot = await mkdtemp(path.join(temporaryParent, 'managed-session-test-'));
  temporaryRoots.push(workspaceRoot);
  await cp(fixtureRoot, workspaceRoot, { recursive: true });
});

afterEach(async () => {
  const disposalOutcomes = await Promise.allSettled(
    disposables.splice(0).map((disposable) => disposable.dispose()),
  );
  const removalOutcomes = await Promise.allSettled(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
  const failures = [...disposalOutcomes, ...removalOutcomes]
    .filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
    .map((outcome) => outcome.reason as unknown);
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Failed to dispose MCP test sessions or remove their temporary workspaces.');
  }
});

describe('managed MCP workspace operations', () => {
  it('reconciles added source membership without a manual cache clear', async () => {
    const adapter = managedAdapter();
    const before = await adapter.workspaceOverview(
      { workspaceRoot },
      projectDetachedAureliaMcpResponse,
    );
    const beforeRevision = before.value.analysisBasis?.sourceWorldRevision;
    expect(beforeRevision).toBeTypeOf('string');

    await writeFile(
      path.join(workspaceRoot, 'src', 'added-by-managed-mcp-test.ts'),
      'export class AddedByManagedMcpTest {}\n',
      'utf8',
    );

    const after = await adapter.workspaceOverview(
      { workspaceRoot },
      projectDetachedAureliaMcpResponse,
    );
    expect(after.value.analysisBasis?.sourceWorldRevision).not.toBe(beforeRevision);
  });

  it('runs the final projector once and surfaces typed stale when an observed source changes', async () => {
    const adapter = managedAdapter();
    const sourceFile = path.join(workspaceRoot, 'src', 'my-app.html');
    let projectorCalls = 0;

    await expect(adapter.templateDiagnostics({
      workspaceRoot,
      sourceFile: { filePath: 'src/my-app.html' },
    }, async (response) => {
      projectorCalls += 1;
      await writeFile(sourceFile, '<template>changed during projection</template>\n', 'utf8');
      return projectAureliaMcpToolResult(response);
    })).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-basis-changed',
    });
    expect(projectorCalls).toBe(1);

    await expect(adapter.templateDiagnostics(
      { workspaceRoot, sourceFile: { filePath: 'src/my-app.html' } },
      projectAureliaMcpToolResult,
    )).resolves.toMatchObject({ structuredContent: { tool: 'aurelia_template_diagnostics' } });
  });

  it('publishes one fresh MCP incarnation when a nested package marker appears during projection', async () => {
    const adapter = managedAdapter();
    const nestedRoot = path.join(workspaceRoot, 'src', 'nested-app');
    const nestedSource = path.join(nestedRoot, 'main.ts');
    const markerFile = path.join(nestedRoot, 'package.json');
    await mkdir(nestedRoot, { recursive: true });
    await writeFile(
      nestedSource,
      "import { Aurelia } from 'aurelia';\nexport const nestedApp = new Aurelia();\n",
      'utf8',
    );

    const summary = vi.spyOn(SemanticRuntime.prototype, 'summary');
    const retire = vi.spyOn(SemanticRuntime.prototype, 'retireWorkspaceIncarnation');

    try {
      const baseline = await adapter.workspaceOverview(
        { workspaceRoot, projectPage: { size: 10 } },
        projectDetachedAureliaMcpResponse,
      );
      const baselineRuntime = summary.mock.contexts.at(-1);
      const baselineSummary = baseline.value.value as SemanticRuntimeSummary;
      expect(baselineRuntime).toBeDefined();
      expect(baselineSummary.projects.map((project) => project.rootDir))
        .not.toContain(path.normalize(nestedRoot));

      let projectorCalls = 0;
      await expect(adapter.workspaceOverview(
        { workspaceRoot, projectPage: { size: 10 } },
        async (response) => {
          projectorCalls += 1;
          await writeFile(markerFile, JSON.stringify({
            name: 'managed-mcp-nested-app',
            private: true,
            type: 'module',
            dependencies: { aurelia: '^2.0.0-rc.2' },
          }), 'utf8');
          return projectDetachedAureliaMcpResponse(response);
        },
      )).rejects.toMatchObject({
        code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
        reason: 'source-world-changed',
        currentnessKind: SemanticSourceWorldCurrentnessKind.FreshBootRequired,
        previousSourceWorldRevision: baseline.value.analysisBasis?.sourceWorldRevision,
      });
      expect(projectorCalls).toBe(1);
      expect(summary.mock.contexts.at(-1)).toBe(baselineRuntime);

      const replacement = await adapter.workspaceOverview(
        { workspaceRoot, projectPage: { size: 10 } },
        projectDetachedAureliaMcpResponse,
      );
      const replacementRuntime = summary.mock.contexts.at(-1);
      expect(replacementRuntime).toBeDefined();
      expect(replacementRuntime).not.toBe(baselineRuntime);
      expect(replacement.value.analysisBasis?.sourceWorldRevision)
        .not.toBe(baseline.value.analysisBasis?.sourceWorldRevision);
      expect(new Set(summary.mock.contexts)).toEqual(new Set([baselineRuntime!, replacementRuntime!]));

      const replacementSummary = replacement.value.value as SemanticRuntimeSummary;
      const nestedProject = replacementSummary.projects.find(
        (project) => project.rootDir === path.normalize(nestedRoot),
      );
      expect(nestedProject).toMatchObject({
        rootDir: path.normalize(nestedRoot),
        admissionOrigins: [{
          kind: 'package-json-marker',
          sourceFilePath: path.normalize(markerFile),
          viaProjectRootHintDir: null,
        }],
      });

      const owned = await adapter.appQuery(
        {
          workspaceRoot,
          projectKey: nestedProject?.projectKey,
          queryKind: 'source-files',
          page: { size: 20 },
        },
        projectDetachedAureliaMcpResponse,
      );
      const ownedSources = owned.value.value as SemanticSourceFilesResult;
      expect(ownedSources.rows).toContainEqual(expect.objectContaining({
        projectKey: nestedProject?.projectKey,
        path: 'main.ts',
      }));

      const reused = await adapter.workspaceOverview(
        { workspaceRoot, projectPage: { size: 10 } },
        projectDetachedAureliaMcpResponse,
      );
      expect(summary.mock.contexts.at(-1)).toBe(replacementRuntime);
      expect(reused.value.analysisBasis?.sourceWorldRevision)
        .toBe(replacement.value.analysisBasis?.sourceWorldRevision);
      expect(retire.mock.contexts.filter((runtime) => runtime === baselineRuntime)).toHaveLength(1);
      expect(retire.mock.contexts).not.toContain(replacementRuntime);
    } finally {
      summary.mockRestore();
      retire.mockRestore();
    }
  });

  it('detaches executable receipt symbols before invoking the final MCP projector', async () => {
    const adapter = managedAdapter();
    let projectorInputSymbols = -1;
    const result = await adapter.workspaceOverview(
      { workspaceRoot },
      (response) => {
        projectorInputSymbols = countSymbols(response);
        return projectAureliaMcpToolResult(response);
      },
    );

    expect(projectorInputSymbols).toBe(0);
    expect(countSymbols(result)).toBe(0);
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result.structuredContent).toMatchObject({
      tool: 'aurelia_workspace_overview',
      workspaceRoot,
    });
  });

  it('does not boot a cache selector and keeps descriptor-distinct sessions isolated', async () => {
    const registry = managedRegistry();
    const adapter = managedAdapter(registry);
    const empty = await adapter.analysisCacheOverview(
      { workspace: { workspaceRoot } },
      projectDetachedAureliaMcpResponse,
    );
    expect(empty.value).toMatchObject({
      totalSessions: 0,
      matchingSessions: 0,
      process: { cacheScope: 'process', authority: 'semantic-runtime-process' },
    });
    const emptyClearOperations = empty.value.process.typeSystemDependencyCache.clearOperations;
    const emptyClear = await adapter.clearAnalysisCache({
      workspace: { workspaceRoot },
      typeSystemDependencyCacheClearPolicy: 'all',
    }, projectDetachedAureliaMcpResponse);
    expect(emptyClear.value).toMatchObject({
      totalSessions: 0,
      matchingSessions: 0,
      process: { authority: 'semantic-runtime-process', policy: 'all' },
    });
    const afterEmptyClear = await adapter.analysisCacheOverview(
      { workspace: { workspaceRoot } },
      projectDetachedAureliaMcpResponse,
    );
    expect(afterEmptyClear.value.totalSessions).toBe(0);
    expect(afterEmptyClear.value.matchingSessions).toBe(0);
    expect(afterEmptyClear.value.process.typeSystemDependencyCache.clearOperations)
      .toBe(emptyClearOperations + 1);

    await adapter.workspaceOverview({ workspaceRoot }, projectDetachedAureliaMcpResponse);
    await adapter.workspaceOverview({
      workspaceRoot,
      projectRootHints: [workspaceRoot],
    }, projectDetachedAureliaMcpResponse);

    let overviewProjectorSymbols = -1;
    const all = await adapter.analysisCacheOverview({}, (response) => {
      overviewProjectorSymbols = countSymbols(response);
      return projectDetachedAureliaMcpResponse(response);
    });
    expect(overviewProjectorSymbols).toBe(0);
    expect(all.value.totalSessions).toBe(2);
    expect(all.value.matchingSessions).toBe(2);
    expect(all.value.process?.cacheScope).toBe('process');
    expect(all.value.sessions.every((session) =>
      !Object.hasOwn(session.analysisCache?.value ?? {}, 'typeSystemDependencyCache')
      && !Object.hasOwn(session.analysisCache?.value ?? {}, 'processMemory')
    )).toBe(true);

    const exact = await adapter.analysisCacheOverview(
      { workspace: { workspaceRoot } },
      projectDetachedAureliaMcpResponse,
    );
    expect(exact.value.matchingSessions).toBe(1);
    expect(exact.value.sessions[0]?.workspaceDescriptor.projectTopology).toMatchObject({
      kind: 'discover',
      projectRootHints: [],
    });
    const exactClear = await adapter.clearAnalysisCache(
      { workspace: { workspaceRoot } },
      projectDetachedAureliaMcpResponse,
    );
    expect(exactClear.value.totalSessions).toBe(2);
    expect(exactClear.value.matchingSessions).toBe(1);
    expect(exactClear.value.sessions[0]?.workspaceDescriptor.projectTopology).toMatchObject({
      kind: 'discover',
      projectRootHints: [],
    });
  });

  it('applies process-global clear once and retries it after an earlier session clear fails', async () => {
    const registry = managedRegistry();
    const adapter = managedAdapter(registry);
    await adapter.workspaceOverview({ workspaceRoot }, projectDetachedAureliaMcpResponse);
    await adapter.workspaceOverview({
      workspaceRoot,
      projectRootHints: [workspaceRoot],
    }, projectDetachedAureliaMcpResponse);

    const before = await adapter.analysisCacheOverview({}, projectDetachedAureliaMcpResponse);
    const beforeClearOperations = before.value.process?.typeSystemDependencyCache.clearOperations ?? 0;
    let clearProjectorSymbols = -1;
    const firstClear = await adapter.clearAnalysisCache(
      { typeSystemDependencyCacheClearPolicy: 'all' },
      (response) => {
        clearProjectorSymbols = countSymbols(response);
        return projectDetachedAureliaMcpResponse(response);
      },
    );
    expect(clearProjectorSymbols).toBe(0);
    expect(firstClear.value.process).toMatchObject({ cacheScope: 'process', policy: 'all' });
    expect(firstClear.value.sessions.every((session) =>
      !Object.hasOwn(session.analysisCacheClear?.value ?? {}, 'typeSystemDependencyCacheClearPolicy')
      && !Object.hasOwn(session.analysisCacheClear?.value ?? {}, 'clearedTypeSystemDependencySourceFiles')
    )).toBe(true);
    const after = await adapter.analysisCacheOverview({}, projectDetachedAureliaMcpResponse);
    expect(after.value.process?.typeSystemDependencyCache.clearOperations).toBe(beforeClearOperations + 1);

    const entries = registryEntries(registry);
    const firstSession = entries[0]?.session;
    const secondSession = entries[1]?.session;
    expect(firstSession).toBeDefined();
    expect(secondSession).toBeDefined();
    vi.spyOn(firstSession!, 'clearAnalysisCache').mockRejectedValueOnce(new Error('synthetic first clear failure'));
    const secondClear = vi.spyOn(secondSession!, 'clearAnalysisCache');

    const retried = await adapter.clearAnalysisCache(
      { typeSystemDependencyCacheClearPolicy: 'all' },
      projectDetachedAureliaMcpResponse,
    );
    expect(retried.value.sessions[0]?.runtimeState).toBe('failed');
    expect(secondClear.mock.calls[0]?.[0]).toEqual({});
    expect(retried.value.process).toMatchObject({
      authority: 'semantic-runtime-process',
      policy: 'all',
    });
    const afterRetried = await adapter.analysisCacheOverview({}, projectDetachedAureliaMcpResponse);
    expect(afterRetried.value.process.typeSystemDependencyCache.clearOperations)
      .toBe(after.value.process.typeSystemDependencyCache.clearOperations + 1);
  });

  it('drains shared work before clear and disposal and rejects admission after disposal begins', async () => {
    const registry = managedRegistry();
    await writeFile(
      path.join(workspaceRoot, 'src', 'process-cache-dependency.ts'),
      "import type { CompilerOptions } from 'typescript';\nexport const compilerOptions: CompilerOptions = {};\n",
      'utf8',
    );
    await registry.run({ workspaceRoot }, async (context) => {
      await context.runtime.answerAppQuery({
        kind: 'template-diagnostics',
        sourceFile: { filePath: 'src/my-app.html' },
        inquiryProfile: 'mcp-orientation',
        typeSystemDependencyCacheClearPolicy: 'preserve',
      });
    });
    const firstReader = deferred<void>();
    const releaseFirstReader = deferred<void>();
    const active = registry.run({ workspaceRoot }, async (context) => {
      context.runtime.summary();
      firstReader.resolve();
      await releaseFirstReader.promise;
      return 'reader-complete';
    });
    await firstReader.promise;

    let clearSettled = false;
    const clear = registry.clearAnalysisCache(undefined, {}, (value) => value)
      .finally(() => { clearSettled = true; });
    await nextTurn();
    expect(clearSettled).toBe(false);
    releaseFirstReader.resolve();
    await expect(active).resolves.toBe('reader-complete');
    await expect(clear).resolves.toMatchObject({ matchingSessions: 1 });
    const beforeDisposal = await registry.overview(undefined, {}, (value) => value);
    const beforeDisposalProcessClears = beforeDisposal.process.typeSystemDependencyCache.clearOperations;
    const beforeDisposalProcessEntries = beforeDisposal.process.typeSystemDependencyCache.entries;
    expect(beforeDisposalProcessEntries).toBeGreaterThan(0);

    const secondReader = deferred<void>();
    const releaseSecondReader = deferred<void>();
    const secondActive = registry.run({ workspaceRoot }, async (context) => {
      context.runtime.summary();
      secondReader.resolve();
      await releaseSecondReader.promise;
    });
    await secondReader.promise;
    let disposalSettled = false;
    const disposal = registry.disposeAll().finally(() => { disposalSettled = true; });
    await nextTurn();
    expect(disposalSettled).toBe(false);
    expect(() => registry.run({ workspaceRoot }, () => undefined)).toThrow(
      SemanticRuntimeSessionRegistryDisposedError,
    );
    releaseSecondReader.resolve();
    await secondActive;
    await disposal;

    const emptyObserver = managedRegistry();
    const afterDisposal = await emptyObserver.overview(undefined, {}, (value) => value);
    expect(afterDisposal.totalSessions).toBe(0);
    expect(afterDisposal.process.typeSystemDependencyCache.entries).toBe(beforeDisposalProcessEntries);
    expect(afterDisposal.process.typeSystemDependencyCache.clearOperations)
      .toBe(beforeDisposalProcessClears);

    const explicitProcessClear = await emptyObserver.clearAnalysisCache(
      undefined,
      { typeSystemDependencyCacheClearPolicy: 'all' },
      (value) => value,
    );
    expect(explicitProcessClear).toMatchObject({
      totalSessions: 0,
      matchingSessions: 0,
      process: { authority: 'semantic-runtime-process', policy: 'all' },
    });
    const afterExplicitProcessClear = await emptyObserver.overview(undefined, {}, (value) => value);
    expect(afterExplicitProcessClear.process.typeSystemDependencyCache.entries).toBe(0);
    expect(afterExplicitProcessClear.process.typeSystemDependencyCache.clearOperations)
      .toBe(beforeDisposalProcessClears + 1);
  });

  it('rejects registry data and control nesting across a macrotask but admits the lineage after egress', async () => {
    const registry = managedRegistry();
    let descendant!: Promise<unknown>;
    const nestedOverviewProjector = vi.fn((value: unknown) => value);
    const nestedClearProjector = vi.fn((value: unknown) => value);

    await expect(registry.run({ workspaceRoot }, async () => {
      await nextTurn();
      await expect(registry.run({ workspaceRoot }, () => 'nested'))
        .rejects.toBeInstanceOf(SemanticRuntimeSessionRegistryReentrantOperationError);
      await expect(registry.overview(undefined, {}, nestedOverviewProjector))
        .rejects.toBeInstanceOf(SemanticRuntimeSessionRegistryReentrantOperationError);
      await expect(registry.clearAnalysisCache(undefined, {}, nestedClearProjector))
        .rejects.toBeInstanceOf(SemanticRuntimeSessionRegistryReentrantOperationError);
      await expect(registry.dispose({ workspaceRoot }))
        .rejects.toBeInstanceOf(SemanticRuntimeSessionRegistryReentrantOperationError);
      expect(() => registry.disposeAll())
        .toThrow(SemanticRuntimeSessionRegistryReentrantOperationError);
      descendant = new Promise((resolve, reject) => {
        setImmediate(() => {
          registry.overview(undefined, {}, (value) => value).then(resolve, reject);
        });
      });
      return 'outer-complete';
    })).resolves.toBe('outer-complete');

    expect(nestedOverviewProjector).not.toHaveBeenCalled();
    expect(nestedClearProjector).not.toHaveBeenCalled();
    await expect(descendant).resolves.toMatchObject({
      totalSessions: 1,
      matchingSessions: 1,
    });
  });

  it('rejects caller-owned store namespaces and project input authorities at runtime', async () => {
    const registry = managedRegistry();
    const withStoreKey = {
      workspaceRoot,
      storeKey: 'caller-owned',
    } as unknown as SemanticRuntimeSessionRegistryOptions;
    await expect(registry.run(withStoreKey, () => undefined))
      .rejects.toThrow('do not supply storeKey');

    const withProjectInputAuthority = {
      workspaceRoot,
      projectInputAuthority: {},
    } as unknown as SemanticRuntimeSessionRegistryOptions;
    await expect(registry.run(withProjectInputAuthority, () => undefined))
      .rejects.toThrow('do not supply projectInputAuthority');
  });
});

function managedRegistry(): SemanticRuntimeSessionRegistry {
  const registry = new SemanticRuntimeSessionRegistry();
  disposables.push({ dispose: () => registry.disposeAll() });
  return registry;
}

function managedAdapter(
  registry = new SemanticRuntimeSessionRegistry(),
): AureliaMcpSemanticRuntimeAdapter {
  const adapter = new AureliaMcpSemanticRuntimeAdapter(registry);
  disposables.push(adapter);
  return adapter;
}

interface SessionEntryProbe {
  readonly key: string;
  readonly descriptor: unknown;
  readonly session: {
    clearAnalysisCache: (...args: unknown[]) => Promise<unknown>;
  };
}

function registryEntries(registry: SemanticRuntimeSessionRegistry): SessionEntryProbe[] {
  const sessions = (registry as unknown as { readonly sessions: Map<string, SessionEntryProbe> }).sessions;
  return [...sessions.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function countSymbols(value: unknown, seen = new Set<object>()): number {
  if (value == null || typeof value !== 'object' || seen.has(value)) {
    return 0;
  }
  seen.add(value);
  return Object.getOwnPropertySymbols(value).length
    + Object.values(value as Record<string, unknown>)
      .reduce<number>((total, child) => total + countSymbols(child, seen), 0);
}

function deferred<TValue>() {
  let resolve!: (value: TValue | PromiseLike<TValue>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function nextTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
