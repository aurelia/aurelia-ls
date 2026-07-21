import type { HotDetailHandle, KernelRecordHandle, ProductHandle } from './handles.js';
import type { HotDetailSlot } from './hot-details.js';
import type { MaterializationRecord } from './materialization.js';
import type { ProductDetailSlot } from './product-details.js';
import {
  KernelDetailAdmission,
  KernelPublicationDecisionKind,
  KernelPublicationManifest,
  KernelPublicationPlan,
  type KernelPublicationContext,
  type KernelPublicationReplacement,
  type KernelPublicationWriterId,
  type KernelStagedEntryRevision,
  type SealedKernelPublicationCandidate,
  StagedKernelPublicationContext,
  type KernelPublicationDecision,
  type KernelHotDetailAdmissionSnapshot,
  type KernelProductDetailAdmissionSnapshot,
} from './publication.js';
import { KernelPublicationSurface } from './publication-surface.js';
import type { KernelDetailReference } from './detail-references.js';
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
  type KernelStoreRetentionCollector,
} from './store.js';
import { referencedKernelRecordHandles } from './record-comparison.js';
import type { SemanticRuntimeKernelCountSnapshot } from '../telemetry/kernel-density.js';
import type { GenerationAuthority } from './generation-authority.js';
import type { SourceFileAddress } from './address.js';

declare const computationIdBrand: unique symbol;

/** Opaque identity for one logical computation occurrence inside an active store. */
export type ComputationId = string & { readonly [computationIdBrand]: true };

/**
 * Domain-owned stable locus used to reconcile a logical computation across runs.
 * Committed state retains only this immutable kernel identity; domain payload must be encoded in the key.
 */
export interface ComputationLocus {
  readonly kind: string;
  readonly reconciliationKey: string;
  readonly summary: string;
}

/** Stable identity for one logical child computation beneath an outer atomic computation. */
export type ComputationChildId = KernelPublicationWriterId;

/** Aggregate operation whose membership/absence revision is not yet owned by a domain authority. */
export const enum ComputationOpenReadKind {
  AllRecords = 'all-records',
  SourceFileIndex = 'source-file-index',
  Materializations = 'materializations',
}

/** Honest blocker retained when a child consumed an unrevisioned aggregate view. */
export class ComputationChildOpenRead {
  readonly positiveRecordHandles: readonly KernelRecordHandle[];

  constructor(
    readonly key: string,
    readonly kind: ComputationOpenReadKind,
    readonly summary: string,
    /** Youngest positive committed row returned by this otherwise unrevisioned aggregate read. */
    readonly minimumLifetimeOrdinal: number | null,
    positiveRecordHandles: readonly KernelRecordHandle[],
  ) {
    this.positiveRecordHandles = Object.freeze([...positiveRecordHandles]);
    Object.freeze(this);
  }
}

/** Presence state captured by one exact candidate-local read. */
export const enum ComputationCandidateReadState {
  /** Another child supplied the candidate entry. */
  Present = 'present',
  /** The outer candidate intentionally omits an entry owned by its prior generation. */
  Absent = 'absent',
}

/** Exact candidate-local dependency, including negative reads that have no producer child. */
export class ComputationCandidateRead {
  constructor(
    readonly readKey: string,
    readonly state: ComputationCandidateReadState,
    readonly producerChildId: ComputationChildId | null,
    readonly observedMutationOrdinal: number | null,
  ) {
    Object.freeze(this);
  }
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

const enum ComputationKernelInputKind {
  Record,
  ProductDetail,
  HotDetail,
}

/** Immutable store-retention fact captured beside one exact positive read. */
class ComputationKernelInput {
  constructor(
    readonly kind: ComputationKernelInputKind,
    readonly handle: KernelRecordHandle | ProductHandle | HotDetailHandle,
    readonly lifetimeOrdinal: number,
  ) {
    Object.freeze(this);
  }
}

export function computationRecordReadKey(handle: KernelRecordHandle): string {
  return `kernel-record:${handle}`;
}

export function computationProductDetailReadKey(productHandle: ProductHandle): string {
  return `kernel-product-detail:${productHandle}`;
}

export function computationHotDetailReadKey(handle: HotDetailHandle): string {
  return `kernel-hot-detail:${handle}`;
}

/** Exact positive or negative read of one normalized kernel record. */
export class ComputationRecordRead implements ComputationRead {
  readonly domain = 'kernel-record';
  readonly readKey: string;
  readonly observedRevision: string;
  readonly retainedKernelInput: ComputationKernelInput | null;

  constructor(
    private readonly store: KernelStore,
    readonly handle: KernelRecordHandle,
    private readonly revision: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {
    this.readKey = computationRecordReadKey(handle);
    this.observedRevision = recordRevisionLabel(revision, lifetimeOrdinal);
    this.retainedKernelInput = revision == null || lifetimeOrdinal == null
      ? null
      : new ComputationKernelInput(ComputationKernelInputKind.Record, handle, lifetimeOrdinal);
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
  readonly retainedKernelInput: ComputationKernelInput | null;

  constructor(
    private readonly store: KernelStore,
    readonly productHandle: ProductHandle,
    readonly detailKind: string,
    private readonly actualKind: string | null,
    private readonly revision: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {
    this.readKey = computationProductDetailReadKey(productHandle);
    this.observedRevision = detailRevisionLabel(actualKind, revision, lifetimeOrdinal);
    this.retainedKernelInput = revision == null || lifetimeOrdinal == null
      ? null
      : new ComputationKernelInput(ComputationKernelInputKind.ProductDetail, productHandle, lifetimeOrdinal);
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
  readonly retainedKernelInput: ComputationKernelInput | null;

  constructor(
    private readonly store: KernelStore,
    readonly handle: HotDetailHandle,
    readonly detailKind: string,
    private readonly actualKind: string | null,
    private readonly revision: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {
    this.readKey = computationHotDetailReadKey(handle);
    this.observedRevision = detailRevisionLabel(actualKind, revision, lifetimeOrdinal);
    this.retainedKernelInput = revision == null || lifetimeOrdinal == null
      ? null
      : new ComputationKernelInput(ComputationKernelInputKind.HotDetail, handle, lifetimeOrdinal);
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

/** Immutable read metadata and callback captured before publication enters the store mutation barrier. */
class SealedComputationRead implements ComputationRead {
  private constructor(
    readonly readKey: string,
    readonly domain: string,
    readonly observedRevision: string,
    private readonly validateCurrent: () => ComputationReadValidation,
    readonly retainedKernelInput: ComputationKernelInput | null,
  ) {
    Object.freeze(this);
  }

  validate(): ComputationReadValidation {
    const current = this.validateCurrent();
    const validation: ComputationReadValidation = {
      isCurrent: current.isCurrent,
      currentRevision: current.currentRevision,
      changedFacets: Object.freeze([...current.changedFacets]),
    };
    return Object.freeze(validation);
  }

  retainKernelInput(retention: KernelStoreRetentionCollector): void {
    const input = this.retainedKernelInput;
    if (input == null) {
      return;
    }
    switch (input.kind) {
      case ComputationKernelInputKind.Record:
        retention.retainRecord(input.handle as KernelRecordHandle);
        break;
      case ComputationKernelInputKind.ProductDetail:
        retention.retainProductDetail(input.handle as ProductHandle);
        break;
      case ComputationKernelInputKind.HotDetail:
        retention.retainHotDetail(input.handle as HotDetailHandle);
        break;
    }
  }

  static from(read: ComputationRead): SealedComputationRead {
    if (read instanceof SealedComputationRead) {
      return read;
    }
    const validate: unknown = Reflect.get(read, 'validate');
    if (typeof validate !== 'function') {
      throw new Error(`Computation read ${read.readKey} has no validation callback.`);
    }
    const validateCurrent = validate as (this: ComputationRead) => ComputationReadValidation;
    const retainedKernelInput = (
      read instanceof ComputationRecordRead
      || read instanceof ComputationProductDetailRead
      || read instanceof ComputationHotDetailRead
    ) ? read.retainedKernelInput : null;
    return new SealedComputationRead(
      read.readKey,
      read.domain,
      read.observedRevision,
      () => Reflect.apply(validateCurrent, read, []),
      retainedKernelInput,
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
  ) {
    Object.freeze(this);
  }
}

/** Why a run was rejected after validating one of its captured reads. */
export class ComputationInvalidRead {
  readonly changedFacets: readonly string[];

  constructor(
    readonly readKey: string,
    readonly domain: string,
    readonly observedRevision: string,
    readonly currentRevision: string,
    changedFacets: readonly string[],
  ) {
    this.changedFacets = Object.freeze([...changedFacets]);
    Object.freeze(this);
  }
}

/** Inspectable causal row for one admitted or rejected computation run. */
export class ComputationTransition {
  readonly changedReads: readonly ComputationReadChange[];
  readonly invalidReads: readonly ComputationInvalidRead[];
  readonly publications: readonly KernelPublicationDecision[];

  constructor(
    readonly computationId: ComputationId,
    readonly runSequence: number,
    readonly state: ComputationCommitState,
    changedReads: readonly ComputationReadChange[],
    invalidReads: readonly ComputationInvalidRead[],
    publications: readonly KernelPublicationDecision[],
  ) {
    this.changedReads = Object.freeze([...changedReads]);
    this.invalidReads = Object.freeze([...invalidReads]);
    this.publications = Object.freeze([...publications]);
    Object.freeze(this);
  }
}

/** Result returned by every lifecycle commit attempt. */
export class ComputationCommitResult {
  constructor(
    readonly state: ComputationCommitState,
    readonly transition: ComputationTransition,
  ) {
    Object.freeze(this);
  }
}

/** Current complete read/output closure for one logical computation. */
export class ComputationState {
  readonly computationId: ComputationId;
  readonly locus: ComputationLocus;
  readonly committedRunSequence: number;
  readonly reads: readonly ComputationRead[];
  readonly openReads: readonly ComputationChildOpenRead[];
  readonly outputs: readonly ComputationOutput[];
  readonly children: readonly ComputationChildState[];
  readonly publication: KernelPublicationManifest;

  constructor(
    computationId: ComputationId,
    locus: ComputationLocus,
    committedRunSequence: number,
    reads: readonly ComputationRead[],
    openReads: readonly ComputationChildOpenRead[],
    outputs: readonly ComputationOutput[],
    children: readonly ComputationChildState[],
    publication: KernelPublicationManifest,
  ) {
    this.computationId = computationId;
    this.locus = locus;
    this.committedRunSequence = committedRunSequence;
    this.reads = Object.freeze([...reads]);
    this.openReads = Object.freeze([...openReads]);
    this.outputs = Object.freeze([...outputs]);
    this.children = Object.freeze([...children]);
    this.publication = publication;
    Object.freeze(this);
  }
}

/** Exact output key owned by one committed computation generation. */
export class ComputationOutput {
  readonly readKey: string;

  constructor(
    readonly surface: KernelPublicationSurface,
    readonly handle: string,
    readonly detailKind: string,
  ) {
    this.readKey = computationOutputReadKey(surface, handle);
    Object.freeze(this);
  }
}

export const enum ComputationChildRole {
  /** Domain-declared child with a stable reconciliation locus. */
  Declared = 'declared',
  /** Kernel-owned default scope for work outside declared children in an explicit partition. */
  Remainder = 'remainder',
}

export const enum ComputationChildSccKind {
  /** Child has no candidate dependency cycle with another committed child. */
  Singleton = 'singleton',
  /** Child belongs to a nontrivial candidate dependency cycle. */
  Cyclic = 'cyclic',
}

/** Exact technical strongly connected component derived from committed candidate-read edges. */
export class ComputationChildScc {
  readonly memberChildIds: readonly ComputationChildId[];

  constructor(
    readonly key: string,
    readonly kind: ComputationChildSccKind,
    memberChildIds: readonly ComputationChildId[],
  ) {
    this.memberChildIds = Object.freeze([...memberChildIds].sort((left, right) => left.localeCompare(right)));
    Object.freeze(this);
  }
}

/** Current read/output manifest for one logical child admitted with its outer computation. */
export class ComputationChildState {
  readonly childId: ComputationChildId;
  readonly locus: ComputationLocus;
  readonly reads: readonly ComputationRead[];
  readonly candidateReads: readonly ComputationCandidateRead[];
  readonly openReads: readonly ComputationChildOpenRead[];
  readonly outputs: readonly ComputationOutput[];

  constructor(
    childId: ComputationChildId,
    locus: ComputationLocus,
    readonly role: ComputationChildRole,
    readonly scc: ComputationChildScc,
    reads: readonly ComputationRead[],
    candidateReads: readonly ComputationCandidateRead[],
    openReads: readonly ComputationChildOpenRead[],
    outputs: readonly ComputationOutput[],
  ) {
    this.childId = childId;
    this.locus = locus;
    this.reads = Object.freeze([...reads]);
    this.candidateReads = Object.freeze([...candidateReads]);
    this.openReads = Object.freeze([...openReads]);
    this.outputs = Object.freeze([...outputs]);
    Object.freeze(this);
  }

  /** Whether every recorded input has an exact revision rather than an unresolved aggregate closure. */
  get hasOnlyRevisionedReads(): boolean {
    return this.openReads.length === 0;
  }
}

class MutableComputationChild {
  readonly readsByKey = new Map<string, ComputationRead>();
  readonly stagedReadsByKey = new Map<string, KernelStagedEntryRevision>();
  readonly openReadsByKey = new Map<string, ComputationChildOpenRead>();

  constructor(
    readonly childId: ComputationChildId,
    readonly locus: ComputationLocus,
    readonly role: ComputationChildRole,
  ) {}
}

interface PreparedComputationChild {
  readonly child: MutableComputationChild;
  readonly reads: readonly ComputationRead[];
  readonly candidateReads: readonly ComputationCandidateRead[];
  readonly openReads: readonly ComputationChildOpenRead[];
  readonly outputs: readonly ComputationOutput[];
}

class ComputationRemainderLocus implements ComputationLocus {
  readonly kind = 'computation-remainder';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(parent: ComputationLocus) {
    this.reconciliationKey = parent.reconciliationKey;
    this.summary = `unmigrated remainder of ${parent.summary}`;
    Object.freeze(this);
  }
}

const enum ComputationRunPhase {
  Preparing,
  Committing,
  Finished,
}

/** Preflighted child manifests or the candidate-local reads that made them stale. */
export class ComputationChildPreparation {
  readonly states: readonly ComputationChildState[];
  readonly invalidReads: readonly ComputationInvalidRead[];

  constructor(
    states: readonly ComputationChildState[],
    invalidReads: readonly ComputationInvalidRead[],
  ) {
    this.states = Object.freeze([...states]);
    this.invalidReads = Object.freeze([...invalidReads]);
    Object.freeze(this);
  }
}

class ComputationChildReadValidationError extends Error {
  constructor(readonly invalidReads: readonly ComputationInvalidRead[]) {
    super('One or more child computation inputs changed before outer publication.');
  }
}

class ComputationInputReadValidationError extends Error {
  constructor(readonly invalidReads: readonly ComputationInvalidRead[]) {
    super('One or more computation inputs changed before outer publication.');
  }
}

class ComputationSupersededDuringCommitError extends Error {
  constructor(computationId: ComputationId, runSequence: number) {
    super(`Computation run ${computationId}@${runSequence} was superseded during publication preflight.`);
  }
}

class ComputationChildPreparationFailure extends Error {
  constructor(
    readonly childId: ComputationChildId,
    override readonly cause: unknown,
  ) {
    super(`Computation child ${childId} failed child preparation; its outer transaction cannot commit.`);
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
  private readonly childrenById = new Map<ComputationChildId, MutableComputationChild>();
  private readonly remainderChild: MutableComputationChild;
  private activeChild: MutableComputationChild;
  private activeChildScopeDepth = 0;
  private hasExplicitChildren = false;
  private hasExplicitPartition = false;
  private childFailure: ComputationChildPreparationFailure | null = null;
  private phase = ComputationRunPhase.Preparing;

  constructor(
    private readonly registry: ComputationLifecycleRegistry,
    private readonly store: KernelStore,
    readonly computationId: ComputationId,
    readonly locus: ComputationLocus,
    readonly runSequence: number,
    previousPublication: KernelPublicationManifest,
  ) {
    this.remainderChild = this.childFor(new ComputationRemainderLocus(locus), ComputationChildRole.Remainder);
    this.activeChild = this.remainderChild;
    this.publications = new StagedKernelPublicationContext(
      this.store,
      previousPublication,
      this.remainderChild.childId,
    );
  }

  /** Declare that this run owns a complete child partition, including an explicit possibly-empty remainder. */
  withChildPartition<TValue>(prepare: () => TValue): TValue {
    this.requirePreparing();
    if (this.hasExplicitPartition) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} already declared its child partition.`);
    }
    if (this.activeChild !== this.remainderChild || this.activeChildScopeDepth !== 0) {
      throw new Error('A computation child partition must be declared from the outer remainder scope.');
    }
    this.hasExplicitPartition = true;
    this.activeChildScopeDepth += 1;
    try {
      const value = prepare();
      if (isPromiseLike(value)) {
        void Promise.resolve(value).catch(() => {});
        throw new Error(`Computation child partition ${this.computationId}@${this.runSequence} must finish synchronously.`);
      }
      return value;
    } catch (error) {
      this.childFailure ??= new ComputationChildPreparationFailure(this.remainderChild.childId, error);
      throw error;
    } finally {
      this.activeChildScopeDepth -= 1;
    }
  }

  /** Run one synchronous preparation scope under a stable logical child identity. */
  withChild<TValue>(locus: ComputationLocus, prepare: () => TValue): TValue {
    this.requirePreparing();
    const capturedLocus = snapshotComputationLocus(locus);
    const childId = computationChildId(this.computationId, capturedLocus);
    const previous = this.activeChild;
    let entered = false;
    try {
      const child = this.childFor(capturedLocus, ComputationChildRole.Declared);
      this.hasExplicitChildren = true;
      this.activeChild = child;
      this.activeChildScopeDepth += 1;
      entered = true;
      const value = prepare();
      if (isPromiseLike(value)) {
        // Observe the continuation before poisoning the run so a later run touch cannot escape as an unhandled rejection.
        void Promise.resolve(value).catch(() => {});
        throw new Error(`Computation child ${child.childId} must finish synchronously inside its outer transaction.`);
      }
      return value;
    } catch (error) {
      this.childFailure ??= new ComputationChildPreparationFailure(childId, error);
      throw error;
    } finally {
      if (entered) {
        this.activeChildScopeDepth -= 1;
        this.activeChild = previous;
      }
    }
  }

  get handles() {
    this.requireCurrent();
    return this.publications.handles;
  }

  isCurrent(): boolean {
    return this.childFailure == null
      && this.phase !== ComputationRunPhase.Finished
      && this.registry.isLatestRun(this)
      && this.publications.isCurrent();
  }

  requireCurrent(): void {
    if (this.phase === ComputationRunPhase.Finished) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} has already finished.`);
    }
    this.requireHealthy();
    if (!this.registry.isLatestRun(this)) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} has been superseded.`);
    }
    this.publications.requireCurrent();
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    this.requireCurrent();
    const result = this.publications.readRecordWithRevision(handle);
    if (this.phase === ComputationRunPhase.Preparing && result.committedRevision != null) {
      this.observe(new ComputationRecordRead(
        this.store,
        handle,
        result.committedRevision.mutationOrdinal,
        result.committedRevision.lifetimeOrdinal,
      ));
    } else if (this.phase === ComputationRunPhase.Preparing && result.stagedRevision != null) {
      this.observeStagedRevision(result.stagedRevision);
    }
    return result.value;
  }

  readAllRecords(): readonly KernelStoreRecord[] {
    this.requireCurrent();
    const records = this.publications.readAllRecords();
    if (this.phase === ComputationRunPhase.Preparing) {
      const inputs = this.committedRecordInputs(records);
      this.observeOpenRead(new ComputationChildOpenRead(
        ComputationOpenReadKind.AllRecords,
        ComputationOpenReadKind.AllRecords,
        'Whole-kernel record enumeration has no domain-owned membership revision.',
        inputs.minimumLifetimeOrdinal,
        inputs.handles,
      ));
    }
    return records;
  }

  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[] {
    this.requireCurrent();
    const records = this.publications.readSourceFileAddressesByFileName(fileName);
    if (this.phase === ComputationRunPhase.Preparing) {
      const inputs = this.committedRecordInputs(records);
      this.observeOpenRead(new ComputationChildOpenRead(
        `${ComputationOpenReadKind.SourceFileIndex}:${fileName}`,
        ComputationOpenReadKind.SourceFileIndex,
        `Source-file address membership for ${fileName} has no path-owned revision.`,
        inputs.minimumLifetimeOrdinal,
        inputs.handles,
      ));
    }
    return records;
  }

  readMaterializations(): readonly MaterializationRecord[] {
    this.requireCurrent();
    const records = this.publications.readMaterializations();
    if (this.phase === ComputationRunPhase.Preparing) {
      const inputs = this.committedRecordInputs(records);
      this.observeOpenRead(new ComputationChildOpenRead(
        ComputationOpenReadKind.Materializations,
        ComputationOpenReadKind.Materializations,
        'Whole-kernel materialization enumeration has no domain-owned membership revision.',
        inputs.minimumLifetimeOrdinal,
        inputs.handles,
      ));
    }
    return records;
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    this.requireCurrent();
    const result = this.publications.readProductDetailWithRevision(slot, productHandle);
    if (this.phase === ComputationRunPhase.Preparing && result.committedRevision != null) {
      this.observe(new ComputationProductDetailRead(
        this.store,
        productHandle,
        slot.detailKind,
        result.committedRevision.actualKind,
        result.committedRevision.mutationOrdinal,
        result.committedRevision.lifetimeOrdinal,
      ));
    } else if (this.phase === ComputationRunPhase.Preparing && result.stagedRevision != null) {
      this.observeStagedRevision(result.stagedRevision);
    }
    return result.value;
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null {
    this.requireCurrent();
    const result = this.publications.readHotDetailWithRevision(slot, handle);
    if (this.phase === ComputationRunPhase.Preparing && result.committedRevision != null) {
      this.observe(new ComputationHotDetailRead(
        this.store,
        handle,
        slot.detailKind,
        result.committedRevision.actualKind,
        result.committedRevision.mutationOrdinal,
        result.committedRevision.lifetimeOrdinal,
      ));
    } else if (this.phase === ComputationRunPhase.Preparing && result.stagedRevision != null) {
      this.observeStagedRevision(result.stagedRevision);
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
    this.requirePreparing();
    const sealed = SealedComputationRead.from(read);
    registerComputationRead(this.readsByKey, sealed, `Computation ${this.computationId}`);
    registerComputationRead(
      this.activeChild.readsByKey,
      sealed,
      `Computation child ${this.activeChild.childId}`,
    );
  }

  publish(plan: KernelPublicationPlan): void {
    this.requirePreparing();
    for (const read of this.publications.publishFrom(this.activeChild.childId, plan)) {
      this.observeStagedRevision(read);
    }
  }

  commit(): ComputationCommitResult {
    this.assertPreparing();
    this.requireNoActiveChildScope('commit');
    this.requireHealthy();
    this.phase = ComputationRunPhase.Committing;
    let committed = false;
    try {
      const candidate = this.publications.seal(
        `computation:${this.computationId}:run:${this.runSequence}`,
      );
      this.publications.prepareCandidateBindingsForCommit();
      this.registerPublicationStructuralReads(candidate);
      const reads = this.readsForCommit(candidate);
      const result = this.registry.commitRun(
        this,
        reads,
        this.openReadsForCommit(),
        this.minimumConsumedLifetimeOrdinal(reads),
        candidate,
      );
      committed = result.state === ComputationCommitState.Committed;
      return result;
    } finally {
      try {
        this.publications.finishCandidateBindings(committed);
      } finally {
        this.phase = ComputationRunPhase.Finished;
        this.registry.finishRun(this);
      }
    }
  }

  /** Finish a prepared run without publishing when domain preparation cannot produce a complete candidate. */
  abort(): void {
    this.assertPreparing();
    this.requireNoActiveChildScope('abort');
    try {
      this.publications.finishCandidateBindings(false);
    } finally {
      this.phase = ComputationRunPhase.Finished;
      this.registry.finishRun(this);
    }
  }

  private assertPreparing(): void {
    if (this.phase !== ComputationRunPhase.Preparing) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} is no longer preparing.`);
    }
  }

  private requirePreparing(): void {
    this.assertPreparing();
    this.requireCurrent();
  }

  private requireHealthy(): void {
    if (this.childFailure != null) {
      throw this.childFailure;
    }
  }

  private requireNoActiveChildScope(operation: string): void {
    if (this.activeChildScopeDepth > 0) {
      throw new Error(
        `Computation run ${this.computationId}@${this.runSequence} cannot ${operation} inside an active child scope.`,
      );
    }
  }

  /** Build final child manifests against the store's authoritative outer publication decisions. */
  prepareChildCommit(
    candidate: SealedKernelPublicationCandidate,
    decisions: readonly KernelPublicationDecision[],
  ): ComputationChildPreparation {
    const outputsByChild = new Map<ComputationChildId, ComputationOutput[]>();
    const outputOwnerByReadKey = new Map<string, ComputationChildId>();
    for (const decision of decisions) {
      if (decision.decision === KernelPublicationDecisionKind.Withdraw) {
        continue;
      }
      const revision = candidate.readStagedRevision(decision.surface, decision.handle);
      if (revision?.writerId == null || revision.actualKind !== decision.detailKind) {
        throw new Error(`Admitted output ${decision.handle} has no coherent staged writer revision.`);
      }
      const output = new ComputationOutput(decision.surface, decision.handle, decision.detailKind);
      const child = this.childrenById.get(revision.writerId);
      if (child == null) {
        throw new Error(`Admitted output ${output.readKey} names unknown child writer ${revision.writerId}.`);
      }
      const existingOwner = outputOwnerByReadKey.get(output.readKey);
      if (existingOwner != null && existingOwner !== child.childId) {
        throw new Error(`Admitted output ${output.readKey} has multiple child writers.`);
      }
      outputOwnerByReadKey.set(output.readKey, child.childId);
      const outputs = outputsByChild.get(child.childId) ?? [];
      outputs.push(output);
      outputsByChild.set(child.childId, outputs);
    }

    const invalidReads: ComputationInvalidRead[] = [];
    const prepared = [...this.childrenById.values()].map((child): PreparedComputationChild => {
      const reads = [...child.readsByKey.values()].filter((read) => {
        const outputOwner = outputOwnerByReadKey.get(read.readKey) ?? null;
        if (outputOwner == null) {
          return true;
        }
        if (outputOwner === child.childId) {
          return false;
        }
        invalidReads.push(new ComputationInvalidRead(
          read.readKey,
          'computation-child-external-read',
          read.observedRevision,
          `candidate-output:${outputOwner}`,
          ['candidate-writer'],
        ));
        return false;
      });
      const candidateReads = [...child.stagedReadsByKey.values()].flatMap((observed) => {
        const current = candidate.readStagedRevision(observed.surface, observed.handle);
        if (
          current?.writerId === child.childId
          && (observed.writerId == null || observed.writerId === child.childId)
        ) {
          return [];
        }
        if (!sameStagedEntryRevision(observed, current)) {
          invalidReads.push(new ComputationInvalidRead(
            computationStagedReadKey(observed),
            'computation-child-staged-read',
            stagedEntryRevisionLabel(observed),
            stagedEntryRevisionLabel(current),
            stagedEntryChangedFacets(observed, current),
          ));
          return [];
        }
        if (stagedEntryIsAbsent(observed)) {
          return [new ComputationCandidateRead(
            computationStagedReadKey(observed),
            ComputationCandidateReadState.Absent,
            null,
            null,
          )];
        }
        return observed.writerId === child.childId
          ? []
          : [new ComputationCandidateRead(
              computationStagedReadKey(observed),
              ComputationCandidateReadState.Present,
              observed.writerId,
              requiredStagedReadMutationOrdinal(observed),
            )];
      });
      return {
        child,
        reads: reads.sort((left, right) => left.readKey.localeCompare(right.readKey)),
        candidateReads: candidateReads.sort((left, right) => left.readKey.localeCompare(right.readKey)),
        openReads: [...child.openReadsByKey.values()].sort((left, right) => left.key.localeCompare(right.key)),
        outputs: (outputsByChild.get(child.childId) ?? []).sort((left, right) => left.readKey.localeCompare(right.readKey)),
      };
    }).filter((candidate) => {
      const hasContent = preparedComputationChildHasContent(candidate);
      if (this.hasExplicitPartition) {
        return candidate.child.role === ComputationChildRole.Remainder || hasContent;
      }
      return this.hasExplicitChildren && hasContent;
    }).sort((left, right) => left.child.childId.localeCompare(right.child.childId));
    const sccByChildId = classifyComputationChildSccs(prepared);
    const states = prepared.map((candidate) => new ComputationChildState(
      candidate.child.childId,
      candidate.child.locus,
      candidate.child.role,
      requiredComputationChildScc(sccByChildId, candidate.child.childId),
      candidate.reads,
      candidate.candidateReads,
      candidate.openReads,
      candidate.outputs,
    ));
    return new ComputationChildPreparation(
      states,
      invalidReads,
    );
  }

  private childFor(locus: ComputationLocus, role: ComputationChildRole): MutableComputationChild {
    const capturedLocus = snapshotComputationLocus(locus);
    const childId = computationChildId(this.computationId, capturedLocus);
    const existing = this.childrenById.get(childId);
    if (existing != null) {
      if (existing.locus.summary !== capturedLocus.summary) {
        throw new Error(`Computation child ${childId} was reconciled with conflicting summaries.`);
      }
      if (existing.role !== role) {
        throw new Error(`Computation child ${childId} was reconciled with conflicting roles.`);
      }
      return existing;
    }
    const child = new MutableComputationChild(childId, capturedLocus, role);
    this.childrenById.set(childId, child);
    return child;
  }

  private observeStagedRevision(revision: KernelStagedEntryRevision): void {
    this.observeStagedRevisionForChild(this.activeChild, revision);
  }

  private observeStagedRevisionForChild(
    child: MutableComputationChild,
    revision: KernelStagedEntryRevision,
  ): void {
    const readKey = computationStagedReadKey(revision);
    const existing = child.stagedReadsByKey.get(readKey);
    if (existing != null && !sameStagedEntryRevision(existing, revision)) {
      if (
        revision.writerId === child.childId
        && (existing.writerId == null || existing.writerId === child.childId)
      ) {
        child.stagedReadsByKey.set(readKey, revision);
        return;
      }
      throw new Error(`Computation child ${child.childId} observed changing candidate output ${readKey}.`);
    }
    child.stagedReadsByKey.set(readKey, revision);
  }

  private observeOpenRead(read: ComputationChildOpenRead): void {
    const existing = this.activeChild.openReadsByKey.get(read.key);
    if (existing != null && (existing.kind !== read.kind || existing.summary !== read.summary)) {
      throw new Error(`Computation child ${this.activeChild.childId} reused aggregate read ${read.key} inconsistently.`);
    }
    this.activeChild.openReadsByKey.set(
      read.key,
      existing == null ? read : mergeComputationOpenRead(existing, read),
    );
  }

  private committedRecordInputs(records: readonly KernelStoreRecord[]): {
    readonly handles: readonly KernelRecordHandle[];
    readonly minimumLifetimeOrdinal: number | null;
  } {
    const handles: KernelRecordHandle[] = [];
    let minimumLifetimeOrdinal: number | null = null;
    for (const record of records) {
      if (this.publications.readStagedRevision(KernelPublicationSurface.Record, record.handle) != null) {
        continue;
      }
      const mutationOrdinal = this.store.readRecordRevision(record.handle);
      const lifetimeOrdinal = this.store.readRecordLifetimeOrdinal(record.handle);
      this.observe(new ComputationRecordRead(
        this.store,
        record.handle,
        mutationOrdinal,
        lifetimeOrdinal,
      ));
      handles.push(record.handle);
      minimumLifetimeOrdinal = maxOptionalOrdinal(
        minimumLifetimeOrdinal,
        lifetimeOrdinal,
      );
    }
    return { handles, minimumLifetimeOrdinal };
  }

  private minimumConsumedLifetimeOrdinal(reads: readonly ComputationRead[]): number | null {
    let lifetimeOrdinal = computationReadLifetimeOrdinal(reads);
    for (const child of this.childrenById.values()) {
      for (const read of child.openReadsByKey.values()) {
        lifetimeOrdinal = maxOptionalOrdinal(lifetimeOrdinal, read.minimumLifetimeOrdinal);
      }
    }
    return lifetimeOrdinal;
  }

  private openReadsForCommit(): readonly ComputationChildOpenRead[] {
    const readsByKey = new Map<string, ComputationChildOpenRead>();
    for (const child of this.childrenById.values()) {
      for (const read of child.openReadsByKey.values()) {
        const existing = readsByKey.get(read.key);
        readsByKey.set(read.key, existing == null ? read : mergeComputationOpenRead(existing, read));
      }
    }
    return [...readsByKey.values()].sort((left, right) => left.key.localeCompare(right.key));
  }

  private registerPublicationStructuralReads(candidate: SealedKernelPublicationCandidate): void {
    const productAdmissionByHandle = new Map(
      candidate.plan.productDetailAdmissionSnapshots.map((snapshot) => [snapshot.productHandle, snapshot]),
    );
    const hotAdmissionByHandle = new Map(
      candidate.plan.hotDetailAdmissionSnapshots.map((snapshot) => [snapshot.handle, snapshot]),
    );
    for (const record of candidate.plan.batch.records) {
      const writerId = requiredCandidateWriter(candidate, KernelPublicationSurface.Record, record.handle);
      for (const reference of referencedKernelRecordHandles(record)) {
        this.registerStructuralRecordRead(candidate, writerId, reference);
      }
    }
    for (const publication of candidate.plan.productDetails) {
      if (
        publication.admission === KernelDetailAdmission.IfAbsent
        && productAdmissionByHandle.get(publication.productHandle)?.expectedEntry != null
      ) {
        continue;
      }
      const writerId = requiredCandidateWriter(
        candidate,
        KernelPublicationSurface.ProductDetail,
        publication.productHandle,
      );
      this.registerStructuralRecordRead(candidate, writerId, publication.productHandle);
      for (const reference of publication.references) {
        this.registerStructuralDetailReference(
          candidate,
          writerId,
          reference,
          productAdmissionByHandle,
          hotAdmissionByHandle,
        );
      }
    }
    for (const publication of candidate.plan.hotDetails) {
      if (
        publication.admission === KernelDetailAdmission.IfAbsent
        && hotAdmissionByHandle.get(publication.handle)?.expectedEntry != null
      ) {
        continue;
      }
      const writerId = requiredCandidateWriter(candidate, KernelPublicationSurface.HotDetail, publication.handle);
      this.registerStructuralRecordRead(candidate, writerId, publication.ownerProductHandle);
      for (const reference of publication.references) {
        this.registerStructuralDetailReference(
          candidate,
          writerId,
          reference,
          productAdmissionByHandle,
          hotAdmissionByHandle,
        );
      }
    }
  }

  private registerStructuralDetailReference(
    candidate: SealedKernelPublicationCandidate,
    writerId: ComputationChildId,
    reference: KernelDetailReference,
    productAdmissionByHandle: ReadonlyMap<ProductHandle, KernelProductDetailAdmissionSnapshot>,
    hotAdmissionByHandle: ReadonlyMap<HotDetailHandle, KernelHotDetailAdmissionSnapshot>,
  ): void {
    switch (reference.surface) {
      case KernelPublicationSurface.Record:
        this.registerStructuralRecordRead(candidate, writerId, reference.handle);
        return;
      case KernelPublicationSurface.ProductDetail: {
        const handle = reference.handle;
        const borrowed = productAdmissionByHandle.get(handle) ?? null;
        if (borrowed?.expectedEntry != null) {
          this.registerStructuralDetailRead(writerId, new ComputationProductDetailRead(
            this.store,
            handle,
            reference.detailKind,
            borrowed.committedRevision.actualKind,
            borrowed.committedRevision.mutationOrdinal,
            borrowed.committedRevision.lifetimeOrdinal,
          ));
          return;
        }
        const child = this.requireChild(writerId);
        const staged = candidate.readStagedRevision(KernelPublicationSurface.ProductDetail, handle);
        if (staged != null) {
          this.observeStagedRevisionForChild(child, staged);
          return;
        }
        const entry = this.store.productDetails.readEntry(handle);
        this.registerStructuralDetailRead(writerId, new ComputationProductDetailRead(
          this.store,
          handle,
          reference.detailKind,
          entry?.slot.detailKind ?? null,
          this.store.productDetails.readMutationOrdinal(handle),
          this.store.productDetails.readLifetimeOrdinal(handle),
        ));
        return;
      }
      case KernelPublicationSurface.HotDetail: {
        const handle = reference.handle;
        const borrowed = hotAdmissionByHandle.get(handle) ?? null;
        if (borrowed?.expectedEntry != null) {
          this.registerStructuralDetailRead(writerId, new ComputationHotDetailRead(
            this.store,
            handle,
            reference.detailKind,
            borrowed.committedRevision.actualKind,
            borrowed.committedRevision.mutationOrdinal,
            borrowed.committedRevision.lifetimeOrdinal,
          ));
          return;
        }
        const child = this.requireChild(writerId);
        const staged = candidate.readStagedRevision(KernelPublicationSurface.HotDetail, handle);
        if (staged != null) {
          this.observeStagedRevisionForChild(child, staged);
          return;
        }
        const entry = this.store.hotDetails.readEntry(handle);
        this.registerStructuralDetailRead(writerId, new ComputationHotDetailRead(
          this.store,
          handle,
          reference.detailKind,
          entry?.slot.detailKind ?? null,
          this.store.hotDetails.readMutationOrdinal(handle),
          this.store.hotDetails.readLifetimeOrdinal(handle),
        ));
      }
    }
  }

  private registerStructuralDetailRead(writerId: ComputationChildId, read: ComputationRead): void {
    const child = this.requireChild(writerId);
    const sealed = SealedComputationRead.from(read);
    registerSupplementalRead(this.readsByKey, sealed, `Computation ${this.computationId}`);
    registerSupplementalRead(child.readsByKey, sealed, `Computation child ${child.childId}`);
  }

  private registerStructuralRecordRead(
    candidate: SealedKernelPublicationCandidate,
    writerId: ComputationChildId,
    handle: KernelRecordHandle,
  ): void {
    const child = this.requireChild(writerId);
    const staged = candidate.readStagedRevision(KernelPublicationSurface.Record, handle);
    if (staged != null) {
      this.observeStagedRevisionForChild(child, staged);
      return;
    }
    const read = SealedComputationRead.from(new ComputationRecordRead(
      this.store,
      handle,
      this.store.readRecordRevision(handle),
      this.store.readRecordLifetimeOrdinal(handle),
    ));
    registerSupplementalRead(this.readsByKey, read, `Computation ${this.computationId}`);
    registerSupplementalRead(child.readsByKey, read, `Computation child ${child.childId}`);
  }

  private readsForCommit(candidate: SealedKernelPublicationCandidate): readonly ComputationRead[] {
    const readsByKey = new Map(this.readsByKey);
    for (const attempt of candidate.productDetailAdmissionAttempts) {
      const snapshot = attempt.snapshot;
      const read = SealedComputationRead.from(new ComputationProductDetailRead(
        this.store,
        snapshot.productHandle,
        snapshot.detailKind,
        snapshot.committedRevision.actualKind,
        snapshot.committedRevision.mutationOrdinal,
        snapshot.committedRevision.lifetimeOrdinal,
      ));
      registerSupplementalRead(readsByKey, read, `Computation ${this.computationId}`);
      registerSupplementalRead(
        this.requireChild(attempt.writerId).readsByKey,
        read,
        `Computation child ${attempt.writerId}`,
      );
    }
    for (const attempt of candidate.hotDetailAdmissionAttempts) {
      const snapshot = attempt.snapshot;
      const read = SealedComputationRead.from(new ComputationHotDetailRead(
        this.store,
        snapshot.handle,
        snapshot.detailKind,
        snapshot.committedRevision.actualKind,
        snapshot.committedRevision.mutationOrdinal,
        snapshot.committedRevision.lifetimeOrdinal,
      ));
      registerSupplementalRead(readsByKey, read, `Computation ${this.computationId}`);
      registerSupplementalRead(
        this.requireChild(attempt.writerId).readsByKey,
        read,
        `Computation child ${attempt.writerId}`,
      );
    }
    return [...readsByKey.values()];
  }

  private requireChild(childId: ComputationChildId): MutableComputationChild {
    const child = this.childrenById.get(childId) ?? null;
    if (child == null) {
      throw new Error(`Computation candidate names unknown child writer ${childId}.`);
    }
    return child;
  }
}

/** Store-local registry for revision-validated computation runs and their complete committed closures. */
export class ComputationLifecycleRegistry implements KernelStoreComputationLifecycle {
  private readonly entriesByLocus = new Map<string, MutableComputationEntry>();
  private readonly entriesById = new Map<ComputationId, MutableComputationEntry>();
  private readonly readersByKey = new Map<string, Set<ComputationId>>();
  private readonly producerByKey = new Map<string, ComputationId>();
  private readonly childReadersByKey = new Map<string, Set<ComputationChildId>>();
  private readonly childProducerByKey = new Map<string, ComputationChildId>();
  private nextComputationOrdinal = 1;
  private readonly publicationOwner = {};

  constructor(private readonly store: KernelStore) {
    store.registerComputationLifecycle(this);
  }

  begin(locus: ComputationLocus): ComputationRun {
    const capturedLocus = snapshotComputationLocus(locus);
    const registryKey = `${capturedLocus.kind}\0${capturedLocus.reconciliationKey}`;
    let entry = this.entriesByLocus.get(registryKey);
    if (entry == null) {
      const computationId = `computation:${this.nextComputationOrdinal++}` as ComputationId;
      entry = {
        computationId,
        locus: capturedLocus,
        latestRunSequence: 0,
        latestFinishedRunSequence: 0,
        state: null,
        admittedGenerationDomains: new Set(),
        transitions: [],
      };
      this.entriesByLocus.set(registryKey, entry);
      this.entriesById.set(computationId, entry);
    } else if (entry.locus.summary !== capturedLocus.summary) {
      throw new Error(`Computation locus ${registryKey} was reconciled with conflicting summaries.`);
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
    const replacement = this.store.replaceOwnedPublication(
      state.publication,
      new KernelPublicationPlan(new KernelStoreBatch([], `retire:${computationId}@${runSequence}`)),
      this.publicationOwner,
      {
        validate: (decisions) => {
          this.validateProducerReplacement(
            state.outputs,
            computationOutputsFromDecisions(decisions),
            computationId,
          );
          this.validateChildReplacement(state.children, []);
        },
        validateCurrent: () => {
          if (entry.state !== state) {
            throw new Error(`Computation generation ${computationId}@${runSequence} changed during retirement.`);
          }
        },
      },
    );
    this.store.retirePublicationManifest(replacement.manifest, this.publicationOwner);
    this.replaceReadIndex(state.reads, [], computationId);
    this.commitProducerReplacement(state.outputs, [], computationId);
    this.commitChildReplacement(state.children, []);
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

  childReadersFor(readKey: string): readonly ComputationChildId[] {
    return [...(this.childReadersByKey.get(readKey) ?? [])]
      .sort((left, right) => left.localeCompare(right));
  }

  childProducerFor(readKey: string): ComputationChildId | null {
    return this.childProducerByKey.get(readKey) ?? null;
  }

  readTransitions(computationId: ComputationId): readonly ComputationTransition[] {
    return [...(this.entriesById.get(computationId)?.transitions ?? [])];
  }

  retainActiveDependencies(retention: KernelStoreRetentionCollector): void {
    for (const entry of this.entriesById.values()) {
      const state = entry.state;
      if (state == null) {
        continue;
      }
      for (const read of state.reads) {
        if (read instanceof SealedComputationRead) {
          read.retainKernelInput(retention);
        }
      }
      for (const openRead of state.openReads) {
        for (const handle of openRead.positiveRecordHandles) {
          retention.retainRecord(handle);
        }
      }
    }
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
      this.commitChildReplacement(state.children, []);
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
    openReads: readonly ComputationChildOpenRead[],
    minimumLifetimeOrdinal: number | null,
    candidate: SealedKernelPublicationCandidate,
  ): ComputationCommitResult {
    const entry = this.entriesById.get(run.computationId);
    if (entry == null) {
      throw new Error(`Unknown computation ${run.computationId}.`);
    }
    if (entry.latestRunSequence !== run.runSequence) {
      return this.reject(entry, run, ComputationCommitState.RejectedSuperseded, []);
    }

    const previousState = entry.state;
    let childPreparation = new ComputationChildPreparation([], []);
    let replacement: KernelPublicationReplacement;
    try {
      replacement = this.store.replaceOwnedPublication(
        previousState?.publication ?? KernelPublicationManifest.empty,
        candidate.plan.withMinimumLifetimeOrdinal(minimumLifetimeOrdinal),
        this.publicationOwner,
        {
          validate: (decisions) => {
            this.requireLatestRunForCommit(entry, run);
            const invalidReads: ComputationInvalidRead[] = [];
            for (const read of reads) {
              const validation = read.validate();
              this.requireLatestRunForCommit(entry, run);
              if (!validation.isCurrent) {
                invalidReads.push(new ComputationInvalidRead(
                  read.readKey,
                  read.domain,
                  read.observedRevision,
                  validation.currentRevision,
                  validation.changedFacets,
                ));
              }
            }
            if (invalidReads.length > 0) {
              throw new ComputationInputReadValidationError(invalidReads);
            }
            this.requireLatestRunForCommit(entry, run);
            childPreparation = run.prepareChildCommit(candidate, decisions);
            if (childPreparation.invalidReads.length > 0) {
              throw new ComputationChildReadValidationError(childPreparation.invalidReads);
            }
            this.validateProducerReplacement(
              previousState?.outputs ?? [],
              computationOutputsFromDecisions(decisions),
              entry.computationId,
            );
            this.validateChildReplacement(previousState?.children ?? [], childPreparation.states);
            this.requireLatestRunForCommit(entry, run);
          },
          validateCurrent: () => this.requireLatestRunForCommit(entry, run),
        },
      );
    } catch (error) {
      if (
        error instanceof ComputationInputReadValidationError
        || error instanceof ComputationChildReadValidationError
      ) {
        return this.reject(entry, run, ComputationCommitState.RejectedInputsChanged, error.invalidReads);
      }
      if (error instanceof ComputationSupersededDuringCommitError) {
        return this.reject(entry, run, ComputationCommitState.RejectedSuperseded, []);
      }
      throw error;
    }
    const outputs = computationOutputsFromDecisions(replacement.decisions);
    const outputKeys = new Set(outputs.map((output) => output.readKey));
    const committedReads = reads.filter((read) => !outputKeys.has(read.readKey));
    const changedReads = compareReadSets(previousState?.reads ?? [], committedReads);
    const nextState = new ComputationState(
      entry.computationId,
      entry.locus,
      run.runSequence,
      committedReads,
      openReads,
      outputs,
      childPreparation.states,
      replacement.manifest,
    );
    this.replaceReadIndex(previousState?.reads ?? [], committedReads, entry.computationId);
    this.commitProducerReplacement(previousState?.outputs ?? [], outputs, entry.computationId);
    this.commitChildReplacement(previousState?.children ?? [], childPreparation.states);
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

  private requireLatestRunForCommit(
    entry: MutableComputationEntry,
    run: ComputationRun,
  ): void {
    if (entry.latestRunSequence !== run.runSequence) {
      throw new ComputationSupersededDuringCommitError(run.computationId, run.runSequence);
    }
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

  private validateChildReplacement(
    previous: readonly ComputationChildState[],
    next: readonly ComputationChildState[],
  ): void {
    const previousChildIds = new Set(previous.map((child) => child.childId));
    for (const child of previous) {
      for (const output of child.outputs) {
        if (this.childProducerByKey.get(output.readKey) !== child.childId) {
          throw new Error(`Child output ${output.readKey} lost producer ownership before replacement.`);
        }
      }
    }
    const nextOutputKeys = new Set<string>();
    for (const child of next) {
      for (const output of child.outputs) {
        if (nextOutputKeys.has(output.readKey)) {
          throw new Error(`Child output ${output.readKey} has multiple final owners.`);
        }
        nextOutputKeys.add(output.readKey);
        const existing = this.childProducerByKey.get(output.readKey);
        if (existing != null && !previousChildIds.has(existing)) {
          throw new Error(`Child output ${output.readKey} is already owned by ${existing}.`);
        }
      }
    }
  }

  /** Apply child read/producer indexes after their outer store publication commits. */
  private commitChildReplacement(
    previous: readonly ComputationChildState[],
    next: readonly ComputationChildState[],
  ): void {
    for (const child of previous) {
      for (const readKey of computationChildReadKeys(child)) {
        const readers = this.childReadersByKey.get(readKey);
        readers?.delete(child.childId);
        if (readers?.size === 0) {
          this.childReadersByKey.delete(readKey);
        }
      }
      for (const output of child.outputs) {
        if (this.childProducerByKey.get(output.readKey) === child.childId) {
          this.childProducerByKey.delete(output.readKey);
        }
      }
    }
    for (const child of next) {
      for (const readKey of computationChildReadKeys(child)) {
        let readers = this.childReadersByKey.get(readKey);
        if (readers == null) {
          readers = new Set();
          this.childReadersByKey.set(readKey, readers);
        }
        readers.add(child.childId);
      }
      for (const output of child.outputs) {
        this.childProducerByKey.set(output.readKey, child.childId);
      }
    }
  }
}

function preparedComputationChildHasContent(child: PreparedComputationChild): boolean {
  return child.reads.length > 0
    || child.candidateReads.length > 0
    || child.openReads.length > 0
    || child.outputs.length > 0;
}

/** Derive exact technical SCCs from the candidate-local producer edges the kernel already validated. */
function classifyComputationChildSccs(
  children: readonly PreparedComputationChild[],
): ReadonlyMap<ComputationChildId, ComputationChildScc> {
  const childrenById = new Map(children.map((child) => [child.child.childId, child]));
  const dependenciesById = new Map<ComputationChildId, readonly ComputationChildId[]>();
  for (const child of children) {
    dependenciesById.set(
      child.child.childId,
      [...new Set(child.candidateReads.flatMap((read) =>
        read.state === ComputationCandidateReadState.Present
          && read.producerChildId != null
          && childrenById.has(read.producerChildId)
          ? [read.producerChildId]
          : []
      ))].sort((left, right) => left.localeCompare(right)),
    );
  }

  let nextIndex = 0;
  const indexById = new Map<ComputationChildId, number>();
  const lowLinkById = new Map<ComputationChildId, number>();
  const stack: ComputationChildId[] = [];
  const onStack = new Set<ComputationChildId>();
  const components: ComputationChildId[][] = [];

  const visit = (childId: ComputationChildId): void => {
    const index = nextIndex++;
    indexById.set(childId, index);
    lowLinkById.set(childId, index);
    stack.push(childId);
    onStack.add(childId);

    for (const dependencyId of dependenciesById.get(childId) ?? []) {
      if (!indexById.has(dependencyId)) {
        visit(dependencyId);
        lowLinkById.set(childId, Math.min(
          lowLinkById.get(childId)!,
          lowLinkById.get(dependencyId)!,
        ));
      } else if (onStack.has(dependencyId)) {
        lowLinkById.set(childId, Math.min(
          lowLinkById.get(childId)!,
          indexById.get(dependencyId)!,
        ));
      }
    }

    if (lowLinkById.get(childId) !== indexById.get(childId)) {
      return;
    }
    const component: ComputationChildId[] = [];
    while (stack.length > 0) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === childId) {
        break;
      }
    }
    components.push(component.sort((left, right) => left.localeCompare(right)));
  };

  for (const childId of [...childrenById.keys()].sort((left, right) => left.localeCompare(right))) {
    if (!indexById.has(childId)) {
      visit(childId);
    }
  }

  const byChildId = new Map<ComputationChildId, ComputationChildScc>();
  for (const members of components) {
    const kind = members.length > 1
      ? ComputationChildSccKind.Cyclic
      : ComputationChildSccKind.Singleton;
    const scc = new ComputationChildScc(
      `computation-child-scc:${members.join('|')}`,
      kind,
      members,
    );
    for (const childId of members) {
      byChildId.set(childId, scc);
    }
  }
  return byChildId;
}

function requiredComputationChildScc(
  sccByChildId: ReadonlyMap<ComputationChildId, ComputationChildScc>,
  childId: ComputationChildId,
): ComputationChildScc {
  const scc = sccByChildId.get(childId) ?? null;
  if (scc == null) {
    throw new Error(`Computation child ${childId} has no classified strongly connected component.`);
  }
  return scc;
}

function registerComputationRead(
  readsByKey: Map<string, ComputationRead>,
  read: SealedComputationRead,
  owner: string,
): void {
  const existing = readsByKey.get(read.readKey);
  if (existing != null && (
    existing.domain !== read.domain
    || existing.observedRevision !== read.observedRevision
  )) {
    throw new Error(`${owner} observed conflicting revisions for ${read.readKey}.`);
  }
  readsByKey.set(read.readKey, read);
}

/** Add a late-derived dependency without replacing an earlier same-domain witness. */
function registerSupplementalRead(
  readsByKey: Map<string, ComputationRead>,
  read: SealedComputationRead,
  owner: string,
): void {
  const existing = readsByKey.get(read.readKey);
  if (existing == null) {
    readsByKey.set(read.readKey, read);
    return;
  }
  if (existing.domain !== read.domain) {
    throw new Error(
      `${owner} observed conflicting domains ${existing.domain} and ${read.domain} for ${read.readKey}.`,
    );
  }
}

function requiredCandidateWriter(
  candidate: SealedKernelPublicationCandidate,
  surface: KernelPublicationSurface,
  handle: string,
): ComputationChildId {
  const revision = candidate.readStagedRevision(surface, handle);
  if (revision?.writerId == null) {
    throw new Error(`Staged ${surface} ${handle} has no candidate writer.`);
  }
  return revision.writerId;
}

function computationChildId(parentId: ComputationId, locus: ComputationLocus): ComputationChildId {
  return JSON.stringify([parentId, locus.kind, locus.reconciliationKey]) as ComputationChildId;
}

function snapshotComputationLocus(locus: ComputationLocus): ComputationLocus {
  return Object.freeze({
    kind: locus.kind,
    reconciliationKey: locus.reconciliationKey,
    summary: locus.summary,
  });
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value != null) || typeof value === 'function'
  ) && typeof (value as PromiseLike<unknown>).then === 'function';
}

function computationStagedReadKey(revision: KernelStagedEntryRevision): string {
  return computationOutputReadKey(revision.surface, revision.handle);
}

function sameStagedEntryRevision(
  left: KernelStagedEntryRevision,
  right: KernelStagedEntryRevision | null,
): boolean {
  if (stagedEntryIsAbsent(left)) {
    return right == null;
  }
  return right != null
    && left.writerId === right.writerId
    && left.surface === right.surface
    && left.handle === right.handle
    && left.actualKind === right.actualKind
    && left.mutationOrdinal === right.mutationOrdinal;
}

function stagedEntryRevisionLabel(revision: KernelStagedEntryRevision | null): string {
  return revision == null || stagedEntryIsAbsent(revision)
    ? 'absent'
    : presentStagedEntryRevisionLabel(revision);
}

function presentStagedEntryRevisionLabel(revision: KernelStagedEntryRevision): string {
  const { writerId, actualKind, mutationOrdinal } = revision;
  if (writerId == null || actualKind == null || mutationOrdinal == null) {
    throw new Error(`Staged entry ${revision.surface}:${revision.handle} has a partial present revision.`);
  }
  return `writer:${writerId}:kind:${actualKind}:revision:${mutationOrdinal}`;
}

function stagedEntryChangedFacets(
  observed: KernelStagedEntryRevision,
  current: KernelStagedEntryRevision | null,
): readonly string[] {
  if (stagedEntryIsAbsent(observed) || current == null) {
    return ['existence'];
  }
  return [
    ...(observed.writerId === current.writerId ? [] : ['writer']),
    ...(observed.actualKind === current.actualKind ? [] : ['slot']),
    ...(observed.mutationOrdinal === current.mutationOrdinal ? [] : ['detail']),
  ];
}

function stagedEntryIsAbsent(revision: KernelStagedEntryRevision): boolean {
  return revision.writerId == null
    && revision.actualKind == null
    && revision.mutationOrdinal == null;
}

function requiredStagedReadMutationOrdinal(revision: KernelStagedEntryRevision): number {
  if (revision.mutationOrdinal == null) {
    throw new Error(`Staged read ${computationStagedReadKey(revision)} has no mutation revision.`);
  }
  return revision.mutationOrdinal;
}

function computationChildReadKeys(child: ComputationChildState): readonly string[] {
  return [...new Set([
    ...child.reads.map((read) => read.readKey),
    ...child.candidateReads.map((read) => read.readKey),
  ])];
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
    const retained = read instanceof SealedComputationRead
      ? read.retainedKernelInput
      : (
          read instanceof ComputationRecordRead
          || read instanceof ComputationProductDetailRead
          || read instanceof ComputationHotDetailRead
        ) ? read.retainedKernelInput : null;
    if (retained == null) {
      continue;
    }
    lifetimeOrdinal = lifetimeOrdinal == null
      ? retained.lifetimeOrdinal
      : Math.max(lifetimeOrdinal, retained.lifetimeOrdinal);
  }
  return lifetimeOrdinal;
}

function maxOptionalOrdinal(left: number | null, right: number | null): number | null {
  return left == null ? right : right == null ? left : Math.max(left, right);
}

function mergeComputationOpenRead(
  left: ComputationChildOpenRead,
  right: ComputationChildOpenRead,
): ComputationChildOpenRead {
  if (left.key !== right.key || left.kind !== right.kind || left.summary !== right.summary) {
    throw new Error(`Aggregate computation read ${left.key} cannot merge incompatible observations.`);
  }
  return new ComputationChildOpenRead(
    left.key,
    left.kind,
    left.summary,
    maxOptionalOrdinal(left.minimumLifetimeOrdinal, right.minimumLifetimeOrdinal),
    [...new Set([...left.positiveRecordHandles, ...right.positiveRecordHandles])].sort(),
  );
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
): string {
  switch (surface) {
    case KernelPublicationSurface.Record:
      return computationRecordReadKey(handle as KernelRecordHandle);
    case KernelPublicationSurface.ProductDetail:
      return computationProductDetailReadKey(handle as ProductHandle);
    case KernelPublicationSurface.HotDetail:
      return computationHotDetailReadKey(handle as HotDetailHandle);
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
