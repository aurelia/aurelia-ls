import type { HotDetailHandle, KernelRecordHandle, ProductHandle } from './handles.js';
import type { HotDetailSlot } from './hot-details.js';
import type {
  MaterializationOwnerHandle,
  MaterializationRecord,
} from './materialization.js';
import type { ProductDetailReadView, ProductDetailSlot } from './product-details.js';
import {
  KernelDetailAdmission,
  KernelPublicationDecision,
  KernelPublicationDecisionKind,
  KernelPublicationManifest,
  KernelPublicationPlan,
  type KernelPublicationContext,
  type KernelPublicationEntryDescriptor,
  type KernelPublicationDecisionCandidate,
  type KernelPublicationDecisionPreviewCandidate,
  type KernelPublicationReplacement,
  type KernelPublicationWriterId,
  KernelStagedEntryRevision,
  type SealedKernelPublicationCandidate,
  StagedKernelPublicationContext,
} from './publication.js';
import { KernelPublicationSurface } from './publication-surface.js';
import {
  type KernelDetailReference,
  KernelRecordReference,
} from './detail-references.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreComputationLifecycle,
  type KernelStoreDensityDelta,
  type KernelStoreDetailDensityDelta,
  type KernelStoreDisposalContext,
  type KernelStoreObservationMarker,
  type KernelReadProjectionRevision,
  type KernelReadProjectionRevisionView,
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
  readonly readKey: string;

  constructor(
    readonly surface: KernelPublicationSurface,
    readonly handle: string,
    readonly actualKind: string | null,
    readonly state: ComputationCandidateReadState,
    readonly producerChildId: ComputationChildId | null,
    readonly observedMutationOrdinal: number | null,
  ) {
    this.readKey = computationOutputReadKey(surface, handle);
    Object.freeze(this);
  }
}

/** Identity link required by one child's publication closure, without implying that the target value was consumed. */
export class ComputationStructuralDependency {
  readonly readKey: string;

  constructor(
    readonly reference: KernelDetailReference,
    readonly producerChildId: ComputationChildId | null,
  ) {
    this.readKey = computationOutputReadKey(reference.surface, reference.handle);
    Object.freeze(this);
  }

  get surface(): KernelPublicationSurface {
    return this.reference.surface;
  }

  get handle(): string {
    return this.reference.handle;
  }

  /** Exact rich-detail slot required by the link; normalized record references are intentionally kind-agnostic. */
  get requiredDetailKind(): string | null {
    return this.reference.detailKind;
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
  /** Re-capture the same observed value through its current authority, or refuse when that authority cannot rebase. */
  tryRebaseCurrent(): ComputationRead | null;
}

/**
 * Side-effect-free value projection used to derive one domain-owned computation read.
 * The resulting read must account for every value consumed through this view.
 */
export interface ComputationDomainReadProjection extends ProductDetailReadView, KernelReadProjectionRevisionView {
  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[];
}

/** Candidate projection after the prospective child carry, available while rebasing its prior reads. */
export interface ComputationReadRebaseContext extends ComputationDomainReadProjection {}

/** Domain override for reads whose current authority is supplied by the candidate being assembled. */
export type ComputationReadRebaser = (
  read: ComputationRead,
  context: ComputationReadRebaseContext,
) => ComputationRead | null | undefined;

/** Run-local admission capability that may reject commit but never becomes a semantic dependency edge. */
class ComputationCurrentnessGuard {
  private readonly checkCurrent: () => boolean;

  constructor(
    readonly guardKey: string,
    private readonly authority: GenerationAuthority,
  ) {
    const isCurrent: unknown = Reflect.get(authority, 'isCurrent');
    if (typeof isCurrent !== 'function') {
      throw new Error(`Currentness guard ${guardKey} has no isCurrent callback.`);
    }
    this.checkCurrent = () => Reflect.apply(isCurrent, authority, []) as boolean;
    Object.freeze(this);
  }

  belongsTo(authority: GenerationAuthority): boolean {
    return this.authority === authority;
  }

  isCurrent(): boolean {
    return this.checkCurrent();
  }
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

export function computationMaterializationOwnerReadKey(ownerHandle: MaterializationOwnerHandle): string {
  return `kernel-materialization-owner:${ownerHandle}`;
}

/** Exact membership of foreign materializations for one owner, excluding this computation's own replacement closure. */
export class ComputationMaterializationOwnerRead implements ComputationRead {
  readonly domain = 'kernel-materialization-owner';
  readonly readKey: string;
  readonly observedRevision: string;
  private readonly excludedRecordHandles: ReadonlySet<KernelRecordHandle>;

  constructor(
    private readonly store: KernelStore,
    readonly ownerHandle: MaterializationOwnerHandle,
    excludedRecordHandles: readonly KernelRecordHandle[],
    readonly observedRecordHandles: readonly KernelRecordHandle[],
  ) {
    this.readKey = computationMaterializationOwnerReadKey(ownerHandle);
    this.excludedRecordHandles = new Set(excludedRecordHandles);
    this.observedRevision = materializationOwnerMembershipRevision(observedRecordHandles);
  }

  validate(): ComputationReadValidation {
    const currentRevision = materializationOwnerMembershipRevision(
      this.store.readMaterializationsByOwner(this.ownerHandle)
        .filter((record) => !this.excludedRecordHandles.has(record.handle))
        .map((record) => record.handle),
    );
    return {
      isCurrent: currentRevision === this.observedRevision,
      currentRevision,
      changedFacets: currentRevision === this.observedRevision ? [] : ['membership'],
    };
  }

  tryRebaseCurrent(): ComputationRead | null {
    // Candidate-local membership must be reconstructed by ComputationRun so staged additions are not lost.
    return null;
  }
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

  tryRebaseCurrent(): ComputationRead | null {
    const current = new ComputationRecordRead(
      this.store,
      this.handle,
      this.store.readRecordRevision(this.handle),
      this.store.readRecordLifetimeOrdinal(this.handle),
    );
    return current.observedRevision === this.observedRevision ? current : null;
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

  tryRebaseCurrent(): ComputationRead | null {
    const currentEntry = this.store.productDetails.readEntry(this.productHandle);
    const current = new ComputationProductDetailRead(
      this.store,
      this.productHandle,
      this.detailKind,
      currentEntry?.slot.detailKind ?? null,
      this.store.productDetails.readMutationOrdinal(this.productHandle),
      this.store.productDetails.readLifetimeOrdinal(this.productHandle),
    );
    return current.observedRevision === this.observedRevision ? current : null;
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

  tryRebaseCurrent(): ComputationRead | null {
    const currentEntry = this.store.hotDetails.readEntry(this.handle);
    const current = new ComputationHotDetailRead(
      this.store,
      this.handle,
      this.detailKind,
      currentEntry?.slot.detailKind ?? null,
      this.store.hotDetails.readMutationOrdinal(this.handle),
      this.store.hotDetails.readLifetimeOrdinal(this.handle),
    );
    return current.observedRevision === this.observedRevision ? current : null;
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
    private readonly source: ComputationRead,
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

  tryRebaseCurrent(): ComputationRead | null {
    return SealedComputationRead.rebase(this);
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
      read,
    );
  }

  static rebase(
    read: ComputationRead,
    rebaser: ((read: ComputationRead) => ComputationRead | null | undefined) | null = null,
  ): SealedComputationRead | null {
    const sealed = SealedComputationRead.from(read);
    const overridden = SealedComputationRead.hasKernelRebaseAuthority(sealed.source)
      ? undefined
      : rebaser?.(sealed.source);
    const rebased = overridden === undefined
      ? sealed.source.tryRebaseCurrent()
      : overridden;
    if (rebased == null) {
      return null;
    }
    const candidate = SealedComputationRead.from(rebased);
    if (candidate.readKey !== sealed.readKey || candidate.domain !== sealed.domain) {
      throw new Error(
        `Computation read rebase changed ${sealed.domain}:${sealed.readKey} into `
        + `${candidate.domain}:${candidate.readKey}.`,
      );
    }
    if (candidate.observedRevision !== sealed.observedRevision || !candidate.validate().isCurrent) {
      return null;
    }
    return candidate;
  }

  static sourceOf(read: ComputationRead): ComputationRead {
    return SealedComputationRead.from(read).source;
  }

  private static hasKernelRebaseAuthority(read: ComputationRead): boolean {
    return read instanceof ComputationMaterializationOwnerRead
      || read instanceof ComputationRecordRead
      || read instanceof ComputationProductDetailRead
      || read instanceof ComputationHotDetailRead;
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
  /** A run-currentness capability was revoked before atomic admission. */
  RejectedCurrentnessChanged = 'rejected-currentness-changed',
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

/** Run-local currentness capability that was revoked before atomic admission. */
export class ComputationInvalidCurrentnessGuard {
  constructor(readonly guardKey: string) {
    Object.freeze(this);
  }
}

/** How one logical child participated in an admitted outer computation transition. */
export const enum ComputationChildTransitionKind {
  /** The child prepared a fresh candidate closure in this run. */
  Executed = 'executed',
  /** The child reused its exact prior closure after current-authority rebase and decision preview. */
  Carried = 'carried',
  /** The prior child had no successor in the admitted candidate and its closure was withdrawn. */
  Withdrawn = 'withdrawn',
}

/** Inspectable child-level execution fact for one admitted outer transition. */
export class ComputationChildTransition {
  constructor(
    readonly childId: ComputationChildId,
    readonly locus: ComputationLocus,
    readonly kind: ComputationChildTransitionKind,
    readonly hadPreviousState: boolean,
  ) {
    Object.freeze(this);
  }
}

/** Inspectable causal row for one admitted or rejected computation run. */
export class ComputationTransition {
  readonly changedReads: readonly ComputationReadChange[];
  readonly invalidReads: readonly ComputationInvalidRead[];
  readonly invalidCurrentnessGuards: readonly ComputationInvalidCurrentnessGuard[];
  readonly publications: readonly KernelPublicationDecision[];
  readonly children: readonly ComputationChildTransition[];

  constructor(
    readonly computationId: ComputationId,
    readonly runSequence: number,
    readonly state: ComputationCommitState,
    changedReads: readonly ComputationReadChange[],
    invalidReads: readonly ComputationInvalidRead[],
    invalidCurrentnessGuards: readonly ComputationInvalidCurrentnessGuard[],
    publications: readonly KernelPublicationDecision[],
    children: readonly ComputationChildTransition[],
  ) {
    this.changedReads = Object.freeze([...changedReads]);
    this.invalidReads = Object.freeze([...invalidReads]);
    this.invalidCurrentnessGuards = Object.freeze([...invalidCurrentnessGuards]);
    this.publications = Object.freeze([...publications]);
    this.children = Object.freeze([...children]);
    Object.freeze(this);
  }
}

export const enum ComputationRetirementCause {
  /** Domain authority explicitly retired one exact committed generation. */
  Explicit = 'explicit',
  /** Kernel lifetime disposal reclaimed the generation's complete publication. */
  LifetimeDisposal = 'lifetime-disposal',
}

/** Stable polling position immediately before the next retirement event ordinal. */
export class ComputationRetirementEventMarker {
  constructor(readonly nextEventOrdinal: number) {
    Object.freeze(this);
  }
}

/** One exact output withdrawn while retiring a committed computation generation. */
export class ComputationRetiredOutput {
  constructor(
    readonly output: ComputationOutput,
    readonly decision: KernelPublicationDecision,
    readonly childId: ComputationChildId | null,
    readonly childRole: ComputationChildRole | null,
    readonly childScc: ComputationChildScc | null,
  ) {
    Object.freeze(this);
  }
}

/** Causal retirement event retained after the corresponding producer/read indexes have been cleared. */
export class ComputationRetirementEvent {
  readonly withdrawnOutputs: readonly ComputationRetiredOutput[];

  constructor(
    readonly ordinal: number,
    readonly cause: ComputationRetirementCause,
    readonly computationId: ComputationId,
    readonly runSequence: number,
    withdrawnOutputs: readonly ComputationRetiredOutput[],
  ) {
    this.withdrawnOutputs = Object.freeze([...withdrawnOutputs]);
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
  /** Child has no semantic-candidate or structural-publication cycle with another committed child. */
  Singleton = 'singleton',
  /** Child belongs to a nontrivial semantic-candidate or structural-publication dependency cycle. */
  Cyclic = 'cyclic',
}

/** Exact technical strongly connected component derived from committed child-dependency edges. */
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
  readonly structuralDependencies: readonly ComputationStructuralDependency[];
  readonly openReads: readonly ComputationChildOpenRead[];
  readonly outputs: readonly ComputationOutput[];

  constructor(
    childId: ComputationChildId,
    locus: ComputationLocus,
    readonly role: ComputationChildRole,
    readonly scc: ComputationChildScc,
    reads: readonly ComputationRead[],
    candidateReads: readonly ComputationCandidateRead[],
    structuralDependencies: readonly ComputationStructuralDependency[],
    openReads: readonly ComputationChildOpenRead[],
    outputs: readonly ComputationOutput[],
  ) {
    this.childId = childId;
    this.locus = locus;
    this.reads = Object.freeze([...reads]);
    this.candidateReads = Object.freeze([...candidateReads]);
    this.structuralDependencies = Object.freeze([...structuralDependencies]);
    this.openReads = Object.freeze([...openReads]);
    this.outputs = Object.freeze([...outputs]);
    Object.freeze(this);
  }

  /** Whether every recorded input has an exact revision rather than an unresolved aggregate closure. */
  get hasOnlyRevisionedReads(): boolean {
    return this.openReads.length === 0;
  }
}

/** Successful child carry plus the current-authority reads that justified reusing its exact outputs. */
export class ComputationChildCarry {
  private readonly readsByKey: ReadonlyMap<string, ComputationRead>;

  constructor(
    readonly previousState: ComputationChildState,
    reads: readonly ComputationRead[],
  ) {
    this.readsByKey = new Map(reads.map((read) => [read.readKey, read]));
    Object.freeze(this);
  }

  readFor(previousRead: ComputationRead): ComputationRead {
    const current = this.readsByKey.get(previousRead.readKey) ?? null;
    if (
      current == null
      || current.domain !== previousRead.domain
      || current.observedRevision !== previousRead.observedRevision
    ) {
      throw new Error(`Carried child has no coherent current read for ${previousRead.readKey}.`);
    }
    return current;
  }
}

class MutableComputationChild {
  readonly readsByKey = new Map<string, ComputationRead>();
  readonly stagedReadsByKey = new Map<string, KernelStagedEntryRevision>();
  readonly structuralReferencesByKey = new Map<string, KernelDetailReference>();
  readonly openReadsByKey = new Map<string, ComputationChildOpenRead>();
  carriedState: ComputationChildState | null = null;
  readonly carriedCandidateReadKeys = new Set<string>();

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
  readonly structuralDependencies: readonly ComputationStructuralDependency[];
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
  readonly transitions: readonly ComputationChildTransition[];
  readonly invalidReads: readonly ComputationInvalidRead[];

  constructor(
    states: readonly ComputationChildState[],
    transitions: readonly ComputationChildTransition[],
    invalidReads: readonly ComputationInvalidRead[],
  ) {
    this.states = Object.freeze([...states]);
    this.transitions = Object.freeze([...transitions]);
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

class ComputationCurrentnessValidationError extends Error {
  constructor(readonly invalidGuards: readonly ComputationInvalidCurrentnessGuard[]) {
    super('One or more computation currentness guards were revoked before outer publication.');
  }
}

class ComputationSupersededDuringCommitError extends Error {
  constructor(computationId: ComputationId, runSequence: number) {
    super(`Computation run ${computationId}@${runSequence} was superseded during publication preflight.`);
  }
}

/** Preview-only kernel view: a rejected rebase must not register semantic reads in its candidate run. */
class StagedComputationReadRebaseContext implements ComputationReadRebaseContext {
  constructor(
    private readonly publications: StagedKernelPublicationContext,
    private readonly prospectiveOutputs: readonly ComputationOutput[],
  ) {}

  readProjectionRevision(): KernelReadProjectionRevision {
    return this.publications.readProjectionRevision();
  }

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    return this.publications.previewMaterializationsByOwnerAfterCarry(
      ownerHandle,
      this.prospectiveOutputs,
    );
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    return this.publications.previewProductDetailAfterCarry(slot, productHandle, this.prospectiveOutputs);
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
  private readonly currentnessGuardsByKey = new Map<string, ComputationCurrentnessGuard>();
  private readonly publications: StagedKernelPublicationContext;
  private readonly childrenById = new Map<ComputationChildId, MutableComputationChild>();
  private readonly remainderChild: MutableComputationChild;
  private activeChild: MutableComputationChild;
  private activeChildScopeDepth = 0;
  private hasExplicitChildren = false;
  private hasExplicitPartition = false;
  private childFailure: ComputationChildPreparationFailure | null = null;
  private phase = ComputationRunPhase.Preparing;
  private carryReadRebaseActive = false;
  private carryDecisionPreviewActive = false;
  /** Candidate-aware values for constructing domain reads without also registering lower-level exact reads. */
  readonly domainReadProjection: ComputationDomainReadProjection;

  constructor(
    private readonly registry: ComputationLifecycleRegistry,
    private readonly store: KernelStore,
    readonly computationId: ComputationId,
    readonly locus: ComputationLocus,
    readonly runSequence: number,
    private readonly previousState: ComputationState | null,
    previousPublication: KernelPublicationManifest,
  ) {
    this.remainderChild = this.childFor(new ComputationRemainderLocus(locus), ComputationChildRole.Remainder);
    this.activeChild = this.remainderChild;
    this.publications = new StagedKernelPublicationContext(
      this.store,
      previousPublication,
      this.remainderChild.childId,
    );
    this.domainReadProjection = Object.freeze({
      readProjectionRevision: () => this.publications.readProjectionRevision(),
      readMaterializationsByOwner: (ownerHandle: MaterializationOwnerHandle) =>
        this.readProjectedMaterializationsByOwner(ownerHandle),
      readProductDetail: <TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle) =>
        this.readProjectedProductDetail(slot, productHandle),
    });
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
      if (child.carriedState != null) {
        throw new Error(`Computation child ${child.childId} was already carried into this candidate.`);
      }
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
      && this.currentnessGuardsAreCurrent()
      && this.publications.isCurrent();
  }

  requireCurrent(): void {
    this.assertCarryReadRebaseInactive();
    if (this.phase === ComputationRunPhase.Finished) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} has already finished.`);
    }
    this.requireHealthy();
    if (!this.registry.isLatestRun(this)) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} has been superseded.`);
    }
    const invalidGuards = invalidCurrentnessGuards([...this.currentnessGuardsByKey.values()]);
    if (invalidGuards.length > 0) {
      throw new Error(
        `Computation run ${this.computationId}@${this.runSequence} has revoked currentness guards: `
        + invalidGuards.map((guard) => guard.guardKey).join(', '),
      );
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

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    this.requireCurrent();
    const snapshot = this.publications.readMaterializationOwnerCandidate(ownerHandle);
    if (this.phase === ComputationRunPhase.Preparing) {
      this.committedRecordInputs(snapshot.committedRecords);
      for (const record of snapshot.stagedRecords) {
        const revision = this.publications.readStagedRevision(KernelPublicationSurface.Record, record.handle);
        if (revision == null) {
          throw new Error(`Candidate materialization ${record.handle} has no staged revision.`);
        }
        this.observeStagedRevision(revision);
      }
      this.observe(new ComputationMaterializationOwnerRead(
        this.store,
        ownerHandle,
        snapshot.excludedRecordHandles,
        snapshot.committedRecords.map((record) => record.handle),
      ));
    }
    return snapshot.records;
  }

  private readProjectedMaterializationsByOwner(
    ownerHandle: MaterializationOwnerHandle,
  ): readonly MaterializationRecord[] {
    if (this.phase === ComputationRunPhase.Finished) {
      return this.store.readMaterializationsByOwner(ownerHandle);
    }
    this.requireCurrent();
    return this.publications.previewMaterializationOwnerCandidate(ownerHandle).records;
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

  private readProjectedProductDetail<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
  ): TDetail | null {
    if (this.phase === ComputationRunPhase.Finished) {
      return this.store.readProductDetail(slot, productHandle);
    }
    this.requireCurrent();
    return this.publications.readProductDetail(slot, productHandle);
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

  /** Guard atomic admission without registering a semantic read or reverse-reader edge. */
  guardCurrent(guardKey: string, authority: GenerationAuthority): void {
    this.requirePreparing();
    if (guardKey.trim().length === 0) {
      throw new Error('Computation currentness guard keys must not be empty.');
    }
    authority.requireCurrent();
    const existing = this.currentnessGuardsByKey.get(guardKey);
    if (existing != null) {
      if (!existing.belongsTo(authority)) {
        throw new Error(`Computation currentness guard ${guardKey} has more than one authority in the same run.`);
      }
      return;
    }
    this.currentnessGuardsByKey.set(guardKey, new ComputationCurrentnessGuard(guardKey, authority));
  }

  private currentnessGuardsAreCurrent(): boolean {
    return [...this.currentnessGuardsByKey.values()].every((guard) => guard.isCurrent());
  }

  publish(plan: KernelPublicationPlan): void {
    this.requirePreparing();
    for (const read of this.publications.publishFrom(this.activeChild.childId, plan)) {
      this.observeStagedRevision(read);
    }
  }

  /** Carry one exact prior singleton child when every dependency still denotes a retained candidate value. */
  tryCarryChild(
    locus: ComputationLocus,
    rebaseRead: ComputationReadRebaser | null = null,
  ): ComputationChildCarry | null {
    this.requirePreparing();
    const capturedLocus = snapshotComputationLocus(locus);
    const childId = computationChildId(this.computationId, capturedLocus);
    if (childId === this.activeChild.childId) {
      throw new Error(`Computation child ${childId} cannot carry itself.`);
    }
    const previous = this.previousState?.children.find((child) => child.childId === childId) ?? null;
    if (
      previous == null
      || previous.role !== ComputationChildRole.Declared
      || previous.scc.kind !== ComputationChildSccKind.Singleton
      || !previous.hasOnlyRevisionedReads
    ) {
      return null;
    }

    const child = this.childFor(capturedLocus, ComputationChildRole.Declared);
    if (
      child.carriedState != null
      || child.readsByKey.size > 0
      || child.stagedReadsByKey.size > 0
      || child.structuralReferencesByKey.size > 0
      || child.openReadsByKey.size > 0
      || this.publications.hasStagedActivityFrom(child.childId)
    ) {
      throw new Error(`Computation child ${child.childId} cannot be carried after candidate work has started.`);
    }
    if (!this.outputsAreUnclaimed(previous.outputs)) return null;
    const rebasedStructuralReferences = this.rebaseStructuralDependencies(previous.structuralDependencies);
    if (rebasedStructuralReferences == null) return null;

    const rebaseContext = new StagedComputationReadRebaseContext(this.publications, previous.outputs);
    const rebasedReads: SealedComputationRead[] = [];
    for (const read of previous.reads) {
      const source = SealedComputationRead.sourceOf(read);
      const rebased = source instanceof ComputationMaterializationOwnerRead
        ? this.rebaseMaterializationOwnerRead(source, previous)
        : this.rebaseCarryRead(read, rebaseRead, rebaseContext);
      if (rebased == null) return null;
      rebasedReads.push(SealedComputationRead.from(rebased));
    }

    if (
      child.carriedState != null
      || child.readsByKey.size > 0
      || child.stagedReadsByKey.size > 0
      || child.structuralReferencesByKey.size > 0
      || child.openReadsByKey.size > 0
      || this.publications.hasStagedActivityFrom(child.childId)
    ) {
      throw new Error(`Computation child ${child.childId} changed while its carry reads were being rebased.`);
    }
    if (!this.outputsAreUnclaimed(previous.outputs)) return null;

    const rebasedCandidateReads: KernelStagedEntryRevision[] = [];
    const retainedDependencyReadKeys = new Set<string>();
    const retainedDependencyOutputs: KernelPublicationEntryDescriptor[] = [];
    for (const read of previous.candidateReads) {
      const current = this.publications.readStagedRevision(read.surface, read.handle);
      if (read.state === ComputationCandidateReadState.Absent) {
        if (current != null || !this.publications.isCandidateEntryAbsent(read.surface, read.handle)) return null;
        rebasedCandidateReads.push(KernelStagedEntryRevision.absent(read.surface, read.handle));
        continue;
      }
      if (
        current == null
        || read.actualKind == null
        || current.writerId !== read.producerChildId
        || current.actualKind !== read.actualKind
      ) {
        return null;
      }
      rebasedCandidateReads.push(current);
      retainedDependencyReadKeys.add(read.readKey);
      retainedDependencyOutputs.push({
        surface: read.surface,
        handle: read.handle,
        detailKind: read.actualKind,
      });
    }

    for (const output of previous.outputs) {
      if (this.registry.childProducerFor(output.readKey) !== previous.childId) return null;
    }
    const preview = this.previewCarryDecisions(
      this.publications.toDecisionPreviewCandidate(
        `preview:${this.computationId}:run:${this.runSequence}:child:${child.childId}`,
        [...retainedDependencyOutputs, ...previous.outputs],
        previous.outputs,
      ),
    );
    if (preview.some((decision) => decision.decision !== KernelPublicationDecisionKind.Retain)) return null;

    // Complete every fallible map merge before carry mutates the staged publication. A caught conflict must not leave
    // commit-capable carried outputs without the dependency evidence that justified them.
    const carriedRunReads = new Map(this.readsByKey);
    const carriedChildReads = new Map(child.readsByKey);
    for (const sealed of rebasedReads) {
      registerComputationRead(carriedRunReads, sealed, `Computation ${this.computationId}`);
      registerComputationRead(carriedChildReads, sealed, `Computation child ${child.childId}`);
    }
    const carriedStagedReads = new Map(child.stagedReadsByKey);
    for (const revision of rebasedCandidateReads) {
      registerStagedEntryRevision(carriedStagedReads, child.childId, revision);
    }

    this.publications.carryFrom(child.childId, previous.outputs);
    for (const read of rebasedReads) {
      const source = SealedComputationRead.sourceOf(read);
      if (source instanceof ComputationMaterializationOwnerRead) {
        this.publications.observeMaterializationOwner(source.ownerHandle);
      }
    }
    for (const [readKey, read] of carriedRunReads) this.readsByKey.set(readKey, read);
    for (const [readKey, read] of carriedChildReads) child.readsByKey.set(readKey, read);
    for (const [readKey, read] of carriedStagedReads) child.stagedReadsByKey.set(readKey, read);
    for (const reference of rebasedStructuralReferences) {
      child.structuralReferencesByKey.set(reference.key, reference);
    }
    child.carriedState = previous;
    for (const readKey of retainedDependencyReadKeys) child.carriedCandidateReadKeys.add(readKey);
    this.hasExplicitChildren = true;
    return new ComputationChildCarry(previous, rebasedReads);
  }

  private rebaseCarryRead(
    read: ComputationRead,
    rebaseRead: ComputationReadRebaser | null,
    context: ComputationReadRebaseContext,
  ): SealedComputationRead | null {
    if (this.carryReadRebaseActive) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} is already rebasing a carry read.`);
    }
    this.carryReadRebaseActive = true;
    try {
      return SealedComputationRead.rebase(
        read,
        rebaseRead == null ? null : (candidate) => rebaseRead(candidate, context),
      );
    } finally {
      this.carryReadRebaseActive = false;
    }
  }

  private previewCarryDecisions(
    candidate: KernelPublicationDecisionPreviewCandidate,
  ): readonly KernelPublicationDecision[] {
    if (this.carryDecisionPreviewActive) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} is already previewing child carry.`);
    }
    this.carryDecisionPreviewActive = true;
    try {
      return this.registry.previewRunPublicationDecisions(this, candidate);
    } finally {
      this.carryDecisionPreviewActive = false;
    }
  }

  private outputsAreUnclaimed(outputs: readonly ComputationOutput[]): boolean {
    return outputs.every((output) =>
      this.publications.readStagedRevision(output.surface, output.handle) == null,
    );
  }

  private rebaseStructuralDependencies(
    dependencies: readonly ComputationStructuralDependency[],
  ): readonly KernelDetailReference[] | null {
    const rebased: KernelDetailReference[] = [];
    for (const dependency of dependencies) {
      const staged = this.publications.readStagedRevision(dependency.surface, dependency.handle);
      const actualKind = staged?.actualKind
        ?? this.structuralDependencyKind(dependency.surface, dependency.handle);
      if (
        actualKind == null
        || (dependency.requiredDetailKind != null && dependency.requiredDetailKind !== actualKind)
      ) {
        return null;
      }
      rebased.push(dependency.reference);
    }
    return rebased;
  }

  private structuralDependencyKind(
    surface: KernelPublicationSurface,
    handle: string,
  ): string | null {
    const staged = this.publications.readStagedRevision(surface, handle);
    if (staged != null) {
      return staged.actualKind;
    }
    if (this.publications.isCandidateEntryAbsent(surface, handle)) {
      return null;
    }
    switch (surface) {
      case KernelPublicationSurface.Record:
        return this.store.read(handle as KernelRecordHandle)?.kind ?? null;
      case KernelPublicationSurface.ProductDetail:
        return this.store.productDetails.readEntry(handle as ProductHandle)?.slot.detailKind ?? null;
      case KernelPublicationSurface.HotDetail:
        return this.store.hotDetails.readEntry(handle as HotDetailHandle)?.slot.detailKind ?? null;
    }
  }

  private rebaseMaterializationOwnerRead(
    read: ComputationMaterializationOwnerRead,
    previous: ComputationChildState,
  ): ComputationMaterializationOwnerRead | null {
    const expectedHandles = new Set(read.observedRecordHandles);
    for (const candidateRead of previous.candidateReads) {
      if (
        candidateRead.state !== ComputationCandidateReadState.Present
        || candidateRead.surface !== KernelPublicationSurface.Record
      ) {
        continue;
      }
      const record = this.store.read(candidateRead.handle as KernelRecordHandle);
      if (record?.kind === 'materialization-record' && record.ownerHandle === read.ownerHandle) {
        expectedHandles.add(record.handle);
      }
    }
    const current = this.publications.previewMaterializationOwnerCandidate(read.ownerHandle);
    const currentHandles = current.records.map((record) => record.handle);
    if (!sameSortedStrings([...expectedHandles], currentHandles)) {
      return null;
    }
    return new ComputationMaterializationOwnerRead(
      this.store,
      read.ownerHandle,
      current.excludedRecordHandles,
      current.committedRecords.map((record) => record.handle),
    );
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
      this.registerPublicationStructuralDependencies(candidate);
      const reads = this.readsForCommit(candidate);
      const result = this.registry.commitRun(
        this,
        reads,
        [...this.currentnessGuardsByKey.values()],
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
    this.assertCarryReadRebaseInactive();
    if (this.phase !== ComputationRunPhase.Preparing) {
      throw new Error(`Computation run ${this.computationId}@${this.runSequence} is no longer preparing.`);
    }
  }

  private assertCarryReadRebaseInactive(): void {
    if (this.carryReadRebaseActive) {
      throw new Error(
        `Computation run ${this.computationId}@${this.runSequence} cannot be used while a carry read is rebasing.`,
      );
    }
    if (this.carryDecisionPreviewActive) {
      throw new Error(
        `Computation run ${this.computationId}@${this.runSequence} cannot be used during child-carry decision preview.`,
      );
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
    const decisionsByReadKey = new Map(decisions.map((decision) => [
      computationOutputReadKey(decision.surface, decision.handle),
      decision,
    ]));
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
          if (!this.publications.isCandidateEntryAbsent(observed.surface, observed.handle)) {
            invalidReads.push(new ComputationInvalidRead(
              computationStagedReadKey(observed),
              'computation-child-staged-read',
              stagedEntryRevisionLabel(observed),
              'foreign-committed-entry',
              ['existence'],
            ));
            return [];
          }
          return [new ComputationCandidateRead(
            observed.surface,
            observed.handle,
            null,
            ComputationCandidateReadState.Absent,
            null,
            null,
          )];
        }
        return observed.writerId === child.childId
          ? []
          : [new ComputationCandidateRead(
              observed.surface,
              observed.handle,
              observed.actualKind,
              ComputationCandidateReadState.Present,
              observed.writerId,
              requiredStagedReadMutationOrdinal(observed),
            )];
      });
      if (child.carriedState != null) {
        for (const output of child.carriedState.outputs) {
          const decision = decisionsByReadKey.get(output.readKey) ?? null;
          if (decision?.decision !== KernelPublicationDecisionKind.Retain) {
            invalidReads.push(new ComputationInvalidRead(
              output.readKey,
              'computation-child-carried-output',
              KernelPublicationDecisionKind.Retain,
              decision?.decision ?? 'missing',
              ['publication-decision'],
            ));
          }
        }
        for (const readKey of child.carriedCandidateReadKeys) {
          const decision = decisionsByReadKey.get(readKey) ?? null;
          if (decision?.decision !== KernelPublicationDecisionKind.Retain) {
            invalidReads.push(new ComputationInvalidRead(
              readKey,
              'computation-child-carried-dependency',
              KernelPublicationDecisionKind.Retain,
              decision?.decision ?? 'missing',
              ['publication-decision'],
            ));
          }
        }
      }
      return {
        child,
        reads: reads.sort((left, right) => left.readKey.localeCompare(right.readKey)),
        candidateReads: candidateReads.sort((left, right) => left.readKey.localeCompare(right.readKey)),
        structuralDependencies: [...child.structuralReferencesByKey.values()]
          .map((reference) => {
            const readKey = computationOutputReadKey(reference.surface, reference.handle);
            return new ComputationStructuralDependency(
              reference,
              outputOwnerByReadKey.get(readKey) ?? this.registry.childProducerFor(readKey),
            );
          })
          .sort((left, right) => left.readKey.localeCompare(right.readKey)),
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
    const states = prepared.map((candidate) => {
      const scc = requiredComputationChildScc(sccByChildId, candidate.child.childId);
      if (candidate.child.carriedState != null && scc.kind !== ComputationChildSccKind.Singleton) {
        invalidReads.push(new ComputationInvalidRead(
          candidate.child.childId,
          'computation-child-carried-topology',
          ComputationChildSccKind.Singleton,
          scc.kind,
          ['strongly-connected-component'],
        ));
      }
      return new ComputationChildState(
        candidate.child.childId,
        candidate.child.locus,
        candidate.child.role,
        scc,
        candidate.reads,
        candidate.candidateReads,
        candidate.structuralDependencies,
        candidate.openReads,
        candidate.outputs,
      );
    });
    const currentById = new Map(states.map((state) => [state.childId, state]));
    const carriedIds = new Set(prepared
      .filter((candidate) => candidate.child.carriedState != null)
      .map((candidate) => candidate.child.childId));
    const previousChildren = this.previousState?.children ?? [];
    const previousIds = new Set(previousChildren.map((child) => child.childId));
    const transitions = [
      ...states.map((state) => new ComputationChildTransition(
        state.childId,
        state.locus,
        carriedIds.has(state.childId)
          ? ComputationChildTransitionKind.Carried
          : ComputationChildTransitionKind.Executed,
        previousIds.has(state.childId),
      )),
      ...previousChildren
        .filter((child) => !currentById.has(child.childId))
        .map((child) => new ComputationChildTransition(
          child.childId,
          child.locus,
          ComputationChildTransitionKind.Withdrawn,
          true,
        )),
    ].sort((left, right) => left.childId.localeCompare(right.childId));
    return new ComputationChildPreparation(
      states,
      transitions,
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
    registerStagedEntryRevision(child.stagedReadsByKey, child.childId, revision);
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

  private registerPublicationStructuralDependencies(candidate: SealedKernelPublicationCandidate): void {
    const borrowedProductDetails = new Set(candidate.plan.productDetailAdmissionSnapshots
      .filter((snapshot) => snapshot.expectedEntry != null)
      .map((snapshot) => snapshot.productHandle));
    const borrowedHotDetails = new Set(candidate.plan.hotDetailAdmissionSnapshots
      .filter((snapshot) => snapshot.expectedEntry != null)
      .map((snapshot) => snapshot.handle));
    for (const record of candidate.plan.batch.records) {
      const writerId = requiredCandidateWriter(candidate, KernelPublicationSurface.Record, record.handle);
      for (const reference of referencedKernelRecordHandles(record)) {
        this.registerStructuralDependency(
          writerId,
          new KernelRecordReference(reference),
        );
      }
    }
    for (const publication of candidate.plan.productDetails) {
      if (
        publication.admission === KernelDetailAdmission.IfAbsent
        && borrowedProductDetails.has(publication.productHandle)
      ) {
        continue;
      }
      const writerId = requiredCandidateWriter(
        candidate,
        KernelPublicationSurface.ProductDetail,
        publication.productHandle,
      );
      this.registerStructuralDependency(
        writerId,
        new KernelRecordReference(publication.productHandle),
      );
      for (const reference of publication.references) {
        this.registerStructuralDependency(writerId, reference);
      }
    }
    for (const publication of candidate.plan.hotDetails) {
      if (
        publication.admission === KernelDetailAdmission.IfAbsent
        && borrowedHotDetails.has(publication.handle)
      ) {
        continue;
      }
      const writerId = requiredCandidateWriter(candidate, KernelPublicationSurface.HotDetail, publication.handle);
      this.registerStructuralDependency(
        writerId,
        new KernelRecordReference(publication.ownerProductHandle),
      );
      for (const reference of publication.references) {
        this.registerStructuralDependency(writerId, reference);
      }
    }
  }

  private registerStructuralDependency(
    writerId: ComputationChildId,
    reference: KernelDetailReference,
  ): void {
    const child = this.requireChild(writerId);
    const actualKind = this.structuralDependencyKind(reference.surface, reference.handle);
    if (actualKind == null || (reference.detailKind != null && reference.detailKind !== actualKind)) {
      // KernelStore owns post-state reference validation and its domain-specific failure vocabulary.
      return;
    }
    const readKey = computationOutputReadKey(reference.surface, reference.handle);
    const ownRevision = this.publications.readStagedRevision(reference.surface, reference.handle);
    if (ownRevision?.writerId === writerId) return;
    const existing = child.structuralReferencesByKey.get(reference.key) ?? null;
    if (
      existing != null
      && existing.detailKind !== reference.detailKind
    ) {
      throw new Error(`Computation child ${writerId} has conflicting structural targets for ${readKey}.`);
    }
    child.structuralReferencesByKey.set(reference.key, reference);
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
  private nextRetirementEventOrdinal = 1;
  private readonly retirementEvents: ComputationRetirementEvent[] = [];
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
      entry.state,
      entry.state?.publication ?? KernelPublicationManifest.empty,
    );
  }

  /** Compare one run-local scheduling candidate through the owning store's final decision authority. */
  previewRunPublicationDecisions(
    run: ComputationRun,
    candidate: KernelPublicationDecisionPreviewCandidate,
  ): readonly KernelPublicationDecision[] {
    const entry = this.entriesById.get(run.computationId);
    if (entry == null || entry.latestRunSequence !== run.runSequence) {
      throw new Error(`Cannot preview superseded computation run ${run.computationId}@${run.runSequence}.`);
    }
    return this.store.previewOwnedPublicationCandidateDecisions(
      entry.state?.publication ?? KernelPublicationManifest.empty,
      candidate,
      this.publicationOwner,
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
    let retiredOutputs: readonly ComputationRetiredOutput[] = [];
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
          retiredOutputs = this.prepareRetiredOutputs(state, decisions);
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
    this.appendRetirementEvent(
      state,
      ComputationRetirementCause.Explicit,
      retiredOutputs,
    );
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

  markRetirementEvents(): ComputationRetirementEventMarker {
    return new ComputationRetirementEventMarker(this.nextRetirementEventOrdinal);
  }

  readRetirementEventsSince(marker: ComputationRetirementEventMarker): readonly ComputationRetirementEvent[] {
    return this.retirementEvents.filter((event) => event.ordinal >= marker.nextEventOrdinal);
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
      const retiredOutputs = this.prepareRetiredOutputs(
        state,
        state.outputs.map((output) => new KernelPublicationDecision(
          output.handle,
          output.surface,
          output.detailKind,
          KernelPublicationDecisionKind.Withdraw,
        )),
      );
      this.replaceReadIndex(state.reads, [], entry.computationId);
      this.commitProducerReplacement(state.outputs, [], entry.computationId);
      this.commitChildReplacement(state.children, []);
      this.store.retirePublicationManifest(state.publication, this.publicationOwner);
      entry.state = null;
      entry.admittedGenerationDomains.clear();
      // Any run prepared against the reclaimed closure must not resurrect it after disposal.
      entry.latestRunSequence += 1;
      this.appendRetirementEvent(
        state,
        ComputationRetirementCause.LifetimeDisposal,
        retiredOutputs,
      );
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
    currentnessGuards: readonly ComputationCurrentnessGuard[],
    openReads: readonly ComputationChildOpenRead[],
    minimumLifetimeOrdinal: number | null,
    candidate: SealedKernelPublicationCandidate,
  ): ComputationCommitResult {
    const entry = this.entriesById.get(run.computationId);
    if (entry == null) {
      throw new Error(`Unknown computation ${run.computationId}.`);
    }
    if (entry.latestRunSequence !== run.runSequence) {
      return this.reject(entry, run, ComputationCommitState.RejectedSuperseded, [], []);
    }

    const initiallyInvalidGuards = invalidCurrentnessGuards(currentnessGuards);
    if (initiallyInvalidGuards.length > 0) {
      return this.reject(
        entry,
        run,
        ComputationCommitState.RejectedCurrentnessChanged,
        [],
        initiallyInvalidGuards,
      );
    }

    const previousState = entry.state;
    let childPreparation = new ComputationChildPreparation([], [], []);
    let replacement: KernelPublicationReplacement;
    try {
      replacement = this.store.replaceOwnedPublicationCandidate(
        previousState?.publication ?? KernelPublicationManifest.empty,
        candidate.publication.withMinimumLifetimeOrdinal(minimumLifetimeOrdinal),
        this.publicationOwner,
        {
          validate: (decisions) => {
            this.requireLatestRunForCommit(entry, run);
            requireCurrentnessGuards(currentnessGuards);
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
            requireCurrentnessGuards(currentnessGuards);
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
            requireCurrentnessGuards(currentnessGuards);
            this.requireLatestRunForCommit(entry, run);
          },
          validateCurrent: () => {
            this.requireLatestRunForCommit(entry, run);
            requireCurrentnessGuards(currentnessGuards);
          },
        },
      );
    } catch (error) {
      if (
        error instanceof ComputationInputReadValidationError
        || error instanceof ComputationChildReadValidationError
      ) {
        return this.reject(entry, run, ComputationCommitState.RejectedInputsChanged, error.invalidReads, []);
      }
      if (error instanceof ComputationCurrentnessValidationError) {
        return this.reject(
          entry,
          run,
          ComputationCommitState.RejectedCurrentnessChanged,
          [],
          error.invalidGuards,
        );
      }
      if (error instanceof ComputationSupersededDuringCommitError) {
        return this.reject(entry, run, ComputationCommitState.RejectedSuperseded, [], []);
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
      [],
      replacement.decisions,
      childPreparation.transitions,
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
    invalidCurrentnessGuards: readonly ComputationInvalidCurrentnessGuard[],
  ): ComputationCommitResult {
    const transition = new ComputationTransition(
      entry.computationId,
      run.runSequence,
      state,
      [],
      invalidReads,
      invalidCurrentnessGuards,
      [],
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

  private prepareRetiredOutputs(
    state: ComputationState,
    decisions: readonly KernelPublicationDecision[],
  ): readonly ComputationRetiredOutput[] {
    const outputByReadKey = new Map(state.outputs.map((output) => [output.readKey, output]));
    const childByOutputReadKey = new Map<string, ComputationChildState>();
    for (const child of state.children) {
      for (const output of child.outputs) {
        childByOutputReadKey.set(output.readKey, child);
      }
    }
    const withdrawnOutputs = decisions.flatMap((decision) => {
      if (decision.decision !== KernelPublicationDecisionKind.Withdraw) {
        return [];
      }
      const readKey = computationOutputReadKey(decision.surface, decision.handle);
      const output = outputByReadKey.get(readKey) ?? null;
      if (output == null) {
        throw new Error(`Retirement withdrew ${readKey} outside the committed computation output manifest.`);
      }
      const child = childByOutputReadKey.get(readKey) ?? null;
      return [new ComputationRetiredOutput(
        output,
        decision,
        child?.childId ?? null,
        child?.role ?? null,
        child?.scc ?? null,
      )];
    });
    if (withdrawnOutputs.length !== state.outputs.length) {
      throw new Error(
        `Retirement of ${state.computationId}@${state.committedRunSequence} withdrew `
        + `${withdrawnOutputs.length} of ${state.outputs.length} committed outputs.`,
      );
    }
    return withdrawnOutputs.sort((left, right) => left.output.readKey.localeCompare(right.output.readKey));
  }

  private appendRetirementEvent(
    state: ComputationState,
    cause: ComputationRetirementCause,
    withdrawnOutputs: readonly ComputationRetiredOutput[],
  ): void {
    this.retirementEvents.push(new ComputationRetirementEvent(
      this.nextRetirementEventOrdinal++,
      cause,
      state.computationId,
      state.committedRunSequence,
      withdrawnOutputs,
    ));
  }
}

function preparedComputationChildHasContent(child: PreparedComputationChild): boolean {
  return child.reads.length > 0
    || child.candidateReads.length > 0
    || child.structuralDependencies.length > 0
    || child.openReads.length > 0
    || child.outputs.length > 0;
}

/** Derive exact technical SCCs from semantic candidate reads and publication-structure producer edges. */
function classifyComputationChildSccs(
  children: readonly PreparedComputationChild[],
): ReadonlyMap<ComputationChildId, ComputationChildScc> {
  const childrenById = new Map(children.map((child) => [child.child.childId, child]));
  const dependenciesById = new Map<ComputationChildId, readonly ComputationChildId[]>();
  for (const child of children) {
    dependenciesById.set(
      child.child.childId,
      [...new Set([
        ...child.candidateReads.flatMap((read) =>
          read.state === ComputationCandidateReadState.Present
            && read.producerChildId != null
            && childrenById.has(read.producerChildId)
            ? [read.producerChildId]
            : []
        ),
        ...child.structuralDependencies.flatMap((dependency) =>
          dependency.producerChildId != null && childrenById.has(dependency.producerChildId)
            ? [dependency.producerChildId]
            : []
        ),
      ])].sort((left, right) => left.localeCompare(right)),
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

function registerStagedEntryRevision(
  readsByKey: Map<string, KernelStagedEntryRevision>,
  childId: ComputationChildId,
  revision: KernelStagedEntryRevision,
): void {
  const readKey = computationStagedReadKey(revision);
  const existing = readsByKey.get(readKey);
  if (existing != null && !sameStagedEntryRevision(existing, revision)) {
    if (
      revision.writerId === childId
      && (existing.writerId == null || existing.writerId === childId)
    ) {
      readsByKey.set(readKey, revision);
      return;
    }
    throw new Error(
      `Computation child ${childId} observed changing candidate output ${readKey}: `
      + `${stagedEntryRevisionLabel(existing)} -> ${stagedEntryRevisionLabel(revision)}.`,
    );
  }
  readsByKey.set(readKey, revision);
}

function materializationOwnerMembershipRevision(handles: readonly KernelRecordHandle[]): string {
  return JSON.stringify([...handles].sort((left, right) => left.localeCompare(right)));
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
    return right == null || stagedEntryIsAbsent(right);
  }
  return right != null
    && left.writerId === right.writerId
    && left.surface === right.surface
    && left.handle === right.handle
    && left.actualKind === right.actualKind
    && left.mutationOrdinal === right.mutationOrdinal;
}

function sameSortedStrings(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort((a, b) => a.localeCompare(b));
  const sortedRight = [...right].sort((a, b) => a.localeCompare(b));
  return sortedLeft.length === sortedRight.length
    && sortedLeft.every((value, index) => value === sortedRight[index]);
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

function invalidCurrentnessGuards(
  guards: readonly ComputationCurrentnessGuard[],
): readonly ComputationInvalidCurrentnessGuard[] {
  return guards
    .filter((guard) => !guard.isCurrent())
    .map((guard) => new ComputationInvalidCurrentnessGuard(guard.guardKey));
}

function requireCurrentnessGuards(guards: readonly ComputationCurrentnessGuard[]): void {
  const invalidGuards = invalidCurrentnessGuards(guards);
  if (invalidGuards.length > 0) {
    throw new ComputationCurrentnessValidationError(invalidGuards);
  }
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

export function computationOutputReadKey(
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
