import type { HotDetailHandle, KernelRecordHandle, ProductHandle } from './handles.js';
import type { HotDetailSlot } from './hot-details.js';
import type { MaterializationRecord } from './materialization.js';
import type { ProductDetailSlot } from './product-details.js';
import {
  KernelPublicationDecisionKind,
  KernelPublicationManifest,
  KernelPublicationPlan,
  KernelPublicationSurface,
  type KernelPublicationContext,
  StagedKernelPublicationContext,
  type KernelPublicationDecision,
} from './publication.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreComputationLifecycle,
  type KernelStoreDensityDelta,
  type KernelStoreDetailDensityDelta,
  type KernelStoreDisposalContext,
  type KernelStoreObservationMarker,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from './store.js';
import type { SemanticRuntimeKernelCountSnapshot } from '../telemetry/kernel-density.js';
import type { GenerationAuthority } from './generation-authority.js';
import type { SourceFileAddress } from './address.js';

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

export function computationRecordReadKey(handle: KernelRecordHandle): string {
  return `kernel-record:${handle}`;
}

export function computationProductDetailReadKey(detailKind: string, productHandle: ProductHandle): string {
  return `kernel-product-detail:${detailKind}:${productHandle}`;
}

export function computationHotDetailReadKey(detailKind: string, handle: HotDetailHandle): string {
  return `kernel-hot-detail:${detailKind}:${handle}`;
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
    readonly lifetimeOrdinal: number | null,
  ) {
    this.readKey = computationRecordReadKey(handle);
    this.observedRevision = recordRevisionLabel(revision, lifetimeOrdinal);
  }

  validate(): ComputationReadValidation {
    const currentRevision = this.store.readRecordRevision(this.handle);
    const currentLifetimeOrdinal = this.store.readRecordLifetimeOrdinal(this.handle);
    return {
      isCurrent: currentRevision === this.revision && currentLifetimeOrdinal === this.lifetimeOrdinal,
      currentRevision: recordRevisionLabel(currentRevision, currentLifetimeOrdinal),
      changedFacets: currentRevision === this.revision && currentLifetimeOrdinal === this.lifetimeOrdinal
        ? []
        : currentRevision == null || this.revision == null
          ? ['existence']
          : [
              ...(currentRevision === this.revision ? [] : ['record']),
              ...(currentLifetimeOrdinal === this.lifetimeOrdinal ? [] : ['lifetime']),
            ],
    };
  }
}

/** Exact positive or negative read of one typed product-detail slot. */
export class ComputationProductDetailRead implements ComputationRead {
  readonly domain = 'kernel-product-detail';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly store: KernelStore,
    readonly productHandle: ProductHandle,
    readonly detailKind: string,
    private readonly actualKind: string | null,
    private readonly revision: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {
    this.readKey = computationProductDetailReadKey(detailKind, productHandle);
    this.observedRevision = detailRevisionLabel(actualKind, revision, lifetimeOrdinal);
  }

  validate(): ComputationReadValidation {
    const currentEntry = this.store.productDetails.readEntry(this.productHandle);
    return validateDetailRevision(
      this.actualKind,
      this.revision,
      this.lifetimeOrdinal,
      currentEntry?.slot.detailKind ?? null,
      this.store.productDetails.readMutationOrdinal(this.productHandle),
      this.store.productDetails.readLifetimeOrdinal(this.productHandle),
    );
  }
}

/** Exact positive or negative read of one typed hot-detail slot. */
export class ComputationHotDetailRead implements ComputationRead {
  readonly domain = 'kernel-hot-detail';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly store: KernelStore,
    readonly handle: HotDetailHandle,
    readonly detailKind: string,
    private readonly actualKind: string | null,
    private readonly revision: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {
    this.readKey = computationHotDetailReadKey(detailKind, handle);
    this.observedRevision = detailRevisionLabel(actualKind, revision, lifetimeOrdinal);
  }

  validate(): ComputationReadValidation {
    const currentEntry = this.store.hotDetails.readEntry(this.handle);
    return validateDetailRevision(
      this.actualKind,
      this.revision,
      this.lifetimeOrdinal,
      currentEntry?.slot.detailKind ?? null,
      this.store.hotDetails.readMutationOrdinal(this.handle),
      this.store.hotDetails.readLifetimeOrdinal(this.handle),
    );
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
    const read = new ComputationRecordRead(
      this.store,
      handle,
      this.store.readRecordRevision(handle),
      this.store.readRecordLifetimeOrdinal(handle),
    );
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
    readonly outputs: readonly ComputationOutput[],
    readonly publication: KernelPublicationManifest,
  ) {}
}

/** Exact output key owned by one committed computation generation. */
export class ComputationOutput {
  readonly readKey: string;

  constructor(
    readonly surface: KernelPublicationSurface,
    readonly handle: string,
    readonly detailKind: string,
  ) {
    this.readKey = computationOutputReadKey(surface, handle, detailKind);
  }
}

/** Revocable capability for one successfully committed computation generation. */
export interface ComputationGenerationAuthority extends GenerationAuthority {
  readonly key: string;
  readonly computationId: ComputationId;
  readonly runSequence: number;
}

class LifecycleComputationGenerationAuthority implements ComputationGenerationAuthority {
  readonly key: string;

  constructor(
    private readonly lifecycle: ComputationLifecycleRegistry,
    readonly computationId: ComputationId,
    readonly runSequence: number,
  ) {
    this.key = `${computationId}@${runSequence}`;
  }

  isCurrent(): boolean {
    return this.lifecycle.readState(this.computationId)?.committedRunSequence === this.runSequence;
  }

  requireCurrent(): void {
    if (!this.isCurrent()) {
      throw new Error(`Computation generation ${this.key} is no longer current.`);
    }
  }
}

interface MutableComputationEntry {
  readonly computationId: ComputationId;
  readonly locus: ComputationLocus;
  latestRunSequence: number;
  latestFinishedRunSequence: number;
  state: ComputationState | null;
  readonly admittedGenerationDomains: Set<string>;
  readonly transitions: ComputationTransition[];
}

/** Run-local transaction. Reads and writes stay private until `commit()` succeeds. */
export class ComputationRun implements KernelPublicationContext {
  private readonly readsByKey = new Map<string, ComputationRead>();
  private readonly publications: StagedKernelPublicationContext;
  private finished = false;

  constructor(
    private readonly registry: ComputationLifecycleRegistry,
    private readonly store: KernelStore,
    readonly computationId: ComputationId,
    readonly locus: ComputationLocus,
    readonly runSequence: number,
    previousPublication: KernelPublicationManifest,
  ) {
    this.publications = new StagedKernelPublicationContext(this.store, previousPublication);
  }

  get handles() {
    this.requireCurrent();
    return this.publications.handles;
  }

  isCurrent(): boolean {
    return !this.finished && this.registry.isLatestRun(this) && this.publications.isCurrent();
  }

  requireCurrent(): void {
    this.assertOpen();
    if (!this.registry.isLatestRun(this)) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} has been superseded.`);
    }
    this.publications.requireCurrent();
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    this.requireCurrent();
    const result = this.publications.readRecordWithRevision(handle);
    if (result.committedRevision != null) {
      this.observe(new ComputationRecordRead(
        this.store,
        handle,
        result.committedRevision.mutationOrdinal,
        result.committedRevision.lifetimeOrdinal,
      ));
    }
    return result.value;
  }

  readAllRecords(): readonly KernelStoreRecord[] {
    this.requireCurrent();
    // Aggregate views require domain-owned membership and closure revisions; exact reads alone cannot make them honest.
    return this.publications.readAllRecords();
  }

  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[] {
    this.requireCurrent();
    return this.publications.readSourceFileAddressesByFileName(fileName);
  }

  readMaterializations(): readonly MaterializationRecord[] {
    this.requireCurrent();
    return this.publications.readMaterializations();
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    this.requireCurrent();
    const result = this.publications.readProductDetailWithRevision(slot, productHandle);
    if (result.committedRevision != null) {
      this.observe(new ComputationProductDetailRead(
        this.store,
        productHandle,
        slot.detailKind,
        result.committedRevision.actualKind,
        result.committedRevision.mutationOrdinal,
        result.committedRevision.lifetimeOrdinal,
      ));
    }
    return result.value;
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null {
    this.requireCurrent();
    const result = this.publications.readHotDetailWithRevision(slot, handle);
    if (result.committedRevision != null) {
      this.observe(new ComputationHotDetailRead(
        this.store,
        handle,
        slot.detailKind,
        result.committedRevision.actualKind,
        result.committedRevision.mutationOrdinal,
        result.committedRevision.lifetimeOrdinal,
      ));
    }
    return result.value;
  }

  markObservation(): KernelStoreObservationMarker {
    this.requireCurrent();
    return this.publications.markObservation();
  }

  readKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot {
    this.requireCurrent();
    return this.publications.readKernelCountSnapshot();
  }

  readDensitySince(marker: KernelStoreObservationMarker): KernelStoreDensityDelta {
    this.requireCurrent();
    return this.publications.readDensitySince(marker);
  }

  readDetailDensitySince(marker: KernelStoreObservationMarker): KernelStoreDetailDensityDelta {
    this.requireCurrent();
    return this.publications.readDetailDensitySince(marker);
  }

  observe(read: ComputationRead): void {
    this.requireCurrent();
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
    this.requireCurrent();
    this.publications.publish(plan);
  }

  commit(): ComputationCommitResult {
    this.assertOpen();
    try {
      return this.registry.commitRun(
        this,
        this.readsForCommit(),
        this.publications.toPlan(`computation:${this.computationId}:run:${this.runSequence}`),
      );
    } finally {
      this.finished = true;
      this.registry.finishRun(this);
    }
  }

  /** Finish a prepared run without publishing when domain preparation cannot produce a complete candidate. */
  abort(): void {
    this.assertOpen();
    this.finished = true;
    this.registry.finishRun(this);
  }

  private assertOpen(): void {
    if (this.finished) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} is already finished.`);
    }
  }

  private readsForCommit(): readonly ComputationRead[] {
    const readsByKey = new Map(this.readsByKey);
    for (const snapshot of this.publications.readProductDetailAdmissionSnapshots()) {
      if (snapshot.expectedEntry == null) {
        continue;
      }
      const read = new ComputationProductDetailRead(
        this.store,
        snapshot.productHandle,
        snapshot.detailKind,
        snapshot.committedRevision.actualKind,
        snapshot.committedRevision.mutationOrdinal,
        snapshot.committedRevision.lifetimeOrdinal,
      );
      readsByKey.set(read.readKey, read);
    }
    for (const snapshot of this.publications.readHotDetailAdmissionSnapshots()) {
      if (snapshot.expectedEntry == null) {
        continue;
      }
      const read = new ComputationHotDetailRead(
        this.store,
        snapshot.handle,
        snapshot.detailKind,
        snapshot.committedRevision.actualKind,
        snapshot.committedRevision.mutationOrdinal,
        snapshot.committedRevision.lifetimeOrdinal,
      );
      readsByKey.set(read.readKey, read);
    }
    return [...readsByKey.values()];
  }
}

/** Store-local registry for revision-validated computation runs and their complete committed closures. */
export class ComputationLifecycleRegistry implements KernelStoreComputationLifecycle {
  private readonly entriesByLocus = new Map<string, MutableComputationEntry>();
  private readonly entriesById = new Map<ComputationId, MutableComputationEntry>();
  private readonly readersByKey = new Map<string, Set<ComputationId>>();
  private readonly producerByKey = new Map<string, ComputationId>();
  private nextComputationOrdinal = 1;
  private readonly publicationOwner = {};

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
        latestFinishedRunSequence: 0,
        state: null,
        admittedGenerationDomains: new Set(),
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
      entry.state?.publication ?? KernelPublicationManifest.empty,
    );
  }

  readState(computationId: ComputationId): ComputationState | null {
    return this.entriesById.get(computationId)?.state ?? null;
  }

  /** Admit one domain object graph exactly once for the current committed run. */
  admitCommittedGeneration(
    computationId: ComputationId,
    runSequence: number,
    domain: string,
  ): ComputationGenerationAuthority {
    const entry = this.entriesById.get(computationId);
    if (entry?.state?.committedRunSequence !== runSequence) {
      throw new Error(`Cannot admit uncommitted computation generation ${computationId}@${runSequence}.`);
    }
    if (entry.admittedGenerationDomains.has(domain)) {
      throw new Error(`Computation generation ${computationId}@${runSequence} already admitted ${domain}.`);
    }
    entry.admittedGenerationDomains.add(domain);
    return new LifecycleComputationGenerationAuthority(this, computationId, runSequence);
  }

  /** Withdraw one exact current generation without relying on its relative store lifetime. */
  retireCommittedGeneration(computationId: ComputationId, runSequence: number): boolean {
    const entry = this.entriesById.get(computationId);
    const state = entry?.state ?? null;
    if (entry == null || state?.committedRunSequence !== runSequence) {
      return false;
    }
    this.store.replaceOwnedPublication(
      state.publication,
      new KernelPublicationPlan(new KernelStoreBatch([], `retire:${computationId}@${runSequence}`)),
      this.publicationOwner,
      {
        validate: (decisions) => this.validateProducerReplacement(
          state.outputs,
          computationOutputsFromDecisions(decisions),
          computationId,
        ),
      },
    );
    this.replaceReadIndex(state.reads, [], computationId);
    this.commitProducerReplacement(state.outputs, [], computationId);
    entry.state = null;
    entry.admittedGenerationDomains.clear();
    entry.latestRunSequence += 1;
    entry.latestFinishedRunSequence = entry.latestRunSequence;
    return true;
  }

  /** Whether a prepared run still owns the newest candidate position at its stable locus. */
  isLatestRun(run: ComputationRun): boolean {
    return this.entriesById.get(run.computationId)?.latestRunSequence === run.runSequence;
  }

  readersFor(readKey: string): readonly ComputationId[] {
    return [...(this.readersByKey.get(readKey) ?? [])]
      .sort((left, right) => left.localeCompare(right));
  }

  producerFor(readKey: string): ComputationId | null {
    return this.producerByKey.get(readKey) ?? null;
  }

  readTransitions(computationId: ComputationId): readonly ComputationTransition[] {
    return [...(this.entriesById.get(computationId)?.transitions ?? [])];
  }

  dispose(context: KernelStoreDisposalContext): void {
    for (const entry of this.entriesById.values()) {
      if (entry.latestFinishedRunSequence < entry.latestRunSequence) {
        // A lifetime boundary invalidates prepared work even when it has not published a first generation yet.
        entry.latestRunSequence += 1;
      }
      const state = entry.state;
      const lifetimeOrdinal = state?.publication.lifetimeOrdinal ?? null;
      if (state == null || lifetimeOrdinal == null || lifetimeOrdinal < context.marker.nextLifetimeOrdinal) {
        continue;
      }
      this.replaceReadIndex(state.reads, [], entry.computationId);
      this.commitProducerReplacement(state.outputs, [], entry.computationId);
      this.store.retirePublicationManifest(state.publication, this.publicationOwner);
      entry.state = null;
      entry.admittedGenerationDomains.clear();
      // Any run prepared against the reclaimed closure must not resurrect it after disposal.
      entry.latestRunSequence += 1;
    }
  }

  /** Internal run-finalization hook shared by commit and domain-owned preparation aborts. */
  finishRun(run: ComputationRun): void {
    const entry = this.entriesById.get(run.computationId);
    if (entry != null) {
      entry.latestFinishedRunSequence = Math.max(entry.latestFinishedRunSequence, run.runSequence);
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
    const replacement = this.store.replaceOwnedPublication(
      previousState?.publication ?? KernelPublicationManifest.empty,
      publication.withMinimumLifetimeOrdinal(computationReadLifetimeOrdinal(reads)),
      this.publicationOwner,
      {
        validate: (decisions) => this.validateProducerReplacement(
          previousState?.outputs ?? [],
          computationOutputsFromDecisions(decisions),
          entry.computationId,
        ),
      },
    );
    const outputs = computationOutputsFromDecisions(replacement.decisions);
    const outputKeys = new Set(outputs.map((output) => output.readKey));
    const committedReads = reads.filter((read) => !outputKeys.has(read.readKey));
    const changedReads = compareReadSets(previousState?.reads ?? [], committedReads);
    const nextState = new ComputationState(
      entry.computationId,
      entry.locus,
      run.runSequence,
      committedReads,
      outputs,
      replacement.manifest,
    );
    this.replaceReadIndex(previousState?.reads ?? [], committedReads, entry.computationId);
    this.commitProducerReplacement(previousState?.outputs ?? [], outputs, entry.computationId);
    entry.state = nextState;
    entry.admittedGenerationDomains.clear();
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

  private validateProducerReplacement(
    previous: readonly ComputationOutput[],
    next: readonly ComputationOutput[],
    computationId: ComputationId,
  ): void {
    for (const output of previous) {
      if (this.producerByKey.get(output.readKey) !== computationId) {
        throw new Error(`Computation output ${output.readKey} lost producer ownership before replacement.`);
      }
    }
    for (const output of next) {
      const existing = this.producerByKey.get(output.readKey);
      if (existing != null && existing !== computationId) {
        throw new Error(`Computation output ${output.readKey} is already owned by ${existing}.`);
      }
    }
  }

  /** Apply the producer index after the store has admitted the preflighted replacement. */
  private commitProducerReplacement(
    previous: readonly ComputationOutput[],
    next: readonly ComputationOutput[],
    computationId: ComputationId,
  ): void {
    for (const output of previous) {
      if (this.producerByKey.get(output.readKey) === computationId) {
        this.producerByKey.delete(output.readKey);
      }
    }
    for (const output of next) {
      this.producerByKey.set(output.readKey, computationId);
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

function computationReadLifetimeOrdinal(reads: readonly ComputationRead[]): number | null {
  let lifetimeOrdinal: number | null = null;
  for (const read of reads) {
    if (
      !(
        read instanceof ComputationRecordRead
        || read instanceof ComputationProductDetailRead
        || read instanceof ComputationHotDetailRead
      )
      || read.lifetimeOrdinal == null
    ) {
      continue;
    }
    lifetimeOrdinal = lifetimeOrdinal == null
      ? read.lifetimeOrdinal
      : Math.max(lifetimeOrdinal, read.lifetimeOrdinal);
  }
  return lifetimeOrdinal;
}

function computationOutputsFromDecisions(
  decisions: readonly KernelPublicationDecision[],
): readonly ComputationOutput[] {
  return decisions
    .filter((decision) => decision.decision !== KernelPublicationDecisionKind.Withdraw)
    .map((decision) => new ComputationOutput(
      decision.surface,
      decision.handle,
      decision.detailKind,
    ))
    .sort((left, right) => left.readKey.localeCompare(right.readKey));
}

function computationOutputReadKey(
  surface: KernelPublicationSurface,
  handle: string,
  detailKind: string,
): string {
  switch (surface) {
    case KernelPublicationSurface.Record:
      return computationRecordReadKey(handle as KernelRecordHandle);
    case KernelPublicationSurface.ProductDetail:
      return computationProductDetailReadKey(detailKind, handle as ProductHandle);
    case KernelPublicationSurface.HotDetail:
      return computationHotDetailReadKey(detailKind, handle as HotDetailHandle);
  }
}

function validateDetailRevision(
  observedKind: string | null,
  observedRevision: number | null,
  observedLifetimeOrdinal: number | null,
  currentKind: string | null,
  currentRevision: number | null,
  currentLifetimeOrdinal: number | null,
): ComputationReadValidation {
  const isCurrent = observedKind === currentKind
    && observedRevision === currentRevision
    && observedLifetimeOrdinal === currentLifetimeOrdinal;
  return {
    isCurrent,
    currentRevision: detailRevisionLabel(currentKind, currentRevision, currentLifetimeOrdinal),
    changedFacets: isCurrent
      ? []
      : [
          ...(observedKind === currentKind
            ? []
            : observedKind == null || currentKind == null ? ['existence'] : ['slot']),
          ...(observedRevision === currentRevision ? [] : ['detail']),
          ...(observedLifetimeOrdinal === currentLifetimeOrdinal ? [] : ['lifetime']),
        ],
  };
}

function detailRevisionLabel(
  actualKind: string | null,
  revision: number | null,
  lifetimeOrdinal: number | null,
): string {
  return revision == null
    ? 'absent'
    : `slot:${actualKind ?? 'unknown'}:revision:${revision}:lifetime:${lifetimeOrdinal ?? 'unknown'}`;
}

function recordRevisionLabel(revision: number | null, lifetimeOrdinal: number | null): string {
  return revision == null ? 'absent' : `revision:${revision}:lifetime:${lifetimeOrdinal ?? 'unknown'}`;
}
