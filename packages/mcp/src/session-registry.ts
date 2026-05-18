import path from 'node:path';
import {
  createSemanticRuntime,
  type SemanticRuntimeAnalysisCacheClearRequest,
  type SemanticRuntimeAnalysisCacheOverviewRequest,
  type SemanticRuntimeAnalysisCacheClearResult,
  type SemanticRuntimeAnalysisCacheOverviewResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntime,
  type SemanticRuntimeOptions,
} from '@aurelia-ls/semantic-runtime';

export class SemanticRuntimeSessionRegistry {
  private readonly sessions = new Map<string, SemanticRuntimeSessionEntry>();

  async runtime(options: SemanticRuntimeOptions): Promise<SemanticRuntime> {
    const normalized = normalizeRuntimeOptions(options);
    const key = runtimeSessionKey(normalized);
    const existing = this.sessions.get(key);
    if (existing != null) {
      return existing.runtime;
    }

    const opened = createSemanticRuntime(normalized).catch((error: unknown) => {
      if (this.sessions.get(key)?.runtime === opened) {
        this.sessions.delete(key);
      }
      throw error;
    });
    this.sessions.set(key, {
      key,
      options: normalized,
      runtime: opened,
    });
    return opened;
  }

  clear(options?: SemanticRuntimeOptions): number {
    if (options == null) {
      const count = this.sessions.size;
      this.sessions.clear();
      return count;
    }
    return this.sessions.delete(runtimeSessionKey(normalizeRuntimeOptions(options))) ? 1 : 0;
  }

  async clearAnalysisCache(
    options?: SemanticRuntimeOptions,
    request: SemanticRuntimeAnalysisCacheClearRequest = {},
  ): Promise<SemanticRuntimeSessionRegistryClearResult> {
    const selectedKey = options == null ? null : runtimeSessionKey(normalizeRuntimeOptions(options));
    const entries = [...this.sessions.values()]
      .filter((entry) => selectedKey == null || entry.key === selectedKey);
    const sessions = await Promise.all(entries.map((entry) => sessionClearResult(entry, request)));
    const disposedCachedApps = sessions.reduce(
      (total, session) => total + (session.analysisCacheClear?.value.disposedCachedApps ?? 0),
      0,
    );
    const disposedKernelRecords = sessions.reduce(
      (total, session) => total + (session.analysisCacheClear?.value.disposedKernelRecords ?? 0),
      0,
    );
    const clearedTypeSystemDependencySourceFiles = sessions.reduce(
      (total, session) => total + (session.analysisCacheClear?.value.clearedTypeSystemDependencySourceFiles ?? 0),
      0,
    );
    const clearedTypeSystemDependencySourceTextCharacters = sessions.reduce(
      (total, session) => total + (session.analysisCacheClear?.value.clearedTypeSystemDependencySourceTextCharacters ?? 0),
      0,
    );
    return {
      totalSessions: this.sessions.size,
      matchingSessions: sessions.length,
      typeSystemDependencyCacheClearPolicy: request.typeSystemDependencyCacheClearPolicy ?? 'preserve',
      disposedCachedApps,
      disposedKernelRecords,
      clearedTypeSystemDependencySourceFiles,
      clearedTypeSystemDependencySourceTextCharacters,
      sessions,
      summary:
        `Cleared analysis cache for ${sessions.length} semantic-runtime session(s), ` +
        `disposing ${disposedCachedApps} cached app epoch(s), ${disposedKernelRecords} kernel record(s), and ` +
        `${clearedTypeSystemDependencySourceFiles} TypeScript dependency cache file(s) ` +
        `(${clearedTypeSystemDependencySourceTextCharacters} source-text character(s)) using policy ` +
        `'${request.typeSystemDependencyCacheClearPolicy ?? 'preserve'}'.`,
    };
  }

  async overview(
    options?: SemanticRuntimeOptions,
    cacheRequest: SemanticRuntimeAnalysisCacheOverviewRequest = {},
  ): Promise<SemanticRuntimeSessionRegistryOverview> {
    const selectedKey = options == null ? null : runtimeSessionKey(normalizeRuntimeOptions(options));
    const entries = [...this.sessions.values()]
      .filter((entry) => selectedKey == null || entry.key === selectedKey);
    const sessions = await Promise.all(entries.map((entry) => sessionSummary(entry, cacheRequest)));
    return {
      totalSessions: this.sessions.size,
      matchingSessions: sessions.length,
      sessions,
      summary: `MCP server has ${this.sessions.size} cached semantic-runtime session(s); ${sessions.length} match the requested selector.`,
    };
  }
}

interface SemanticRuntimeSessionEntry {
  readonly key: string;
  readonly options: SemanticRuntimeOptions;
  readonly runtime: Promise<SemanticRuntime>;
}

export interface SemanticRuntimeSessionSummary {
  readonly workspaceRoot: string;
  readonly storeKey: string | null;
  readonly projectDiscovery: SemanticRuntimeOptions['projectDiscovery'] | null;
  readonly projectCount: number | null;
  readonly projectKeys: readonly (string | null)[] | null;
  readonly runtimeState: 'ready' | 'failed';
  readonly analysisCache: SemanticRuntimeAnswer<SemanticRuntimeAnalysisCacheOverviewResult> | null;
  readonly failureSummary: string | null;
}

export interface SemanticRuntimeSessionRegistryOverview {
  readonly totalSessions: number;
  readonly matchingSessions: number;
  readonly sessions: readonly SemanticRuntimeSessionSummary[];
  readonly summary: string;
}

export interface SemanticRuntimeSessionClearSummary {
  readonly workspaceRoot: string;
  readonly storeKey: string | null;
  readonly projectDiscovery: SemanticRuntimeOptions['projectDiscovery'] | null;
  readonly projectCount: number | null;
  readonly projectKeys: readonly (string | null)[] | null;
  readonly runtimeState: 'ready' | 'failed';
  readonly analysisCacheClear: SemanticRuntimeAnswer<SemanticRuntimeAnalysisCacheClearResult> | null;
  readonly failureSummary: string | null;
}

export interface SemanticRuntimeSessionRegistryClearResult {
  readonly totalSessions: number;
  readonly matchingSessions: number;
  readonly typeSystemDependencyCacheClearPolicy: NonNullable<SemanticRuntimeAnalysisCacheClearRequest['typeSystemDependencyCacheClearPolicy']>;
  readonly disposedCachedApps: number;
  readonly disposedKernelRecords: number;
  readonly clearedTypeSystemDependencySourceFiles: number;
  readonly clearedTypeSystemDependencySourceTextCharacters: number;
  readonly sessions: readonly SemanticRuntimeSessionClearSummary[];
  readonly summary: string;
}

export function normalizeRuntimeOptions(options: SemanticRuntimeOptions): SemanticRuntimeOptions {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  return {
    ...options,
    workspaceRoot,
    projects: options.projects?.map((project) => ({
      ...project,
      rootDir: path.isAbsolute(project.rootDir)
        ? path.resolve(project.rootDir)
        : path.resolve(workspaceRoot, project.rootDir),
    })),
  };
}

function runtimeSessionKey(options: SemanticRuntimeOptions): string {
  return JSON.stringify({
    workspaceRoot: options.workspaceRoot,
    storeKey: options.storeKey ?? null,
    projectDiscovery: options.projectDiscovery ?? null,
    projects: options.projects ?? null,
  });
}

async function sessionSummary(
  entry: SemanticRuntimeSessionEntry,
  cacheRequest: SemanticRuntimeAnalysisCacheOverviewRequest,
): Promise<SemanticRuntimeSessionSummary> {
  try {
    const runtime = await entry.runtime;
    return {
      workspaceRoot: entry.options.workspaceRoot,
      storeKey: entry.options.storeKey ?? null,
      projectDiscovery: entry.options.projectDiscovery ?? null,
      projectCount: entry.options.projects?.length ?? null,
      projectKeys: entry.options.projects?.map((project) => project.projectKey ?? null) ?? null,
      runtimeState: 'ready',
      analysisCache: runtime.analysisCacheOverview(cacheRequest),
      failureSummary: null,
    };
  } catch (error) {
    return {
      workspaceRoot: entry.options.workspaceRoot,
      storeKey: entry.options.storeKey ?? null,
      projectDiscovery: entry.options.projectDiscovery ?? null,
      projectCount: entry.options.projects?.length ?? null,
      projectKeys: entry.options.projects?.map((project) => project.projectKey ?? null) ?? null,
      runtimeState: 'failed',
      analysisCache: null,
      failureSummary: error instanceof Error ? error.message : String(error),
    };
  }
}

async function sessionClearResult(
  entry: SemanticRuntimeSessionEntry,
  request: SemanticRuntimeAnalysisCacheClearRequest,
): Promise<SemanticRuntimeSessionClearSummary> {
  try {
    const runtime = await entry.runtime;
    return {
      workspaceRoot: entry.options.workspaceRoot,
      storeKey: entry.options.storeKey ?? null,
      projectDiscovery: entry.options.projectDiscovery ?? null,
      projectCount: entry.options.projects?.length ?? null,
      projectKeys: entry.options.projects?.map((project) => project.projectKey ?? null) ?? null,
      runtimeState: 'ready',
      analysisCacheClear: runtime.clearAnalysisCache(request),
      failureSummary: null,
    };
  } catch (error) {
    return {
      workspaceRoot: entry.options.workspaceRoot,
      storeKey: entry.options.storeKey ?? null,
      projectDiscovery: entry.options.projectDiscovery ?? null,
      projectCount: entry.options.projects?.length ?? null,
      projectKeys: entry.options.projects?.map((project) => project.projectKey ?? null) ?? null,
      runtimeState: 'failed',
      analysisCacheClear: null,
      failureSummary: error instanceof Error ? error.message : String(error),
    };
  }
}
