import { AsyncLocalStorage } from 'node:async_hooks';

import type {
  SemanticRuntimeAnalysisBasis,
  SemanticRuntimeAnswer,
  SemanticRuntimeOptions,
} from './contracts.js';
import type {
  SemanticRuntimeAnalysisReceipt,
  SemanticRuntimeAnalysisReceiptBuilder,
  SemanticRuntimeAnalysisReceiptValidation,
} from './analysis-receipt.js';
import {
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

/** Runtime options whose store namespace is owned privately by the managed session. */
export type ManagedSemanticWorkspaceSessionOptions = Omit<SemanticRuntimeOptions, 'storeKey'>;

/** Callback-scoped access to one pinned runtime and composition of every semantic answer used by the result. */
export interface ManagedSemanticWorkspaceOperationContext {
  readonly runtime: SemanticRuntime;
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
  drainPromise: Promise<void> | null;
  resolveDrain: (() => void) | null;
}

interface ManagedSemanticWorkspaceOperationScope {
  readonly session: ManagedSemanticWorkspaceSession;
  readonly parent: ManagedSemanticWorkspaceOperationScope | null;
  active: boolean;
}

let nextManagedSessionSequence = 0n;
const managedSemanticWorkspaceOperationScopes = new AsyncLocalStorage<ManagedSemanticWorkspaceOperationScope>();

/** Raised when a completed callback no longer describes the source world pinned at its ingress. */
export class ManagedSemanticWorkspaceOperationStaleError extends Error {
  readonly code = 'SEMANTIC_RUNTIME_OPERATION_STALE' as const;
  readonly reason: 'source-world-changed' | 'analysis-basis-changed';
  readonly currentnessKind: ChangedSemanticSourceWorldResult['kind'] | null;
  readonly previousSourceWorldRevision: string;
  readonly nextSourceWorldRevision: string;
  readonly analysisBasisRevision: string | null;
  readonly changedReadKeys: readonly string[];
  readonly changedFacets: readonly string[];
  readonly changedSemanticFactKeys: readonly string[];

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

  constructor(readonly action: 'run' | 'dispose') {
    super(
      `Cannot ${action === 'run' ? 'start a nested operation' : 'dispose the managed workspace'} `
      + 'from one of its active operation callbacks.',
    );
    this.name = 'ManagedSemanticWorkspaceReentrantOperationError';
  }
}

/**
 * Owns one long-lived semantic workspace across current, equivalent, and fresh source-world observations.
 *
 * The callback is the complete consumer operation, including DTO/presentation mapping. The runtime is borrowed only
 * for that callback: consumers must not retain it or return it as a durable session handle. A changed source world at
 * egress rejects the operation instead of replaying consumer code with a replacement runtime.
 */
export class ManagedSemanticWorkspaceSession {
  private readonly descriptor: SemanticWorkspaceDescriptor;
  private readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority;
  private readonly sessionSequence = allocateManagedSessionSequence();
  private nextIncarnationSequence = 0n;
  private activeIncarnation: ManagedSemanticWorkspaceIncarnation | null = null;
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
    const completed = await this.runManagedOperation(operation);
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
    return this.runManagedOperation(operation);
  }

  private async runManagedOperation<TResult>(
    operation: ManagedSemanticWorkspaceOperation<TResult>,
  ): Promise<ManagedSemanticWorkspaceOperationResult<TResult>> {
    this.assertNotReentrant('run');
    if (typeof operation !== 'function') {
      throw new TypeError('Managed semantic workspace operation must be a function.');
    }
    const incarnation = await this.acquireIncarnation();
    const receiptBuilder = incarnation.runtime.createAnalysisReceiptBuilder();
    const context = new ManagedSemanticWorkspaceOperationContextScope(
      incarnation.runtime,
      receiptBuilder,
    );
    try {
      let result: TResult;
      try {
        const operationScope: ManagedSemanticWorkspaceOperationScope = {
          session: this,
          parent: managedSemanticWorkspaceOperationScopes.getStore() ?? null,
          active: true,
        };
        try {
          result = await managedSemanticWorkspaceOperationScopes.run(
            operationScope,
            () => operation(context),
          );
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

  /** Stop admitting operations, drain all borrowed runtimes, and retire the remaining session cache. */
  dispose(): Promise<void> {
    this.assertNotReentrant('dispose');
    if (this.disposal != null) {
      return this.disposal;
    }
    this.isClosing = true;
    if (this.activeIncarnation != null) {
      this.activeIncarnation.acceptingOperations = false;
    }
    const disposal = this.disposeSession();
    this.disposal = disposal;
    return disposal;
  }

  private async acquireIncarnation(): Promise<ManagedSemanticWorkspaceIncarnation> {
    for (;;) {
      this.assertOpen();
      const incarnation = this.activeIncarnation;
      if (incarnation?.acceptingOperations === true) {
        const currentness = incarnation.sourceWorld.resolveCurrent();
        if (
          currentness.kind === SemanticSourceWorldCurrentnessKind.Current
          && incarnation === this.activeIncarnation
          && incarnation.acceptingOperations
        ) {
          incarnation.activeOperationCount += 1;
          return incarnation;
        }
        if (currentness.kind !== SemanticSourceWorldCurrentnessKind.Current) {
          this.invalidateIncarnation(incarnation, currentness);
        }
      }
      await (this.reconciliation ?? this.startReconciliation());
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
    const reconciliation = this.reconcileSourceWorld(candidate);
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
    if (incumbent != null) {
      incumbent.acceptingOperations = false;
      await waitForIncarnationDrain(incumbent);
    }
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
        && candidate.sourceWorldRevision === incumbent.sourceWorld.sourceWorldRevision
      ) {
        incumbent.runtime.rebindEquivalentSourceWorld(candidate);
        incumbent.sourceWorld = candidate;
        incumbent.invalidation = null;
        incumbent.acceptingOperations = true;
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
              retireRuntime(incumbent.runtime);
            } catch (retirementError) {
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
          replacement.acceptingOperations = true;
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

  private async disposeSession(): Promise<void> {
    const reconciliation = this.reconciliation;
    if (reconciliation != null) {
      try {
        await reconciliation;
      } catch {
        // A failed candidate was never published; disposal still owns retirement of the incumbent below.
      }
    }
    const incarnation = this.activeIncarnation;
    if (incarnation == null) {
      return;
    }
    incarnation.acceptingOperations = false;
    await waitForIncarnationDrain(incarnation);
    try {
      retireRuntime(incarnation.runtime);
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

  private assertNotReentrant(action: 'run' | 'dispose'): void {
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

  constructor(
    readonly runtime: SemanticRuntime,
    private readonly receiptBuilder: SemanticRuntimeAnalysisReceiptBuilder,
  ) {}

  readonly absorb = <TValue>(answer: SemanticRuntimeAnswer<TValue>): SemanticRuntimeAnswer<TValue> => {
    this.requireOpen('absorb a semantic answer');
    const receipt = semanticRuntimeAnalysisReceiptFor(answer);
    if (receipt == null) {
      throw new Error('Cannot absorb a semantic answer that does not carry an exact semantic-runtime analysis receipt.');
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
    this.isOpen = false;
  }

  private requireOpen(action: string): void {
    if (!this.isOpen) {
      throw new Error(`Cannot ${action} after its managed workspace operation has closed.`);
    }
  }
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
    changedFacets: [],
    changedSemanticFactKeys: validation.changedSemanticFactKeys,
  });
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

function retireRuntime(runtime: SemanticRuntime): void {
  runtime.retireWorkspaceIncarnation();
  runtime.clearAnalysisCache({ typeSystemDependencyCacheClearPolicy: 'preserve' });
}
