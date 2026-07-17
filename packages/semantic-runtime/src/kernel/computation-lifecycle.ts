import type { KernelRecordHandle } from './handles.js';
import type { MaterializationRecord } from './materialization.js';
import {
  KernelPublicationManifest,
  type KernelPublicationPlan,
  type KernelPublicationContext,
  StagedKernelPublicationContext,
  type KernelPublicationDecision,
} from './publication.js';
import type {
  KernelStore,
  KernelStoreComputationLifecycle,
  KernelStoreDisposalContext,
  KernelStoreReadView,
  KernelStoreRecord,
} from './store.js';

declare const computationIdBrand: unique symbol;

/** Opaque identity for one logical computation occurrence inside an active store. */
export type ComputationId = string & { readonly [computationIdBrand]: true };

/** Domain-owned stable locus used to reconcile a logical computation across runs. */
export interface ComputationLocus {
  readonly kind: string;
  readonly reconciliationKey: string;
  readonly summary: string;
}

/** Commit-time validation result for one typed, domain-owned input read. */
export interface ComputationReadValidation {
  readonly isCurrent: boolean;
  readonly currentRevision: string;
  readonly changedFacets: readonly string[];
}

/**
 * One positive or negative input read captured by a computation run.
 *
 * The lifecycle stores only inspection summaries. The read implementation retains the typed revision and owns its
 * currentness comparison, so source, lookup, policy, and checker epochs do not collapse into one revision ontology.
 */
export interface ComputationRead {
  readonly readKey: string;
  readonly domain: string;
  readonly observedRevision: string;
  validate(): ComputationReadValidation;
}

/** Exact positive or negative read of one normalized kernel record. */
export class ComputationRecordRead implements ComputationRead {
  readonly domain = 'kernel-record';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly store: KernelStore,
    readonly handle: KernelRecordHandle,
    private readonly revision: number | null,
  ) {
    this.readKey = `kernel-record:${handle}`;
    this.observedRevision = recordRevisionLabel(revision);
  }

  validate(): ComputationReadValidation {
    const current = this.store.readRecordRevision(this.handle);
    return {
      isCurrent: current === this.revision,
      currentRevision: recordRevisionLabel(current),
      changedFacets: current === this.revision
        ? []
        : current == null || this.revision == null
          ? ['existence']
          : ['record'],
    };
  }
}

/** Read-tracing kernel view used when an existing graph traversal becomes a computation input. */
export class ComputationRecordReadView implements KernelStoreReadView {
  private readonly readsByHandle = new Map<KernelRecordHandle, ComputationRecordRead>();

  constructor(private readonly store: KernelStore) {}

  get handles() {
    return this.store.handles;
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    const record = this.store.read(handle);
    const read = new ComputationRecordRead(this.store, handle, this.store.readRecordRevision(handle));
    const existing = this.readsByHandle.get(handle);
    if (existing != null && existing.observedRevision !== read.observedRevision) {
      throw new Error(`Kernel record ${handle} changed during one computation run.`);
    }
    this.readsByHandle.set(handle, read);
    return record;
  }

  readAll(): readonly ComputationRecordRead[] {
    return [...this.readsByHandle.values()];
  }
}

export const enum ComputationCommitState {
  /** The run's reads were current and its complete publication replaced the prior closure. */
  Committed = 'committed',
  /** A newer admitted run for the same computation won before this run attempted publication. */
  RejectedSuperseded = 'rejected-superseded',
  /** At least one registered input revision changed before publication. */
  RejectedInputsChanged = 'rejected-inputs-changed',
}

/** Old/new registered-read comparison installed atomically with a successful publication. */
export class ComputationReadChange {
  constructor(
    readonly readKey: string,
    readonly domain: string,
    readonly previousRevision: string | null,
    readonly nextRevision: string | null,
  ) {}
}

/** Why a run was rejected after validating one of its captured reads. */
export class ComputationInvalidRead {
  constructor(
    readonly readKey: string,
    readonly domain: string,
    readonly observedRevision: string,
    readonly currentRevision: string,
    readonly changedFacets: readonly string[],
  ) {}
}

/** Inspectable causal row for one admitted or rejected computation run. */
export class ComputationTransition {
  constructor(
    readonly computationId: ComputationId,
    readonly runSequence: number,
    readonly state: ComputationCommitState,
    readonly changedReads: readonly ComputationReadChange[],
    readonly invalidReads: readonly ComputationInvalidRead[],
    readonly publications: readonly KernelPublicationDecision[],
  ) {}
}

/** Result returned by every lifecycle commit attempt. */
export class ComputationCommitResult {
  constructor(
    readonly state: ComputationCommitState,
    readonly transition: ComputationTransition,
  ) {}
}

/** Current complete read/output closure for one logical computation. */
export class ComputationState {
  constructor(
    readonly computationId: ComputationId,
    readonly locus: ComputationLocus,
    readonly committedRunSequence: number,
    readonly reads: readonly ComputationRead[],
    readonly publication: KernelPublicationManifest,
  ) {}
}

interface MutableComputationEntry {
  readonly computationId: ComputationId;
  readonly locus: ComputationLocus;
  latestRunSequence: number;
  state: ComputationState | null;
  readonly transitions: ComputationTransition[];
}

/** Run-local transaction. Reads and writes stay private until `commit()` succeeds. */
export class ComputationRun implements KernelPublicationContext {
  private readonly readsByKey = new Map<string, ComputationRead>();
  private readonly publications: StagedKernelPublicationContext;
  private finished = false;

  constructor(
    private readonly registry: ComputationLifecycleRegistry,
    store: KernelStore,
    readonly computationId: ComputationId,
    readonly locus: ComputationLocus,
    readonly runSequence: number,
  ) {
    this.publications = new StagedKernelPublicationContext(store);
  }

  get handles() {
    return this.publications.handles;
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    return this.publications.read(handle);
  }

  readMaterializations(): readonly MaterializationRecord[] {
    return this.publications.readMaterializations();
  }

  observe(read: ComputationRead): void {
    this.assertOpen();
    const existing = this.readsByKey.get(read.readKey);
    if (existing != null && (
      existing.domain !== read.domain
      || existing.observedRevision !== read.observedRevision
    )) {
      throw new Error(
        `Computation ${this.computationId} observed conflicting revisions for ${read.readKey}.`,
      );
    }
    this.readsByKey.set(read.readKey, read);
  }

  publish(plan: KernelPublicationPlan): void {
    this.assertOpen();
    this.publications.publish(plan);
  }

  commit(): ComputationCommitResult {
    this.assertOpen();
    this.finished = true;
    return this.registry.commitRun(
      this,
      [...this.readsByKey.values()],
      this.publications.toPlan(`computation:${this.computationId}:run:${this.runSequence}`),
    );
  }

  private assertOpen(): void {
    if (this.finished) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} is already finished.`);
    }
  }
}

/** Store-local registry for revision-validated computation runs and their complete committed closures. */
export class ComputationLifecycleRegistry implements KernelStoreComputationLifecycle {
  private readonly entriesByLocus = new Map<string, MutableComputationEntry>();
  private readonly entriesById = new Map<ComputationId, MutableComputationEntry>();
  private readonly readersByKey = new Map<string, Set<ComputationId>>();
  private nextComputationOrdinal = 1;

  constructor(private readonly store: KernelStore) {
    store.registerComputationLifecycle(this);
  }

  begin(locus: ComputationLocus): ComputationRun {
    const registryKey = `${locus.kind}\0${locus.reconciliationKey}`;
    let entry = this.entriesByLocus.get(registryKey);
    if (entry == null) {
      const computationId = `computation:${this.nextComputationOrdinal++}` as ComputationId;
      entry = {
        computationId,
        locus,
        latestRunSequence: 0,
        state: null,
        transitions: [],
      };
      this.entriesByLocus.set(registryKey, entry);
      this.entriesById.set(computationId, entry);
    }
    entry.latestRunSequence += 1;
    return new ComputationRun(
      this,
      this.store,
      entry.computationId,
      entry.locus,
      entry.latestRunSequence,
    );
  }

  readState(computationId: ComputationId): ComputationState | null {
    return this.entriesById.get(computationId)?.state ?? null;
  }

  readersFor(readKey: string): readonly ComputationId[] {
    return [...(this.readersByKey.get(readKey) ?? [])]
      .sort((left, right) => left.localeCompare(right));
  }

  readTransitions(computationId: ComputationId): readonly ComputationTransition[] {
    return [...(this.entriesById.get(computationId)?.transitions ?? [])];
  }

  dispose(context: KernelStoreDisposalContext): void {
    for (const entry of this.entriesById.values()) {
      const state = entry.state;
      const lifetimeOrdinal = state?.publication.lifetimeOrdinal ?? null;
      if (state == null || lifetimeOrdinal == null || lifetimeOrdinal < context.marker.nextLifetimeOrdinal) {
        continue;
      }
      this.replaceReadIndex(state.reads, [], entry.computationId);
      entry.state = null;
      // Any run prepared against the reclaimed closure must not resurrect it after disposal.
      entry.latestRunSequence += 1;
    }
  }

  commitRun(
    run: ComputationRun,
    reads: readonly ComputationRead[],
    publication: KernelPublicationPlan,
  ): ComputationCommitResult {
    const entry = this.entriesById.get(run.computationId);
    if (entry == null) {
      throw new Error(`Unknown computation ${run.computationId}.`);
    }
    if (entry.latestRunSequence !== run.runSequence) {
      return this.reject(entry, run, ComputationCommitState.RejectedSuperseded, []);
    }

    const invalidReads = reads.flatMap((read) => {
      const validation = read.validate();
      return validation.isCurrent
        ? []
        : [new ComputationInvalidRead(
          read.readKey,
          read.domain,
          read.observedRevision,
          validation.currentRevision,
          validation.changedFacets,
        )];
    });
    if (invalidReads.length > 0) {
      return this.reject(entry, run, ComputationCommitState.RejectedInputsChanged, invalidReads);
    }

    const previousState = entry.state;
    const changedReads = compareReadSets(previousState?.reads ?? [], reads);
    const replacement = this.store.replacePublication(
      previousState?.publication ?? KernelPublicationManifest.empty,
      publication,
    );
    const nextState = new ComputationState(
      entry.computationId,
      entry.locus,
      run.runSequence,
      [...reads],
      replacement.manifest,
    );
    this.replaceReadIndex(previousState?.reads ?? [], reads, entry.computationId);
    entry.state = nextState;
    const transition = new ComputationTransition(
      entry.computationId,
      run.runSequence,
      ComputationCommitState.Committed,
      changedReads,
      [],
      replacement.decisions,
    );
    entry.transitions.push(transition);
    return new ComputationCommitResult(ComputationCommitState.Committed, transition);
  }

  private reject(
    entry: MutableComputationEntry,
    run: ComputationRun,
    state: ComputationCommitState,
    invalidReads: readonly ComputationInvalidRead[],
  ): ComputationCommitResult {
    const transition = new ComputationTransition(
      entry.computationId,
      run.runSequence,
      state,
      [],
      invalidReads,
      [],
    );
    entry.transitions.push(transition);
    return new ComputationCommitResult(state, transition);
  }

  private replaceReadIndex(
    previous: readonly ComputationRead[],
    next: readonly ComputationRead[],
    computationId: ComputationId,
  ): void {
    for (const read of previous) {
      const readers = this.readersByKey.get(read.readKey);
      readers?.delete(computationId);
      if (readers?.size === 0) {
        this.readersByKey.delete(read.readKey);
      }
    }
    for (const read of next) {
      let readers = this.readersByKey.get(read.readKey);
      if (readers == null) {
        readers = new Set();
        this.readersByKey.set(read.readKey, readers);
      }
      readers.add(computationId);
    }
  }
}

function compareReadSets(
  previous: readonly ComputationRead[],
  next: readonly ComputationRead[],
): readonly ComputationReadChange[] {
  const previousByKey = new Map(previous.map((read) => [read.readKey, read]));
  const nextByKey = new Map(next.map((read) => [read.readKey, read]));
  const changes: ComputationReadChange[] = [];
  const keys = [...new Set([...previousByKey.keys(), ...nextByKey.keys()])].sort();
  for (const key of keys) {
    const before = previousByKey.get(key) ?? null;
    const after = nextByKey.get(key) ?? null;
    if (
      before?.domain === after?.domain
      && before?.observedRevision === after?.observedRevision
    ) {
      continue;
    }
    changes.push(new ComputationReadChange(
      key,
      after?.domain ?? before?.domain ?? 'unknown',
      before?.observedRevision ?? null,
      after?.observedRevision ?? null,
    ));
  }
  return changes;
}

export function computationPublicationRecordHandles(
  state: ComputationState | null,
): readonly KernelRecordHandle[] {
  return state?.publication.recordHandles ?? [];
}

function recordRevisionLabel(revision: number | null): string {
  return revision == null ? 'absent' : `revision:${revision}`;
}
