import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { createSourceAnalysisAuditAnswer } from '../audit.js';
import { createSourceAnalysisPaths } from '../config.js';
import { createSourceAnalysisRouteWitnessAnswer } from '../route-witness.js';
import type { SourceAnalysisAnalysisOptions } from '../analysis-options.js';
import { generateDepsAnalysis } from '../deps/analyze.js';
import { generateExportsAnalysis } from '../exports/analyze.js';
import { generateTypeRefsAnalysis } from '../typerefs/analyze.js';
import {
  SourceAnalysisHostSessionManager,
  type SourceAnalysisHostSessionState,
  sortKinds,
  toSessionStatusEntry,
} from './session-manager.js';
import {
  SOURCE_ANALYSIS_HOST_SCHEMA_VERSION,
  SOURCE_ANALYSIS_KINDS,
  type MaterializeSnapshotsArgs,
  type MaterializeSnapshotsResult,
  type QueryAuditPackageArgs,
  type QueryAuditPackageResult,
  type QueryRouteWitnessArgs,
  type QueryRouteWitnessResult,
  type QueryArgs,
  type QuerySnapshotResult,
  type QuerySummaryResult,
  type SessionCloseArgs,
  type SessionCloseResult,
  type SessionInvalidateArgs,
  type SessionInvalidateResult,
  type SessionOpenArgs,
  type SessionOpenResult,
  type SessionRefreshArgs,
  type SessionRefreshResult,
  type SessionStatusArgs,
  type SessionStatusResult,
  type SourceAnalysisHostCacheMeta,
  type SourceAnalysisHostCommandArgsMap,
  type SourceAnalysisHostCommandInvocation,
  type SourceAnalysisHostCommandName,
  type SourceAnalysisHostCommandResult,
  type SourceAnalysisHostCommandStatus,
  type SourceAnalysisHostEnvelope,
  type SourceAnalysisHostError,
  type SourceAnalysisHostInvalidationMeta,
  type SourceAnalysisKind,
  type SourceAnalysisOutputByKind,
  type SourceAnalysisSummaryByKind,
} from './types.js';

interface CommandOutcome {
  readonly status?: SourceAnalysisHostCommandStatus;
  readonly result?: unknown;
  readonly sessionId?: string;
  readonly cache?: SourceAnalysisHostCacheMeta;
  readonly refreshedKinds?: readonly SourceAnalysisKind[];
  readonly invalidation?: SourceAnalysisHostInvalidationMeta;
  readonly errors?: readonly SourceAnalysisHostError[];
}

const DEFAULT_CACHE: SourceAnalysisHostCacheMeta = { hit: false, tier: 'cold' };
const ALL_KINDS = SOURCE_ANALYSIS_KINDS;
const SOURCE_FILE_PATTERN = /(\.d\.ts|\.tsx|\.ts|\.mts|\.cts)$/i;

export class SourceAnalysisHostRuntime {
  readonly #sessions = new SourceAnalysisHostSessionManager();

  execute<TCommand extends SourceAnalysisHostCommandName>(
    invocation: SourceAnalysisHostCommandInvocation<TCommand>,
  ): SourceAnalysisHostEnvelope<SourceAnalysisHostCommandResult<TCommand>> {
    const startedAt = Date.now();

    let outcome: CommandOutcome;
    try {
      outcome = this.#dispatch(invocation);
    } catch (error) {
      const sessionId = extractSessionId(invocation.args);
      outcome = {
        status: 'error',
        result: null,
        sessionId: sessionId ?? undefined,
        errors: [toHostError(error)],
      };
    }

    const sessionState = outcome.sessionId
      ? this.#tryGetSession(outcome.sessionId)
      : undefined;
    const invalidation = outcome.invalidation
      ?? (sessionState ? buildInvalidationMeta(sessionState) : emptyInvalidationMeta());

    return {
      schemaVersion: SOURCE_ANALYSIS_HOST_SCHEMA_VERSION,
      command: invocation.command,
      status: outcome.status ?? 'ok',
      result: (outcome.result ?? null) as SourceAnalysisHostCommandResult<TCommand>,
      meta: {
        ...(outcome.sessionId ? { sessionId: outcome.sessionId } : {}),
        durationMs: Date.now() - startedAt,
        cache: outcome.cache ?? DEFAULT_CACHE,
        invalidation,
        refreshedKinds: outcome.refreshedKinds ?? [],
      },
      errors: outcome.errors ?? [],
    };
  }

  #dispatch<TCommand extends SourceAnalysisHostCommandName>(
    invocation: SourceAnalysisHostCommandInvocation<TCommand>,
  ): CommandOutcome {
    switch (invocation.command) {
      case 'session.open': return this.#sessionOpen(invocation.args as SessionOpenArgs);
      case 'session.close': return this.#sessionClose(invocation.args as SessionCloseArgs);
      case 'session.status': return this.#sessionStatus(invocation.args as SessionStatusArgs);
      case 'session.invalidate': return this.#sessionInvalidate(invocation.args as SessionInvalidateArgs);
      case 'session.refresh': return this.#sessionRefresh(invocation.args as SessionRefreshArgs);
      case 'query.deps.summary': return this.#querySummary('deps', invocation.args as QueryArgs);
      case 'query.deps.snapshot': return this.#querySnapshot('deps', invocation.args as QueryArgs);
      case 'query.typerefs.summary': return this.#querySummary('typerefs', invocation.args as QueryArgs);
      case 'query.typerefs.snapshot': return this.#querySnapshot('typerefs', invocation.args as QueryArgs);
      case 'query.exports.summary': return this.#querySummary('exports', invocation.args as QueryArgs);
      case 'query.exports.snapshot': return this.#querySnapshot('exports', invocation.args as QueryArgs);
      case 'query.audit.package': return this.#queryAuditPackage(invocation.args as QueryAuditPackageArgs);
      case 'query.route.witness': return this.#queryRouteWitness(invocation.args as QueryRouteWitnessArgs);
      case 'materializeSnapshots': return this.#materializeSnapshots(invocation.args as MaterializeSnapshotsArgs);
      default: return assertNever(invocation.command);
    }
  }

  #sessionOpen(args: SessionOpenArgs): CommandOutcome {
    const state = this.#sessions.open(args);
    const result: SessionOpenResult = {
      sessionId: state.sessionId,
      repoPath: state.repoPath,
      target: state.target,
      warmPrograms: state.warmPrograms,
      dirtyKinds: sortKinds(state.dirtyKinds),
    };
    return {
      result,
      sessionId: state.sessionId,
      invalidation: buildInvalidationMeta(state),
    };
  }

  #sessionClose(args: SessionCloseArgs): CommandOutcome {
    const closed = this.#sessions.close(args.sessionId);
    const result: SessionCloseResult = {
      sessionId: args.sessionId,
      closed,
    };
    return {
      result,
      sessionId: args.sessionId,
      invalidation: emptyInvalidationMeta(),
    };
  }

  #sessionStatus(args: SessionStatusArgs): CommandOutcome {
    const sessions = this.#sessions.list(args.sessionId).map(toSessionStatusEntry);
    const result: SessionStatusResult = { sessions };
    return {
      result,
      sessionId: args.sessionId,
      invalidation: args.sessionId
        ? buildInvalidationMeta(this.#sessions.get(args.sessionId))
        : emptyInvalidationMeta(),
      cache: {
        hit: sessions.length > 0 && sessions.every((session) => session.cachedKinds.length > 0),
        tier: sessions.some((session) => session.cachedKinds.length > 0) ? 'warm' : 'cold',
      },
    };
  }

  #sessionInvalidate(args: SessionInvalidateArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const invalidatedFiles = invalidateSession(state, args);
    const result: SessionInvalidateResult = {
      sessionId: state.sessionId,
      scope: args.scope === 'project' || !args.files || args.files.length === 0 ? 'project' : 'files',
      invalidatedFiles,
      dirtyKinds: sortKinds(state.dirtyKinds),
    };
    return {
      result,
      sessionId: state.sessionId,
      invalidation: buildInvalidationMeta(state),
      cache: {
        hit: false,
        tier: hasCachedSnapshots(state) ? 'warm' : 'cold',
      },
    };
  }

  #sessionRefresh(args: SessionRefreshArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const requestedKinds = normalizeKinds(args.kinds);
    const hadWarmSnapshot = requestedKinds.some((kind) => state.snapshots[kind] !== undefined);
    const refreshedKinds = refreshKinds(state, requestedKinds, { force: args.force });
    const result: SessionRefreshResult = {
      sessionId: state.sessionId,
      refreshedKinds,
      dirtyKinds: sortKinds(state.dirtyKinds),
      warningsByKind: cloneWarningsByKind(state),
      lastRefreshAtByKind: { ...state.lastRefreshAtByKind },
    };
    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: {
        hit: refreshedKinds.length === 0 && hadWarmSnapshot,
        tier: hadWarmSnapshot ? 'warm' : 'cold',
      },
    };
  }

  #querySummary<TKind extends SourceAnalysisKind>(
    kind: TKind,
    args: QueryArgs,
  ): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const query = ensureFreshSnapshot(state, kind, args.refreshIfNeeded);
    const snapshot = query.snapshot;
    const result: QuerySummaryResult<TKind> = {
      kind,
      generatedAt: snapshot.generated_at,
      summary: snapshot.summary as SourceAnalysisSummaryByKind[TKind],
      warnings: query.warnings,
    };
    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: query.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: query.cache,
    };
  }

  #querySnapshot<TKind extends SourceAnalysisKind>(
    kind: TKind,
    args: QueryArgs,
  ): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const query = ensureFreshSnapshot(state, kind, args.refreshIfNeeded);
    const result: QuerySnapshotResult<TKind> = {
      kind,
      snapshot: query.snapshot,
      warnings: query.warnings,
    };
    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: query.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: query.cache,
    };
  }

  #queryAuditPackage(args: QueryAuditPackageArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const depsQuery = ensureFreshSnapshot(state, 'deps', args.refreshIfNeeded);
    const typeRefsQuery = ensureFreshSnapshot(state, 'typerefs', args.refreshIfNeeded);
    const exportsQuery = ensureFreshSnapshot(state, 'exports', args.refreshIfNeeded);

    const warnings = [
      ...depsQuery.warnings,
      ...typeRefsQuery.warnings,
      ...exportsQuery.warnings,
    ];
    const refreshedKinds = sortKinds([
      ...depsQuery.refreshedKinds,
      ...typeRefsQuery.refreshedKinds,
      ...exportsQuery.refreshedKinds,
    ]);
    const result: QueryAuditPackageResult = {
      answer: createSourceAnalysisAuditAnswer(
        {
          inquiryEpisode: 'inventory-and-audit-sweep',
          focusRef: { kind: 'package', value: args.packageName },
          questionRoute: 'inventory',
          readMode: 'summary-card',
          worldFrame: {
            repoPath: state.repoPath,
            target: state.target,
            regimeAnchor: 'hosted',
            partiality: 'complete',
            freshness: 'snapshot',
          },
        },
        {
          deps: depsQuery.snapshot,
          typeRefs: typeRefsQuery.snapshot,
          exports: exportsQuery.snapshot,
          warnings,
        },
      ),
      warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: {
        hit: depsQuery.cache.hit && typeRefsQuery.cache.hit && exportsQuery.cache.hit,
        tier: depsQuery.cache.tier === 'warm'
          || typeRefsQuery.cache.tier === 'warm'
          || exportsQuery.cache.tier === 'warm'
          ? 'warm'
          : 'cold',
      },
    };
  }

  #queryRouteWitness(args: QueryRouteWitnessArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const depsQuery = ensureFreshSnapshot(state, 'deps', args.refreshIfNeeded);
    const typeRefsQuery = ensureFreshSnapshot(state, 'typerefs', args.refreshIfNeeded);
    const exportsQuery = ensureFreshSnapshot(state, 'exports', args.refreshIfNeeded);

    const warnings = [
      ...depsQuery.warnings,
      ...typeRefsQuery.warnings,
      ...exportsQuery.warnings,
    ];
    const refreshedKinds = sortKinds([
      ...depsQuery.refreshedKinds,
      ...typeRefsQuery.refreshedKinds,
      ...exportsQuery.refreshedKinds,
    ]);
    const result: QueryRouteWitnessResult = {
      answer: createSourceAnalysisRouteWitnessAnswer(
        {
          inquiryEpisode: 'bounded-closure-explanation',
          focusRef: {
            kind: args.focusKind,
            value: args.focusValue,
          },
          questionRoute: 'route',
          readMode: 'focus-card',
          worldFrame: {
            repoPath: state.repoPath,
            target: state.target,
            regimeAnchor: 'hosted',
            partiality: 'complete',
            freshness: 'snapshot',
          },
        },
        {
          deps: depsQuery.snapshot,
          typeRefs: typeRefsQuery.snapshot,
          exports: exportsQuery.snapshot,
          warnings,
        },
      ),
      warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: {
        hit: depsQuery.cache.hit && typeRefsQuery.cache.hit && exportsQuery.cache.hit,
        tier: depsQuery.cache.tier === 'warm'
          || typeRefsQuery.cache.tier === 'warm'
          || exportsQuery.cache.tier === 'warm'
          ? 'warm'
          : 'cold',
      },
    };
  }

  #materializeSnapshots(args: MaterializeSnapshotsArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const kinds = normalizeKinds(args.kinds);
    const outDir = resolve(
      args.outDir ?? createSourceAnalysisPaths(import.meta.url).snapshotRootPath,
    );
    mkdirSync(outDir, { recursive: true });

    const refreshedKinds: SourceAnalysisKind[] = [];
    const files: Partial<Record<SourceAnalysisKind, string>> = {};
    let sawWarmSnapshot = false;

    for (const kind of kinds) {
      const query = ensureFreshSnapshot(state, kind, args.refreshIfNeeded);
      if (query.cache.tier === 'warm') {
        sawWarmSnapshot = true;
      }
      refreshedKinds.push(...query.refreshedKinds);

      const outputPath = join(outDir, `${state.target}-${kind}.json`);
      writeSnapshotJson(outputPath, query.snapshot);
      files[kind] = outputPath;
    }

    const result: MaterializeSnapshotsResult = {
      sessionId: state.sessionId,
      outDir,
      files,
    };
    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: sortKinds(refreshedKinds),
      invalidation: buildInvalidationMeta(state),
      cache: {
        hit: refreshedKinds.length === 0 && sawWarmSnapshot,
        tier: sawWarmSnapshot ? 'warm' : 'cold',
      },
    };
  }

  #tryGetSession(sessionId: string): SourceAnalysisHostSessionState | undefined {
    try {
      return this.#sessions.get(sessionId);
    } catch {
      return undefined;
    }
  }
}

export function createSourceAnalysisHostRuntime(): SourceAnalysisHostRuntime {
  return new SourceAnalysisHostRuntime();
}

function ensureFreshSnapshot<TKind extends SourceAnalysisKind>(
  state: SourceAnalysisHostSessionState,
  kind: TKind,
  refreshIfNeeded = true,
): {
  snapshot: SourceAnalysisOutputByKind[TKind];
  warnings: readonly string[];
  refreshedKinds: readonly TKind[];
  cache: SourceAnalysisHostCacheMeta;
} {
  const hadSnapshot = state.snapshots[kind] !== undefined;
  const needsRefresh = state.dirtyKinds.has(kind) || !hadSnapshot;

  let refreshedKinds: readonly TKind[] = [];
  if (needsRefresh) {
    if (!refreshIfNeeded) {
      throw new Error(`source-analysis ${kind} snapshot is dirty for session "${state.sessionId}"`);
    }
    refreshedKinds = refreshKinds(state, [kind]) as readonly TKind[];
  }

  const snapshot = state.snapshots[kind];
  if (!snapshot) {
    throw new Error(`source-analysis ${kind} snapshot is unavailable for session "${state.sessionId}"`);
  }

  return {
    snapshot: snapshot as SourceAnalysisOutputByKind[TKind],
    warnings: state.warningsByKind[kind] ?? [],
    refreshedKinds,
    cache: {
      hit: hadSnapshot && refreshedKinds.length === 0,
      tier: hadSnapshot ? 'warm' : 'cold',
    },
  };
}

function refreshKinds(
  state: SourceAnalysisHostSessionState,
  requestedKinds: readonly SourceAnalysisKind[],
  options: {
    force?: boolean;
  } = {},
): readonly SourceAnalysisKind[] {
  const refreshedKinds: SourceAnalysisKind[] = [];
  const kindsToRefresh = options.force
    ? requestedKinds
    : requestedKinds.filter((kind) => state.dirtyKinds.has(kind) || state.snapshots[kind] === undefined);

  for (const kind of kindsToRefresh) {
    const result = runAnalysis(state, kind);
    setSnapshot(state, kind, result.output);
    state.warningsByKind[kind] = result.warnings;
    state.lastRefreshAtByKind[kind] = result.output.generated_at;
    state.dirtyKinds.delete(kind);
    refreshedKinds.push(kind);
  }

  if (state.dirtyKinds.size === 0) {
    state.dirtyFiles.clear();
    state.invalidationKind = 'none';
    state.invalidationCount = 0;
  }

  return sortKinds(refreshedKinds);
}

function runAnalysis<TKind extends SourceAnalysisKind>(
  state: SourceAnalysisHostSessionState,
  kind: TKind,
): {
  output: SourceAnalysisOutputByKind[TKind];
  warnings: readonly string[];
} {
  const analysisOptions: SourceAnalysisAnalysisOptions = {
    cachePrograms: state.warmPrograms,
  };

  switch (kind) {
    case 'deps': {
      const result = generateDepsAnalysis(state.session, analysisOptions);
      return {
        output: result.output as SourceAnalysisOutputByKind[TKind],
        warnings: result.warnings,
      };
    }
    case 'typerefs': {
      const result = generateTypeRefsAnalysis(state.session, analysisOptions);
      return {
        output: result.output as SourceAnalysisOutputByKind[TKind],
        warnings: result.warnings,
      };
    }
    case 'exports': {
      const result = generateExportsAnalysis(state.session, analysisOptions);
      return {
        output: result.output as SourceAnalysisOutputByKind[TKind],
        warnings: result.warnings,
      };
    }
    default:
      return assertNever(kind);
  }
}

function setSnapshot<TKind extends SourceAnalysisKind>(
  state: SourceAnalysisHostSessionState,
  kind: TKind,
  output: SourceAnalysisOutputByKind[TKind],
): void {
  (
    state.snapshots as Partial<Record<SourceAnalysisKind, SourceAnalysisOutputByKind[SourceAnalysisKind]>>
  )[kind] = output;
}

function invalidateSession(
  state: SourceAnalysisHostSessionState,
  args: SessionInvalidateArgs,
): readonly string[] {
  const scope = args.scope === 'project' || !args.files || args.files.length === 0
    ? 'project'
    : 'files';

  if (scope === 'project') {
    state.session.clearProgramCache();
    for (const kind of ALL_KINDS) {
      state.dirtyKinds.add(kind);
    }
    state.invalidationKind = 'project';
    state.invalidationCount = Math.max(args.files?.length ?? 0, 1);
    if (args.files) {
      for (const filePath of args.files) {
        const normalized = normalizeSessionFilePath(state, filePath);
        if (normalized) {
          state.dirtyFiles.add(normalized);
        }
      }
    }
    return [...state.dirtyFiles].sort();
  }

  const invalidatedFiles: string[] = [];
  const affectedKinds = new Set<SourceAnalysisKind>();
  for (const filePath of args.files ?? []) {
    const normalized = normalizeSessionFilePath(state, filePath);
    if (!normalized) continue;

    invalidatedFiles.push(normalized);
    state.dirtyFiles.add(normalized);
    for (const kind of affectedKindsForFile(normalized)) {
      affectedKinds.add(kind);
      state.dirtyKinds.add(kind);
    }
  }

  if (affectedKinds.size > 0) {
    state.session.clearProgramCache();
    state.invalidationKind = 'files';
    state.invalidationCount = invalidatedFiles.length;
  }

  return [...new Set(invalidatedFiles)].sort();
}

function affectedKindsForFile(relPath: string): readonly SourceAnalysisKind[] {
  const fileName = basename(relPath);
  if (fileName === 'package.json') {
    return ALL_KINDS;
  }
  if (/^tsconfig(\..+)?\.json$/i.test(fileName)) {
    return ALL_KINDS;
  }
  if (SOURCE_FILE_PATTERN.test(relPath)) {
    return ALL_KINDS;
  }
  return [];
}

function normalizeSessionFilePath(
  state: SourceAnalysisHostSessionState,
  pathValue: string,
): string | null {
  const absPath = isAbsoluteLike(pathValue)
    ? resolve(pathValue)
    : resolve(state.repoPath, pathValue);
  const relPath = state.session.toRepoRelative(absPath).replace(/^\.\/+/, '');
  if (relPath.startsWith('..')) {
    return null;
  }
  return relPath;
}

function isAbsoluteLike(pathValue: string): boolean {
  return /^[a-z]:[\\/]/i.test(pathValue) || pathValue.startsWith('/') || pathValue.startsWith('\\\\');
}

function normalizeKinds(
  kinds?: readonly SourceAnalysisKind[],
): readonly SourceAnalysisKind[] {
  if (!kinds || kinds.length === 0) {
    return ALL_KINDS;
  }

  const unique = new Set<SourceAnalysisKind>();
  for (const kind of kinds) {
    if (!ALL_KINDS.includes(kind)) {
      throw new Error(`unknown source-analysis kind "${kind}"`);
    }
    unique.add(kind);
  }
  return sortKinds(unique);
}

function hasCachedSnapshots(state: SourceAnalysisHostSessionState): boolean {
  return Object.keys(state.snapshots).length > 0;
}

function buildInvalidationMeta(
  state: SourceAnalysisHostSessionState,
): SourceAnalysisHostInvalidationMeta {
  return {
    kind: state.invalidationKind,
    count: state.invalidationCount,
    dirtyKinds: sortKinds(state.dirtyKinds),
    dirtyFiles: [...state.dirtyFiles].sort(),
  };
}

function emptyInvalidationMeta(): SourceAnalysisHostInvalidationMeta {
  return {
    kind: 'none',
    count: 0,
    dirtyKinds: [],
    dirtyFiles: [],
  };
}

function cloneWarningsByKind(
  state: SourceAnalysisHostSessionState,
): Partial<Record<SourceAnalysisKind, readonly string[]>> {
  return {
    ...(state.warningsByKind.deps ? { deps: [...state.warningsByKind.deps] } : {}),
    ...(state.warningsByKind.typerefs ? { typerefs: [...state.warningsByKind.typerefs] } : {}),
    ...(state.warningsByKind.exports ? { exports: [...state.warningsByKind.exports] } : {}),
  };
}

function writeSnapshotJson(path: string, snapshot: unknown): void {
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tempPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
    renameSync(tempPath, path);
  } finally {
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Best-effort cleanup for failed writes.
      }
    }
  }
}

function extractSessionId(
  args: SourceAnalysisHostCommandArgsMap[SourceAnalysisHostCommandName],
): string | null {
  return typeof args === 'object' && args !== null && 'sessionId' in args && typeof args.sessionId === 'string'
    ? args.sessionId
    : null;
}

function toHostError(error: unknown): SourceAnalysisHostError {
  if (error instanceof Error) {
    return {
      code: 'SOURCE_ANALYSIS_HOST_ERROR',
      message: error.message,
    };
  }
  return {
    code: 'SOURCE_ANALYSIS_HOST_ERROR',
    message: String(error),
  };
}

function assertNever(value: never): never {
  throw new Error(`unhandled source-analysis host command: ${String(value)}`);
}
