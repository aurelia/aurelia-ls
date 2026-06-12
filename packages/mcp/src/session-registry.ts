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
    const remainingCachedApps = sessions.reduce(
      (total, session) => total + (session.analysisCacheClear?.value.remainingCachedApps ?? 0),
      0,
    );
    const retainedWorkspaceKernelRecords = sessions.reduce(
      (total, session) => total + (session.analysisCacheClear?.value.workspaceKernel.totalRecords ?? 0),
      0,
    );
    const valueWithoutDisplayText: Omit<SemanticRuntimeSessionRegistryClearResult, 'displayText'> = {
      totalSessions: this.sessions.size,
      matchingSessions: sessions.length,
      typeSystemDependencyCacheClearPolicy: request.typeSystemDependencyCacheClearPolicy ?? 'preserve',
      disposedCachedApps,
      disposedKernelRecords,
      remainingCachedApps,
      retainedWorkspaceKernelRecords,
      clearedTypeSystemDependencySourceFiles,
      clearedTypeSystemDependencySourceTextCharacters,
      sessions,
      summary:
        `Cleared analysis cache for ${sessions.length} semantic-runtime session(s), ` +
        `disposing ${disposedCachedApps} cached app epoch(s), ${disposedKernelRecords} app-epoch kernel record(s), and ` +
        `${clearedTypeSystemDependencySourceFiles} TypeScript dependency cache file(s) ` +
        `(${clearedTypeSystemDependencySourceTextCharacters} source-text character(s)) using policy ` +
        `'${request.typeSystemDependencyCacheClearPolicy ?? 'preserve'}'; ${remainingCachedApps} app epoch(s) and ` +
        `${retainedWorkspaceKernelRecords} workspace kernel record(s) remain in the selected runtime session(s).`,
    };
    return {
      ...valueWithoutDisplayText,
      displayText: semanticRuntimeSessionRegistryClearDisplayText(valueWithoutDisplayText),
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
    const valueWithoutDisplayText: Omit<SemanticRuntimeSessionRegistryOverview, 'displayText'> = {
      totalSessions: this.sessions.size,
      matchingSessions: sessions.length,
      sessions,
      summary: `MCP server has ${this.sessions.size} cached semantic-runtime session(s); ${sessions.length} match the requested selector.`,
    };
    return {
      ...valueWithoutDisplayText,
      displayText: semanticRuntimeSessionRegistryOverviewDisplayText(valueWithoutDisplayText),
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
  readonly displayText: string;
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
  readonly remainingCachedApps: number;
  readonly retainedWorkspaceKernelRecords: number;
  readonly clearedTypeSystemDependencySourceFiles: number;
  readonly clearedTypeSystemDependencySourceTextCharacters: number;
  readonly sessions: readonly SemanticRuntimeSessionClearSummary[];
  readonly displayText: string;
  readonly summary: string;
}

function semanticRuntimeSessionRegistryOverviewDisplayText(
  value: Omit<SemanticRuntimeSessionRegistryOverview, 'displayText'>,
): string {
  const lines = [
    `MCP analysis cache: ${value.matchingSessions} matching session(s) out of ${value.totalSessions} cached semantic-runtime session(s).`,
  ];
  if (value.sessions.length === 0) {
    lines.push('Sessions: none. Open a workspace/app tool first; pass appRetention=retain-app only when several app calls should share one app epoch.');
  } else {
    lines.push(`Sessions: ${value.sessions.slice(0, SESSION_REGISTRY_DISPLAY_LIMIT).map((session, index) =>
      `${index + 1}. ${session.runtimeState} ${session.workspaceRoot} (${session.projectDiscovery ?? 'default discovery'}): ${session.analysisCache?.summary ?? session.failureSummary ?? 'not inspected'}`
    ).join(' | ')}${value.sessions.length > SESSION_REGISTRY_DISPLAY_LIMIT ? ` | +${value.sessions.length - SESSION_REGISTRY_DISPLAY_LIMIT} more` : ''}.`);
    const cacheLines = value.sessions
      .map((session) => firstSessionAnswerDisplayLine(session.analysisCache))
      .filter((line): line is string => line != null)
      .slice(0, SESSION_REGISTRY_DISPLAY_LIMIT);
    if (cacheLines.length > 0) {
      lines.push(`Runtime cache hints: ${cacheLines.join(' | ')}.`);
    }
  }
  lines.push('Next: use includeKernelBreakdowns/includeDetailDensity for memory attribution, or aurelia_clear_analysis_cache to reclaim retained app epochs.');
  return lines.join('\n');
}

function semanticRuntimeSessionRegistryClearDisplayText(
  value: Omit<SemanticRuntimeSessionRegistryClearResult, 'displayText'>,
): string {
  const lines = [
    `MCP analysis cache clear: ${value.matchingSessions} matching session(s) out of ${value.totalSessions}; disposed ${value.disposedCachedApps} app epoch(s), ${value.disposedKernelRecords} app-epoch kernel record(s), and ${value.clearedTypeSystemDependencySourceFiles} dependency source-file cache file(s).`,
    `Remaining in selected session(s): ${value.remainingCachedApps} app epoch(s), ${value.retainedWorkspaceKernelRecords} workspace kernel record(s). Workspace kernel records are boot/source-discovery state, not cached app epochs.`,
    `Dependency clear policy: ${value.typeSystemDependencyCacheClearPolicy}; source-text characters cleared=${value.clearedTypeSystemDependencySourceTextCharacters}. The default preserve policy keeps warm TypeScript dependency/lib source files.`,
  ];
  const clearLines = value.sessions
    .map((session) => firstSessionAnswerDisplayLine(session.analysisCacheClear))
    .filter((line): line is string => line != null)
    .slice(0, SESSION_REGISTRY_DISPLAY_LIMIT);
  if (clearLines.length > 0) {
    lines.push(`Runtime clear hints: ${clearLines.join(' | ')}.`);
  }
  lines.push('Next: re-open app tools as needed; a fresh analysis-cache overview should show whether retained sessions remain.');
  return lines.join('\n');
}

function firstSessionAnswerDisplayLine(answer: SemanticRuntimeAnswer<unknown> | null): string | null {
  const answerValue = answer?.value;
  const displayText = answerValue != null
    && typeof answerValue === 'object'
    && !Array.isArray(answerValue)
    && typeof (answerValue as { readonly displayText?: unknown }).displayText === 'string'
      ? (answerValue as { readonly displayText: string }).displayText
      : null;
  if (typeof displayText !== 'string') {
    return null;
  }
  const line = displayText.split(/\r?\n/u).map((part) => part.trim()).find((part) => part.length > 0) ?? null;
  return line == null ? null : trimSessionDisplayLine(line);
}

function trimSessionDisplayLine(line: string): string {
  return line.length <= 180
    ? line
    : `${line.slice(0, 177)}...`;
}

const SESSION_REGISTRY_DISPLAY_LIMIT = 4;

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
