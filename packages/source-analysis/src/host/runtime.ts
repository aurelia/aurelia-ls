import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { createAuditAnswer } from '../audit.js';
import type { AnswerRef } from '../answer-card.js';
import type { AnswerDocument } from '../answer-document.js';
import {
  renderAnswerDocumentToJson,
  renderAnswerDocumentToPlainText,
} from '../answer-renderer.js';
import { createSnapshotPaths, deriveSnapshotTargetFromRepoPath } from '../snapshot-config.js';
import { loadCurrentSnapshots } from '../current-snapshots.js';
import {
  SNAPSHOT_KINDS,
  type SnapshotKind,
} from '../snapshots.js';
import { CapabilityIngress } from '../capability-ingress.js';
import type { InquiryExecutionSummary } from '../inquiry-ingress.js';
import { InquiryIngress } from '../inquiry-ingress.js';
import type { ConsumerKind } from '../inquiry-policy.js';
import { resolveInquiryPolicy } from '../inquiry-policy.js';
import type { FocusKind } from '../inquiry-model.js';
import { createNavigationEpisode } from '../navigation.js';
import { createRouteWitnessAnswer } from '../route-witness.js';
import type { ProgramReuseOptions } from '../program-reuse-options.js';
import { generateDepsAnalysis } from '../deps/analyze.js';
import { generateExportsAnalysis } from '../exports/analyze.js';
import {
  scanParsedTsconfigSourceFiles,
  type ParsedTsconfigSourceFileScanResult,
} from '../tsconfig-source-files.js';
import { generateTypeRefsAnalysis } from '../typerefs/analyze.js';
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
  type AskQuestionArgs,
  type AskQuestionExecution,
  type AskQuestionExecutionStep,
  type AskQuestionResult,
  type DescribeInquiriesArgs,
  type DescribeInquiriesResult,
  type DescribeCapabilitiesArgs,
  type DescribeCapabilitiesResult,
  type PlanInquiryArgs,
  type PlanInquiryResult,
  type PlanQuestionArgs,
  type PlanQuestionResult,
  type RepairCommandArgs,
  type RepairCommandResult,
  type AuditPackageQueryArgs,
  type AuditPackageQueryResult,
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

interface InquiryExecutionOutcome {
  readonly usedSessionId?: string;
  readonly invalidation: HostInvalidationMeta;
  readonly cache: HostCacheMeta;
  readonly refreshedKinds: readonly SnapshotKind[];
  readonly freshness: 'live' | 'snapshot';
  readonly execution: AskQuestionExecution;
}

const DEFAULT_CACHE: HostCacheMeta = { hit: false, tier: 'cold' };
const ALL_SNAPSHOT_KINDS = SNAPSHOT_KINDS;
const SOURCE_FILE_PATTERN = /(\.d\.ts|\.tsx|\.ts|\.mts|\.cts)$/i;

export class SnapshotHostRuntime {
  readonly #sessions = new HostSessionManager();
  readonly #ingress = new CapabilityIngress();
  readonly #publicIngress = new InquiryIngress();

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
    switch (invocation.command) {
      case 'describe.inquiries': return this.#describeInquiries(invocation.args as DescribeInquiriesArgs);
      case 'describe.capabilities': return this.#describeCapabilities(invocation.args as DescribeCapabilitiesArgs);
      case 'plan.inquiry': return this.#planInquiry(invocation.args as PlanInquiryArgs);
      case 'plan.question': return this.#planQuestion(invocation.args as PlanQuestionArgs);
      case 'ask.question': return this.#askQuestion(invocation.args as AskQuestionArgs);
      case 'repair.command': return this.#repairCommand(invocation.args as RepairCommandArgs);
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
      case 'materializeSnapshots': return this.#materializeSnapshots(invocation.args as MaterializeSnapshotsArgs);
      default: return assertNever(invocation.command);
    }
  }

  #describeInquiries(args: DescribeInquiriesArgs): CommandOutcome {
    const answer = this.#publicIngress.createDiscoveryAnswer({
      question: args.question,
      focusKind: args.focusKind,
      familyId: args.familyId,
      includeExamples: args.includeExamples,
      topK: args.topK,
      readMode: args.readMode,
      consumer: args.consumer,
      worldFrame: {
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: 'live',
      },
    });
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: DescribeInquiriesResult = {
      answer,
      ...(rendered ? { rendered } : {}),
    };
    return {
      result,
      invalidation: emptyInvalidationMeta(),
    };
  }

  #describeCapabilities(args: DescribeCapabilitiesArgs): CommandOutcome {
    const answer = this.#ingress.createDiscoveryAnswer({
      question: args.question,
      focusKind: args.focusKind,
      includeExamples: args.includeExamples,
      topK: args.topK,
      readMode: args.readMode,
      consumer: args.consumer,
      worldFrame: {
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: 'live',
      },
    });
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: DescribeCapabilitiesResult = {
      answer,
      ...(rendered ? { rendered } : {}),
    };
    return {
      result,
      invalidation: emptyInvalidationMeta(),
    };
  }

  #planQuestion(args: PlanQuestionArgs): CommandOutcome {
    const sessionState = args.sessionId ? this.#tryGetSession(args.sessionId) : undefined;
    const answer = this.#ingress.createPlanAnswer({
      question: args.question,
      sessionId: args.sessionId,
      focusKind: args.focusKind,
      focusValue: args.focusValue,
      readMode: args.readMode,
      consumer: args.consumer,
      worldFrame: {
        ...(sessionState ? { repoPath: sessionState.repoPath, target: sessionState.target } : {}),
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: 'live',
      },
    });
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: PlanQuestionResult = {
      answer,
      ...(rendered ? { rendered } : {}),
    };
    return {
      result,
      sessionId: sessionState?.sessionId,
      invalidation: sessionState ? buildInvalidationMeta(sessionState) : emptyInvalidationMeta(),
      cache: sessionState
        ? { hit: hasCachedSnapshots(sessionState), tier: hasCachedSnapshots(sessionState) ? 'warm' : 'cold' }
        : DEFAULT_CACHE,
    };
  }

  #planInquiry(args: PlanInquiryArgs): CommandOutcome {
    const sessionState = args.sessionId ? this.#tryGetSession(args.sessionId) : undefined;
    const answer = this.#publicIngress.createPlanAnswer({
      question: args.question,
      sessionId: args.sessionId,
      repoPath: args.repoPath ?? sessionState?.repoPath ?? process.cwd(),
      target: args.target ?? sessionState?.target,
      focusKind: args.focusKind,
      focusValue: args.focusValue,
      familyId: args.familyId,
      readMode: args.readMode,
      consumer: args.consumer,
      worldFrame: {
        repoPath: args.repoPath ?? sessionState?.repoPath ?? process.cwd(),
        target: args.target ?? sessionState?.target,
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: 'live',
      },
    });
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: PlanInquiryResult = {
      answer,
      ...(rendered ? { rendered } : {}),
    };
    return {
      result,
      sessionId: sessionState?.sessionId,
      invalidation: sessionState ? buildInvalidationMeta(sessionState) : emptyInvalidationMeta(),
      cache: sessionState
        ? { hit: hasCachedSnapshots(sessionState), tier: hasCachedSnapshots(sessionState) ? 'warm' : 'cold' }
        : DEFAULT_CACHE,
    };
  }

  #repairCommand(args: RepairCommandArgs): CommandOutcome {
    const answer = this.#ingress.createRepairAnswer({
      command: args.command,
      args: args.args,
      question: args.question,
      readMode: args.readMode,
      consumer: args.consumer,
      worldFrame: {
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: 'live',
      },
    });
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: RepairCommandResult = {
      answer,
      ...(rendered ? { rendered } : {}),
    };
    return {
      result,
      invalidation: emptyInvalidationMeta(),
    };
  }

  #askQuestion(args: AskQuestionArgs): CommandOutcome {
    const existingSession = args.sessionId ? this.#tryGetSession(args.sessionId) : undefined;
    const repoPath = args.repoPath ?? existingSession?.repoPath ?? process.cwd();
    const target = args.target ?? existingSession?.target;
    const plan = this.#publicIngress.plan({
      question: args.question,
      sessionId: args.sessionId,
      repoPath,
      target,
      focusKind: args.focusKind,
      focusValue: args.focusValue,
      familyId: args.familyId,
    });

    const executed = plan.status === 'ready' && plan.primaryStep
      ? this.#tryExecuteInquiryPlanAgainstCurrentSnapshots(plan, {
        repoPath,
        target,
      }) ?? this.#executeInquiryPlan(plan, {
        existingSession,
        repoPath,
        target,
      })
      : undefined;
    const answer = this.#publicIngress.createAskAnswer({
      question: args.question,
      sessionId: executed?.usedSessionId ?? args.sessionId,
      repoPath,
      target,
      focusKind: args.focusKind,
      focusValue: args.focusValue,
      familyId: args.familyId,
      readMode: args.readMode,
      consumer: args.consumer,
      worldFrame: {
        repoPath,
        target,
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: executed?.freshness ?? 'live',
      },
      plan,
      execution: executed ? summarizeInquiryExecution(executed) : undefined,
    });
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: AskQuestionResult = {
      answer,
      ...(rendered ? { rendered } : {}),
      ...(executed ? { execution: executed.execution } : {}),
    };
    return {
      result,
      sessionId: existingSession?.sessionId,
      invalidation: executed?.invalidation ?? (existingSession ? buildInvalidationMeta(existingSession) : emptyInvalidationMeta()),
      cache: executed?.cache ?? (existingSession
        ? { hit: hasCachedSnapshots(existingSession), tier: hasCachedSnapshots(existingSession) ? 'warm' : 'cold' }
        : DEFAULT_CACHE),
      refreshedKinds: executed?.refreshedKinds ?? [],
    };
  }

  #sessionOpen(args: SessionOpenArgs): CommandOutcome {
    const state = this.#sessions.open(args);
    const result: SessionOpenResult = {
      sessionId: state.sessionId,
      repoPath: state.repoPath,
      target: state.target,
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
    const hadWarmSnapshot = requestedKinds.some((kind) => state.snapshots[kind] !== undefined);
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
    const depsQuery = ensureFreshSnapshot(state, 'deps', args.refreshIfNeeded);
    const typeRefsQuery = ensureFreshSnapshot(state, 'typerefs', args.refreshIfNeeded);
    const exportsQuery = ensureFreshSnapshot(state, 'exports', args.refreshIfNeeded);

    const warnings = [
      ...depsQuery.warnings,
      ...typeRefsQuery.warnings,
      ...exportsQuery.warnings,
    ];
    const refreshedKinds = sortSnapshotKinds([
      ...depsQuery.refreshedKinds,
      ...typeRefsQuery.refreshedKinds,
      ...exportsQuery.refreshedKinds,
    ]);
    const answer = createAuditAnswer(
      {
        inquiryEpisode: 'inventory-and-audit-sweep',
        focusRef: { kind: 'package', value: args.packageName },
        questionRoute: 'inventory',
        readMode: args.readMode ?? 'summary-card',
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
    );
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: AuditPackageQueryResult = {
      answer,
      ...(rendered ? { rendered } : {}),
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

  #queryRouteWitness(args: RouteWitnessQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const depsQuery = ensureFreshSnapshot(state, 'deps', args.refreshIfNeeded);
    const typeRefsQuery = ensureFreshSnapshot(state, 'typerefs', args.refreshIfNeeded);
    const exportsQuery = ensureFreshSnapshot(state, 'exports', args.refreshIfNeeded);

    const warnings = [
      ...depsQuery.warnings,
      ...typeRefsQuery.warnings,
      ...exportsQuery.warnings,
    ];
    const refreshedKinds = sortSnapshotKinds([
      ...depsQuery.refreshedKinds,
      ...typeRefsQuery.refreshedKinds,
      ...exportsQuery.refreshedKinds,
    ]);
    const answer = createRouteWitnessAnswer(
      {
        inquiryEpisode: 'bounded-closure-explanation',
        focusRef: {
          kind: args.focusKind,
          value: args.focusValue,
        },
        questionRoute: 'route',
        readMode: args.readMode ?? 'focus-card',
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
    );
    const rendered = buildRenderedView(answer, args.consumer, args.renderStyle);
    const result: RouteWitnessQueryResult = {
      answer,
      ...(rendered ? { rendered } : {}),
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

  #queryNavigate(args: NavigateQueryArgs): CommandOutcome {
    const state = this.#sessions.get(args.sessionId);
    const depsQuery = ensureFreshSnapshot(state, 'deps', args.refreshIfNeeded);
    const typeRefsQuery = ensureFreshSnapshot(state, 'typerefs', args.refreshIfNeeded);
    const exportsQuery = ensureFreshSnapshot(state, 'exports', args.refreshIfNeeded);

    const warnings = [
      ...depsQuery.warnings,
      ...typeRefsQuery.warnings,
      ...exportsQuery.warnings,
    ];
    const refreshedKinds = sortSnapshotKinds([
      ...depsQuery.refreshedKinds,
      ...typeRefsQuery.refreshedKinds,
      ...exportsQuery.refreshedKinds,
    ]);
    const episode = createNavigationEpisode(
      {
        inquiryEpisode: 'orient-and-localize',
        focusRef: {
          kind: args.focusKind,
          value: args.focusValue,
        },
        questionRoute: args.questionRoute ?? 'join',
        readMode: args.readMode ?? 'focus-card',
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
    );
    const rendered = buildRenderedView(episode.answer, args.consumer, args.renderStyle);
    const result: NavigateQueryResult = {
      answer: episode.answer,
      ...(rendered ? { rendered } : {}),
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
    const kinds = normalizeSnapshotKinds(args.kinds);
    const outDir = resolve(
      args.outDir ?? createSnapshotPaths(import.meta.url).snapshotRootPath,
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

  #tryExecuteInquiryPlanAgainstCurrentSnapshots(
    plan: { readonly steps: readonly { readonly command: string; readonly args: Record<string, unknown>; }[]; readonly primaryStep?: { readonly command: string; readonly args: Record<string, unknown>; } },
    context: {
      readonly repoPath: string;
      readonly target?: string;
    },
  ): InquiryExecutionOutcome | undefined {
    const primaryStep = plan.primaryStep;
    if (!primaryStep || !supportsCurrentSnapshotExecution(primaryStep.command)) {
      return undefined;
    }

    const target = context.target ?? deriveSnapshotTargetFromRepoPath(context.repoPath);
    try {
      const snapshots = loadCurrentSnapshots(target);
      const primaryEnvelope = createCurrentSnapshotEnvelope(primaryStep.command, primaryStep.args, snapshots, context.repoPath, target);
      if (!primaryEnvelope) {
        return undefined;
      }
      const steps: AskQuestionExecutionStep[] = plan.steps.map((step) => ({
        command: step.command,
        args: step.args,
        status: step.command === 'session.open' ? 'skipped' : step.command === primaryStep.command ? 'executed' : 'skipped',
        detail: step.command === 'session.open'
          ? 'Used current materialized snapshots instead of opening a transient live session.'
          : step.command === primaryStep.command
            ? 'Executed against the current snapshot contract.'
            : 'This step was not needed once current snapshots were available.',
      }));

      return {
        invalidation: emptyInvalidationMeta(),
        cache: { hit: true, tier: 'warm' },
        refreshedKinds: [],
        freshness: 'snapshot',
        execution: {
          ephemeralSession: false,
          steps,
          primaryEnvelope,
        },
      };
    } catch {
      return undefined;
    }
  }

  #executeInquiryPlan(
    plan: { readonly steps: readonly { readonly command: string; readonly args: Record<string, unknown>; }[] },
    context: {
      readonly existingSession?: HostSessionState;
      readonly repoPath: string;
      readonly target?: string;
    },
  ): InquiryExecutionOutcome {
    const steps: AskQuestionExecutionStep[] = [];
    let sessionState = context.existingSession;
    let openedEphemeralSession = false;
    let primaryEnvelope: HostCommandEnvelope<unknown> | undefined;
    let cache: HostCacheMeta = context.existingSession
      ? { hit: hasCachedSnapshots(context.existingSession), tier: hasCachedSnapshots(context.existingSession) ? 'warm' : 'cold' }
      : DEFAULT_CACHE;
    let invalidation = context.existingSession ? buildInvalidationMeta(context.existingSession) : emptyInvalidationMeta();
    let refreshedKinds: readonly SnapshotKind[] = [];

    try {
      for (const step of plan.steps) {
        if (step.command === 'session.open') {
          if (sessionState) {
            steps.push({
              command: step.command,
              args: step.args,
              status: 'skipped',
              detail: `Reusing the existing session "${sessionState.sessionId}".`,
            });
            continue;
          }

          const openOutcome = this.#sessionOpen({
            repoPath: asStepString(step.args.repoPath) ?? context.repoPath,
            ...(asStepString(step.args.target) ? { target: asStepString(step.args.target) } : {}),
          });
          const openResult = openOutcome.result as SessionOpenResult;
          sessionState = this.#sessions.get(openResult.sessionId);
          openedEphemeralSession = true;
          cache = openOutcome.cache ?? DEFAULT_CACHE;
          invalidation = openOutcome.invalidation ?? buildInvalidationMeta(sessionState);
          refreshedKinds = openOutcome.refreshedKinds ?? [];
          steps.push({
            command: step.command,
            args: step.args,
            status: 'executed',
            detail: `Opened session "${openResult.sessionId}".`,
          });
          continue;
        }

        const resolvedArgs = resolveInquiryStepArgs(step.args, sessionState?.sessionId);
        if (resolvedArgs === null) {
          steps.push({
            command: step.command,
            args: step.args,
            status: 'failed',
            detail: 'The inquiry plan still requires a session before this step can execute.',
          });
          break;
        }

        const envelope = this.execute({
          command: step.command as HostCommandName,
          args: resolvedArgs as HostCommandArgsMap[HostCommandName],
        });
        primaryEnvelope ??= envelope as HostCommandEnvelope<unknown>;
        cache = envelope.meta.cache;
        invalidation = envelope.meta.invalidation;
        refreshedKinds = envelope.meta.refreshedKinds;
        steps.push({
          command: step.command,
          args: resolvedArgs,
          status: envelope.status === 'ok' && envelope.errors.length === 0 ? 'executed' : 'failed',
          ...(envelope.errors[0] ? { detail: envelope.errors[0].message } : {}),
        });
        if (envelope.status !== 'ok' || envelope.errors.length > 0) {
          break;
        }
        if (envelope.meta.sessionId) {
          sessionState = this.#tryGetSession(envelope.meta.sessionId) ?? sessionState;
        }
      }
    } finally {
      if (openedEphemeralSession && sessionState) {
        this.#sessionClose({ sessionId: sessionState.sessionId });
      }
    }

    return {
      usedSessionId: sessionState?.sessionId,
      invalidation,
      cache,
      refreshedKinds,
      freshness: 'live',
      execution: {
        usedSessionId: sessionState?.sessionId,
        ephemeralSession: openedEphemeralSession,
        steps,
        ...(primaryEnvelope ? { primaryEnvelope } : {}),
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

export function createSnapshotHostRuntime(): SnapshotHostRuntime {
  return new SnapshotHostRuntime();
}

function summarizeInquiryExecution(
  executed: InquiryExecutionOutcome,
): InquiryExecutionSummary {
  const primaryEnvelope = executed.execution.primaryEnvelope;
  if (!primaryEnvelope) {
    return {
      status: 'skipped',
      ephemeralSession: executed.execution.ephemeralSession,
      ...(executed.usedSessionId ? { sessionId: executed.usedSessionId } : {}),
      facts: [],
      lines: [],
    };
  }

  return {
    status: primaryEnvelope.status === 'ok' && primaryEnvelope.errors.length === 0 ? 'executed' : 'failed',
    command: primaryEnvelope.command,
    ...(executed.usedSessionId ? { sessionId: executed.usedSessionId } : {}),
    ephemeralSession: executed.execution.ephemeralSession,
    facts: summarizePrimaryFacts(primaryEnvelope),
    lines: summarizePrimaryLines(primaryEnvelope),
  };
}

function supportsCurrentSnapshotExecution(command: string): boolean {
  return command === 'query.audit.package'
    || command === 'query.route.witness'
    || command === 'query.navigate'
    || command === 'query.deps.summary'
    || command === 'query.typerefs.summary'
    || command === 'query.exports.summary';
}

function createCurrentSnapshotEnvelope(
  command: string,
  args: Record<string, unknown>,
  snapshots: ReturnType<typeof loadCurrentSnapshots>,
  repoPath: string,
  target: string,
): HostCommandEnvelope<unknown> | undefined {
  switch (command) {
    case 'query.audit.package': {
      const packageName = asStepString(args.packageName);
      if (!packageName) {
        return undefined;
      }
      const answer = createAuditAnswer({
        inquiryEpisode: 'inventory-and-audit-sweep',
        focusRef: { kind: 'package', value: packageName },
        questionRoute: 'inventory',
        readMode: 'summary-card',
        worldFrame: {
          repoPath,
          target,
          regimeAnchor: 'batch',
          partiality: 'complete',
          freshness: 'snapshot',
        },
      }, snapshots);
      return snapshotEnvelope(command, {
        answer,
        warnings: snapshots.warnings,
      });
    }
    case 'query.route.witness': {
      const focusKind = args.focusKind === 'file' || args.focusKind === 'type' ? args.focusKind : undefined;
      const focusValue = asStepString(args.focusValue);
      if (!focusKind || !focusValue) {
        return undefined;
      }
      const answer = createRouteWitnessAnswer({
        inquiryEpisode: 'bounded-closure-explanation',
        focusRef: { kind: focusKind, value: focusValue },
        questionRoute: 'route',
        readMode: 'focus-card',
        worldFrame: {
          repoPath,
          target,
          regimeAnchor: 'batch',
          partiality: 'complete',
          freshness: 'snapshot',
        },
      }, snapshots);
      return snapshotEnvelope(command, {
        answer,
        warnings: snapshots.warnings,
      });
    }
    case 'query.navigate': {
      const focusKind = args.focusKind === 'package' || args.focusKind === 'file' || args.focusKind === 'type' || args.focusKind === 'export'
        ? args.focusKind
        : undefined;
      const focusValue = asStepString(args.focusValue);
      if (!focusKind || !focusValue) {
        return undefined;
      }
      const episode = createNavigationEpisode({
        inquiryEpisode: 'orient-and-localize',
        focusRef: { kind: focusKind, value: focusValue },
        questionRoute: args.questionRoute === 'route' || args.questionRoute === 'search' || args.questionRoute === 'join'
          ? args.questionRoute
          : 'join',
        readMode: 'focus-card',
        worldFrame: {
          repoPath,
          target,
          regimeAnchor: 'batch',
          partiality: 'complete',
          freshness: 'snapshot',
        },
      }, snapshots);
      return snapshotEnvelope(command, {
        answer: episode.answer,
        warnings: snapshots.warnings,
      });
    }
    case 'query.deps.summary':
      return snapshotEnvelope(command, {
        kind: 'deps',
        generatedAt: snapshots.deps.generated_at,
        summary: snapshots.deps.summary,
        warnings: snapshots.warnings,
      });
    case 'query.typerefs.summary':
      return snapshotEnvelope(command, {
        kind: 'typerefs',
        generatedAt: snapshots.typeRefs.generated_at,
        summary: snapshots.typeRefs.summary,
        warnings: snapshots.warnings,
      });
    case 'query.exports.summary':
      return snapshotEnvelope(command, {
        kind: 'exports',
        generatedAt: snapshots.exports.generated_at,
        summary: snapshots.exports.summary,
        warnings: snapshots.warnings,
      });
    default:
      return undefined;
  }
}

function buildRenderedView<TResult extends { document?: AnswerDocument<AnswerRef> }>(
  answer: { readonly query: { readonly focusRef: { readonly kind: FocusKind }; readonly inquiryEpisode?: string; readonly readMode?: string; }; readonly outcome: { readonly value?: TResult } },
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

  const policy = resolveInquiryPolicy(answer.query as Parameters<typeof resolveInquiryPolicy>[0], {
    focusKind: answer.query.focusRef.kind,
    inquiryEpisode: (answer.query.inquiryEpisode ?? 'orient-and-localize') as Parameters<typeof resolveInquiryPolicy>[1]['inquiryEpisode'],
    readMode: (answer.query.readMode ?? 'focus-card') as Parameters<typeof resolveInquiryPolicy>[1]['readMode'],
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

function snapshotEnvelope(
  command: string,
  result: unknown,
): HostCommandEnvelope<unknown> {
  return {
    schemaVersion: HOST_SCHEMA_VERSION,
    command: command as HostCommandName,
    status: 'ok',
    result,
    meta: {
      durationMs: 0,
      cache: { hit: true, tier: 'warm' },
      invalidation: emptyInvalidationMeta(),
      refreshedKinds: [],
    },
    errors: [],
  };
}

function summarizePrimaryFacts(
  envelope: HostCommandEnvelope<unknown>,
): readonly { readonly label: string; readonly value: string }[] {
  const result = envelope.result as Record<string, unknown> | null;
  switch (envelope.command) {
    case 'query.deps.summary': {
      const summary = (result as unknown as SessionSummaryQueryResult<'deps'>).summary;
      return [
        { label: 'files analyzed', value: `${summary.files_analyzed}` },
        { label: 'uncovered files', value: `${summary.uncovered_files}` },
        { label: 'unresolved imports', value: `${summary.unresolved}` },
      ];
    }
    case 'query.typerefs.summary': {
      const summary = (result as unknown as SessionSummaryQueryResult<'typerefs'>).summary;
      return [
        { label: 'declarations', value: `${summary.type_declarations}` },
        { label: 'references', value: `${summary.type_references}` },
      ];
    }
    case 'query.exports.summary': {
      const summary = (result as unknown as SessionSummaryQueryResult<'exports'>).summary;
      return [
        { label: 'packages', value: `${summary.packages_analyzed}` },
        { label: 'exports', value: `${summary.exports ?? 'unknown'}` },
      ];
    }
    case 'session.status': {
      const sessions = (result as unknown as SessionStatusResult).sessions;
      return [
        { label: 'sessions', value: `${sessions.length}` },
        { label: 'warm sessions', value: `${sessions.filter((session) => session.cachedKinds.length > 0).length}` },
      ];
    }
    case 'session.refresh': {
      const refresh = result as unknown as SessionRefreshResult;
      return [
        { label: 'refreshed kinds', value: refresh.refreshedKinds.join(', ') || 'none' },
        { label: 'dirty kinds', value: refresh.dirtyKinds.join(', ') || 'none' },
      ];
    }
    case 'materializeSnapshots': {
      const materialized = result as unknown as MaterializeSnapshotsResult;
      return [
        { label: 'out dir', value: materialized.outDir },
        { label: 'files written', value: `${Object.keys(materialized.files).length}` },
      ];
    }
    default: {
      const answer = (result as { answer?: { outcome?: { value?: { summaryLines?: readonly string[] } } } }).answer;
      if (answer?.outcome?.value) {
        const value = answer.outcome.value as { title?: string; primaryRef?: { label?: string; value?: string } };
        return [
          ...(value.title ? [{ label: 'answer title', value: value.title }] : []),
          ...(value.primaryRef?.value ? [{ label: 'primary ref', value: value.primaryRef.value }] : []),
        ];
      }
      return [];
    }
  }
}

function summarizePrimaryLines(
  envelope: HostCommandEnvelope<unknown>,
): readonly string[] {
  const result = envelope.result as Record<string, unknown> | null;
  switch (envelope.command) {
    case 'query.deps.summary': {
      const summary = (result as unknown as SessionSummaryQueryResult<'deps'>).summary;
      return [
        `Dependency posture covers ${summary.files_analyzed} files with ${summary.uncovered_files} uncovered files and ${summary.unresolved} unresolved imports.`,
      ];
    }
    case 'query.typerefs.summary':
    case 'query.exports.summary':
    case 'query.audit.package':
    case 'query.route.witness':
    case 'query.navigate':
    case 'describe.capabilities':
    case 'describe.inquiries':
    case 'plan.question':
    case 'plan.inquiry':
    case 'repair.command': {
      const answer = (result as { answer?: { outcome?: { value?: { summaryLines?: readonly string[] } } } }).answer;
      return answer?.outcome?.value?.summaryLines?.slice(0, 4) ?? [];
    }
    case 'session.status': {
      const sessions = (result as unknown as SessionStatusResult).sessions;
      return [
        `Session status currently tracks ${sessions.length} hosted session${sessions.length === 1 ? '' : 's'}.`,
      ];
    }
    case 'session.refresh': {
      const refresh = result as unknown as SessionRefreshResult;
      return [
        refresh.refreshedKinds.length > 0
          ? `Refreshed ${refresh.refreshedKinds.join(', ')}.`
          : 'No dirty kinds required refresh.',
      ];
    }
    case 'materializeSnapshots': {
      const materialized = result as unknown as MaterializeSnapshotsResult;
      return [
        `Materialized ${Object.keys(materialized.files).length} snapshot file${Object.keys(materialized.files).length === 1 ? '' : 's'} to ${materialized.outDir}.`,
      ];
    }
    default:
      return [];
  }
}

function resolveInquiryStepArgs(
  args: Record<string, unknown>,
  sessionId: string | undefined,
): Record<string, unknown> | null {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === '$session.open') {
      if (!sessionId) {
        return null;
      }
      resolved[key] = sessionId;
      continue;
    }
    resolved[key] = value;
  }
  return resolved;
}

function asStepString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
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
  const sharedSourceFileScan = shouldShareSourceFileScan(requestedKinds)
    ? scanParsedTsconfigSourceFiles(state.session)
    : undefined;
  const refreshedKinds: SnapshotKind[] = [];
  const kindsToRefresh = options.force
    ? requestedKinds
    : requestedKinds.filter((kind) => state.dirtyKinds.has(kind) || state.snapshots[kind] === undefined);

  for (const kind of kindsToRefresh) {
    const result = runAnalysis(state, kind, sharedSourceFileScan);
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
  sharedSourceFileScan?: ParsedTsconfigSourceFileScanResult,
): {
  output: SnapshotOutputMap[TKind];
  warnings: readonly string[];
} {
  const analysisOptions: ProgramReuseOptions = {
    cachePrograms: state.warmPrograms,
  };

  switch (kind) {
    case 'deps': {
      const result = generateDepsAnalysis(state.session, analysisOptions, sharedSourceFileScan);
      return {
        output: result.output as SnapshotOutputMap[TKind],
        warnings: result.warnings,
      };
    }
    case 'typerefs': {
      const result = generateTypeRefsAnalysis(state.session, analysisOptions, sharedSourceFileScan);
      return {
        output: result.output as SnapshotOutputMap[TKind],
        warnings: result.warnings,
      };
    }
    case 'exports': {
      const result = generateExportsAnalysis(state.session, analysisOptions);
      return {
        output: result.output as SnapshotOutputMap[TKind],
        warnings: result.warnings,
      };
    }
    default:
      return assertNever(kind);
  }
}

function shouldShareSourceFileScan(
  requestedKinds: readonly SnapshotKind[],
): boolean {
  const unique = new Set(requestedKinds);
  return unique.has('deps') && unique.has('typerefs');
}

function setSnapshot<TKind extends SnapshotKind>(
  state: HostSessionState,
  kind: TKind,
  output: SnapshotOutputMap[TKind],
): void {
  (
    state.snapshots as Partial<Record<SnapshotKind, SnapshotOutputMap[SnapshotKind]>>
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
  return Object.keys(state.snapshots).length > 0;
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
