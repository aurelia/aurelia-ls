import { AsyncLocalStorage } from 'node:async_hooks';

import type {
  SemanticRuntimeAnalysisBasis,
  SemanticRuntimeAnswer,
  SemanticRuntimeOptions,
  SemanticRuntimeSessionAnalysisCacheClearResult,
  SemanticRuntimeSessionAnalysisCacheClearRequest,
  SemanticRuntimeSessionAnalysisCacheOverviewRequest,
  SemanticRuntimeSessionAnalysisCacheOverviewResult,
} from './contracts.js';
import type {
  SemanticRuntimeAnalysisReceipt,
  SemanticRuntimeAnalysisReceiptBuilder,
  SemanticRuntimeAnalysisReceiptValidation,
} from './analysis-receipt.js';
import {
  revokeSemanticRuntimeAnalysisReceiptFor,
  semanticRuntimeAnalysisReceiptFor,
} from './analysis-receipt.js';
import { SemanticRuntime } from './runtime.js';
import {
  semanticRuntimeOptionsForWorkspaceDescriptor,
  semanticWorkspaceDescriptorForRuntimeOptions,
  type SemanticWorkspaceDescriptor,
} from './workspace-descriptor.js';
import {
  SemanticSourceWorldCurrentnessKind,
  resolveSemanticSourceWorld,
  type ResolvedSemanticSourceWorld,
  type EquivalentSemanticSourceWorldResult,
  type FreshBootRequiredSemanticSourceWorldResult,
  type SemanticSourceWorldCurrentnessResult,
} from '../boot/source-world.js';
import { SemanticRuntimeProjectInputAuthority } from '../kernel/project-input.js';
import {
  isSemanticRuntimeAnalysisCurrentnessError,
  semanticRuntimeAnalysisCurrentnessFailure,
  type SemanticRuntimeAnalysisCurrentnessError,
  type SemanticRuntimeAnalysisCurrentnessFailure,
} from '../kernel/analysis-currentness.js';

/** Runtime options whose store namespace is owned privately by the managed session. */
export type ManagedSemanticWorkspaceSessionOptions = Omit<SemanticRuntimeOptions, 'storeKey'>;

/** Explicit transport-facing runtime answer surface borrowed for one managed operation. */
export type ManagedSemanticWorkspaceRuntimeReadFacade = Pick<
  SemanticRuntime,
  | 'summary'
  | 'authoredSourceOwnership'
  | 'nativeProjectConfigurations'
  | 'projectConfigurationDiagnostics'
  | 'appQueryCatalog'
  | 'appBuilderQueryCatalog'
  | 'answerAppBuilderQuery'
  | 'answerAppQuery'
  | 'answerAppQueries'
  | 'templateCompletions'
  | 'templateCursorInfo'
  | 'templateDiagnostics'
>;

/** Callback-scoped access to one pinned runtime and composition of every semantic answer used by the result. */
export interface ManagedSemanticWorkspaceOperationContext {
  /** Portable resolved semantic-plan revision pinned for this complete consumer operation. */
  readonly sourceWorldRevision: string;
  /**
   * Facade calls auto-compose their answer receipts and any still-pending promise is drained before egress.
   * Answer proofs are borrowed only for this callback and revoked at its close; retained envelopes keep portable data.
   */
  readonly runtime: ManagedSemanticWorkspaceRuntimeReadFacade;
  /** Compose an answer obtained outside this facade; do not re-absorb a facade answer. */
  absorb<TValue>(answer: SemanticRuntimeAnswer<TValue>): SemanticRuntimeAnswer<TValue>;
  /** Read exact host text as part of this operation's final analysis receipt. Absolute paths only. */
  readSourceText(fileName: string): string | undefined;
  /** Reuse one retained completed-operation proof when it is still exact for this pinned source world. */
  tryAbsorbReceipt(receipt: ManagedSemanticWorkspaceOperationReceipt): boolean;
}

/** One complete consumer operation, including projection into its transport or presentation result. */
export type ManagedSemanticWorkspaceOperation<TResult> = (
  context: ManagedSemanticWorkspaceOperationContext,
) => TResult | PromiseLike<TResult>;

/** Projection of one shared, source-world-pinned analysis-cache overview. */
export type ManagedSemanticWorkspaceAnalysisCacheOverviewProjector<TResult> = (
  answer: SemanticRuntimeAnswer<SemanticRuntimeSessionAnalysisCacheOverviewResult>,
) => TResult | PromiseLike<TResult>;

/** Source-world observation immediately after one exclusive analysis-cache clear. */
export interface ManagedSemanticWorkspaceAnalysisCacheClearOutcome {
  readonly status: 'current' | 'reconciliation-pending';
  readonly clearedSourceWorldRevision: string;
  readonly nextSourceWorldRevision: string;
  readonly currentnessKind: ChangedSemanticSourceWorldResult['kind'] | null;
}

/** Projection of the answer produced by one already-applied, never-replayed exclusive cache clear. */
export type ManagedSemanticWorkspaceAnalysisCacheClearProjector<TResult> = (
  answer: SemanticRuntimeAnswer<SemanticRuntimeSessionAnalysisCacheClearResult>,
  outcome: ManagedSemanticWorkspaceAnalysisCacheClearOutcome,
) => TResult | PromiseLike<TResult>;

/** A completed managed operation plus its caller-owned exact proof. */
export interface ManagedSemanticWorkspaceOperationResult<TResult> {
  readonly value: TResult;
  readonly receipt: ManagedSemanticWorkspaceOperationReceipt;
}

const managedSemanticWorkspaceAnalysisReceipts = new WeakMap<
  ManagedSemanticWorkspaceOperationReceipt,
  SemanticRuntimeAnalysisReceipt
>();

/**
 * Opaque process-private proof retained by a consumer cache.
 *
 * Validate and compose it only through `ManagedSemanticWorkspaceOperationContext.tryAbsorbReceipt`, where source-world
 * ingress and egress remain pinned around the proof. The portable basis is safe to serialize; the capability is not.
 */
export class ManagedSemanticWorkspaceOperationReceipt {
  private constructor(readonly analysisBasis: SemanticRuntimeAnalysisBasis) {}

  dispose(): void {
    const receipt = managedSemanticWorkspaceAnalysisReceipts.get(this);
    if (receipt == null) {
      return;
    }
    managedSemanticWorkspaceAnalysisReceipts.delete(this);
    receipt.dispose();
  }
}

type ChangedSemanticSourceWorldResult =
  | EquivalentSemanticSourceWorldResult
  | FreshBootRequiredSemanticSourceWorldResult;

interface ManagedSemanticWorkspaceIncarnation {
  readonly runtime: SemanticRuntime;
  sourceWorld: ResolvedSemanticSourceWorld;
  acceptingOperations: boolean;
  activeOperationCount: number;
  invalidation: ChangedSemanticSourceWorldResult | null;
  forceFreshReplacement: boolean;
  retirementClearRequired: boolean;
  drainPromise: Promise<void> | null;
  resolveDrain: (() => void) | null;
}

interface ManagedSemanticWorkspaceOperationScope {
  readonly session: ManagedSemanticWorkspaceSession;
  readonly parent: ManagedSemanticWorkspaceOperationScope | null;
  active: boolean;
}

type ManagedSemanticWorkspaceOperationAction =
  | 'run'
  | 'analysis-cache-overview'
  | 'clear-analysis-cache'
  | 'dispose';

type ManagedSemanticWorkspaceTransitionKind = 'reconcile' | 'clear-analysis-cache' | 'dispose';

let nextManagedSessionSequence = 0n;
const managedSemanticWorkspaceOperationScopes = new AsyncLocalStorage<ManagedSemanticWorkspaceOperationScope>();

/** Raised when a completed callback no longer describes the source world pinned at its ingress. */
export class ManagedSemanticWorkspaceOperationStaleError extends Error {
  readonly code = 'SEMANTIC_RUNTIME_OPERATION_STALE' as const;
  readonly reason: 'source-world-changed' | 'analysis-basis-changed' | 'analysis-currentness-changed';
  readonly currentnessKind: ChangedSemanticSourceWorldResult['kind'] | null;
  readonly previousSourceWorldRevision: string;
  readonly nextSourceWorldRevision: string;
  readonly analysisBasisRevision: string | null;
  readonly changedReadKeys: readonly string[];
  readonly changedFacets: readonly string[];
  readonly changedSemanticFactKeys: readonly string[];
  readonly analysisCurrentness: SemanticRuntimeAnalysisCurrentnessFailure | null;

  constructor(input: ManagedSemanticWorkspaceOperationStaleErrorInput) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = 'ManagedSemanticWorkspaceOperationStaleError';
    this.reason = input.reason;
    this.currentnessKind = input.currentnessKind;
    this.previousSourceWorldRevision = input.previousSourceWorldRevision;
    this.nextSourceWorldRevision = input.nextSourceWorldRevision;
    this.analysisBasisRevision = input.analysisBasisRevision;
    this.changedReadKeys = Object.freeze([...input.changedReadKeys]);
    this.changedFacets = Object.freeze([...input.changedFacets]);
    this.changedSemanticFactKeys = Object.freeze([...input.changedSemanticFactKeys]);
    this.analysisCurrentness = input.analysisCurrentness == null
      ? null
      : snapshotAnalysisCurrentnessFailure(input.analysisCurrentness);
  }

}

interface ManagedSemanticWorkspaceOperationStaleErrorInput {
  readonly message: string;
  readonly cause?: unknown;
  readonly reason: ManagedSemanticWorkspaceOperationStaleError['reason'];
  readonly currentnessKind: ManagedSemanticWorkspaceOperationStaleError['currentnessKind'];
  readonly previousSourceWorldRevision: string;
  readonly nextSourceWorldRevision: string;
  readonly analysisBasisRevision: string | null;
  readonly changedReadKeys: readonly string[];
  readonly changedFacets: readonly string[];
  readonly changedSemanticFactKeys: readonly string[];
  readonly analysisCurrentness?: SemanticRuntimeAnalysisCurrentnessFailure | null;
}

/** Raised when an operation is requested after managed workspace disposal has begun. */
export class ManagedSemanticWorkspaceDisposedError extends Error {
  readonly code = 'SEMANTIC_RUNTIME_WORKSPACE_DISPOSED' as const;

  constructor() {
    super('Cannot run a semantic workspace operation after its managed session has begun disposal.');
    this.name = 'ManagedSemanticWorkspaceDisposedError';
  }
}

/** Raised instead of waiting on an operation lease owned by the calling async context itself. */
export class ManagedSemanticWorkspaceReentrantOperationError extends Error {
  readonly code = 'SEMANTIC_RUNTIME_WORKSPACE_REENTRANT_OPERATION' as const;

  constructor(readonly action: ManagedSemanticWorkspaceOperationAction) {
    super(
      `Cannot ${managedOperationActionSummary(action)} `
      + 'from one of its active operation callbacks.',
    );
    this.name = 'ManagedSemanticWorkspaceReentrantOperationError';
  }
}

/**
 * Owns one long-lived semantic workspace across current, equivalent, and fresh source-world observations.
 *
 * The callback is the complete consumer operation, including DTO/presentation mapping. The runtime is borrowed only
 * for that callback: consumers must not retain it or return it as a durable session handle. Facade answer envelopes
 * remain portable after egress, but their process-private proofs do not; `runWithReceipt` is the explicit bounded proof
 * transfer. A changed source world at egress rejects the operation instead of replaying consumer code with a replacement
 * runtime.
 */
export class ManagedSemanticWorkspaceSession {
  private readonly descriptor: SemanticWorkspaceDescriptor;
  private readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority;
  private readonly sessionSequence = allocateManagedSessionSequence();
  private nextIncarnationSequence = 0n;
  private activeIncarnation: ManagedSemanticWorkspaceIncarnation | null = null;
  private transitionTail: Promise<void> = Promise.resolve();
  private queuedTransitionCount = 0;
  private reconciliation: Promise<void> | null = null;
  private disposal: Promise<void> | null = null;
  private isClosing = false;

  constructor(options: ManagedSemanticWorkspaceSessionOptions) {
    if ((options as SemanticRuntimeOptions).storeKey !== undefined) {
      throw new Error('Managed semantic workspace sessions own their private store namespace; do not supply storeKey.');
    }
    this.descriptor = semanticWorkspaceDescriptorForRuntimeOptions(options);
    this.projectInputAuthority = options.projectInputAuthority ?? new SemanticRuntimeProjectInputAuthority();
  }

  /**
   * Run one operation against a pinned runtime and validate its source-world basis before releasing the result.
   * Consumer callbacks are invoked at most once.
   */
  async run<TResult>(operation: ManagedSemanticWorkspaceOperation<TResult>): Promise<TResult> {
    this.assertNotReentrant('run');
    if (typeof operation !== 'function') {
      throw new TypeError('Managed semantic workspace operation must be a function.');
    }
    const completed = await this.runManagedOperation(
      'run',
      true,
      (_runtime, context) => operation(context),
    );
    try {
      return completed.value;
    } finally {
      completed.receipt.dispose();
    }
  }

  /**
   * Run one complete consumer operation and transfer its exact validated proof to the caller.
   * The caller must dispose the receipt when its bounded cache entry is replaced or retired.
   */
  runWithReceipt<TResult>(
    operation: ManagedSemanticWorkspaceOperation<TResult>,
  ): Promise<ManagedSemanticWorkspaceOperationResult<TResult>> {
    this.assertNotReentrant('run');
    if (typeof operation !== 'function') {
      return Promise.reject(new TypeError('Managed semantic workspace operation must be a function.'));
    }
    return this.runManagedOperation(
      'run',
      true,
      (_runtime, context) => operation(context),
    );
  }

  /** Inspect analysis-cache retention through an ordinary shared managed read and project before source-world egress. */
  async analysisCacheOverview<TResult>(
    request: SemanticRuntimeSessionAnalysisCacheOverviewRequest,
    project: ManagedSemanticWorkspaceAnalysisCacheOverviewProjector<TResult>,
  ): Promise<TResult> {
    this.assertNotReentrant('analysis-cache-overview');
    if (typeof project !== 'function') {
      throw new TypeError('Managed semantic workspace analysis-cache overview projector must be a function.');
    }
    const completed = await this.runManagedOperation(
      'analysis-cache-overview',
      false,
      (runtime) => project(runtime.sessionAnalysisCacheOverview(request)),
    );
    try {
      return completed.value;
    } finally {
      completed.receipt.dispose();
    }
  }

  /**
   * Stop admission, drain every shared reader, clear the FIFO-selected incumbent exactly once, and project the result.
   * A topology change observed while draining queues reconciliation but never stale-rejects or replays the applied clear.
   */
  clearAnalysisCache<TResult>(
    request: SemanticRuntimeSessionAnalysisCacheClearRequest,
    project: ManagedSemanticWorkspaceAnalysisCacheClearProjector<TResult>,
  ): Promise<TResult> {
    this.assertNotReentrant('clear-analysis-cache');
    if (typeof project !== 'function') {
      throw new TypeError('Managed semantic workspace analysis-cache clear projector must be a function.');
    }
    return this.enqueueTransition(
      'clear-analysis-cache',
      () => this.clearSelectedIncarnation(request, project),
    );
  }

  /** Stop admitting operations, cancel queued work, drain active work, and retire the remaining session cache. */
  dispose(): Promise<void> {
    this.assertNotReentrant('dispose');
    if (this.disposal != null) {
      return this.disposal;
    }
    this.isClosing = true;
    this.stopReaderAdmission();
    const disposal = this.enqueueTransition(
      'dispose',
      () => this.disposeSession(),
      true,
    );
    this.disposal = disposal;
    return disposal;
  }

  private async runManagedOperation<TResult>(
    action: 'run' | 'analysis-cache-overview',
    mayPopulateAnalysisCache: boolean,
    operation: (
      runtime: SemanticRuntime,
      context: ManagedSemanticWorkspaceOperationContext,
    ) => TResult | PromiseLike<TResult>,
  ): Promise<ManagedSemanticWorkspaceOperationResult<TResult>> {
    this.assertNotReentrant(action);
    const incarnation = await this.acquireIncarnation(mayPopulateAnalysisCache);
    const receiptBuilder = incarnation.runtime.createAnalysisReceiptBuilder();
    const context = new ManagedSemanticWorkspaceOperationContextScope(
      incarnation.runtime,
      receiptBuilder,
      incarnation.sourceWorld.sourceWorldRevision,
    );
    try {
      let result!: TResult;
      try {
        const operationScope: ManagedSemanticWorkspaceOperationScope = {
          session: this,
          parent: managedSemanticWorkspaceOperationScopes.getStore() ?? null,
          active: true,
        };
        try {
          let callbackFailure: unknown;
          let callbackFailed = false;
          try {
            result = await managedSemanticWorkspaceOperationScopes.run(
              operationScope,
              () => operation(incarnation.runtime, context),
            );
          } catch (error) {
            callbackFailed = true;
            callbackFailure = error;
          }
          context.close();
          const runtimeCallOutcome = await context.settleRuntimeCalls();
          if (callbackFailed) {
            rethrowConsumerFailure(callbackFailure);
          }
          if (!runtimeCallOutcome.succeeded) {
            rethrowConsumerFailure(runtimeCallOutcome.error);
          }
        } finally {
          operationScope.active = false;
        }
      } catch (error) {
        context.close();
        let staleSourceWorld: ChangedSemanticSourceWorldResult | null = null;
        try {
          staleSourceWorld = this.operationSourceWorldStaleness(incarnation);
        } catch {
          throw error;
        }
        if (staleSourceWorld != null) {
          throw sourceWorldStaleError(staleSourceWorld, error);
        }
        if (isSemanticRuntimeAnalysisCurrentnessError(error)) {
          throw analysisCurrentnessStaleError(incarnation, error);
        }
        throw error;
      }
      context.close();
      const analysisReceipt = this.completeOperationEgress(incarnation, receiptBuilder);
      return Object.freeze({
        value: result,
        receipt: managedSemanticWorkspaceOperationReceipt(analysisReceipt),
      });
    } finally {
      context.close();
      this.releaseIncarnation(incarnation);
    }
  }

  private async acquireIncarnation(
    mayPopulateAnalysisCache: boolean,
  ): Promise<ManagedSemanticWorkspaceIncarnation> {
    for (;;) {
      this.assertOpen();
      const incarnation = this.activeIncarnation;
      if (
        incarnation?.acceptingOperations === true
        && this.queuedTransitionCount === 0
      ) {
        const currentness = incarnation.sourceWorld.resolveCurrent();
        if (
          currentness.kind === SemanticSourceWorldCurrentnessKind.Current
          && incarnation === this.activeIncarnation
          && incarnation.acceptingOperations
          && this.queuedTransitionCount === 0
        ) {
          incarnation.activeOperationCount += 1;
          if (mayPopulateAnalysisCache) {
            incarnation.retirementClearRequired = true;
          }
          return incarnation;
        }
        if (currentness.kind !== SemanticSourceWorldCurrentnessKind.Current) {
          this.invalidateIncarnation(incarnation, currentness);
        }
      }
      if (this.reconciliation != null) {
        await this.reconciliation;
        continue;
      }
      if (this.queuedTransitionCount > 0) {
        await this.transitionTail;
        continue;
      }
      await this.startReconciliation();
    }
  }

  private completeOperationEgress(
    incarnation: ManagedSemanticWorkspaceIncarnation,
    builder: SemanticRuntimeAnalysisReceiptBuilder,
  ): SemanticRuntimeAnalysisReceipt {
    const staleSourceWorld = this.operationSourceWorldStaleness(incarnation);
    if (staleSourceWorld != null) {
      throw sourceWorldStaleError(staleSourceWorld);
    }
    const receipt = builder.seal();
    const validation = receipt.validate();
    if (!validation.isCurrent) {
      receipt.dispose();
      throw analysisBasisStaleError(receipt, validation);
    }
    return receipt;
  }

  private operationSourceWorldStaleness(
    incarnation: ManagedSemanticWorkspaceIncarnation,
  ): ChangedSemanticSourceWorldResult | null {
    if (incarnation.invalidation != null) {
      return incarnation.invalidation;
    }
    const currentness = incarnation.sourceWorld.resolveCurrent();
    if (currentness.kind === SemanticSourceWorldCurrentnessKind.Current) {
      return null;
    }
    this.invalidateIncarnation(incarnation, currentness);
    return currentness;
  }

  private invalidateIncarnation(
    incarnation: ManagedSemanticWorkspaceIncarnation,
    currentness: ChangedSemanticSourceWorldResult,
  ): void {
    if (incarnation.invalidation == null) {
      incarnation.invalidation = currentness;
    }
    incarnation.acceptingOperations = false;
    if (!this.isClosing && incarnation === this.activeIncarnation) {
      void this.startReconciliation(currentness.sourceWorld);
    }
  }

  private startReconciliation(candidate?: ResolvedSemanticSourceWorld): Promise<void> {
    if (this.reconciliation != null) {
      return this.reconciliation;
    }
    const reconciliation = this.enqueueTransition(
      'reconcile',
      () => this.reconcileSourceWorld(candidate),
    );
    this.reconciliation = reconciliation;
    void reconciliation.then(
      () => {
        if (this.reconciliation === reconciliation) {
          this.reconciliation = null;
        }
      },
      () => {
        if (this.reconciliation === reconciliation) {
          this.reconciliation = null;
        }
      },
    );
    return reconciliation;
  }

  private async reconcileSourceWorld(initialCandidate?: ResolvedSemanticSourceWorld): Promise<void> {
    const incumbent = this.activeIncarnation;
    if (this.isClosing) {
      return;
    }

    let candidate = await stabilizeSourceWorld(
      initialCandidate ?? (incumbent == null
        ? this.resolveSourceWorld()
        : changedSourceWorld(incumbent.sourceWorld.resolveCurrent())),
      () => this.isClosing,
    );
    if (candidate == null) {
      return;
    }

    for (;;) {
      if (this.isClosing) {
        return;
      }
      if (
        incumbent != null
        && !incumbent.forceFreshReplacement
        && candidate.sourceWorldRevision === incumbent.sourceWorld.sourceWorldRevision
      ) {
        incumbent.runtime.rebindEquivalentSourceWorld(candidate);
        incumbent.sourceWorld = candidate;
        incumbent.invalidation = null;
        incumbent.forceFreshReplacement = false;
        return;
      }

      const runtime = await SemanticRuntime.openResolvedSourceWorld(candidate, this.allocateStoreKey());
      let publishedSourceWorld = candidate;
      for (;;) {
        if (this.isClosing) {
          retireRuntime(runtime);
          return;
        }
        const currentness = publishedSourceWorld.resolveCurrent();
        if (currentness.kind === SemanticSourceWorldCurrentnessKind.Current) {
          const replacement = createIncarnation(runtime, publishedSourceWorld);
          if (incumbent != null) {
            try {
              retireIncarnation(incumbent);
            } catch (retirementError) {
              // Retirement closes the incumbent before its fallible cleanup. It can no longer serve work, so do not
              // retain that partially cleared terminal runtime as the session's published incarnation while reporting
              // the transition failure. A later operation boots a wholly fresh incarnation instead of retiring it again.
              if (this.activeIncarnation === incumbent) {
                this.activeIncarnation = null;
              }
              try {
                retireRuntime(runtime);
              } catch (replacementRetirementError) {
                throw new AggregateError(
                  [retirementError, replacementRetirementError],
                  'Failed to retire both the stale and unpublished semantic-runtime incarnations.',
                );
              }
              throw retirementError;
            }
          }
          this.activeIncarnation = replacement;
          return;
        }
        const nextCandidate = await stabilizeSourceWorld(currentness.sourceWorld, () => this.isClosing);
        if (nextCandidate == null) {
          retireRuntime(runtime);
          return;
        }
        if (nextCandidate.sourceWorldRevision === publishedSourceWorld.sourceWorldRevision) {
          runtime.rebindEquivalentSourceWorld(nextCandidate);
          publishedSourceWorld = nextCandidate;
          continue;
        }
        retireRuntime(runtime);
        candidate = nextCandidate;
        break;
      }
    }
  }

  private resolveSourceWorld(): ResolvedSemanticSourceWorld {
    return resolveSemanticSourceWorld(
      semanticRuntimeOptionsForWorkspaceDescriptor(this.descriptor, {
        projectInputAuthority: this.projectInputAuthority,
      }),
    );
  }

  private allocateStoreKey(): string {
    this.nextIncarnationSequence += 1n;
    return `semantic-runtime-managed:${this.sessionSequence.toString(36)}:incarnation:${this.nextIncarnationSequence.toString(36)}`;
  }

  private enqueueTransition<TResult>(
    kind: ManagedSemanticWorkspaceTransitionKind,
    transition: () => TResult | PromiseLike<TResult>,
    allowWhileClosing = false,
  ): Promise<TResult> {
    this.queuedTransitionCount += 1;
    this.stopReaderAdmission();
    const predecessor = this.transitionTail;
    const result = predecessor.then(async () => {
      if (!allowWhileClosing) {
        this.assertOpen();
      }
      const incumbent = this.activeIncarnation;
      if (incumbent != null) {
        incumbent.acceptingOperations = false;
        await waitForIncarnationDrain(incumbent);
      }
      if (!allowWhileClosing) {
        this.assertOpen();
      }
      return transition();
    });
    const settled = result.finally(() => {
      this.queuedTransitionCount -= 1;
      if (this.queuedTransitionCount < 0) {
        throw new Error(`Managed semantic workspace transition '${kind}' settled more than once.`);
      }
      this.reopenReaderAdmission();
    });
    this.transitionTail = settled.then(
      () => undefined,
      () => undefined,
    );
    return settled;
  }

  private async clearSelectedIncarnation<TResult>(
    request: SemanticRuntimeSessionAnalysisCacheClearRequest,
    project: ManagedSemanticWorkspaceAnalysisCacheClearProjector<TResult>,
  ): Promise<TResult> {
    if (this.activeIncarnation == null) {
      await this.reconcileSourceWorld();
    }
    if (this.activeIncarnation?.forceFreshReplacement === true) {
      // A prior partially failed clear terminally poisoned its incumbent. Recover inside this writer so a clear that
      // was already queued ahead of the recovery transition cannot touch that incarnation a second time.
      await this.reconcileSourceWorld();
    }
    this.assertOpen();
    const incarnation = this.activeIncarnation;
    if (incarnation == null) {
      throw new Error('Managed semantic workspace clear completed boot without an active runtime incarnation.');
    }
    let answer: SemanticRuntimeAnswer<SemanticRuntimeSessionAnalysisCacheClearResult>;
    try {
      // Process-owned retention is controlled once through the process authority, never once per workspace session.
      answer = incarnation.runtime.sessionAnalysisCacheClear(request);
      incarnation.retirementClearRequired = false;
    } catch (error) {
      // Raw clear advances the runtime lifetime before its first mutation. Once it throws, the incarnation has an
      // unknown partial cache state and must never reopen or be cleared a second time during retirement.
      incarnation.forceFreshReplacement = true;
      incarnation.retirementClearRequired = false;
      void this.startReconciliation();
      throw error;
    }

    const currentnessAfterClear = this.observeIncarnationCurrentness(incarnation);
    const outcome = analysisCacheClearOutcome(incarnation, currentnessAfterClear);
    const operationScope: ManagedSemanticWorkspaceOperationScope = {
      session: this,
      parent: managedSemanticWorkspaceOperationScopes.getStore() ?? null,
      active: true,
    };
    try {
      return await managedSemanticWorkspaceOperationScopes.run(
        operationScope,
        () => project(answer, outcome),
      );
    } finally {
      operationScope.active = false;
      this.observeIncarnationCurrentness(incarnation);
    }
  }

  private observeIncarnationCurrentness(
    incarnation: ManagedSemanticWorkspaceIncarnation,
  ): ChangedSemanticSourceWorldResult | null {
    if (incarnation.invalidation != null) {
      return incarnation.invalidation;
    }
    const currentness = incarnation.sourceWorld.resolveCurrent();
    if (currentness.kind === SemanticSourceWorldCurrentnessKind.Current) {
      return null;
    }
    this.invalidateIncarnation(incarnation, currentness);
    return currentness;
  }

  private stopReaderAdmission(): void {
    if (this.activeIncarnation != null) {
      this.activeIncarnation.acceptingOperations = false;
    }
  }

  private reopenReaderAdmission(): void {
    if (
      this.queuedTransitionCount !== 0
      || this.isClosing
      || this.activeIncarnation == null
      || this.activeIncarnation.invalidation != null
      || this.activeIncarnation.forceFreshReplacement
    ) {
      return;
    }
    this.activeIncarnation.acceptingOperations = true;
  }

  private releaseIncarnation(incarnation: ManagedSemanticWorkspaceIncarnation): void {
    incarnation.activeOperationCount -= 1;
    if (incarnation.activeOperationCount < 0) {
      throw new Error('Managed semantic workspace operation lease was released more than once.');
    }
    if (incarnation.activeOperationCount === 0 && incarnation.resolveDrain != null) {
      const resolveDrain = incarnation.resolveDrain;
      incarnation.resolveDrain = null;
      incarnation.drainPromise = null;
      resolveDrain();
    }
  }

  private disposeSession(): void {
    const incarnation = this.activeIncarnation;
    if (incarnation == null) {
      return;
    }
    incarnation.acceptingOperations = false;
    try {
      retireIncarnation(incarnation);
    } finally {
      if (this.activeIncarnation === incarnation) {
        this.activeIncarnation = null;
      }
    }
  }

  private assertOpen(): void {
    if (this.isClosing) {
      throw new ManagedSemanticWorkspaceDisposedError();
    }
  }

  private assertNotReentrant(action: ManagedSemanticWorkspaceOperationAction): void {
    for (
      let scope: ManagedSemanticWorkspaceOperationScope | null =
        managedSemanticWorkspaceOperationScopes.getStore() ?? null;
      scope != null;
      scope = scope.parent
    ) {
      if (scope.active && scope.session === this) {
        throw new ManagedSemanticWorkspaceReentrantOperationError(action);
      }
    }
  }
}

class ManagedSemanticWorkspaceOperationContextScope implements ManagedSemanticWorkspaceOperationContext {
  private isOpen = true;
  private readonly pendingRuntimeCalls = new Set<ManagedPendingRuntimeCall>();
  private readonly autoObservedReceipts = new WeakSet<SemanticRuntimeAnalysisReceipt>();
  private readonly borrowedRuntimeAnswers = new Set<SemanticRuntimeAnswer<unknown>>();
  readonly runtime: ManagedSemanticWorkspaceRuntimeReadFacade;

  constructor(
    runtime: SemanticRuntime,
    private readonly receiptBuilder: SemanticRuntimeAnalysisReceiptBuilder,
    readonly sourceWorldRevision: string,
  ) {
    this.runtime = managedSemanticWorkspaceRuntimeReadFacade(
      runtime,
      (action) => this.requireOpen(action),
      (result) => this.observeRuntimeCallResult(result),
    );
  }

  readonly absorb = <TValue>(answer: SemanticRuntimeAnswer<TValue>): SemanticRuntimeAnswer<TValue> => {
    this.requireOpen('absorb a semantic answer');
    const receipt = semanticRuntimeAnalysisReceiptFor(answer);
    if (receipt == null) {
      throw new Error('Cannot absorb a semantic answer that does not carry an exact semantic-runtime analysis receipt.');
    }
    if (this.autoObservedReceipts.has(receipt)) {
      throw new Error(
        'Cannot explicitly absorb an answer returned by the managed runtime facade; facade answers are auto-composed.',
      );
    }
    this.receiptBuilder.observeReceipt(receipt);
    return answer;
  };

  readonly readSourceText = (fileName: string): string | undefined => {
    this.requireOpen('read source text');
    return this.receiptBuilder.readSourceText(fileName);
  };

  readonly tryAbsorbReceipt = (receipt: ManagedSemanticWorkspaceOperationReceipt): boolean => {
    this.requireOpen('absorb a retained operation receipt');
    const analysisReceipt = managedSemanticWorkspaceAnalysisReceipts.get(receipt);
    return analysisReceipt != null && this.receiptBuilder.tryObserveReceipt(analysisReceipt);
  };

  close(): void {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    for (const answer of this.borrowedRuntimeAnswers) {
      revokeSemanticRuntimeAnalysisReceiptFor(answer);
    }
    this.borrowedRuntimeAnswers.clear();
  }

  async settleRuntimeCalls(): Promise<ManagedRuntimeCallOutcome> {
    let result: ManagedRuntimeCallOutcome = { succeeded: true };
    const pendingAtCallbackCompletion = [...this.pendingRuntimeCalls].map((call) => call.outcome);
    for (const outcome of await Promise.all(pendingAtCallbackCompletion)) {
      if (!outcome.succeeded && result.succeeded) {
        result = outcome;
      }
    }
    return result;
  }

  private observeRuntimeCallResult(result: unknown): unknown {
    if (!isPromiseLike(result)) {
      this.observeRuntimeAnswer(result);
      return result;
    }
    const observed = Promise.resolve(result).then((value: unknown) => {
      this.observeRuntimeAnswer(value);
      return value;
    });
    const pending: ManagedPendingRuntimeCall = {
      outcome: Promise.resolve({ succeeded: true }),
    };
    pending.outcome = observed.then(
      (): ManagedRuntimeCallOutcome => {
        this.pendingRuntimeCalls.delete(pending);
        return { succeeded: true };
      },
      (error: unknown): ManagedRuntimeCallOutcome => {
        this.pendingRuntimeCalls.delete(pending);
        return { succeeded: false, error };
      },
    );
    this.pendingRuntimeCalls.add(pending);
    return observed;
  }

  private observeRuntimeAnswer(value: unknown): void {
    const answers = semanticRuntimeAnswersWithReceiptsIn(value);
    const rootAnswer = answers[0];
    const rootReceipt = rootAnswer == null
      ? null
      : semanticRuntimeAnalysisReceiptFor(rootAnswer);
    const shouldObserveRootReceipt = rootReceipt != null && !this.autoObservedReceipts.has(rootReceipt);
    const newlyBorrowedAnswers: SemanticRuntimeAnswer<unknown>[] = [];
    for (const answer of answers) {
      const receipt = semanticRuntimeAnalysisReceiptFor(answer);
      if (receipt == null || this.autoObservedReceipts.has(receipt)) {
        continue;
      }
      this.autoObservedReceipts.add(receipt);
      newlyBorrowedAnswers.push(answer);
    }
    try {
      if (shouldObserveRootReceipt) {
        // Nested answer publication already proves that the root receipt subsumes every child receipt. Compose that
        // aggregate once; the recursive walk above exists only to revoke every process-private carrier at egress.
        this.receiptBuilder.observeReceipt(rootReceipt);
      }
    } finally {
      for (const answer of newlyBorrowedAnswers) {
        if (this.isOpen) {
          this.borrowedRuntimeAnswers.add(answer);
        } else {
          revokeSemanticRuntimeAnalysisReceiptFor(answer);
        }
      }
    }
  }

  private requireOpen(action: string): void {
    if (!this.isOpen) {
      throw new Error(`Cannot ${action} after its managed workspace operation has closed.`);
    }
  }
}

type ManagedRuntimeCallOutcome =
  | { readonly succeeded: true }
  | { readonly succeeded: false; readonly error: unknown };

interface ManagedPendingRuntimeCall {
  outcome: Promise<ManagedRuntimeCallOutcome>;
}

function semanticRuntimeAnswersWithReceiptsIn(value: unknown): readonly SemanticRuntimeAnswer<unknown>[] {
  if (!isObject(value)) {
    return [];
  }
  const root = value as SemanticRuntimeAnswer<unknown>;
  if (semanticRuntimeAnalysisReceiptFor(root) == null) {
    // Every managed facade method returns one answer envelope. Receipt-free static answers have no nested proof graph.
    return [];
  }
  const answers: SemanticRuntimeAnswer<unknown>[] = [root];
  const visited = new WeakSet<object>();
  visited.add(root);
  const visit = (candidate: unknown): void => {
    if (!isObject(candidate) || visited.has(candidate)) {
      return;
    }
    visited.add(candidate);
    const answer = candidate as SemanticRuntimeAnswer<unknown>;
    if (semanticRuntimeAnalysisReceiptFor(answer) != null) {
      answers.push(answer);
    }
    for (const key of Object.keys(candidate)) {
      visit(Reflect.get(candidate, key));
    }
  };
  for (const key of Object.keys(root)) {
    visit(Reflect.get(root, key));
  }
  return answers;
}

function managedSemanticWorkspaceOperationReceipt(
  analysisReceipt: SemanticRuntimeAnalysisReceipt,
): ManagedSemanticWorkspaceOperationReceipt {
  const receipt = Object.create(ManagedSemanticWorkspaceOperationReceipt.prototype) as
    ManagedSemanticWorkspaceOperationReceipt;
  Object.defineProperty(receipt, 'analysisBasis', {
    value: analysisReceipt.basis,
    enumerable: true,
    configurable: false,
    writable: false,
  });
  managedSemanticWorkspaceAnalysisReceipts.set(receipt, analysisReceipt);
  return Object.freeze(receipt);
}

function sourceWorldStaleError(
  currentness: ChangedSemanticSourceWorldResult,
  cause?: unknown,
): ManagedSemanticWorkspaceOperationStaleError {
  return new ManagedSemanticWorkspaceOperationStaleError({
    message:
      `Semantic workspace operation became stale while it was running: source world changed from `
      + `'${currentness.previousSourceWorld.sourceWorldRevision}' to `
      + `'${currentness.sourceWorld.sourceWorldRevision}' (${currentness.kind}).`,
    ...(cause === undefined ? {} : { cause }),
    reason: 'source-world-changed',
    currentnessKind: currentness.kind,
    previousSourceWorldRevision: currentness.previousSourceWorld.sourceWorldRevision,
    nextSourceWorldRevision: currentness.sourceWorld.sourceWorldRevision,
    analysisBasisRevision: null,
    changedReadKeys: currentness.receiptValidation.changedReadKeys,
    changedFacets: currentness.receiptValidation.changedFacets,
    changedSemanticFactKeys: [],
  });
}

function analysisBasisStaleError(
  receipt: SemanticRuntimeAnalysisReceipt,
  validation: SemanticRuntimeAnalysisReceiptValidation,
): ManagedSemanticWorkspaceOperationStaleError {
  return new ManagedSemanticWorkspaceOperationStaleError({
    message:
      `Semantic workspace operation became stale while it was running: exact analysis basis `
      + `'${receipt.basis.revision}' is no longer current.`,
    reason: 'analysis-basis-changed',
    currentnessKind: null,
    previousSourceWorldRevision: receipt.basis.sourceWorldRevision,
    nextSourceWorldRevision: receipt.basis.sourceWorldRevision,
    analysisBasisRevision: receipt.basis.revision,
    changedReadKeys: validation.changedReadKeys,
    changedFacets: validation.changedFacets,
    changedSemanticFactKeys: validation.changedSemanticFactKeys,
  });
}

function analysisCurrentnessStaleError(
  incarnation: ManagedSemanticWorkspaceIncarnation,
  cause: SemanticRuntimeAnalysisCurrentnessError,
): ManagedSemanticWorkspaceOperationStaleError {
  const currentness = semanticRuntimeAnalysisCurrentnessFailure(cause);
  const sourceWorldRevision = incarnation.sourceWorld.sourceWorldRevision;
  return new ManagedSemanticWorkspaceOperationStaleError({
    message:
      `Semantic workspace operation became stale while it was running: internal analysis currentness changed `
      + `(${currentness.reason}).`,
    cause,
    reason: 'analysis-currentness-changed',
    currentnessKind: null,
    previousSourceWorldRevision: sourceWorldRevision,
    nextSourceWorldRevision: sourceWorldRevision,
    analysisBasisRevision: null,
    changedReadKeys: currentness.changedReadKeys,
    changedFacets: currentness.changedFacets,
    changedSemanticFactKeys: currentness.changedSemanticFactKeys,
    analysisCurrentness: currentness,
  });
}

function snapshotAnalysisCurrentnessFailure(
  currentness: SemanticRuntimeAnalysisCurrentnessFailure,
): SemanticRuntimeAnalysisCurrentnessFailure {
  return Object.freeze({
    code: currentness.code,
    reason: currentness.reason,
    message: currentness.message,
    answerLeaseKind: currentness.answerLeaseKind,
    invalidGenerationKeys: normalizedManagedCurrentnessFacts(currentness.invalidGenerationKeys),
    changedReadKeys: normalizedManagedCurrentnessFacts(currentness.changedReadKeys),
    changedFacets: normalizedManagedCurrentnessFacts(currentness.changedFacets),
    changedSemanticFactKeys: normalizedManagedCurrentnessFacts(currentness.changedSemanticFactKeys),
  });
}

function normalizedManagedCurrentnessFacts(facts: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(facts)].sort((left, right) => left.localeCompare(right)));
}

function allocateManagedSessionSequence(): bigint {
  nextManagedSessionSequence += 1n;
  return nextManagedSessionSequence;
}

function createIncarnation(
  runtime: SemanticRuntime,
  sourceWorld: ResolvedSemanticSourceWorld,
): ManagedSemanticWorkspaceIncarnation {
  return {
    runtime,
    sourceWorld,
    acceptingOperations: false,
    activeOperationCount: 0,
    invalidation: null,
    forceFreshReplacement: false,
    retirementClearRequired: true,
    drainPromise: null,
    resolveDrain: null,
  };
}

function waitForIncarnationDrain(incarnation: ManagedSemanticWorkspaceIncarnation): Promise<void> {
  if (incarnation.activeOperationCount === 0) {
    return Promise.resolve();
  }
  if (incarnation.drainPromise == null) {
    incarnation.drainPromise = new Promise<void>((resolve) => {
      incarnation.resolveDrain = resolve;
    });
  }
  return incarnation.drainPromise;
}

async function stabilizeSourceWorld(
  initial: ResolvedSemanticSourceWorld,
  shouldStop: () => boolean,
): Promise<ResolvedSemanticSourceWorld | null> {
  let candidate = initial;
  for (;;) {
    if (shouldStop()) {
      return null;
    }
    const currentness = candidate.resolveCurrent();
    if (currentness.kind === SemanticSourceWorldCurrentnessKind.Current) {
      return candidate;
    }
    candidate = currentness.sourceWorld;
    await yieldToSourceWorldChanges();
  }
}

function changedSourceWorld(currentness: SemanticSourceWorldCurrentnessResult): ResolvedSemanticSourceWorld {
  return currentness.sourceWorld;
}

function yieldToSourceWorldChanges(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function retireIncarnation(incarnation: ManagedSemanticWorkspaceIncarnation): void {
  incarnation.acceptingOperations = false;
  incarnation.runtime.retireWorkspaceIncarnation();
  if (!incarnation.retirementClearRequired) {
    return;
  }
  // Clear at most once after retirement. A failure leaves this terminal incarnation closed rather than retryable.
  incarnation.retirementClearRequired = false;
  incarnation.runtime.sessionAnalysisCacheClear();
}

function retireRuntime(runtime: SemanticRuntime): void {
  runtime.retireWorkspaceIncarnation();
  runtime.sessionAnalysisCacheClear();
}

function analysisCacheClearOutcome(
  incarnation: ManagedSemanticWorkspaceIncarnation,
  currentness: ChangedSemanticSourceWorldResult | null,
): ManagedSemanticWorkspaceAnalysisCacheClearOutcome {
  return Object.freeze({
    status: currentness == null ? 'current' : 'reconciliation-pending',
    clearedSourceWorldRevision: incarnation.sourceWorld.sourceWorldRevision,
    nextSourceWorldRevision:
      currentness?.sourceWorld.sourceWorldRevision ?? incarnation.sourceWorld.sourceWorldRevision,
    currentnessKind: currentness?.kind ?? null,
  });
}

const MANAGED_RUNTIME_READ_PROPERTIES = [
  'summary',
  'authoredSourceOwnership',
  'nativeProjectConfigurations',
  'projectConfigurationDiagnostics',
  'appQueryCatalog',
  'appBuilderQueryCatalog',
  'answerAppBuilderQuery',
  'answerAppQuery',
  'answerAppQueries',
  'templateCompletions',
  'templateCursorInfo',
  'templateDiagnostics',
] as const satisfies readonly (keyof ManagedSemanticWorkspaceRuntimeReadFacade)[];

const managedRuntimeReadPropertySet = new Set<PropertyKey>(MANAGED_RUNTIME_READ_PROPERTIES);

function managedSemanticWorkspaceRuntimeReadFacade(
  runtime: SemanticRuntime,
  requireOpen: (action: string) => void,
  observeResult: (result: unknown) => unknown,
): ManagedSemanticWorkspaceRuntimeReadFacade {
  const target = Object.create(null) as Record<PropertyKey, unknown>;
  for (const property of MANAGED_RUNTIME_READ_PROPERTIES) {
    const method = Reflect.get(runtime, property, runtime) as (...args: unknown[]) => unknown;
    Object.defineProperty(target, property, {
      value: (...args: unknown[]): unknown => {
        requireOpen(`call runtime method '${property}'`);
        return observeResult(Reflect.apply(method, runtime, args));
      },
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  Object.freeze(target);
  return new Proxy(target, {
    get(facade, property) {
      requireOpen('use its runtime facade');
      if (!managedRuntimeReadPropertySet.has(property)) {
        throw new Error(
          `Semantic runtime property '${String(property)}' is not available through a managed operation read facade.`,
        );
      }
      return Reflect.get(facade, property, facade);
    },
    set() {
      requireOpen('mutate its runtime facade');
      throw new Error('Managed semantic workspace runtime read facades are read-only.');
    },
    defineProperty() {
      requireOpen('define a property on its runtime facade');
      throw new Error('Managed semantic workspace runtime read facades are read-only.');
    },
    deleteProperty() {
      requireOpen('delete a property from its runtime facade');
      throw new Error('Managed semantic workspace runtime read facades are read-only.');
    },
    has(facade, property) {
      requireOpen('inspect its runtime facade');
      return managedRuntimeReadPropertySet.has(property) && Reflect.has(facade, property);
    },
    ownKeys(facade) {
      requireOpen('enumerate its runtime facade');
      return Reflect.ownKeys(facade);
    },
    getOwnPropertyDescriptor(facade, property) {
      requireOpen('inspect its runtime facade properties');
      return Reflect.getOwnPropertyDescriptor(facade, property);
    },
    getPrototypeOf() {
      requireOpen('inspect its runtime facade prototype');
      return null;
    },
  }) as ManagedSemanticWorkspaceRuntimeReadFacade;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value != null) || typeof value === 'function'
  ) && typeof Reflect.get(value, 'then') === 'function';
}

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value != null) || typeof value === 'function';
}

function rethrowConsumerFailure(error: unknown): never {
  // Consumer callbacks and facade promises are ordinary JavaScript boundaries; preserve even non-Error throws exactly.
  throw error;
}

function managedOperationActionSummary(action: ManagedSemanticWorkspaceOperationAction): string {
  switch (action) {
    case 'run':
      return 'start a nested operation';
    case 'analysis-cache-overview':
      return 'start a nested analysis-cache overview';
    case 'clear-analysis-cache':
      return 'clear the analysis cache';
    case 'dispose':
      return 'dispose the managed workspace';
  }
}
