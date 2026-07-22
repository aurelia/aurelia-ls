import {
  readHotDetailEntry,
  type HotDetailEntry,
  type HotDetailReadView,
  type HotDetailSlot,
  type PreparedHotDetailEntry,
} from './hot-details.js';
import type {
  KernelHandleFactory,
  KernelRecordHandle,
  HotDetailHandle,
  ProductHandle,
} from './handles.js';
import {
  readProductDetailEnvelope,
  type PreparedProductDetailEntry,
  type ProductDetailEntry,
  type ProductDetailReadView,
  type ProductDetailSlot,
} from './product-details.js';
import {
  KernelReadProjectionRevision,
  type KernelReadProjectionRevisionView,
  type KernelStore,
  type KernelMaterializationReadView,
  type KernelRecordCollectionReadView,
  type KernelSourceFileReadView,
  type KernelStoreDensityDelta,
  type KernelStoreDetailDensityDelta,
  type KernelStoreObservationMarker,
  type KernelStoreRecord,
  type KernelTelemetryReadView,
} from './store.js';
import { SourceFileAddress } from './address.js';
import {
  MaterializedProduct,
  sameMaterializedProductEnvelope,
  type MaterializationOwnerHandle,
  type MaterializationRecord,
} from './materialization.js';
import {
  isSemanticAddressRecord,
  isSemanticIdentityRecord,
  sourceFilePathMatches,
} from './source-address.js';
import {
  countSemanticRuntimeRowsBy,
  type SemanticRuntimeKernelCountSnapshot,
} from '../telemetry/kernel-density.js';
import { readSemanticRuntimeDetailDensityRows } from '../telemetry/detail-density.js';
import type { GenerationAuthority } from './generation-authority.js';
import { KernelPublicationSurface } from './publication-surface.js';
import type { KernelDetailReference } from './detail-references.js';
import {
  KernelPublicationDecisionKind,
  type KernelComparablePublicationDecision,
  type KernelDetailComparator,
  type KernelPublicationComparisonContext,
} from './publication-comparison.js';

export {
  KernelPublicationDecisionKind,
  type KernelComparablePublicationDecision,
  type KernelDetailComparator,
  type KernelPublicationComparisonContext,
} from './publication-comparison.js';

/** How a staged detail behaves when its handle is already owned by another publication. */
export const enum KernelDetailAdmission {
  /** The detail is owned by this publication and an unrelated existing detail is an error. */
  Required = 'required',
  /** Reuse an unrelated existing detail with the same slot instead of claiming ownership. */
  IfAbsent = 'if-absent',
}

/** One typed product-detail attachment staged beside its kernel product envelope. */
export class KernelProductDetailPublication<TDetail> {
  readonly references: readonly KernelDetailReference[];

  constructor(
    readonly slot: ProductDetailSlot<TDetail>,
    readonly productHandle: ProductHandle,
    readonly detail: TDetail,
    readonly admission: KernelDetailAdmission = KernelDetailAdmission.Required,
  ) {
    this.references = slot.referencesFor(detail);
    Object.freeze(this);
  }
}

/** One typed epoch-local hot detail staged beside a computation publication. */
export class KernelHotDetailPublication<TDetail> {
  readonly references: readonly KernelDetailReference[];

  constructor(
    readonly slot: HotDetailSlot<TDetail>,
    readonly ownerProductHandle: ProductHandle,
    readonly handle: HotDetailHandle,
    readonly detail: TDetail,
    readonly admission: KernelDetailAdmission = KernelDetailAdmission.Required,
  ) {
    this.references = slot.referencesFor(detail);
    Object.freeze(this);
  }
}

/** Coherent normalized-record emission carried by an immediate or staged publication. */
export class KernelStoreBatch {
  readonly records: readonly KernelStoreRecord[];
  readonly label: string | null;

  constructor(
    /** Normalized records emitted together by one analysis step. */
    records: readonly KernelStoreRecord[] = [],
    /** Optional non-semantic label for debugging and inquiry traces. */
    label: string | null = null,
  ) {
    this.records = Object.freeze([...records]);
    this.label = label;
    Object.freeze(this);
  }
}

export function publishProductDetail<TDetail>(
  slot: ProductDetailSlot<TDetail>,
  productHandle: ProductHandle,
  detail: TDetail,
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
): KernelProductDetailPublication<unknown> {
  return new KernelProductDetailPublication(
    slot,
    productHandle,
    detail,
    admission,
  ) as unknown as KernelProductDetailPublication<unknown>;
}

export function publishHotDetail<TDetail>(
  slot: HotDetailSlot<TDetail>,
  ownerProductHandle: ProductHandle,
  handle: HotDetailHandle,
  detail: TDetail,
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
): KernelHotDetailPublication<unknown> {
  return new KernelHotDetailPublication(
    slot,
    ownerProductHandle,
    handle,
    detail,
    admission,
  ) as unknown as KernelHotDetailPublication<unknown>;
}

export function publishProductDetails<TDetail extends { readonly productHandle: ProductHandle }>(
  slot: ProductDetailSlot<TDetail>,
  details: readonly TDetail[],
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
): readonly KernelProductDetailPublication<unknown>[] {
  return details.map((detail) => publishProductDetail(slot, detail.productHandle, detail, admission));
}

/** Complete staged mutation emitted by one or more materializer phases. */
export class KernelPublicationPlan {
  readonly batch: KernelStoreBatch;
  readonly productDetails: readonly KernelProductDetailPublication<unknown>[];
  readonly hotDetails: readonly KernelHotDetailPublication<unknown>[];
  readonly productDetailAdmissionSnapshots: readonly KernelProductDetailAdmissionSnapshot[];
  readonly hotDetailAdmissionSnapshots: readonly KernelHotDetailAdmissionSnapshot[];
  readonly minimumLifetimeOrdinal: number | null;

  constructor(
    batch: KernelStoreBatch,
    productDetails: readonly KernelProductDetailPublication<unknown>[] = [],
    hotDetails: readonly KernelHotDetailPublication<unknown>[] = [],
    /** Foreign product-detail admission decisions observed by a staged run. */
    productDetailAdmissionSnapshots: readonly KernelProductDetailAdmissionSnapshot[] = [],
    /** Foreign hot-detail admission decisions observed by a staged run. */
    hotDetailAdmissionSnapshots: readonly KernelHotDetailAdmissionSnapshot[] = [],
    /** Youngest kernel lifetime consumed through a registered computation read. */
    minimumLifetimeOrdinal: number | null = null,
  ) {
    this.batch = batch;
    this.productDetails = Object.freeze([...productDetails]);
    this.hotDetails = Object.freeze([...hotDetails]);
    this.productDetailAdmissionSnapshots = Object.freeze([...productDetailAdmissionSnapshots]);
    this.hotDetailAdmissionSnapshots = Object.freeze([...hotDetailAdmissionSnapshots]);
    this.minimumLifetimeOrdinal = minimumLifetimeOrdinal;
    Object.freeze(this);
  }

  withMinimumLifetimeOrdinal(minimumLifetimeOrdinal: number | null): KernelPublicationPlan {
    const effective = maxLifetimeOrdinal(this.minimumLifetimeOrdinal, minimumLifetimeOrdinal);
    return effective === this.minimumLifetimeOrdinal
      ? this
      : new KernelPublicationPlan(
          this.batch,
          this.productDetails,
          this.hotDetails,
          this.productDetailAdmissionSnapshots,
          this.hotDetailAdmissionSnapshots,
          effective,
        );
  }
}

/** Structural output descriptor accepted by the staged carry boundary. */
export interface KernelPublicationCarryOutput {
  readonly surface: KernelPublicationSurface;
  readonly handle: string;
  readonly detailKind: string;
}

/** Store revision captured when a staged operation consumes one exact committed entry. */
export class KernelCommittedEntryRevision {
  constructor(
    readonly actualKind: string | null,
    readonly mutationOrdinal: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {}
}

declare const kernelPublicationWriterIdBrand: unique symbol;

/** Run-local writer identity retained while one outer publication is being staged. */
export type KernelPublicationWriterId = string & { readonly [kernelPublicationWriterIdBrand]: true };

/** Exact candidate revision captured when a staged read consumes another run-local write. */
export class KernelStagedEntryRevision {
  private constructor(
    /** Null for the candidate-local absence created by hiding this computation's prior generation. */
    readonly writerId: KernelPublicationWriterId | null,
    readonly surface: KernelPublicationSurface,
    readonly handle: string,
    readonly actualKind: string | null,
    readonly mutationOrdinal: number | null,
  ) {}

  static absent(surface: KernelPublicationSurface, handle: string): KernelStagedEntryRevision {
    return new KernelStagedEntryRevision(null, surface, handle, null, null);
  }

  static present(
    writerId: KernelPublicationWriterId,
    surface: KernelPublicationSurface,
    handle: string,
    actualKind: string,
    mutationOrdinal: number,
  ): KernelStagedEntryRevision {
    return new KernelStagedEntryRevision(writerId, surface, handle, actualKind, mutationOrdinal);
  }
}

/** Exact staged lookup plus the foreign committed revision that supplied it, when one did. */
export class StagedKernelRead<TValue> {
  constructor(
    readonly value: TValue | null,
    readonly committedRevision: KernelCommittedEntryRevision | null,
    readonly stagedRevision: KernelStagedEntryRevision | null,
  ) {}
}

/** Candidate-normalized owner membership plus the committed and staged rows that supplied it. */
export class StagedKernelMaterializationOwnerRead {
  readonly records: readonly MaterializationRecord[];
  readonly committedRecords: readonly MaterializationRecord[];
  readonly stagedRecords: readonly MaterializationRecord[];
  readonly excludedRecordHandles: readonly KernelRecordHandle[];

  constructor(
    records: readonly MaterializationRecord[],
    committedRecords: readonly MaterializationRecord[],
    stagedRecords: readonly MaterializationRecord[],
    excludedRecordHandles: readonly KernelRecordHandle[],
  ) {
    this.records = Object.freeze([...records]);
    this.committedRecords = Object.freeze([...committedRecords]);
    this.stagedRecords = Object.freeze([...stagedRecords]);
    this.excludedRecordHandles = Object.freeze([...excludedRecordHandles]);
    Object.freeze(this);
  }
}

/** Exact foreign product-detail entry, or absence, used by one staged admission decision. */
export class KernelProductDetailAdmissionSnapshot {
  constructor(
    readonly productHandle: ProductHandle,
    readonly detailKind: string,
    readonly expectedEntry: ProductDetailEntry<unknown> | null,
    readonly committedRevision: KernelCommittedEntryRevision,
  ) {}
}

/** Exact foreign hot-detail entry, or absence, used by one staged admission decision. */
export class KernelHotDetailAdmissionSnapshot {
  constructor(
    readonly handle: HotDetailHandle,
    readonly detailKind: string,
    readonly expectedEntry: HotDetailEntry<unknown> | null,
    readonly committedRevision: KernelCommittedEntryRevision,
  ) {}
}

/** Child writer whose `IfAbsent` publication consumed one exact committed product-detail decision. */
export class KernelProductDetailAdmissionAttempt {
  constructor(
    readonly writerId: KernelPublicationWriterId,
    readonly snapshot: KernelProductDetailAdmissionSnapshot,
  ) {}
}

/** Child writer whose `IfAbsent` publication consumed one exact committed hot-detail decision. */
export class KernelHotDetailAdmissionAttempt {
  constructor(
    readonly writerId: KernelPublicationWriterId,
    readonly snapshot: KernelHotDetailAdmissionSnapshot,
  ) {}
}

/** Exact store entries currently owned by one committed computation. */
export class KernelPublicationManifest {
  static readonly empty = new KernelPublicationManifest();

  readonly recordHandles: readonly KernelRecordHandle[];
  readonly productDetailHandles: readonly ProductHandle[];
  readonly hotDetailHandles: readonly HotDetailHandle[];
  /** Monotone lifetime inherited from this lineage or advanced to its youngest positive dependency. */
  readonly lifetimeOrdinal: number | null;

  constructor(
    recordHandles: readonly KernelRecordHandle[] = [],
    productDetailHandles: readonly ProductHandle[] = [],
    hotDetailHandles: readonly HotDetailHandle[] = [],
    lifetimeOrdinal: number | null = null,
  ) {
    this.recordHandles = Object.freeze([...recordHandles]);
    this.productDetailHandles = Object.freeze([...productDetailHandles]);
    this.hotDetailHandles = Object.freeze([...hotDetailHandles]);
    this.lifetimeOrdinal = lifetimeOrdinal;
    Object.freeze(this);
  }
}

/** One retain/refresh/replace/withdraw decision in an admitted publication. */
export class KernelPublicationDecision {
  constructor(
    readonly handle: string,
    readonly surface: KernelPublicationSurface,
    readonly detailKind: string,
    readonly decision: KernelPublicationDecisionKind,
  ) {
    Object.freeze(this);
  }
}

/** Result of atomically replacing one prior manifest. */
export class KernelPublicationReplacement {
  readonly decisions: readonly KernelPublicationDecision[];

  constructor(
    readonly manifest: KernelPublicationManifest,
    decisions: readonly KernelPublicationDecision[],
  ) {
    this.decisions = Object.freeze([...decisions]);
    Object.freeze(this);
  }
}

const kernelPublicationDecisionCandidateAuthority = Object.freeze({});
const kernelPublicationDecisionPreviewCandidateAuthority = Object.freeze({});
const kernelPublicationDecisionCandidates = new WeakSet<object>();
const kernelPublicationDecisionPreviewCandidates = new WeakSet<object>();

function retainedPublicationOutputsByKey(
  retainedOutputs: readonly KernelPublicationCarryOutput[],
): ReadonlyMap<string, KernelPublicationCarryOutput> {
  const retainedOutputsByKey = new Map<string, KernelPublicationCarryOutput>();
  for (const output of retainedOutputs) {
    const key = stagedRevisionKey(output.surface, output.handle);
    const existing = retainedOutputsByKey.get(key) ?? null;
    if (existing != null && existing.detailKind !== output.detailKind) {
      throw new Error(`Carried output ${key} has conflicting kinds ${existing.detailKind} and ${output.detailKind}.`);
    }
    retainedOutputsByKey.set(key, output);
  }
  return retainedOutputsByKey;
}

/** Final replacement candidate minted only by sealing staged publication, including explicit carry authority. */
export class KernelPublicationDecisionCandidate {
  readonly #retainedOutputsByKey: ReadonlyMap<string, KernelPublicationCarryOutput>;

  constructor(
    authority: object,
    readonly plan: KernelPublicationPlan,
    retainedOutputs: readonly KernelPublicationCarryOutput[],
  ) {
    if (authority !== kernelPublicationDecisionCandidateAuthority) {
      throw new Error('Kernel publication decision candidates can only be minted by staged publication.');
    }
    this.#retainedOutputsByKey = retainedPublicationOutputsByKey(retainedOutputs);
    kernelPublicationDecisionCandidates.add(this);
    Object.freeze(this);
  }

  explicitlyRetains(
    surface: KernelPublicationSurface,
    handle: string,
    detailKind: string,
  ): boolean {
    return this.#retainedOutputsByKey.get(stagedRevisionKey(surface, handle))?.detailKind === detailKind;
  }

  withMinimumLifetimeOrdinal(minimumLifetimeOrdinal: number | null): KernelPublicationDecisionCandidate {
    const plan = this.plan.withMinimumLifetimeOrdinal(minimumLifetimeOrdinal);
    return plan === this.plan
      ? this
      : mintKernelPublicationDecisionCandidate(plan, [...this.#retainedOutputsByKey.values()]);
  }
}

/** Assert that final replacement received authority minted by sealing staged publication. */
export function assertKernelPublicationDecisionCandidate(
  candidate: KernelPublicationDecisionCandidate,
): void {
  if (!kernelPublicationDecisionCandidates.has(candidate)) {
    throw new Error('Kernel publication decision candidate authority was not minted by sealed staged publication.');
  }
}

function mintKernelPublicationDecisionCandidate(
  plan: KernelPublicationPlan,
  retainedOutputs: readonly KernelPublicationCarryOutput[],
): KernelPublicationDecisionCandidate {
  return new KernelPublicationDecisionCandidate(
    kernelPublicationDecisionCandidateAuthority,
    plan,
    retainedOutputs,
  );
}

/** Carry-aware comparison candidate that can be spent only by the non-mutating preview boundary. */
export class KernelPublicationDecisionPreviewCandidate {
  readonly #retainedOutputsByKey: ReadonlyMap<string, KernelPublicationCarryOutput>;

  constructor(
    authority: object,
    readonly plan: KernelPublicationPlan,
    retainedOutputs: readonly KernelPublicationCarryOutput[],
  ) {
    if (authority !== kernelPublicationDecisionPreviewCandidateAuthority) {
      throw new Error('Kernel publication decision preview candidates can only be minted by staged publication.');
    }
    this.#retainedOutputsByKey = retainedPublicationOutputsByKey(retainedOutputs);
    kernelPublicationDecisionPreviewCandidates.add(this);
    Object.freeze(this);
  }

  explicitlyRetains(
    surface: KernelPublicationSurface,
    handle: string,
    detailKind: string,
  ): boolean {
    return this.#retainedOutputsByKey.get(stagedRevisionKey(surface, handle))?.detailKind === detailKind;
  }
}

/** Assert that decision preview received authority minted for preview rather than final replacement. */
export function assertKernelPublicationDecisionPreviewCandidate(
  candidate: KernelPublicationDecisionPreviewCandidate,
): void {
  if (!kernelPublicationDecisionPreviewCandidates.has(candidate)) {
    throw new Error('Kernel publication decision preview authority was not minted by staged publication.');
  }
}

function mintKernelPublicationDecisionPreviewCandidate(
  plan: KernelPublicationPlan,
  retainedOutputs: readonly KernelPublicationCarryOutput[],
): KernelPublicationDecisionPreviewCandidate {
  return new KernelPublicationDecisionPreviewCandidate(
    kernelPublicationDecisionPreviewCandidateAuthority,
    plan,
    retainedOutputs,
  );
}

/** Immutable run-local publication snapshot used by validation and child-manifest admission. */
export class SealedKernelPublicationCandidate {
  private readonly revisionsByKey: ReadonlyMap<string, KernelStagedEntryRevision>;

  constructor(
    readonly publication: KernelPublicationDecisionCandidate,
    revisions: readonly KernelStagedEntryRevision[],
    readonly productDetailAdmissionAttempts: readonly KernelProductDetailAdmissionAttempt[],
    readonly hotDetailAdmissionAttempts: readonly KernelHotDetailAdmissionAttempt[],
  ) {
    this.revisionsByKey = new Map(revisions.map((revision) => [
      stagedRevisionKey(revision.surface, revision.handle),
      revision,
    ]));
  }

  get plan(): KernelPublicationPlan {
    return this.publication.plan;
  }

  readStagedRevision(
    surface: KernelPublicationSurface,
    handle: string,
  ): KernelStagedEntryRevision | null {
    return this.revisionsByKey.get(stagedRevisionKey(surface, handle)) ?? null;
  }
}

function maxLifetimeOrdinal(left: number | null, right: number | null): number | null {
  return left == null ? right : right == null ? left : Math.max(left, right);
}

/** Required read/write boundary used by materializers in immediate or staged mode. */
export interface KernelPublicationContext
  extends KernelRecordCollectionReadView, KernelSourceFileReadView, KernelMaterializationReadView,
    ProductDetailReadView, HotDetailReadView,
    KernelTelemetryReadView,
    GenerationAuthority {
  publish(plan: KernelPublicationPlan): void;
}

/** Store publication view revoked with the committed computation generation that exposed it. */
export class GenerationBoundKernelPublicationContext implements KernelPublicationContext {
  constructor(
    private readonly delegate: KernelPublicationContext,
    private readonly authority: GenerationAuthority,
  ) {}

  get handles(): KernelHandleFactory {
    this.requireCurrent();
    return this.delegate.handles;
  }

  isCurrent(): boolean {
    return this.authority.isCurrent() && this.delegate.isCurrent();
  }

  requireCurrent(): void {
    this.authority.requireCurrent();
    this.delegate.requireCurrent();
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    this.requireCurrent();
    return this.delegate.read(handle);
  }

  readAllRecords(): readonly KernelStoreRecord[] {
    this.requireCurrent();
    return this.delegate.readAllRecords();
  }

  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[] {
    this.requireCurrent();
    return this.delegate.readSourceFileAddressesByFileName(fileName);
  }

  readMaterializations(): readonly MaterializationRecord[] {
    this.requireCurrent();
    return this.delegate.readMaterializations();
  }

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    this.requireCurrent();
    return this.delegate.readMaterializationsByOwner(ownerHandle);
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    this.requireCurrent();
    return this.delegate.readProductDetail(slot, productHandle);
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null {
    this.requireCurrent();
    return this.delegate.readHotDetail(slot, handle);
  }

  markObservation(): KernelStoreObservationMarker {
    this.requireCurrent();
    return this.delegate.markObservation();
  }

  readKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot {
    this.requireCurrent();
    return this.delegate.readKernelCountSnapshot();
  }

  readDensitySince(marker: KernelStoreObservationMarker): KernelStoreDensityDelta {
    this.requireCurrent();
    return this.delegate.readDensitySince(marker);
  }

  readDetailDensitySince(marker: KernelStoreObservationMarker): KernelStoreDetailDensityDelta {
    this.requireCurrent();
    return this.delegate.readDetailDensitySince(marker);
  }

  publish(plan: KernelPublicationPlan): void {
    this.requireCurrent();
    this.delegate.publish(plan);
  }
}

/** Run-local collector that keeps every materializer write invisible until lifecycle commit. */
export class StagedKernelPublicationContext implements KernelPublicationContext, KernelReadProjectionRevisionView {
  private records = new Map<KernelRecordHandle, KernelStoreRecord>();
  private productDetails = new Map<ProductHandle, KernelProductDetailPublication<unknown>>();
  private hotDetails = new Map<HotDetailHandle, KernelHotDetailPublication<unknown>>();
  private recordWriters = new Map<KernelRecordHandle, KernelPublicationWriterId>();
  private productDetailWriters = new Map<ProductHandle, KernelPublicationWriterId>();
  private hotDetailWriters = new Map<HotDetailHandle, KernelPublicationWriterId>();
  private productDetailAdmissionSnapshots = new Map<ProductHandle, KernelProductDetailAdmissionSnapshot>();
  private hotDetailAdmissionSnapshots = new Map<HotDetailHandle, KernelHotDetailAdmissionSnapshot>();
  private productDetailAdmissionWriters = new Map<ProductHandle, Set<KernelPublicationWriterId>>();
  private hotDetailAdmissionWriters = new Map<HotDetailHandle, Set<KernelPublicationWriterId>>();
  private recordMutationOrdinals = new Map<KernelRecordHandle, number>();
  private productDetailMutationOrdinals = new Map<ProductHandle, number>();
  private hotDetailMutationOrdinals = new Map<HotDetailHandle, number>();
  private readonly carriedOutputsByKey = new Map<string, KernelPublicationCarryOutput>();
  private readonly observedMaterializationOwners = new Set<MaterializationOwnerHandle>();
  private readonly previousRecordHandles: ReadonlySet<KernelRecordHandle>;
  private readonly previousProductDetailHandles: ReadonlySet<ProductHandle>;
  private readonly previousHotDetailHandles: ReadonlySet<HotDetailHandle>;
  private readonly baseKernelCounts: SemanticRuntimeKernelCountSnapshot;
  private nextMutationOrdinal = 0;
  private failedPublication: Error | null = null;
  private sealed = false;
  private candidateBindingsPreparedForCommit = false;
  private candidateBindingsFinished = false;
  private readonly stagedProductDetailBindings = new Map<
    KernelProductDetailPublication<unknown>,
    PreparedProductDetailEntry<unknown>
  >();
  private readonly stagedHotDetailBindings = new Map<
    KernelHotDetailPublication<unknown>,
    PreparedHotDetailEntry<unknown>
  >();

  constructor(
    private readonly store: KernelStore,
    previous: KernelPublicationManifest,
    private readonly defaultWriterId: KernelPublicationWriterId,
  ) {
    this.previousRecordHandles = new Set(previous.recordHandles);
    this.previousProductDetailHandles = new Set(previous.productDetailHandles);
    this.previousHotDetailHandles = new Set(previous.hotDetailHandles);
    this.baseKernelCounts = kernelCountsWithoutPreviousPublication(store, previous);
  }

  get handles(): KernelHandleFactory {
    this.requireCurrent();
    return this.store.handles;
  }

  readProjectionRevision(): KernelReadProjectionRevision {
    return new KernelReadProjectionRevision(
      this.store.readProjectionRevision().committedMutationOrdinal,
      this.nextMutationOrdinal,
    );
  }

  isCurrent(): boolean {
    return this.failedPublication == null;
  }

  requireCurrent(): void {
    this.assertHealthy();
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    return this.readRecordWithRevision(handle).value;
  }

  /** Read one staged-or-committed record without mistaking this computation's own output for an input. */
  readRecordWithRevision(handle: KernelRecordHandle): StagedKernelRead<KernelStoreRecord> {
    this.requireCurrent();
    const staged = this.records.get(handle) ?? null;
    if (staged != null) {
      return new StagedKernelRead(staged, null, this.recordStagedRevision(staged));
    }
    if (this.previousRecordHandles.has(handle)) {
      return new StagedKernelRead<KernelStoreRecord>(
        null,
        null,
        KernelStagedEntryRevision.absent(KernelPublicationSurface.Record, handle),
      );
    }
    const committed = this.store.read(handle);
    return new StagedKernelRead(
      committed,
      new KernelCommittedEntryRevision(
        committed?.kind ?? null,
        this.store.readRecordRevision(handle),
        this.store.readRecordLifetimeOrdinal(handle),
      ),
      null,
    );
  }

  readAllRecords(): readonly KernelStoreRecord[] {
    this.requireCurrent();
    return [
      ...this.store.readAllRecords().filter((record) => !this.previousRecordHandles.has(record.handle)),
      ...this.records.values(),
    ];
  }

  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[] {
    this.requireCurrent();
    const addresses = new Map(
      this.store.readSourceFileAddressesByFileName(fileName)
        .filter((address) => !this.previousRecordHandles.has(address.handle))
        .map((address) => [address.handle, address]),
    );
    for (const record of this.records.values()) {
      if (record instanceof SourceFileAddress && sourceFilePathMatches(record, fileName)) {
        addresses.set(record.handle, record);
      }
    }
    return [...addresses.values()];
  }

  readMaterializations(): readonly MaterializationRecord[] {
    this.requireCurrent();
    const materializations = new Map(
      this.store.readMaterializations()
        .filter((record) => !this.previousRecordHandles.has(record.handle))
        .map((record) => [record.handle, record]),
    );
    for (const record of this.records.values()) {
      if (record.kind === 'materialization-record') {
        materializations.set(record.handle, record);
      }
    }
    return [...materializations.values()];
  }

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    return this.readMaterializationOwnerCandidate(ownerHandle).records;
  }

  /** Read one exact owner set while retaining which rows are foreign inputs and which are candidate outputs. */
  readMaterializationOwnerCandidate(ownerHandle: MaterializationOwnerHandle): StagedKernelMaterializationOwnerRead {
    this.observeMaterializationOwner(ownerHandle);
    return this.previewMaterializationOwnerCandidate(ownerHandle);
  }

  /** Inspect one exact owner set without freezing candidate absence during speculative carry preflight. */
  previewMaterializationOwnerCandidate(ownerHandle: MaterializationOwnerHandle): StagedKernelMaterializationOwnerRead {
    this.requireCurrent();
    const committed = new Map(
      this.store.readMaterializationsByOwner(ownerHandle)
        .filter((record) => !this.previousRecordHandles.has(record.handle))
        .map((record) => [record.handle, record]),
    );
    const previous = this.store.readMaterializationsByOwner(ownerHandle)
      .filter((record) => this.previousRecordHandles.has(record.handle));
    const staged = [...this.records.values()]
      .filter((record): record is MaterializationRecord =>
        record.kind === 'materialization-record' && record.ownerHandle === ownerHandle
      )
      .sort((left, right) => left.handle.localeCompare(right.handle));
    for (const record of staged) {
      committed.delete(record.handle);
    }
    const committedRecords = [...committed.values()].sort((left, right) => left.handle.localeCompare(right.handle));
    const records = [...committedRecords, ...staged].sort((left, right) => left.handle.localeCompare(right.handle));
    return new StagedKernelMaterializationOwnerRead(
      records,
      committedRecords,
      staged,
      [...new Set([...previous, ...staged].map((record) => record.handle))].sort(),
    );
  }

  /** Read one owner set as it would appear after a proposed child carry, without staging that carry. */
  previewMaterializationsByOwnerAfterCarry(
    ownerHandle: MaterializationOwnerHandle,
    outputs: readonly KernelPublicationCarryOutput[],
  ): readonly MaterializationRecord[] {
    const records = new Map(
      this.previewMaterializationOwnerCandidate(ownerHandle).records
        .map((record) => [record.handle, record]),
    );
    for (const output of outputs) {
      if (output.surface !== KernelPublicationSurface.Record) continue;
      const record = this.previousRecordForCarry(output);
      if (record.kind === 'materialization-record' && record.ownerHandle === ownerHandle) {
        records.set(record.handle, record);
      }
    }
    return [...records.values()].sort((left, right) => left.handle.localeCompare(right.handle));
  }

  /** Read one typed detail as it would appear after a proposed child carry, without staging that carry. */
  previewProductDetailAfterCarry<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
    outputs: readonly KernelPublicationCarryOutput[],
  ): TDetail | null {
    const staged = this.productDetails.get(productHandle) ?? null;
    if (staged != null) {
      return this.readProductDetail(slot, productHandle);
    }
    const carried = outputs.find((output) =>
      output.surface === KernelPublicationSurface.ProductDetail
      && output.handle === productHandle
    );
    if (carried == null) {
      return this.readProductDetail(slot, productHandle);
    }
    const entry = this.previousProductDetailForCarry(carried);
    return entry.slot === slot ? entry.detail as TDetail : null;
  }

  /** Freeze one owner set after a speculative reader has committed to its observed membership. */
  observeMaterializationOwner(ownerHandle: MaterializationOwnerHandle): void {
    this.requireCurrent();
    if (!this.sealed) {
      this.observedMaterializationOwners.add(ownerHandle);
    }
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    return this.readProductDetailWithRevision(slot, productHandle).value;
  }

  /** Read one typed detail while preserving whether a foreign committed entry supplied the answer. */
  readProductDetailWithRevision<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
  ): StagedKernelRead<TDetail> {
    this.requireCurrent();
    const staged = this.productDetails.get(productHandle) ?? null;
    const admission = this.productDetailAdmissionSnapshots.get(productHandle) ?? null;
    const existingEntry = admission == null
      ? this.previousProductDetailHandles.has(productHandle)
        ? null
        : this.store.productDetails.readEntry(productHandle)
      : admission.expectedEntry;
    const existing = existingEntry?.slot === slot
      ? existingEntry.detail as TDetail
      : null;
    if (staged == null) {
      const hidesPrevious = this.previousProductDetailHandles.has(productHandle);
      const committedRevision = hidesPrevious
        ? null
        : admission?.committedRevision ?? new KernelCommittedEntryRevision(
            existingEntry?.slot.detailKind ?? null,
            this.store.productDetails.readMutationOrdinal(productHandle),
            this.store.productDetails.readLifetimeOrdinal(productHandle),
          );
      return new StagedKernelRead(
        existing,
        committedRevision,
        hidesPrevious
          ? KernelStagedEntryRevision.absent(KernelPublicationSurface.ProductDetail, productHandle)
          : null,
      );
    }
    if (staged.admission === KernelDetailAdmission.IfAbsent && existingEntry != null) {
      return new StagedKernelRead(
        existing,
        admission?.committedRevision ?? new KernelCommittedEntryRevision(
          existingEntry.slot.detailKind,
          this.store.productDetails.readMutationOrdinal(productHandle),
          this.store.productDetails.readLifetimeOrdinal(productHandle),
        ),
        null,
      );
    }
    return staged.slot !== slot
      ? new StagedKernelRead<TDetail>(null, null, this.productDetailStagedRevision(staged))
      : new StagedKernelRead(
          this.bindStagedProductDetail(staged) as TDetail,
          null,
          this.productDetailStagedRevision(staged),
        );
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null {
    return this.readHotDetailWithRevision(slot, handle).value;
  }

  /** Read one typed hot detail while preserving whether a foreign committed entry supplied the answer. */
  readHotDetailWithRevision<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: HotDetailHandle,
  ): StagedKernelRead<TDetail> {
    this.requireCurrent();
    const staged = this.hotDetails.get(handle) ?? null;
    const admission = this.hotDetailAdmissionSnapshots.get(handle) ?? null;
    const existingEntry = admission == null
      ? this.previousHotDetailHandles.has(handle)
        ? null
        : this.store.hotDetails.readEntry(handle)
      : admission.expectedEntry;
    const existing = existingEntry?.slot === slot
      ? existingEntry.detail as TDetail
      : null;
    if (staged == null) {
      const hidesPrevious = this.previousHotDetailHandles.has(handle);
      const committedRevision = hidesPrevious
        ? null
        : admission?.committedRevision ?? new KernelCommittedEntryRevision(
            existingEntry?.slot.detailKind ?? null,
            this.store.hotDetails.readMutationOrdinal(handle),
            this.store.hotDetails.readLifetimeOrdinal(handle),
          );
      return new StagedKernelRead(
        existing,
        committedRevision,
        hidesPrevious
          ? KernelStagedEntryRevision.absent(KernelPublicationSurface.HotDetail, handle)
          : null,
      );
    }
    if (staged.admission === KernelDetailAdmission.IfAbsent && existingEntry != null) {
      return new StagedKernelRead(
        existing,
        admission?.committedRevision ?? new KernelCommittedEntryRevision(
          existingEntry.slot.detailKind,
          this.store.hotDetails.readMutationOrdinal(handle),
          this.store.hotDetails.readLifetimeOrdinal(handle),
        ),
        null,
      );
    }
    return staged.slot !== slot
      ? new StagedKernelRead<TDetail>(null, null, this.hotDetailStagedRevision(staged))
      : new StagedKernelRead(
          this.bindStagedHotDetail(staged) as TDetail,
          null,
          this.hotDetailStagedRevision(staged),
        );
  }

  markObservation(): KernelStoreObservationMarker {
    this.requireCurrent();
    return { nextMutationOrdinal: this.nextMutationOrdinal };
  }

  readKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot {
    this.requireCurrent();
    const counts = mutableKernelCounts(this.baseKernelCounts);
    for (const record of this.records.values()) {
      if (this.stagedRecordContributes(record.handle)) {
        applyKernelRecordCount(counts, record, 1);
      }
    }
    counts.productDetails += [...this.productDetails.values()]
      .filter((publication) => this.stagedProductDetailContributes(publication))
      .length;
    counts.hotDetails += [...this.hotDetails.values()]
      .filter((publication) => this.stagedHotDetailContributes(publication))
      .length;
    return counts;
  }

  readDensitySince(marker: KernelStoreObservationMarker): KernelStoreDensityDelta {
    this.requireCurrent();
    const records = [...this.records.values()].filter((record) =>
      (this.recordMutationOrdinals.get(record.handle) ?? -1) >= marker.nextMutationOrdinal
      && this.stagedRecordContributes(record.handle)
    );
    const productDetails = [...this.productDetails.values()].filter((publication) =>
      (this.productDetailMutationOrdinals.get(publication.productHandle) ?? -1) >= marker.nextMutationOrdinal
      && this.stagedProductDetailContributes(publication)
    );
    const hotDetails = [...this.hotDetails.values()].filter((publication) =>
      (this.hotDetailMutationOrdinals.get(publication.handle) ?? -1) >= marker.nextMutationOrdinal
      && this.stagedHotDetailContributes(publication)
    );
    return {
      recordKinds: countSemanticRuntimeRowsBy(records, (record) => record.kind),
      sourceSpanRoles: countSemanticRuntimeRowsBy(
        records,
        (record) => record.kind === 'source-span-address' ? record.role : null,
      ),
      productKinds: countSemanticRuntimeRowsBy(
        records,
        (record) => record.kind === 'materialized-product' ? record.productKindKey : null,
      ),
      productDetailKinds: countSemanticRuntimeRowsBy(productDetails, (publication) => publication.slot.detailKind),
      hotDetailKinds: countSemanticRuntimeRowsBy(hotDetails, (publication) => publication.slot.detailKind),
    };
  }

  readDetailDensitySince(marker: KernelStoreObservationMarker): KernelStoreDetailDensityDelta {
    this.requireCurrent();
    const productDetails = [...this.productDetails.values()].filter((publication) =>
      (this.productDetailMutationOrdinals.get(publication.productHandle) ?? -1) >= marker.nextMutationOrdinal
      && this.stagedProductDetailContributes(publication)
    );
    const hotDetails = [...this.hotDetails.values()].filter((publication) =>
      (this.hotDetailMutationOrdinals.get(publication.handle) ?? -1) >= marker.nextMutationOrdinal
      && this.stagedHotDetailContributes(publication)
    );
    return {
      productDetailDensity: readSemanticRuntimeDetailDensityRows(productDetails.map((publication) => {
        const product = this.read(publication.productHandle);
        return {
          detailKind: publication.slot.detailKind,
          detail: publication.detail,
          envelopeHandles: product?.kind === 'materialized-product'
            ? [
              product.handle,
              product.identityHandle,
              product.addressHandle,
              product.provenanceHandle,
            ].filter((handle) => handle != null).map((handle) => String(handle))
            : [publication.productHandle],
        };
      })),
      hotDetailDensity: readSemanticRuntimeDetailDensityRows(hotDetails.map((publication) => ({
        detailKind: publication.slot.detailKind,
        detail: publication.detail,
        envelopeHandles: [publication.ownerProductHandle, publication.handle],
      }))),
    };
  }

  publish(plan: KernelPublicationPlan): void {
    this.publishFrom(this.defaultWriterId, plan);
  }

  /** Stage one complete materializer emission under the child writer that actually produced it. */
  publishFrom(
    writerId: KernelPublicationWriterId,
    plan: KernelPublicationPlan,
  ): readonly KernelStagedEntryRevision[] {
    this.assertPreparing();
    try {
      if (plan.productDetailAdmissionSnapshots.length > 0 || plan.hotDetailAdmissionSnapshots.length > 0) {
        throw new Error('A staged publication cannot import admission snapshots from another transaction.');
      }
      const records = new Map(this.records);
      const productDetails = new Map(this.productDetails);
      const hotDetails = new Map(this.hotDetails);
      const recordWriters = new Map(this.recordWriters);
      const productDetailWriters = new Map(this.productDetailWriters);
      const hotDetailWriters = new Map(this.hotDetailWriters);
      const productDetailAdmissionSnapshots = new Map(this.productDetailAdmissionSnapshots);
      const hotDetailAdmissionSnapshots = new Map(this.hotDetailAdmissionSnapshots);
      const productDetailAdmissionWriters = cloneWriterSets(this.productDetailAdmissionWriters);
      const hotDetailAdmissionWriters = cloneWriterSets(this.hotDetailAdmissionWriters);
      const recordMutationOrdinals = new Map(this.recordMutationOrdinals);
      const productDetailMutationOrdinals = new Map(this.productDetailMutationOrdinals);
      const hotDetailMutationOrdinals = new Map(this.hotDetailMutationOrdinals);
      let nextMutationOrdinal = this.nextMutationOrdinal;
      const stagedReads: KernelStagedEntryRevision[] = [];

      for (const record of plan.batch.records) {
        const handle = record.handle;
        if (
          record.kind === 'materialization-record'
          && this.observedMaterializationOwners.has(record.ownerHandle)
        ) {
          throw new Error(
            `Staged publication cannot add materialization ${handle} after owner ${record.ownerHandle} was observed.`,
          );
        }
        if (records.has(handle)) {
          throw new Error(`Staged publication emitted duplicate kernel record ${handle}.`);
        }
        records.set(handle, record);
        recordWriters.set(handle, writerId);
        recordMutationOrdinals.set(handle, nextMutationOrdinal++);
      }
      for (const publication of plan.productDetails) {
        const outcome = this.stageProductDetail(
          writerId,
          publication,
          productDetails,
          productDetailAdmissionSnapshots,
          productDetailAdmissionWriters,
        );
        if (outcome === StagedDetailOutcome.Added) {
          productDetailWriters.set(publication.productHandle, writerId);
          productDetailMutationOrdinals.set(publication.productHandle, nextMutationOrdinal++);
          if (
            publication.admission === KernelDetailAdmission.IfAbsent
            && productDetailAdmissionSnapshots.get(publication.productHandle)?.expectedEntry == null
          ) {
            stagedReads.push(KernelStagedEntryRevision.present(
              writerId,
              KernelPublicationSurface.ProductDetail,
              publication.productHandle,
              publication.slot.detailKind,
              requiredStagedMutationOrdinal(
                productDetailMutationOrdinals,
                publication.productHandle,
                KernelPublicationSurface.ProductDetail,
              ),
            ));
          }
        } else if (outcome === StagedDetailOutcome.ReusedStaged) {
          stagedReads.push(KernelStagedEntryRevision.present(
            requiredStagedWriter(
              productDetailWriters,
              publication.productHandle,
              KernelPublicationSurface.ProductDetail,
            ),
            KernelPublicationSurface.ProductDetail,
            publication.productHandle,
            publication.slot.detailKind,
            requiredStagedMutationOrdinal(
              productDetailMutationOrdinals,
              publication.productHandle,
              KernelPublicationSurface.ProductDetail,
            ),
          ));
        }
      }
      for (const publication of plan.hotDetails) {
        const outcome = this.stageHotDetail(
          writerId,
          publication,
          hotDetails,
          hotDetailAdmissionSnapshots,
          hotDetailAdmissionWriters,
        );
        if (outcome === StagedDetailOutcome.Added) {
          hotDetailWriters.set(publication.handle, writerId);
          hotDetailMutationOrdinals.set(publication.handle, nextMutationOrdinal++);
          if (
            publication.admission === KernelDetailAdmission.IfAbsent
            && hotDetailAdmissionSnapshots.get(publication.handle)?.expectedEntry == null
          ) {
            stagedReads.push(KernelStagedEntryRevision.present(
              writerId,
              KernelPublicationSurface.HotDetail,
              publication.handle,
              publication.slot.detailKind,
              requiredStagedMutationOrdinal(
                hotDetailMutationOrdinals,
                publication.handle,
                KernelPublicationSurface.HotDetail,
              ),
            ));
          }
        } else if (outcome === StagedDetailOutcome.ReusedStaged) {
          stagedReads.push(KernelStagedEntryRevision.present(
            requiredStagedWriter(hotDetailWriters, publication.handle, KernelPublicationSurface.HotDetail),
            KernelPublicationSurface.HotDetail,
            publication.handle,
            publication.slot.detailKind,
            requiredStagedMutationOrdinal(
              hotDetailMutationOrdinals,
              publication.handle,
              KernelPublicationSurface.HotDetail,
            ),
          ));
        }
      }

      this.records = records;
      this.productDetails = productDetails;
      this.hotDetails = hotDetails;
      this.recordWriters = recordWriters;
      this.productDetailWriters = productDetailWriters;
      this.hotDetailWriters = hotDetailWriters;
      this.productDetailAdmissionSnapshots = productDetailAdmissionSnapshots;
      this.hotDetailAdmissionSnapshots = hotDetailAdmissionSnapshots;
      this.productDetailAdmissionWriters = productDetailAdmissionWriters;
      this.hotDetailAdmissionWriters = hotDetailAdmissionWriters;
      this.recordMutationOrdinals = recordMutationOrdinals;
      this.productDetailMutationOrdinals = productDetailMutationOrdinals;
      this.hotDetailMutationOrdinals = hotDetailMutationOrdinals;
      this.nextMutationOrdinal = nextMutationOrdinal;
      return stagedReads;
    } catch (error) {
      this.failedPublication = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  /** Stage one prior child's exact owned entries under its stable writer identity. */
  carryFrom(
    writerId: KernelPublicationWriterId,
    outputs: readonly KernelPublicationCarryOutput[],
  ): readonly KernelStagedEntryRevision[] {
    this.assertPreparing();
    const carriedOutputsByKey = new Map(this.carriedOutputsByKey);
    const records: KernelStoreRecord[] = [];
    const productDetails: KernelProductDetailPublication<unknown>[] = [];
    const hotDetails: KernelHotDetailPublication<unknown>[] = [];

    for (const output of outputs) {
      const key = stagedRevisionKey(output.surface, output.handle);
      const existing = carriedOutputsByKey.get(key) ?? null;
      if (existing != null && existing.detailKind !== output.detailKind) {
        throw new Error(`Cannot carry ${key}; it has conflicting kinds ${existing.detailKind} and ${output.detailKind}.`);
      }
      carriedOutputsByKey.set(key, output);
      switch (output.surface) {
        case KernelPublicationSurface.Record: {
          records.push(this.previousRecordForCarry(output));
          break;
        }
        case KernelPublicationSurface.ProductDetail: {
          const handle = output.handle as ProductHandle;
          const entry = this.previousProductDetailForCarry(output);
          productDetails.push(new KernelProductDetailPublication(entry.slot, handle, entry.detail));
          break;
        }
        case KernelPublicationSurface.HotDetail: {
          const handle = output.handle as HotDetailHandle;
          if (!this.previousHotDetailHandles.has(handle)) {
            throw new Error(`Cannot carry hot detail ${handle}; it is not owned by the prior publication.`);
          }
          const entry = this.store.hotDetails.readEntry(handle);
          if (entry == null || entry.slot.detailKind !== output.detailKind) {
            throw new Error(`Cannot carry hot detail ${handle}; its committed slot no longer matches ${output.detailKind}.`);
          }
          hotDetails.push(new KernelHotDetailPublication(
            entry.slot,
            entry.ownerProductHandle,
            handle,
            entry.detail,
          ));
          break;
        }
      }
    }

    const reads = this.publishFrom(
      writerId,
      new KernelPublicationPlan(
        new KernelStoreBatch(records, `carry:${writerId}`),
        productDetails,
        hotDetails,
      ),
    );
    for (const [key, output] of carriedOutputsByKey) {
      this.carriedOutputsByKey.set(key, output);
    }
    return reads;
  }

  private previousRecordForCarry(output: KernelPublicationCarryOutput): KernelStoreRecord {
    const handle = output.handle as KernelRecordHandle;
    if (!this.previousRecordHandles.has(handle)) {
      throw new Error(`Cannot carry record ${handle}; it is not owned by the prior publication.`);
    }
    const record = this.store.read(handle);
    if (record == null || record.kind !== output.detailKind) {
      throw new Error(`Cannot carry record ${handle}; its committed kind no longer matches ${output.detailKind}.`);
    }
    return record;
  }

  private previousProductDetailForCarry(output: KernelPublicationCarryOutput): ProductDetailEntry<unknown> {
    const handle = output.handle as ProductHandle;
    if (!this.previousProductDetailHandles.has(handle)) {
      throw new Error(`Cannot carry product detail ${handle}; it is not owned by the prior publication.`);
    }
    const entry = this.store.productDetails.readEntry(handle);
    if (entry == null || entry.slot.detailKind !== output.detailKind) {
      throw new Error(
        `Cannot carry product detail ${handle}; its committed slot no longer matches ${output.detailKind}.`,
      );
    }
    return entry;
  }

  /** Freeze one coherent publication/revision view before any input validator can run. */
  seal(label: string): SealedKernelPublicationCandidate {
    this.assertPreparing();
    this.sealed = true;
    return new SealedKernelPublicationCandidate(
      mintKernelPublicationDecisionCandidate(
        this.toPlanUnchecked(label),
        [...this.carriedOutputsByKey.values()],
      ),
      [
        ...[...this.records.values()].map((record) => this.recordStagedRevision(record)),
        ...[...this.productDetails.values()].map((publication) => this.productDetailStagedRevision(publication)),
        ...[...this.hotDetails.values()].map((publication) => this.hotDetailStagedRevision(publication)),
      ],
      admissionAttempts(
        this.productDetailAdmissionSnapshots,
        this.productDetailAdmissionWriters,
        KernelProductDetailAdmissionAttempt,
      ),
      admissionAttempts(
        this.hotDetailAdmissionSnapshots,
        this.hotDetailAdmissionWriters,
        KernelHotDetailAdmissionAttempt,
      ),
    );
  }

  toPlan(label: string): KernelPublicationPlan {
    this.assertPreparing();
    return this.toPlanUnchecked(label);
  }

  /**
   * Complete the current partial candidate with exact prior entries for decision preview only.
   *
   * Scheduling happens before omission can honestly mean withdrawal. The final plan still treats
   * omission as removal; this preview merely lets staged producers spend the store's real comparators.
   */
  toDecisionPreviewCandidate(
    label: string,
    prospectiveCarryOutputs: readonly KernelPublicationCarryOutput[] = [],
  ): KernelPublicationDecisionPreviewCandidate {
    this.assertPreparing();
    const records = new Map(this.records);
    const productDetails = new Map(this.productDetails);
    const hotDetails = new Map(this.hotDetails);

    for (const handle of this.previousRecordHandles) {
      if (records.has(handle)) continue;
      const record = this.store.read(handle);
      if (record == null) {
        throw new Error(`Cannot preview publication ${label}; prior record ${handle} is no longer committed.`);
      }
      records.set(handle, record);
    }
    for (const handle of this.previousProductDetailHandles) {
      if (productDetails.has(handle)) continue;
      const entry = this.store.productDetails.readEntry(handle);
      if (entry == null) {
        throw new Error(`Cannot preview publication ${label}; prior product detail ${handle} is no longer committed.`);
      }
      productDetails.set(handle, new KernelProductDetailPublication(entry.slot, handle, entry.detail));
    }
    for (const handle of this.previousHotDetailHandles) {
      if (hotDetails.has(handle)) continue;
      const entry = this.store.hotDetails.readEntry(handle);
      if (entry == null) {
        throw new Error(`Cannot preview publication ${label}; prior hot detail ${handle} is no longer committed.`);
      }
      hotDetails.set(handle, new KernelHotDetailPublication(
        entry.slot,
        entry.ownerProductHandle,
        handle,
        entry.detail,
      ));
    }

    return mintKernelPublicationDecisionPreviewCandidate(
      new KernelPublicationPlan(
        new KernelStoreBatch([...records.values()], label),
        [...productDetails.values()],
        [...hotDetails.values()],
        [...this.productDetailAdmissionSnapshots.values()],
        [...this.hotDetailAdmissionSnapshots.values()],
        null,
      ),
      [...this.carriedOutputsByKey.values(), ...prospectiveCarryOutputs],
    );
  }

  /** Restore superseded candidate leases before any durable publication can be admitted. */
  prepareCandidateBindingsForCommit(): void {
    if (!this.sealed) {
      throw new Error('Staged candidate bindings cannot be prepared before publication is sealed.');
    }
    if (this.candidateBindingsPreparedForCommit || this.candidateBindingsFinished) {
      throw new Error('Staged candidate bindings have already been prepared for commit.');
    }
    this.candidateBindingsPreparedForCommit = true;
    const errors: unknown[] = [];
    for (const [publication, prepared] of [...this.stagedHotDetailBindings].reverse()) {
      if (this.hotDetails.get(publication.handle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
        this.stagedHotDetailBindings.delete(publication);
      } catch (error) {
        errors.push(error);
      }
    }
    for (const [publication, prepared] of [...this.stagedProductDetailBindings].reverse()) {
      if (this.productDetails.get(publication.productHandle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
        this.stagedProductDetailBindings.delete(publication);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Superseded candidate detail bindings could not be restored before commit.');
    }
  }

  /** Close every reversible binding lease created while sibling children inspected staged details. */
  finishCandidateBindings(committed: boolean): void {
    if (this.candidateBindingsFinished) {
      throw new Error('Staged candidate bindings have already been finalized.');
    }
    this.candidateBindingsFinished = true;
    const errors: unknown[] = [];
    for (const [publication, prepared] of [...this.stagedHotDetailBindings].reverse()) {
      if (committed && this.hotDetails.get(publication.handle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
      } catch (error) {
        errors.push(error);
      }
    }
    for (const [publication, prepared] of [...this.stagedProductDetailBindings].reverse()) {
      if (committed && this.productDetails.get(publication.productHandle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Staged candidate detail bindings could not be finalized.');
    }
  }

  private toPlanUnchecked(label: string): KernelPublicationPlan {
    return new KernelPublicationPlan(
      new KernelStoreBatch(
        [...this.records.values()],
        label,
      ),
      [...this.productDetails.values()],
      [...this.hotDetails.values()],
      [...this.productDetailAdmissionSnapshots.values()],
      [...this.hotDetailAdmissionSnapshots.values()],
      null,
    );
  }

  /** Foreign catalog decisions made while staging; positive rows become persistent computation reads. */
  readProductDetailAdmissionSnapshots(): readonly KernelProductDetailAdmissionSnapshot[] {
    return [...this.productDetailAdmissionSnapshots.values()];
  }

  /** Foreign hot-catalog decisions made while staging; positive rows become persistent computation reads. */
  readHotDetailAdmissionSnapshots(): readonly KernelHotDetailAdmissionSnapshot[] {
    return [...this.hotDetailAdmissionSnapshots.values()];
  }

  /** Current exact candidate revision for validating one child-to-child staged read. */
  readStagedRevision(
    surface: KernelPublicationSurface,
    handle: string,
  ): KernelStagedEntryRevision | null {
    switch (surface) {
      case KernelPublicationSurface.Record: {
        const record = this.records.get(handle as KernelRecordHandle) ?? null;
        return record == null ? null : this.recordStagedRevision(record);
      }
      case KernelPublicationSurface.ProductDetail: {
        const publication = this.productDetails.get(handle as ProductHandle) ?? null;
        return publication == null ? null : this.productDetailStagedRevision(publication);
      }
      case KernelPublicationSurface.HotDetail: {
        const publication = this.hotDetails.get(handle as HotDetailHandle) ?? null;
        return publication == null ? null : this.hotDetailStagedRevision(publication);
      }
    }
  }

  /** Whether one child has already staged output or an admission decision in this candidate. */
  hasStagedActivityFrom(writerId: KernelPublicationWriterId): boolean {
    return [...this.recordWriters.values()].includes(writerId)
      || [...this.productDetailWriters.values()].includes(writerId)
      || [...this.hotDetailWriters.values()].includes(writerId)
      || [...this.productDetailAdmissionWriters.values()].some((writers) => writers.has(writerId))
      || [...this.hotDetailAdmissionWriters.values()].some((writers) => writers.has(writerId));
  }

  /** Candidate-normalized absence across staged output, hidden prior ownership, and foreign committed occupancy. */
  isCandidateEntryAbsent(surface: KernelPublicationSurface, handle: string): boolean {
    if (this.readStagedRevision(surface, handle) != null) {
      return false;
    }
    switch (surface) {
      case KernelPublicationSurface.Record:
        return this.previousRecordHandles.has(handle as KernelRecordHandle)
          || this.store.read(handle as KernelRecordHandle) == null;
      case KernelPublicationSurface.ProductDetail:
        return this.previousProductDetailHandles.has(handle as ProductHandle)
          || this.store.productDetails.readEntry(handle as ProductHandle) == null;
      case KernelPublicationSurface.HotDetail:
        return this.previousHotDetailHandles.has(handle as HotDetailHandle)
          || this.store.hotDetails.readEntry(handle as HotDetailHandle) == null;
    }
  }

  private recordStagedRevision(record: KernelStoreRecord): KernelStagedEntryRevision {
    return KernelStagedEntryRevision.present(
      requiredStagedWriter(this.recordWriters, record.handle, KernelPublicationSurface.Record),
      KernelPublicationSurface.Record,
      record.handle,
      record.kind,
      requiredStagedMutationOrdinal(
        this.recordMutationOrdinals,
        record.handle,
        KernelPublicationSurface.Record,
      ),
    );
  }

  private productDetailStagedRevision(
    publication: KernelProductDetailPublication<unknown>,
  ): KernelStagedEntryRevision {
    return KernelStagedEntryRevision.present(
      requiredStagedWriter(
        this.productDetailWriters,
        publication.productHandle,
        KernelPublicationSurface.ProductDetail,
      ),
      KernelPublicationSurface.ProductDetail,
      publication.productHandle,
      publication.slot.detailKind,
      requiredStagedMutationOrdinal(
        this.productDetailMutationOrdinals,
        publication.productHandle,
        KernelPublicationSurface.ProductDetail,
      ),
    );
  }

  private hotDetailStagedRevision(
    publication: KernelHotDetailPublication<unknown>,
  ): KernelStagedEntryRevision {
    return KernelStagedEntryRevision.present(
      requiredStagedWriter(
        this.hotDetailWriters,
        publication.handle,
        KernelPublicationSurface.HotDetail,
      ),
      KernelPublicationSurface.HotDetail,
      publication.handle,
      publication.slot.detailKind,
      requiredStagedMutationOrdinal(
        this.hotDetailMutationOrdinals,
        publication.handle,
        KernelPublicationSurface.HotDetail,
      ),
    );
  }

  private stageProductDetail(
    writerId: KernelPublicationWriterId,
    publication: KernelProductDetailPublication<unknown>,
    productDetails: Map<ProductHandle, KernelProductDetailPublication<unknown>>,
    admissionSnapshots: Map<ProductHandle, KernelProductDetailAdmissionSnapshot>,
    admissionWriters: Map<ProductHandle, Set<KernelPublicationWriterId>>,
  ): StagedDetailOutcome {
    const existing = productDetails.get(publication.productHandle) ?? null;
    if (existing == null) {
      const admission = this.productDetailAdmissionSnapshot(publication, admissionSnapshots);
      if (publication.admission === KernelDetailAdmission.Required && admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.productHandle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      if (publication.admission === KernelDetailAdmission.IfAbsent && admission?.expectedEntry != null) {
        registerAdmissionWriter(admissionWriters, publication.productHandle, writerId);
      }
      productDetails.set(publication.productHandle, publication);
      return StagedDetailOutcome.Added;
    }
    if (existing.slot !== publication.slot) {
      throw new Error(
        `Staged publication emitted conflicting product details for ${publication.productHandle}: `
        + `distinct ${existing.slot.detailKind} and ${publication.slot.detailKind} slot contracts.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      const admission = admissionSnapshots.get(publication.productHandle) ?? null;
      if (admission?.expectedEntry != null) {
        registerAdmissionWriter(admissionWriters, publication.productHandle, writerId);
        return StagedDetailOutcome.ReusedCommitted;
      }
      return StagedDetailOutcome.ReusedStaged;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      const admission = admissionSnapshots.get(publication.productHandle) ?? null;
      if (admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.productHandle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      productDetails.set(publication.productHandle, publication);
      return StagedDetailOutcome.Added;
    }
    throw new Error(`Staged publication emitted duplicate product detail ${publication.productHandle}.`);
  }

  private stageHotDetail(
    writerId: KernelPublicationWriterId,
    publication: KernelHotDetailPublication<unknown>,
    hotDetails: Map<HotDetailHandle, KernelHotDetailPublication<unknown>>,
    admissionSnapshots: Map<HotDetailHandle, KernelHotDetailAdmissionSnapshot>,
    admissionWriters: Map<HotDetailHandle, Set<KernelPublicationWriterId>>,
  ): StagedDetailOutcome {
    const existing = hotDetails.get(publication.handle) ?? null;
    if (existing == null) {
      const admission = this.hotDetailAdmissionSnapshot(publication, admissionSnapshots);
      if (publication.admission === KernelDetailAdmission.Required && admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.handle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      if (publication.admission === KernelDetailAdmission.IfAbsent && admission?.expectedEntry != null) {
        registerAdmissionWriter(admissionWriters, publication.handle, writerId);
      }
      hotDetails.set(publication.handle, publication);
      return StagedDetailOutcome.Added;
    }
    if (existing.slot !== publication.slot) {
      throw new Error(
        `Staged publication emitted conflicting hot details for ${publication.handle}: `
        + `distinct ${existing.slot.detailKind} and ${publication.slot.detailKind} slot contracts.`,
      );
    }
    if (existing.ownerProductHandle !== publication.ownerProductHandle) {
      throw new Error(
        `Staged publication emitted conflicting owners for hot detail ${publication.handle}: `
        + `${existing.ownerProductHandle} and ${publication.ownerProductHandle}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      const admission = admissionSnapshots.get(publication.handle) ?? null;
      if (admission?.expectedEntry != null) {
        registerAdmissionWriter(admissionWriters, publication.handle, writerId);
        return StagedDetailOutcome.ReusedCommitted;
      }
      return StagedDetailOutcome.ReusedStaged;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      const admission = admissionSnapshots.get(publication.handle) ?? null;
      if (admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.handle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      hotDetails.set(publication.handle, publication);
      return StagedDetailOutcome.Added;
    }
    throw new Error(`Staged publication emitted duplicate hot detail ${publication.handle}.`);
  }

  private productDetailAdmissionSnapshot(
    publication: KernelProductDetailPublication<unknown>,
    snapshots: Map<ProductHandle, KernelProductDetailAdmissionSnapshot>,
  ): KernelProductDetailAdmissionSnapshot | null {
    if (this.previousProductDetailHandles.has(publication.productHandle)) {
      return null;
    }
    let snapshot = snapshots.get(publication.productHandle);
    if (snapshot == null) {
      const expectedEntry = this.store.productDetails.readEntry(publication.productHandle);
      if (expectedEntry != null && expectedEntry.slot !== publication.slot) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.productHandle} already has `
          + `a distinct ${expectedEntry.slot.detailKind} slot contract.`,
        );
      }
      snapshot = new KernelProductDetailAdmissionSnapshot(
        publication.productHandle,
        publication.slot.detailKind,
        expectedEntry,
        new KernelCommittedEntryRevision(
          expectedEntry?.slot.detailKind ?? null,
          this.store.productDetails.readMutationOrdinal(publication.productHandle),
          this.store.productDetails.readLifetimeOrdinal(publication.productHandle),
        ),
      );
      snapshots.set(publication.productHandle, snapshot);
    }
    return snapshot;
  }

  private hotDetailAdmissionSnapshot(
    publication: KernelHotDetailPublication<unknown>,
    snapshots: Map<HotDetailHandle, KernelHotDetailAdmissionSnapshot>,
  ): KernelHotDetailAdmissionSnapshot | null {
    if (this.previousHotDetailHandles.has(publication.handle)) {
      return null;
    }
    let snapshot = snapshots.get(publication.handle);
    if (snapshot == null) {
      const expectedEntry = this.store.hotDetails.readEntry(publication.handle);
      if (expectedEntry != null && expectedEntry.slot !== publication.slot) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.handle} already has `
          + `a distinct ${expectedEntry.slot.detailKind} slot contract.`,
        );
      }
      if (expectedEntry != null && expectedEntry.ownerProductHandle !== publication.ownerProductHandle) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.handle} is owned by `
          + `${expectedEntry.ownerProductHandle}, not ${publication.ownerProductHandle}.`,
        );
      }
      snapshot = new KernelHotDetailAdmissionSnapshot(
        publication.handle,
        publication.slot.detailKind,
        expectedEntry,
        new KernelCommittedEntryRevision(
          expectedEntry?.slot.detailKind ?? null,
          this.store.hotDetails.readMutationOrdinal(publication.handle),
          this.store.hotDetails.readLifetimeOrdinal(publication.handle),
        ),
      );
      snapshots.set(publication.handle, snapshot);
    }
    return snapshot;
  }

  private stagedRecordContributes(handle: KernelRecordHandle): boolean {
    return this.previousRecordHandles.has(handle) || this.store.read(handle) == null;
  }

  private stagedProductDetailContributes(publication: KernelProductDetailPublication<unknown>): boolean {
    return this.previousProductDetailHandles.has(publication.productHandle)
      || this.productDetailAdmissionSnapshots.get(publication.productHandle)?.expectedEntry == null;
  }

  private stagedHotDetailContributes(publication: KernelHotDetailPublication<unknown>): boolean {
    return this.previousHotDetailHandles.has(publication.handle)
      || this.hotDetailAdmissionSnapshots.get(publication.handle)?.expectedEntry == null;
  }

  private bindStagedProductDetail(publication: KernelProductDetailPublication<unknown>): unknown {
    return this.prepareCandidateRead(() => {
      const product = this.read(publication.productHandle);
      if (!(product instanceof MaterializedProduct)) {
        throw new Error(
          `Staged product detail ${publication.slot.detailKind} has no materialized-product envelope `
          + `${publication.productHandle}.`,
        );
      }
      const committedEnvelope = readProductDetailEnvelope(publication.detail);
      if (committedEnvelope != null) {
        if (committedEnvelope.handle !== product.handle) {
          throw new Error(
            `Product detail is already bound to ${committedEnvelope.handle}; cannot stage it for ${product.handle}.`,
          );
        }
        if (!sameMaterializedProductEnvelope(committedEnvelope, product)) {
          throw new Error(
            `Committed product detail ${publication.slot.detailKind} cannot supply candidate ${product.handle}; `
            + 'its materialized-product envelope changed. Emit a fresh detail object for this generation.',
          );
        }
        // Keep the committed weak binding visible until the candidate is admitted atomically.
        return publication.detail;
      }
      let prepared = this.stagedProductDetailBindings.get(publication);
      if (prepared == null) {
        prepared = this.store.productDetails.prepareReplacementEntry(
          publication.slot,
          product,
          publication.detail,
          publication.references,
        );
        prepared.admitCandidateBinding();
        this.stagedProductDetailBindings.set(publication, prepared);
      }
      return publication.detail;
    });
  }

  private bindStagedHotDetail(publication: KernelHotDetailPublication<unknown>): unknown {
    return this.prepareCandidateRead(() => {
      const owner = this.read(publication.ownerProductHandle);
      if (!(owner instanceof MaterializedProduct)) {
        throw new Error(
          `Staged hot detail ${publication.slot.detailKind} has no materialized-product owner `
          + `${publication.ownerProductHandle}.`,
        );
      }
      const committedEntry = readHotDetailEntry(publication.detail);
      if (committedEntry != null) {
        if (
          committedEntry.handle !== publication.handle
          || committedEntry.ownerProductHandle !== owner.handle
          || committedEntry.slot !== publication.slot
        ) {
          throw new Error(
            `Hot detail is already bound to ${committedEntry.handle} under ${committedEntry.ownerProductHandle}; `
            + `cannot stage it for ${publication.handle} under ${owner.handle}.`,
          );
        }
        if (!sameMaterializedProductEnvelope(committedEntry.owner, owner)) {
          throw new Error(
            `Committed hot detail ${publication.slot.detailKind} cannot supply candidate ${publication.handle}; `
            + 'its owner product envelope changed. Emit a fresh detail object for this generation.',
          );
        }
        // Store admission refreshes the owner object only after every fallible preflight succeeds.
        return publication.detail;
      }
      let prepared = this.stagedHotDetailBindings.get(publication);
      if (prepared == null) {
        prepared = this.store.hotDetails.prepareReplacementEntry(
          publication.slot,
          owner,
          publication.handle,
          publication.detail,
          publication.references,
        );
        prepared.admitCandidateBinding();
        this.stagedHotDetailBindings.set(publication, prepared);
      }
      return publication.detail;
    });
  }

  private prepareCandidateRead<TValue>(prepare: () => TValue): TValue {
    try {
      return prepare();
    } catch (error) {
      this.failedPublication = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  private assertHealthy(): void {
    if (this.failedPublication != null) {
      throw new Error(
        `Staged publication cannot continue after a failed write: ${this.failedPublication.message}`,
      );
    }
  }

  private assertPreparing(): void {
    this.assertHealthy();
    if (this.sealed) {
      throw new Error('Staged kernel publication is sealed for commit.');
    }
  }
}

const enum StagedDetailOutcome {
  Added,
  ReusedStaged,
  ReusedCommitted,
}

function stagedRevisionKey(surface: KernelPublicationSurface, handle: string): string {
  return `${surface}\0${handle}`;
}

function cloneWriterSets<THandle extends string>(
  source: ReadonlyMap<THandle, ReadonlySet<KernelPublicationWriterId>>,
): Map<THandle, Set<KernelPublicationWriterId>> {
  return new Map([...source].map(([handle, writers]) => [handle, new Set(writers)]));
}

function registerAdmissionWriter<THandle extends string>(
  writersByHandle: Map<THandle, Set<KernelPublicationWriterId>>,
  handle: THandle,
  writerId: KernelPublicationWriterId,
): void {
  const writers = writersByHandle.get(handle) ?? new Set<KernelPublicationWriterId>();
  writers.add(writerId);
  writersByHandle.set(handle, writers);
}

function admissionAttempts<
  THandle extends string,
  TSnapshot,
  TAttempt,
>(
  snapshots: ReadonlyMap<THandle, TSnapshot>,
  writersByHandle: ReadonlyMap<THandle, ReadonlySet<KernelPublicationWriterId>>,
  Attempt: new (writerId: KernelPublicationWriterId, snapshot: TSnapshot) => TAttempt,
): readonly TAttempt[] {
  return [...writersByHandle].flatMap(([handle, writers]) => {
    const snapshot = snapshots.get(handle);
    if (snapshot == null) {
      throw new Error(`Admission writers for ${handle} have no exact catalog snapshot.`);
    }
    return [...writers].map((writerId) => new Attempt(writerId, snapshot));
  });
}

function requiredStagedWriter<THandle extends string>(
  writers: ReadonlyMap<THandle, KernelPublicationWriterId>,
  handle: THandle,
  surface: KernelPublicationSurface,
): KernelPublicationWriterId {
  const writer = writers.get(handle);
  if (writer == null) {
    throw new Error(`Staged ${surface} ${handle} has no writer attribution.`);
  }
  return writer;
}

function requiredStagedMutationOrdinal<THandle extends string>(
  ordinals: ReadonlyMap<THandle, number>,
  handle: THandle,
  surface: KernelPublicationSurface,
): number {
  const ordinal = ordinals.get(handle);
  if (ordinal == null) {
    throw new Error(`Staged ${surface} ${handle} has no mutation revision.`);
  }
  return ordinal;
}

type MutableKernelCountSnapshot = {
  -readonly [TKey in keyof SemanticRuntimeKernelCountSnapshot]: SemanticRuntimeKernelCountSnapshot[TKey];
};

function kernelCountsWithoutPreviousPublication(
  store: KernelStore,
  previous: KernelPublicationManifest,
): SemanticRuntimeKernelCountSnapshot {
  const counts = mutableKernelCounts(store.readKernelCountSnapshot());
  for (const handle of previous.recordHandles) {
    const record = store.read(handle);
    if (record != null) {
      applyKernelRecordCount(counts, record, -1);
    }
  }
  counts.productDetails -= previous.productDetailHandles
    .filter((handle) => store.productDetails.readEntry(handle) != null)
    .length;
  counts.hotDetails -= previous.hotDetailHandles
    .filter((handle) => store.hotDetails.readEntry(handle) != null)
    .length;
  return counts;
}

function mutableKernelCounts(snapshot: SemanticRuntimeKernelCountSnapshot): MutableKernelCountSnapshot {
  return { ...snapshot };
}

function applyKernelRecordCount(
  counts: MutableKernelCountSnapshot,
  record: KernelStoreRecord,
  direction: 1 | -1,
): void {
  counts.totalRecords += direction;
  counts.handleCharacters += direction * record.handle.length;
  if (isSemanticAddressRecord(record)) {
    counts.addresses += direction;
    return;
  }
  if (isSemanticIdentityRecord(record)) {
    counts.identities += direction;
    return;
  }
  switch (record.kind) {
    case 'evidence-record':
      counts.evidence += direction;
      return;
    case 'provenance-record':
      counts.provenance += direction;
      return;
    case 'semantic-claim':
      counts.claims += direction;
      return;
    case 'open-seam':
      counts.openSeams += direction;
      return;
    case 'materialized-product':
      counts.products += direction;
      return;
    case 'materialization-record':
      counts.materializations += direction;
      return;
  }
}
