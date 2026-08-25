import { AsyncLocalStorage } from 'node:async_hooks';
import {
  clearSemanticRuntimeProcessTypeSystemCache,
  ManagedSemanticWorkspaceSession,
  normalizeSemanticRuntimeOptions,
  readSemanticRuntimeMemorySample,
  semanticWorkspaceDescriptorForRuntimeOptions,
  semanticRuntimeWorkspaceDescriptorKey,
  semanticRuntimeProcessTypeSystemCacheOverview,
  type ManagedSemanticWorkspaceOperationContext,
  type ManagedSemanticWorkspaceAnalysisCacheClearOutcome,
  type ManagedSemanticWorkspaceSessionOptions,
  type SemanticRuntimeOptions,
  type SemanticRuntimeAnalysisCacheClearRequest,
  type SemanticRuntimeAnalysisCacheOverviewResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeProcessTypeSystemCacheClearResult,
  type SemanticRuntimeSessionAnalysisCacheClearRequest,
  type SemanticRuntimeSessionAnalysisCacheClearResult,
  type SemanticRuntimeSessionAnalysisCacheOverviewRequest,
  type SemanticRuntimeSessionAnalysisCacheOverviewResult,
  type SemanticWorkspaceDescriptor,
} from '@aurelia-ls/semantic-runtime';
import {
  serializeAureliaMcpError,
  type SerializedAureliaMcpError,
} from './tool-errors.js';

export type SemanticRuntimeSessionOperation<TResult> = (
  context: ManagedSemanticWorkspaceOperationContext,
  descriptor: SemanticWorkspaceDescriptor,
) => TResult | PromiseLike<TResult>;

/** Portable workspace identity accepted by MCP; process-local input authorities and store namespaces are registry-owned. */
export type SemanticRuntimeSessionRegistryOptions = Omit<
  ManagedSemanticWorkspaceSessionOptions,
  'projectInputAuthority'
>;

export type SemanticRuntimeSessionRegistryProjector<TValue, TResult> = (
  value: TValue,
  selectedDescriptor: SemanticWorkspaceDescriptor | null,
) => TResult | PromiseLike<TResult>;

export class SemanticRuntimeSessionRegistry {
  private readonly sessions = new Map<string, SemanticRuntimeSessionEntry>();
  private readonly gate = semanticRuntimeSessionRegistryGate;
  private closing = false;
  private disposal: Promise<void> | null = null;

  run<TResult>(
    options: SemanticRuntimeSessionRegistryOptions,
    operation: SemanticRuntimeSessionOperation<TResult>,
  ): Promise<TResult> {
    this.assertOpen();
    return this.gate.runShared(async () => {
      this.assertOpen();
      const entry = this.entry(options);
      return entry.session.run((context) => operation(context, entry.descriptor));
    });
  }

  overview<TResult>(
    options: SemanticRuntimeSessionRegistryOptions | undefined,
    request: SemanticRuntimeSessionAnalysisCacheOverviewRequest,
    project: SemanticRuntimeSessionRegistryProjector<SemanticRuntimeSessionRegistryOverview, TResult>,
  ): Promise<TResult> {
    this.assertOpen();
    return this.gate.runShared(async () => {
      this.assertOpen();
      const selection = this.selection(options);
      const sessions = await Promise.all(selection.entries.map((entry) => inspectSession(entry, request)));
      const process: SemanticRuntimeSessionRegistryProcessOverview = {
        cacheScope: 'process',
        authority: 'semantic-runtime-process',
        typeSystemDependencyCache: semanticRuntimeProcessTypeSystemCacheOverview({
          rowLimit: request.rowLimit,
        }),
        processMemory: readSemanticRuntimeMemorySample(),
      };
      const valueWithoutDisplayText: Omit<SemanticRuntimeSessionRegistryOverview, 'displayText'> = {
        totalSessions: this.sessions.size,
        matchingSessions: sessions.length,
        process,
        sessions,
        summary:
          `MCP server has ${this.sessions.size} managed semantic workspace session(s); `
          + `${sessions.length} match the requested selector.`,
      };
      const result = {
        ...valueWithoutDisplayText,
        displayText: semanticRuntimeSessionRegistryOverviewDisplayText(valueWithoutDisplayText),
      };
      return project(result, selection.descriptor);
    });
  }

  clearAnalysisCache<TResult>(
    options: SemanticRuntimeSessionRegistryOptions | undefined,
    request: SemanticRuntimeAnalysisCacheClearRequest,
    project: SemanticRuntimeSessionRegistryProjector<SemanticRuntimeSessionRegistryClearResult, TResult>,
  ): Promise<TResult> {
    this.assertOpen();
    return this.gate.runExclusive(async () => {
      this.assertOpen();
      const selection = this.selection(options);
      const requestedPolicy = request.typeSystemDependencyCacheClearPolicy ?? 'preserve';
      const sessions: SemanticRuntimeSessionClearSummary[] = [];

      for (const entry of selection.entries) {
        const cleared = await clearSession(entry, {});
        sessions.push(cleared.session);
      }
      const process = processClearResult(clearSemanticRuntimeProcessTypeSystemCache({
        typeSystemDependencyCacheClearPolicy: requestedPolicy,
      }));

      const disposedCachedApps = sessions.reduce(
        (total, session) => total + (session.analysisCacheClear?.value.disposedCachedApps ?? 0),
        0,
      );
      const disposedKernelRecords = sessions.reduce(
        (total, session) => total + (session.analysisCacheClear?.value.disposedKernelRecords ?? 0),
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
        typeSystemDependencyCacheClearPolicy: requestedPolicy,
        disposedCachedApps,
        disposedKernelRecords,
        remainingCachedApps,
        retainedWorkspaceKernelRecords,
        clearedTypeSystemDependencySourceFiles: process.clearedSourceFiles,
        clearedTypeSystemDependencySourceTextCharacters: process.clearedSourceTextCharacters,
        process,
        sessions,
        summary:
          `Cleared session-local analysis retention for ${sessions.length} managed semantic workspace session(s), `
          + `disposing ${disposedCachedApps} cached app epoch(s) and ${disposedKernelRecords} app-epoch kernel record(s). `
          + processClearSummary(process),
      };
      const result = {
        ...valueWithoutDisplayText,
        displayText: semanticRuntimeSessionRegistryClearDisplayText(valueWithoutDisplayText),
      };
      return project(result, selection.descriptor);
    });
  }

  dispose(options: SemanticRuntimeSessionRegistryOptions): Promise<boolean> {
    this.assertOpen();
    return this.gate.runExclusive(async () => {
      this.assertOpen();
      const normalized = normalizeManagedSessionOptions(options);
      const key = semanticRuntimeWorkspaceDescriptorKey(normalized);
      const entry = this.sessions.get(key);
      if (entry == null) {
        return false;
      }
      this.sessions.delete(key);
      await entry.session.dispose();
      return true;
    });
  }

  disposeAll(): Promise<void> {
    this.gate.assertNotReentrant('dispose all managed semantic workspace sessions');
    if (this.disposal != null) {
      return this.disposal;
    }
    this.closing = true;
    const disposal = this.gate.runExclusive(async () => {
      const entries = [...this.sessions.values()];
      this.sessions.clear();
      const outcomes = await Promise.allSettled(entries.map((entry) => entry.session.dispose()));
      const failures = outcomes
        .filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
        .map((outcome) => outcome.reason as unknown);
      if (failures.length > 0) {
        throw new AggregateError(failures, 'Failed to dispose every managed semantic workspace session.');
      }
    });
    this.disposal = disposal;
    void disposal.catch(() => {
      if (this.disposal === disposal && this.sessions.size > 0) {
        this.disposal = null;
        this.closing = false;
      }
    });
    return disposal;
  }

  private entry(options: SemanticRuntimeSessionRegistryOptions): SemanticRuntimeSessionEntry {
    const normalized = normalizeManagedSessionOptions(options);
    const key = semanticRuntimeWorkspaceDescriptorKey(normalized);
    const existing = this.sessions.get(key);
    if (existing != null) {
      return existing;
    }
    const descriptor = semanticWorkspaceDescriptorForRuntimeOptions(normalized);
    const opened: SemanticRuntimeSessionEntry = {
      key,
      options: normalized,
      descriptor,
      session: new ManagedSemanticWorkspaceSession(normalized),
    };
    this.sessions.set(key, opened);
    return opened;
  }

  private selection(options: SemanticRuntimeSessionRegistryOptions | undefined): SemanticRuntimeSessionSelection {
    if (options == null) {
      return {
        descriptor: null,
        entries: [...this.sessions.values()].sort(compareSessionEntries),
      };
    }
    const normalized = normalizeManagedSessionOptions(options);
    const descriptor = semanticWorkspaceDescriptorForRuntimeOptions(normalized);
    const selected = this.sessions.get(semanticRuntimeWorkspaceDescriptorKey(normalized));
    return {
      descriptor,
      entries: selected == null ? [] : [selected],
    };
  }

  private assertOpen(): void {
    if (this.closing) {
      throw new SemanticRuntimeSessionRegistryDisposedError();
    }
  }
}

interface SemanticRuntimeSessionEntry {
  readonly key: string;
  readonly options: SemanticRuntimeSessionRegistryOptions;
  readonly descriptor: SemanticWorkspaceDescriptor;
  readonly session: ManagedSemanticWorkspaceSession;
}

interface SemanticRuntimeSessionSelection {
  readonly descriptor: SemanticWorkspaceDescriptor | null;
  readonly entries: readonly SemanticRuntimeSessionEntry[];
}

export interface SemanticRuntimeSessionSummary {
  readonly workspaceDescriptor: SemanticWorkspaceDescriptor;
  readonly runtimeState: 'ready' | 'failed';
  readonly analysisCache: SemanticRuntimeAnswer<SemanticRuntimeSessionAnalysisCacheOverviewResult> | null;
  readonly failure: SerializedAureliaMcpError | null;
  readonly failureSummary: string | null;
}

export interface SemanticRuntimeSessionRegistryProcessOverview {
  readonly cacheScope: 'process';
  readonly authority: 'semantic-runtime-process';
  readonly typeSystemDependencyCache: SemanticRuntimeAnalysisCacheOverviewResult['typeSystemDependencyCache'];
  readonly processMemory: SemanticRuntimeAnalysisCacheOverviewResult['processMemory'];
}

export interface SemanticRuntimeSessionRegistryOverview {
  readonly totalSessions: number;
  readonly matchingSessions: number;
  readonly process: SemanticRuntimeSessionRegistryProcessOverview;
  readonly sessions: readonly SemanticRuntimeSessionSummary[];
  readonly displayText: string;
  readonly summary: string;
}

export interface SemanticRuntimeSessionClearSummary {
  readonly workspaceDescriptor: SemanticWorkspaceDescriptor;
  readonly runtimeState: 'ready' | 'failed';
  readonly analysisCacheClear: SemanticRuntimeAnswer<SemanticRuntimeSessionAnalysisCacheClearResult> | null;
  readonly operationOutcome: ManagedSemanticWorkspaceAnalysisCacheClearOutcome | null;
  readonly failure: SerializedAureliaMcpError | null;
  readonly failureSummary: string | null;
}

export interface SemanticRuntimeSessionRegistryProcessClear {
  readonly cacheScope: 'process';
  readonly authority: 'semantic-runtime-process';
  readonly policy: NonNullable<SemanticRuntimeAnalysisCacheClearRequest['typeSystemDependencyCacheClearPolicy']>;
  readonly clearedSourceFiles: number;
  readonly clearedSourceTextCharacters: number;
  readonly clearedNodeModuleSourceFiles: number;
  readonly clearedNodeModuleSourceTextCharacters: number;
  readonly clearedDeclarationSourceFiles: number;
  readonly clearedDeclarationSourceTextCharacters: number;
  readonly clearedDefaultLibrarySourceFiles: number;
  readonly clearedDefaultLibrarySourceTextCharacters: number;
  readonly clearedExternalDeclarationSourceFiles: number;
  readonly clearedExternalDeclarationSourceTextCharacters: number;
  readonly remainingSourceFiles: number;
}

export interface SemanticRuntimeSessionRegistryClearResult {
  readonly totalSessions: number;
  readonly matchingSessions: number;
  readonly typeSystemDependencyCacheClearPolicy: NonNullable<SemanticRuntimeAnalysisCacheClearRequest['typeSystemDependencyCacheClearPolicy']>;
  readonly disposedCachedApps: number;
  readonly disposedKernelRecords: number;
  readonly remainingCachedApps: number;
  readonly retainedWorkspaceKernelRecords: number;
  /** Process-global count, reported once rather than summed across session rows. */
  readonly clearedTypeSystemDependencySourceFiles: number;
  /** Process-global count, reported once rather than summed across session rows. */
  readonly clearedTypeSystemDependencySourceTextCharacters: number;
  readonly process: SemanticRuntimeSessionRegistryProcessClear;
  readonly sessions: readonly SemanticRuntimeSessionClearSummary[];
  readonly displayText: string;
  readonly summary: string;
}

interface ClearedSession {
  readonly session: SemanticRuntimeSessionClearSummary;
}

async function inspectSession(
  entry: SemanticRuntimeSessionEntry,
  request: SemanticRuntimeSessionAnalysisCacheOverviewRequest,
): Promise<SemanticRuntimeSessionSummary> {
  try {
    return await entry.session.analysisCacheOverview(request, (answer) => {
      const sessionValue = answer.value;
      const localSummary = sessionOverviewSummary(sessionValue);
      return detachJsonValue({
        workspaceDescriptor: entry.descriptor,
        runtimeState: 'ready' as const,
        analysisCache: {
          ...answer,
          summary: localSummary,
          value: {
            ...sessionValue,
            summary: localSummary,
            displayText: localSummary,
          },
        },
        failure: null,
        failureSummary: null,
      });
    });
  } catch (error) {
    const failure = serializeAureliaMcpError(error);
    return {
      workspaceDescriptor: entry.descriptor,
      runtimeState: 'failed',
      analysisCache: null,
      failure,
      failureSummary: failure.message,
    };
  }
}

async function clearSession(
  entry: SemanticRuntimeSessionEntry,
  request: SemanticRuntimeSessionAnalysisCacheClearRequest,
): Promise<ClearedSession> {
  try {
    return await entry.session.clearAnalysisCache(request, (answer, operationOutcome) => {
      const sessionValue = answer.value;
      const localSummary = sessionClearSummary(sessionValue);
      return detachJsonValue({
        session: {
          workspaceDescriptor: entry.descriptor,
          runtimeState: 'ready' as const,
          analysisCacheClear: {
            ...answer,
            summary: localSummary,
            value: {
              ...sessionValue,
              summary: localSummary,
              displayText: localSummary,
            },
          },
          operationOutcome,
          failure: null,
          failureSummary: null,
        },
      });
    });
  } catch (error) {
    const failure = serializeAureliaMcpError(error);
    return {
      session: {
        workspaceDescriptor: entry.descriptor,
        runtimeState: 'failed',
        analysisCacheClear: null,
        operationOutcome: null,
        failure,
        failureSummary: failure.message,
      },
    };
  }
}

function processClearResult(
  result: SemanticRuntimeProcessTypeSystemCacheClearResult,
): SemanticRuntimeSessionRegistryProcessClear {
  return {
    cacheScope: 'process',
    authority: 'semantic-runtime-process',
    policy: result.typeSystemDependencyCacheClearPolicy,
    clearedSourceFiles: result.clearedTypeSystemDependencySourceFiles,
    clearedSourceTextCharacters: result.clearedTypeSystemDependencySourceTextCharacters,
    clearedNodeModuleSourceFiles: result.clearedTypeSystemDependencyNodeModuleSourceFiles,
    clearedNodeModuleSourceTextCharacters: result.clearedTypeSystemDependencyNodeModuleSourceTextCharacters,
    clearedDeclarationSourceFiles: result.clearedTypeSystemDependencyDeclarationSourceFiles,
    clearedDeclarationSourceTextCharacters: result.clearedTypeSystemDependencyDeclarationSourceTextCharacters,
    clearedDefaultLibrarySourceFiles: result.clearedTypeSystemDependencyDefaultLibrarySourceFiles,
    clearedDefaultLibrarySourceTextCharacters: result.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters,
    clearedExternalDeclarationSourceFiles: result.clearedTypeSystemDependencyExternalDeclarationSourceFiles,
    clearedExternalDeclarationSourceTextCharacters: result.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters,
    remainingSourceFiles: result.remainingTypeSystemDependencySourceFiles,
  };
}

function sessionOverviewSummary(value: SemanticRuntimeSessionAnalysisCacheOverviewResult): string {
  return `Session retains ${value.cachedAppCount} cached app epoch(s), ${value.typeSystemProjectCount} TypeScript project(s), `
    + `${value.workspaceKernel.totalRecords} workspace/app kernel record(s), and `
    + `${value.runtimeQueryClaimProfiles.length} runtime query-claim profile(s).`;
}

function sessionClearSummary(value: SemanticRuntimeSessionAnalysisCacheClearResult): string {
  return `Cleared session-local retention: disposed ${value.disposedCachedApps} cached app epoch(s), `
    + `${value.disposedKernelRecords} app-epoch kernel record(s), and ${value.disposedQueryClaimRecords} query claim(s); `
    + `${value.remainingCachedApps} cached app epoch(s) and ${value.workspaceKernel.totalRecords} workspace kernel record(s) remain.`;
}

function semanticRuntimeSessionRegistryOverviewDisplayText(
  value: Omit<SemanticRuntimeSessionRegistryOverview, 'displayText'>,
): string {
  const lines = [
    `MCP analysis retention: ${value.matchingSessions} matching managed session(s) out of ${value.totalSessions}.`,
  ];
  if (value.sessions.length === 0) {
    lines.push('Sessions: none. Open a workspace or app tool first.');
  } else {
    lines.push(`Sessions: ${value.sessions.slice(0, SESSION_REGISTRY_DISPLAY_LIMIT).map((session, index) =>
      `${index + 1}. ${session.runtimeState} ${session.workspaceDescriptor.workspaceRoot} (${workspaceTopologyLabel(session.workspaceDescriptor)}): ${session.analysisCache?.summary ?? session.failureSummary ?? 'not inspected'}`
    ).join(' | ')}${value.sessions.length > SESSION_REGISTRY_DISPLAY_LIMIT ? ` | +${value.sessions.length - SESSION_REGISTRY_DISPLAY_LIMIT} more` : ''}.`);
  }
  if (value.process != null) {
    lines.push(
      `Process-global TypeScript dependency cache: ${value.process.typeSystemDependencyCache.entries} file(s), `
      + `${value.process.typeSystemDependencyCache.sourceTextCharacters} source-text character(s).`,
    );
  }
  lines.push('Next: use detailed cache flags for attribution, or clear retained analysis when memory pressure outweighs warm reuse.');
  return lines.join('\n');
}

function semanticRuntimeSessionRegistryClearDisplayText(
  value: Omit<SemanticRuntimeSessionRegistryClearResult, 'displayText'>,
): string {
  const lines = [
    `MCP analysis retention clear: ${value.matchingSessions} matching managed session(s) out of ${value.totalSessions}; `
    + `disposed ${value.disposedCachedApps} cached app epoch(s) and ${value.disposedKernelRecords} app-epoch kernel record(s).`,
    `Remaining in selected sessions: ${value.remainingCachedApps} app epoch(s), `
    + `${value.retainedWorkspaceKernelRecords} workspace kernel record(s).`,
    'Workspace kernel records retain managed boot/source-discovery state; they are not cached app epochs.',
    processClearSummary(value.process),
  ];
  lines.push('Next: continue using workspace/app tools; managed source-world reconciliation handles source and configuration edits automatically.');
  return lines.join('\n');
}

function processClearSummary(
  process: SemanticRuntimeSessionRegistryProcessClear,
): string {
  const policyNote = process.policy === 'preserve'
    ? ' The preserve policy keeps warm TypeScript dependency/lib source files.'
    : '';
  return `Applied process-global TypeScript dependency cache policy '${process.policy}' exactly once, clearing `
    + `${process.clearedSourceFiles} file(s) and ${process.clearedSourceTextCharacters} source-text character(s).${policyNote}`;
}

function workspaceTopologyLabel(descriptor: SemanticWorkspaceDescriptor): string {
  return descriptor.projectTopology.kind === 'discover'
    ? `${descriptor.projectTopology.strategy}, hints=${descriptor.projectTopology.projectRootHints.length}, exclusions=${descriptor.excludedWorkspaceRoots.length}`
    : `explicit projects=${descriptor.projectTopology.projects.length}, exclusions=${descriptor.excludedWorkspaceRoots.length}`;
}

function compareSessionEntries(left: SemanticRuntimeSessionEntry, right: SemanticRuntimeSessionEntry): number {
  return left.key.localeCompare(right.key);
}

function normalizeManagedSessionOptions(
  options: SemanticRuntimeSessionRegistryOptions,
): SemanticRuntimeSessionRegistryOptions {
  const unchecked = options as SemanticRuntimeOptions;
  if (unchecked.storeKey !== undefined) {
    throw new TypeError('MCP semantic workspace registries own their private store namespaces; do not supply storeKey.');
  }
  if (unchecked.projectInputAuthority !== undefined) {
    throw new TypeError('MCP semantic workspace registries own their project input authority; do not supply projectInputAuthority.');
  }
  const normalized = normalizeSemanticRuntimeOptions(options);
  const {
    storeKey: _storeKey,
    projectInputAuthority: _projectInputAuthority,
    ...registryOptions
  } = normalized;
  return registryOptions;
}

function detachJsonValue<TValue>(value: TValue): TValue {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError('Managed semantic workspace control results must be JSON-serializable values.');
  }
  return JSON.parse(serialized) as TValue;
}

const SESSION_REGISTRY_DISPLAY_LIMIT = 4;

export class SemanticRuntimeSessionRegistryDisposedError extends Error {
  readonly code = 'AURELIA_MCP_SESSION_REGISTRY_DISPOSED' as const;

  constructor() {
    super('Cannot use the semantic workspace registry after disposal has begun.');
    this.name = 'SemanticRuntimeSessionRegistryDisposedError';
  }
}

export class SemanticRuntimeSessionRegistryReentrantOperationError extends Error {
  readonly code = 'AURELIA_MCP_SESSION_REGISTRY_REENTRANT_OPERATION' as const;

  constructor(readonly action: string) {
    super(`Cannot ${action} from inside an active semantic workspace registry operation.`);
    this.name = 'SemanticRuntimeSessionRegistryReentrantOperationError';
  }
}

type RegistryGateMode = 'shared' | 'exclusive';

interface RegistryGateScope {
  readonly mode: RegistryGateMode;
  active: boolean;
}

interface RegistryGateWaiter {
  readonly mode: RegistryGateMode;
  readonly resolve: () => void;
}

class RegistryOperationGate {
  private readonly scope = new AsyncLocalStorage<RegistryGateScope>();
  private readonly waiters: RegistryGateWaiter[] = [];
  private activeReaders = 0;
  private activeWriter = false;

  async runShared<TResult>(operation: () => TResult | PromiseLike<TResult>): Promise<TResult> {
    this.assertNotReentrant('start a nested shared operation');
    await this.acquire('shared');
    const scope: RegistryGateScope = { mode: 'shared', active: true };
    try {
      return await this.scope.run(scope, operation);
    } finally {
      scope.active = false;
      this.activeReaders -= 1;
      this.drain();
    }
  }

  async runExclusive<TResult>(operation: () => TResult | PromiseLike<TResult>): Promise<TResult> {
    this.assertNotReentrant('start a nested exclusive operation');
    await this.acquire('exclusive');
    const scope: RegistryGateScope = { mode: 'exclusive', active: true };
    try {
      return await this.scope.run(scope, operation);
    } finally {
      scope.active = false;
      this.activeWriter = false;
      this.drain();
    }
  }

  assertNotReentrant(action: string): void {
    if (this.scope.getStore()?.active === true) {
      throw new SemanticRuntimeSessionRegistryReentrantOperationError(action);
    }
  }

  private acquire(mode: RegistryGateMode): Promise<void> {
    if (this.canAcquireImmediately(mode)) {
      this.admit(mode);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push({ mode, resolve });
    });
  }

  private canAcquireImmediately(mode: RegistryGateMode): boolean {
    if (this.activeWriter || this.waiters.length > 0) {
      return false;
    }
    return mode === 'shared' || this.activeReaders === 0;
  }

  private admit(mode: RegistryGateMode): void {
    if (mode === 'shared') {
      this.activeReaders += 1;
    } else {
      this.activeWriter = true;
    }
  }

  private drain(): void {
    if (this.activeWriter || this.activeReaders > 0 || this.waiters.length === 0) {
      return;
    }
    if (this.waiters[0]?.mode === 'exclusive') {
      const waiter = this.waiters.shift();
      if (waiter != null) {
        this.admit(waiter.mode);
        waiter.resolve();
      }
      return;
    }
    while (this.waiters[0]?.mode === 'shared') {
      const waiter = this.waiters.shift();
      if (waiter == null) break;
      this.admit(waiter.mode);
      waiter.resolve();
    }
  }
}

const semanticRuntimeSessionRegistryGate = new RegistryOperationGate();
