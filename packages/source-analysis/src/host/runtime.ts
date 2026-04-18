import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { createAuditAnswer } from '../audit.js';
import type { AnswerDocument } from '../answer-document.js';
import type { AnswerRef } from '../answer-ref.js';
import {
  renderAnswerDocumentToJson,
  renderAnswerDocumentToPlainText,
} from '../answer-renderer.js';
import { createAnalysisViews } from '../analysis-views.js';
import { createHostedWorldFrame } from '../analysis-surface.js';
import { resolveAnalysisProfile } from '../analysis-profile.js';
import {
  inspectAnalyzabilityPosture,
} from '../analyzability-posture.js';
import {
  createSnapshotPaths,
  resolveSnapshotRootPath,
  resolveSnapshotTarget,
} from '../snapshot-config.js';
import {
  SNAPSHOT_KINDS,
  type SnapshotKind,
} from '../snapshots.js';
import type { ConsumerKind } from '../inquiry-policy.js';
import {
  createPresentationPolicyInput,
  resolveInquiryPolicy,
} from '../inquiry-policy.js';
import type {
  FocusKind,
  InquiryEpisode,
  PolicyFocusKind,
  QuestionRoute,
  ReadMode,
} from '../inquiry-model.js';
import { resolvePresentationReadMode } from '../inquiry-model.js';
import { createNavigationEpisode } from '../navigation.js';
import { createLegacyProjectionWorkspaceAuthority } from '../authority/workspace-authority.js';
import { createRouteWitnessAnswer } from '../route-witness.js';
import type { ProgramReuseOptions } from '../program-reuse-options.js';
import {
  generateDepsAnalysisFromRuntime,
} from '../deps/analyze.js';
import {
  generateExportsAnalysisFromRuntime,
} from '../exports/analyze.js';
import {
  buildStructuralClaimGraph,
  type StructuralClaimGraphRuntime,
} from '../structural-claim-graph.js';
import {
  scanParsedTsconfigSourceFiles,
  type ParsedTsconfigSourceFileScanResult,
} from '../tsconfig-source-files.js';
import {
  generateTypeRefsAnalysisFromRuntime,
} from '../typerefs/analyze.js';
import {
  HostSessionManager,
  type HostSessionState,
  sortSnapshotKinds,
  toSessionStatusEntry,
} from './session-manager.js';
import {
  HOST_SCHEMA_VERSION,
  type MaterializeSnapshotsArgs,
  type MaterializeSnapshotsResult,
  type DescribeProfileArgs,
  type DescribeProfileResult,
  type AuditPackageQueryArgs,
  type AuditPackageQueryResult,
  type ResolvePackageQueryArgs,
  type ResolvePackageQueryResult,
  type ResolveTypeQueryArgs,
  type ResolveTypeQueryResult,
  type ResolveExportQueryArgs,
  type ResolveExportQueryResult,
  type InspectPackageSurfaceQueryArgs,
  type InspectPackageSurfaceQueryResult,
  type InspectPackageReachabilityQueryArgs,
  type InspectPackageReachabilityQueryResult,
  type TraceExportQueryArgs,
  type TraceExportQueryResult,
  type HostStructuralPackageSurface,
  type HostPackageReachability,
  type LookupSymbolDeclarationArgs,
  type LookupSymbolDeclarationResult,
  type InspectFileQueryArgs,
  type InspectFileQueryResult,
  type NavigateQueryArgs,
  type NavigateQueryResult,
  type RouteWitnessQueryArgs,
  type RouteWitnessQueryResult,
  type SessionQueryArgs,
  type SessionSnapshotQueryResult,
  type SessionSummaryQueryResult,
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
  type HostCacheMeta,
  type HostCommandArgsMap,
  type HostCommandInvocation,
  type HostCommandName,
  type HostCommandResult,
  type HostCommandStatus,
  type HostCommandEnvelope,
  type HostError,
  type HostInvalidationMeta,
  type SnapshotOutputMap,
  type SnapshotSummaryMap,
  type HostRenderedView,
} from './types.js';

interface CommandOutcome {
  readonly status?: HostCommandStatus;
  readonly result?: unknown;
  readonly sessionId?: string;
  readonly cache?: HostCacheMeta;
  readonly refreshedKinds?: readonly SnapshotKind[];
  readonly invalidation?: HostInvalidationMeta;
  readonly errors?: readonly HostError[];
}

export interface SnapshotHostRuntimeOptions {
  readonly executionMode?: 'session-first';
}

const DEFAULT_CACHE: HostCacheMeta = { hit: false, tier: 'cold' };
const ALL_SNAPSHOT_KINDS = SNAPSHOT_KINDS;
const SOURCE_FILE_PATTERN = /(\.d\.ts|\.tsx|\.ts|\.mts|\.cts)$/i;

export class SnapshotHostRuntime {
  readonly #sessions = new HostSessionManager();

  constructor(
    _options: SnapshotHostRuntimeOptions = {},
  ) {
  }

  execute<TCommand extends HostCommandName>(
    invocation: HostCommandInvocation<TCommand>,
  ): HostCommandEnvelope<HostCommandResult<TCommand>> {
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
      schemaVersion: HOST_SCHEMA_VERSION,
      command: invocation.command,
      status: outcome.status ?? 'ok',
      result: (outcome.result ?? null) as HostCommandResult<TCommand>,
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

  #dispatch<TCommand extends HostCommandName>(
    invocation: HostCommandInvocation<TCommand>,
  ): CommandOutcome {
    // TODO: This switch still exposes the historical projection-shaped command
    // surface as the center of gravity. Move toward dispatching shared
    // authority operations/evaluators here and keep query.deps/query.typerefs/
    // query.exports as compatibility shims rather than the native product shape.
    switch (invocation.command) {
      case 'describe.profile': return this.#describeProfile(invocation.args as DescribeProfileArgs);
      case 'session.open': return this.#sessionOpen(invocation.args as SessionOpenArgs);
      case 'session.close': return this.#sessionClose(invocation.args as SessionCloseArgs);
      case 'session.status': return this.#sessionStatus(invocation.args as SessionStatusArgs);
      case 'session.invalidate': return this.#sessionInvalidate(invocation.args as SessionInvalidateArgs);
      case 'session.refresh': return this.#sessionRefresh(invocation.args as SessionRefreshArgs);
      case 'query.deps.summary': return this.#querySummary('deps', invocation.args as SessionQueryArgs);
      case 'query.deps.snapshot': return this.#querySnapshot('deps', invocation.args as SessionQueryArgs);
      case 'query.typerefs.summary': return this.#querySummary('typerefs', invocation.args as SessionQueryArgs);
      case 'query.typerefs.snapshot': return this.#querySnapshot('typerefs', invocation.args as SessionQueryArgs);
      case 'query.exports.summary': return this.#querySummary('exports', invocation.args as SessionQueryArgs);
      case 'query.exports.snapshot': return this.#querySnapshot('exports', invocation.args as SessionQueryArgs);
      case 'query.audit.package': return this.#queryAuditPackage(invocation.args as AuditPackageQueryArgs);
      case 'query.route.witness': return this.#queryRouteWitness(invocation.args as RouteWitnessQueryArgs);
      case 'query.navigate': return this.#queryNavigate(invocation.args as NavigateQueryArgs);
      case 'query.package.resolve': return this.#queryResolvePackage(invocation.args as ResolvePackageQueryArgs);
      case 'query.type.resolve': return this.#queryResolveType(invocation.args as ResolveTypeQueryArgs);
      case 'query.export.resolve': return this.#queryResolveExport(invocation.args as ResolveExportQueryArgs);
      case 'query.package.surface': return this.#queryInspectPackageSurface(invocation.args as InspectPackageSurfaceQueryArgs);
      case 'query.package.reachability': return this.#queryInspectPackageReachability(invocation.args as InspectPackageReachabilityQueryArgs);
      case 'query.export.trace': return this.#queryTraceExport(invocation.args as TraceExportQueryArgs);
      case 'query.symbol.lookup': return this.#queryLookupSymbol(invocation.args as LookupSymbolDeclarationArgs);
      case 'query.file.inspect': return this.#queryInspectFile(invocation.args as InspectFileQueryArgs);
      case 'materializeSnapshots': return this.#materializeSnapshots(invocation.args as MaterializeSnapshotsArgs);
      default: return assertNever(invocation.command);
    }
  }

  #describeProfile(args: DescribeProfileArgs): CommandOutcome {
    const profile = resolveAnalysisProfile({
      repoPath: args.repoPath,
      target: args.target,
      profilePath: args.profilePath,
    });
    const snapshotPaths = createSnapshotPaths(import.meta.url);
    const posture = inspectAnalyzabilityPosture(
      snapshotPaths,
      profile,
    );
    const result: DescribeProfileResult = {
      profile,
      snapshotSupport: posture.snapshotSupport,
      posture,
    };
    return {
      result,
      invalidation: emptyInvalidationMeta(),
    };
  }

  #sessionOpen(args: SessionOpenArgs): CommandOutcome {
    const state = this.#sessions.open(args);
    const result: SessionOpenResult = {
      sessionId: state.sessionId,
      repoPath: state.repoPath,
      target: state.target,
      profileId: state.profileId,
      profilePath: state.profilePath,
      warmPrograms: state.warmPrograms,
      dirtyKinds: sortSnapshotKinds(state.dirtyKinds),
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
      dirtyKinds: sortSnapshotKinds(state.dirtyKinds),
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
    const requestedKinds = normalizeSnapshotKinds(args.kinds);
    const hadWarmSnapshot = requestedKinds.some((kind) => state.analysisViews[kind] !== undefined);
    const refreshedKinds = refreshKinds(state, requestedKinds, { force: args.force });
    const result: SessionRefreshResult = {
      sessionId: state.sessionId,
      refreshedKinds,
      dirtyKinds: sortSnapshotKinds(state.dirtyKinds),
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

  #querySummary<TKind extends SnapshotKind>(
    kind: TKind,
    args: SessionQueryArgs,
  ): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const query = ensureFreshSnapshot(state, kind, args.refreshIfNeeded);
    const snapshot = query.snapshot;
    const result: SessionSummaryQueryResult<TKind> = {
      kind,
      generatedAt: snapshot.generated_at,
      summary: snapshot.summary as SnapshotSummaryMap[TKind],
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

  #querySnapshot<TKind extends SnapshotKind>(
    kind: TKind,
    args: SessionQueryArgs,
  ): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const query = ensureFreshSnapshot(state, kind, args.refreshIfNeeded);
    const result: SessionSnapshotQueryResult<TKind> = {
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

  #queryAuditPackage(args: AuditPackageQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const readMode = presentationReadMode(args.readMode, 'summary-card');
    const answer = createAuditAnswer(
      {
        inquiryEpisode: 'inventory-and-audit-sweep',
        focusRef: { kind: 'package', value: args.packageName },
        questionRoute: 'inventory',
        readMode,
        worldFrame: createRuntimeWorldFrame({
          repoPath: state.repoPath,
          target: state.target,
        }),
      },
      hostedAnalysis.analysis,
    );
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: AuditPackageQueryResult = {
      answer,
      ...(rendered ? { rendered } : {}),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryRouteWitness(args: RouteWitnessQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const readMode = presentationReadMode(args.readMode, 'focus-card');
    const answer = createRouteWitnessAnswer(
      {
        inquiryEpisode: 'bounded-closure-explanation',
        focusRef: {
          kind: args.focusKind,
          value: args.focusValue,
        },
        questionRoute: 'route',
        readMode,
        worldFrame: createRuntimeWorldFrame({
          repoPath: state.repoPath,
          target: state.target,
        }),
      },
      hostedAnalysis.analysis,
    );
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: RouteWitnessQueryResult = {
      answer,
      ...(rendered ? { rendered } : {}),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryNavigate(args: NavigateQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const readMode = presentationReadMode(args.readMode, 'focus-card');
    const episode = createNavigationEpisode(
      {
        inquiryEpisode: 'orient-and-localize',
        focusRef: {
          kind: args.focusKind,
          value: args.focusValue,
        },
        questionRoute: args.questionRoute ?? 'join',
        readMode,
        worldFrame: createRuntimeWorldFrame({
          repoPath: state.repoPath,
          target: state.target,
        }),
      },
      authority,
    );
    const rendered = buildRenderedView(episode.answer, args.consumer, args.renderStyle);
    const result: NavigateQueryResult = {
      answer: episode.answer,
      ...(rendered ? { rendered } : {}),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryResolvePackage(args: ResolvePackageQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const result: ResolvePackageQueryResult = {
      outcome: authority.resolvePackage(
        {
          kind: args.locatorKind ?? 'package-name',
          value: args.locator,
        },
        args.spendThreshold,
      ),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryResolveType(args: ResolveTypeQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const result: ResolveTypeQueryResult = {
      outcome: authority.resolveTypeDeclaration(
        {
          kind: 'type-name',
          value: args.locator,
        },
        args.spendThreshold,
      ),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryResolveExport(args: ResolveExportQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const result: ResolveExportQueryResult = {
      outcome: authority.resolveExport(
        {
          kind: 'export-name',
          value: args.locator,
        },
        args.spendThreshold,
      ),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryInspectPackageSurface(args: InspectPackageSurfaceQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const packageOutcome = authority.resolvePackage(
      {
        kind: args.locatorKind ?? 'package-name',
        value: args.locator,
      },
      args.spendThreshold,
    );
    const result: InspectPackageSurfaceQueryResult = {
      packageOutcome,
      surface: packageOutcome.kind === 'claim'
        ? serializePackageSurface(authority.getStructuralPackageSurface(packageOutcome.value.package_dir))
        : null,
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryInspectPackageReachability(args: InspectPackageReachabilityQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const packageOutcome = authority.resolvePackage(
      {
        kind: args.locatorKind ?? 'package-name',
        value: args.locator,
      },
      args.spendThreshold,
    );
    const result: InspectPackageReachabilityQueryResult = {
      packageOutcome,
      reachability: packageOutcome.kind === 'claim'
        ? serializePackageReachability(authority.getPackageReachability(packageOutcome.value.package_dir))
        : null,
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryTraceExport(args: TraceExportQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const packageOutcome = authority.resolvePackage(
      {
        kind: args.packageLocatorKind ?? 'package-name',
        value: args.packageLocator,
      },
      args.spendThreshold,
    );
    const exportOutcome = packageOutcome.kind === 'claim'
      ? authority.resolvePackageExport(
        packageOutcome.value.package_dir,
        args.exportedName,
        args.spendThreshold,
      )
      : null;
    const result: TraceExportQueryResult = {
      packageOutcome,
      exportOutcome,
      route: exportOutcome?.kind === 'claim'
        ? authority.resolveExportRoute(exportOutcome.value)
        : null,
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryLookupSymbol(args: LookupSymbolDeclarationArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const result: LookupSymbolDeclarationResult = {
      lookup: authority.lookupSymbolDeclaration({
        kind: 'symbol-name',
        value: args.locator,
      }),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #queryInspectFile(args: InspectFileQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const hostedAnalysis = ensureFreshHostedAnalysisContext(state, args.refreshIfNeeded);
    const authority = createLegacyProjectionWorkspaceAuthority(hostedAnalysis.analysis);
    const result: InspectFileQueryResult = {
      inspection: authority.inspectFocusedFile({
        kind: 'file-path',
        value: args.filePath,
      }),
      warnings: hostedAnalysis.warnings,
    };

    return {
      result,
      sessionId: state.sessionId,
      refreshedKinds: hostedAnalysis.refreshedKinds,
      invalidation: buildInvalidationMeta(state),
      cache: hostedAnalysis.cache,
    };
  }

  #materializeSnapshots(args: MaterializeSnapshotsArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const kinds = normalizeSnapshotKinds(args.kinds);
    const outDir = resolve(
      args.outDir ?? resolveSnapshotRootPath(createSnapshotPaths(import.meta.url), state.repoPath),
    );
    mkdirSync(outDir, { recursive: true });

    const refreshedKinds: SnapshotKind[] = [];
    const files: Partial<Record<SnapshotKind, string>> = {};
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
      refreshedKinds: sortSnapshotKinds(refreshedKinds),
      invalidation: buildInvalidationMeta(state),
      cache: {
        hit: refreshedKinds.length === 0 && sawWarmSnapshot,
        tier: sawWarmSnapshot ? 'warm' : 'cold',
      },
    };
  }

  #tryGetSession(sessionId: string): HostSessionState | undefined {
    try {
      return this.#sessions.get(sessionId);
    } catch {
      return undefined;
    }
  }
}

export function createSnapshotHostRuntime(
  options: SnapshotHostRuntimeOptions = {},
): SnapshotHostRuntime {
  return new SnapshotHostRuntime(options);
}

function buildRenderedView<TResult extends { document?: AnswerDocument<AnswerRef> }>(
  answer: {
    readonly query: {
      readonly focusRef: { readonly kind: FocusKind };
      readonly questionRoute: QuestionRoute;
      readonly inquiryEpisode?: InquiryEpisode;
      readonly readMode?: ReadMode;
    };
    readonly outcome: { readonly value?: TResult };
  },
  consumer: ConsumerKind | undefined,
  renderStyle: 'answer' | 'plain-text' | 'json-document' | undefined,
): HostRenderedView | undefined {
  if (!renderStyle || renderStyle === 'answer') {
    return undefined;
  }

  const document = answer.outcome.value?.document;
  if (!document) {
    return undefined;
  }

  const readMode = resolvePresentationReadMode(answer.query.readMode, 'focus-card');

  const policy = resolveInquiryPolicy(createPresentationPolicyInput(answer.query, readMode), {
    focusKind: policyFocusKindForRenderedAnswer(answer.query.focusRef.kind),
    inquiryEpisode: (answer.query.inquiryEpisode ?? 'orient-and-localize') as Parameters<typeof resolveInquiryPolicy>[1]['inquiryEpisode'],
    readMode,
    ...(consumer ? { consumer } : {}),
  });

  if (renderStyle === 'plain-text') {
    return {
      style: 'plain-text',
      rendered: renderAnswerDocumentToPlainText(document, policy),
    };
  }

  return {
    style: 'json-document',
    document: renderAnswerDocumentToJson(document, policy),
  };
}

function policyFocusKindForRenderedAnswer(
  focusKind: FocusKind,
): PolicyFocusKind {
  return focusKind === 'claim'
    ? 'inquiry'
    : focusKind;
}

function ensureFreshHostedAnalysisContext(
  state: HostSessionState,
  refreshIfNeeded = true,
): {
  analysis: ReturnType<typeof createAnalysisViews>;
  warnings: readonly string[];
  refreshedKinds: readonly SnapshotKind[];
  cache: HostCacheMeta;
} {
  const liveStructuralSurface = ensureLiveStructuralSurface(state);
  const depsQuery = ensureFreshSnapshot(state, 'deps', refreshIfNeeded);
  const typeRefsQuery = ensureFreshSnapshot(state, 'typerefs', refreshIfNeeded);
  const exportsQuery = ensureFreshSnapshot(state, 'exports', refreshIfNeeded);

  return {
    analysis: createAnalysisViews({
      source: 'hosted-analysis',
      deps: depsQuery.snapshot,
      typeRefs: typeRefsQuery.snapshot,
      exports: exportsQuery.snapshot,
      repoSession: state.session,
      structuralRuntime: liveStructuralSurface.structuralRuntime,
      sourceFileScan: liveStructuralSurface.sourceFileScan,
      repoSourceFiles: liveStructuralSurface.repoSourceFiles,
    }),
    warnings: [
      ...depsQuery.warnings,
      ...typeRefsQuery.warnings,
      ...exportsQuery.warnings,
    ],
    refreshedKinds: sortSnapshotKinds([
      ...depsQuery.refreshedKinds,
      ...typeRefsQuery.refreshedKinds,
      ...exportsQuery.refreshedKinds,
    ]),
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

function createRuntimeWorldFrame(
  options: {
    readonly repoPath?: string;
    readonly target?: string;
    readonly profilePath?: string;
    readonly freshness?: 'live' | 'snapshot';
  },
) {
  return createHostedWorldFrame({
    targeting: {
      ...(options.repoPath ? { repoPath: options.repoPath } : {}),
      ...(options.target ? { target: options.target } : {}),
      ...(options.profilePath ? { profilePath: options.profilePath } : {}),
    },
    posture: {
      ...(options.freshness ? { freshness: options.freshness } : {}),
    },
  });
}

function presentationReadMode(
  readMode: ReadMode | undefined,
  fallback: 'summary-card' | 'focus-card',
) {
  return resolvePresentationReadMode(readMode, fallback);
}

function ensureFreshSnapshot<TKind extends SnapshotKind>(
  state: HostSessionState,
  kind: TKind,
  refreshIfNeeded = true,
): {
  snapshot: SnapshotOutputMap[TKind];
  warnings: readonly string[];
  refreshedKinds: readonly TKind[];
  cache: HostCacheMeta;
} {
  const hadSnapshot = state.analysisViews[kind] !== undefined;
  const needsRefresh = state.dirtyKinds.has(kind) || !hadSnapshot;

  let refreshedKinds: readonly TKind[] = [];
  if (needsRefresh) {
    if (!refreshIfNeeded) {
      throw new Error(`source-analysis ${kind} snapshot is dirty for session "${state.sessionId}"`);
    }
    refreshedKinds = refreshKinds(state, [kind]) as readonly TKind[];
  }

  const snapshot = state.analysisViews[kind];
  if (!snapshot) {
    throw new Error(`source-analysis ${kind} snapshot is unavailable for session "${state.sessionId}"`);
  }

  return {
    snapshot: snapshot as SnapshotOutputMap[TKind],
    warnings: state.warningsByKind[kind] ?? [],
    refreshedKinds,
    cache: {
      hit: hadSnapshot && refreshedKinds.length === 0,
      tier: hadSnapshot ? 'warm' : 'cold',
    },
  };
}

function refreshKinds(
  state: HostSessionState,
  requestedKinds: readonly SnapshotKind[],
  options: {
    force?: boolean;
  } = {},
): readonly SnapshotKind[] {
  const refreshedKinds: SnapshotKind[] = [];
  const kindsToRefresh = options.force
    ? requestedKinds
    : requestedKinds.filter((kind) => state.dirtyKinds.has(kind) || state.analysisViews[kind] === undefined);

  if (kindsToRefresh.length === 0) {
    return [];
  }

  const liveRuntime = ensureLiveStructuralSurface(state);

  for (const kind of kindsToRefresh) {
    const result = runAnalysis(state, kind, liveRuntime);
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

  return sortSnapshotKinds(refreshedKinds);
}

function runAnalysis<TKind extends SnapshotKind>(
  state: HostSessionState,
  kind: TKind,
  liveRuntime: {
    readonly repoSourceFiles: readonly string[];
    readonly sourceFileScan: ParsedTsconfigSourceFileScanResult;
    readonly structuralRuntime: StructuralClaimGraphRuntime;
  },
): {
  output: SnapshotOutputMap[TKind];
  warnings: readonly string[];
} {
  const analysisOptions: ProgramReuseOptions = {
    cachePrograms: state.warmPrograms,
  };

  switch (kind) {
    case 'deps': {
      const result = generateDepsAnalysisFromRuntime(
        state.session,
        liveRuntime.structuralRuntime,
        liveRuntime.sourceFileScan,
      );
      return {
        output: result.output as SnapshotOutputMap[TKind],
        warnings: result.warnings,
      };
    }
    case 'typerefs': {
      const result = generateTypeRefsAnalysisFromRuntime(
        state.session,
        liveRuntime.structuralRuntime,
        liveRuntime.sourceFileScan,
      );
      return {
        output: result.output as SnapshotOutputMap[TKind],
        warnings: result.warnings,
      };
    }
    case 'exports': {
      const result = generateExportsAnalysisFromRuntime(
        state.session,
        liveRuntime.structuralRuntime,
        analysisOptions,
      );
      return {
        output: result.output as SnapshotOutputMap[TKind],
        warnings: result.warnings,
      };
    }
    default:
      return assertNever(kind);
  }
}

function ensureLiveStructuralSurface(
  state: HostSessionState,
): {
  readonly repoSourceFiles: readonly string[];
  readonly sourceFileScan: ParsedTsconfigSourceFileScanResult;
  readonly structuralRuntime: StructuralClaimGraphRuntime;
} {
  const repoSourceFiles = state.liveAnalysis.repoSourceFiles
    ?? state.session.listRepoSourceFiles();
  if (!state.liveAnalysis.repoSourceFiles) {
    state.liveAnalysis.repoSourceFiles = repoSourceFiles;
  }

  const sourceFileScan = state.liveAnalysis.sourceFileScan
    ?? scanParsedTsconfigSourceFiles(state.session);
  if (!state.liveAnalysis.sourceFileScan) {
    state.liveAnalysis.sourceFileScan = sourceFileScan;
  }

  const structuralRuntime = state.liveAnalysis.structuralRuntime
    ?? buildStructuralClaimGraph(state.session, { sourceFileScan });
  if (!state.liveAnalysis.structuralRuntime) {
    state.liveAnalysis.structuralRuntime = structuralRuntime;
  }

  return {
    repoSourceFiles,
    sourceFileScan,
    structuralRuntime,
  };
}

function setSnapshot<TKind extends SnapshotKind>(
  state: HostSessionState,
  kind: TKind,
  output: SnapshotOutputMap[TKind],
): void {
  (
    state.analysisViews as Partial<Record<SnapshotKind, SnapshotOutputMap[SnapshotKind]>>
  )[kind] = output;
}

function invalidateSession(
  state: HostSessionState,
  args: SessionInvalidateArgs,
): readonly string[] {
  const scope = args.scope === 'project' || !args.files || args.files.length === 0
    ? 'project'
    : 'files';

  if (scope === 'project') {
    state.session.clearProgramCache();
    state.liveAnalysis.repoSourceFiles = undefined;
    state.liveAnalysis.sourceFileScan = undefined;
    state.liveAnalysis.structuralRuntime = undefined;
    for (const kind of ALL_SNAPSHOT_KINDS) {
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
  const affectedKinds = new Set<SnapshotKind>();
  for (const filePath of args.files ?? []) {
    const normalized = normalizeSessionFilePath(state, filePath);
    if (!normalized) continue;

    invalidatedFiles.push(normalized);
    state.dirtyFiles.add(normalized);
    for (const kind of affectedSnapshotKindsForFile(normalized)) {
      affectedKinds.add(kind);
      state.dirtyKinds.add(kind);
    }
  }

  if (affectedKinds.size > 0) {
    state.session.clearProgramCache();
    state.liveAnalysis.repoSourceFiles = undefined;
    state.liveAnalysis.sourceFileScan = undefined;
    state.liveAnalysis.structuralRuntime = undefined;
    state.invalidationKind = 'files';
    state.invalidationCount = invalidatedFiles.length;
  }

  return [...new Set(invalidatedFiles)].sort();
}

function affectedSnapshotKindsForFile(relPath: string): readonly SnapshotKind[] {
  const fileName = basename(relPath);
  if (fileName === 'package.json') {
    return ALL_SNAPSHOT_KINDS;
  }
  if (/^tsconfig(\..+)?\.json$/i.test(fileName)) {
    return ALL_SNAPSHOT_KINDS;
  }
  if (SOURCE_FILE_PATTERN.test(relPath)) {
    return ALL_SNAPSHOT_KINDS;
  }
  return [];
}

function normalizeSessionFilePath(
  state: HostSessionState,
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

function normalizeSnapshotKinds(
  kinds?: readonly SnapshotKind[],
): readonly SnapshotKind[] {
  if (!kinds || kinds.length === 0) {
    return ALL_SNAPSHOT_KINDS;
  }

  const unique = new Set<SnapshotKind>();
  for (const kind of kinds) {
    if (!ALL_SNAPSHOT_KINDS.includes(kind)) {
      throw new Error(`unknown source-analysis kind "${kind}"`);
    }
    unique.add(kind);
  }
  return sortSnapshotKinds(unique);
}

function hasCachedSnapshots(state: HostSessionState): boolean {
  return Object.keys(state.analysisViews).length > 0;
}

function buildInvalidationMeta(
  state: HostSessionState,
): HostInvalidationMeta {
  return {
    kind: state.invalidationKind,
    count: state.invalidationCount,
    dirtyKinds: sortSnapshotKinds(state.dirtyKinds),
    dirtyFiles: [...state.dirtyFiles].sort(),
  };
}

function emptyInvalidationMeta(): HostInvalidationMeta {
  return {
    kind: 'none',
    count: 0,
    dirtyKinds: [],
    dirtyFiles: [],
  };
}

function cloneWarningsByKind(
  state: HostSessionState,
): Partial<Record<SnapshotKind, readonly string[]>> {
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
      }
    }
  }
}

function serializePackageSurface(
  surface: ReturnType<ReturnType<typeof createLegacyProjectionWorkspaceAuthority>['getStructuralPackageSurface']>,
): HostStructuralPackageSurface | null {
  if (!surface) {
    return null;
  }

  const fileEntries = [...surface.files]
    .sort((left, right) => left.localeCompare(right))
    .map((filePath) => ({
      filePath,
      declarations: [...(surface.declarationsByFile.get(filePath) ?? [])],
      exportRecords: [...(surface.exportRecordsByFile.get(filePath) ?? [])],
    }));

  return {
    files: [...surface.files],
    uncoveredFiles: [...surface.uncoveredFiles],
    unresolvedImports: [...surface.unresolvedImports],
    fileEntries,
  };
}

function serializePackageReachability(
  reachability: ReturnType<ReturnType<typeof createLegacyProjectionWorkspaceAuthority>['getPackageReachability']>,
): HostPackageReachability | null {
  if (!reachability) {
    return null;
  }

  return {
    pkg: reachability.pkg,
    files: [...reachability.files],
    roots: [...reachability.roots],
    routeEdges: [...reachability.routeEdges],
    publicSurfaceFiles: [...reachability.publicSurfaceFiles],
    candidateEntryFiles: [...reachability.candidateEntryFiles],
    exerciseFiles: [...reachability.exerciseFiles],
  };
}

function extractSessionId(
  args: HostCommandArgsMap[HostCommandName],
): string | null {
  return typeof args === 'object' && args !== null && 'sessionId' in args && typeof args.sessionId === 'string'
    ? args.sessionId
    : null;
}

function toHostError(error: unknown): HostError {
  if (error instanceof Error) {
    return {
      code: 'HOST_ERROR',
      message: error.message,
    };
  }
  return {
    code: 'HOST_ERROR',
    message: String(error),
  };
}

function assertNever(value: never): never {
  throw new Error(`unhandled source-analysis host command: ${String(value)}`);
}
