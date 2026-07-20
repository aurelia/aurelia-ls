import type { HotDetailEntry, HotDetailReadView, HotDetailSlot } from './hot-details.js';
import type {
  KernelHandleFactory,
  KernelRecordHandle,
  HotDetailHandle,
  ProductHandle,
} from './handles.js';
import type { ProductDetailEntry, ProductDetailReadView, ProductDetailSlot } from './product-details.js';
import type {
  KernelStore,
  KernelMaterializationReadView,
  KernelRecordCollectionReadView,
  KernelSourceFileReadView,
  KernelStoreDensityDelta,
  KernelStoreDetailDensityDelta,
  KernelStoreObservationMarker,
  KernelStoreRecord,
  KernelTelemetryReadView,
} from './store.js';
import { SourceFileAddress } from './address.js';
import type { MaterializationRecord } from './materialization.js';
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

/** How a staged detail behaves when its handle is already owned by another publication. */
export const enum KernelDetailAdmission {
  /** The detail is owned by this publication and an unrelated existing detail is an error. */
  Required = 'required',
  /** Reuse an unrelated existing detail with the same slot instead of claiming ownership. */
  IfAbsent = 'if-absent',
}

/** Observable decision made while replacing one computation-owned publication. */
export const enum KernelPublicationDecisionKind {
  /** A handle did not exist in the prior manifest and is published for the first time. */
  Publish = 'publish',
  /** Semantic value and witness data are unchanged, so the existing object remains current. */
  Retain = 'retain',
  /** Semantic value is unchanged, but source/provenance witness data must be refreshed. */
  RefreshWitness = 'refresh-witness',
  /** Semantic value changed and the prior object is replaced. */
  Replace = 'replace',
  /** The prior manifest owned the handle and the new publication no longer emits it. */
  Withdraw = 'withdraw',
}

export type KernelComparablePublicationDecision =
  | KernelPublicationDecisionKind.Retain
  | KernelPublicationDecisionKind.RefreshWitness
  | KernelPublicationDecisionKind.Replace;

export const enum KernelPublicationSurface {
  /** Normalized address, identity, evidence, provenance, claim, product, or materialization record. */
  Record = 'record',
  /** Typed detail whose lifetime is bound to a materialized-product envelope. */
  ProductDetail = 'product-detail',
  /** Typed epoch-local detail stored outside the normalized product envelope. */
  HotDetail = 'hot-detail',
}

/** Old/new record views available while a rich detail compares semantic and witness facts. */
export interface KernelPublicationComparisonContext {
  readPrevious(handle: KernelRecordHandle): KernelStoreRecord | null;
  readNext(handle: KernelRecordHandle): KernelStoreRecord | null;
}

export type KernelDetailComparator<TDetail> = (
  previous: TDetail,
  next: TDetail,
  context: KernelPublicationComparisonContext,
) => KernelComparablePublicationDecision;

/** One typed product-detail attachment staged beside its kernel product envelope. */
export class KernelProductDetailPublication<TDetail> {
  constructor(
    readonly slot: ProductDetailSlot<TDetail>,
    readonly productHandle: ProductHandle,
    readonly detail: TDetail,
    readonly admission: KernelDetailAdmission = KernelDetailAdmission.Required,
    readonly compare: KernelDetailComparator<TDetail> | null = null,
  ) {}
}

/** One typed epoch-local hot detail staged beside a computation publication. */
export class KernelHotDetailPublication<TDetail> {
  constructor(
    readonly slot: HotDetailSlot<TDetail>,
    readonly ownerProductHandle: ProductHandle,
    readonly handle: HotDetailHandle,
    readonly detail: TDetail,
    readonly admission: KernelDetailAdmission = KernelDetailAdmission.Required,
    readonly compare: KernelDetailComparator<TDetail> | null = null,
  ) {}
}

/** Coherent normalized-record emission carried by an immediate or staged publication. */
export class KernelStoreBatch {
  constructor(
    /** Normalized records emitted together by one analysis step. */
    readonly records: readonly KernelStoreRecord[] = [],
    /** Optional non-semantic label for debugging and inquiry traces. */
    readonly label: string | null = null,
  ) {}
}

export function publishProductDetail<TDetail>(
  slot: ProductDetailSlot<TDetail>,
  productHandle: ProductHandle,
  detail: TDetail,
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
  compare: KernelDetailComparator<TDetail> | null = null,
): KernelProductDetailPublication<unknown> {
  return new KernelProductDetailPublication(
    slot,
    productHandle,
    detail,
    admission,
    compare,
  ) as unknown as KernelProductDetailPublication<unknown>;
}

export function publishHotDetail<TDetail>(
  slot: HotDetailSlot<TDetail>,
  ownerProductHandle: ProductHandle,
  handle: HotDetailHandle,
  detail: TDetail,
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
  compare: KernelDetailComparator<TDetail> | null = null,
): KernelHotDetailPublication<unknown> {
  return new KernelHotDetailPublication(
    slot,
    ownerProductHandle,
    handle,
    detail,
    admission,
    compare,
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
  constructor(
    readonly batch: KernelStoreBatch,
    readonly productDetails: readonly KernelProductDetailPublication<unknown>[] = [],
    readonly hotDetails: readonly KernelHotDetailPublication<unknown>[] = [],
    /** Foreign product-detail admission decisions observed by a staged run. */
    readonly productDetailAdmissionSnapshots: readonly KernelProductDetailAdmissionSnapshot[] = [],
    /** Foreign hot-detail admission decisions observed by a staged run. */
    readonly hotDetailAdmissionSnapshots: readonly KernelHotDetailAdmissionSnapshot[] = [],
    /** Youngest kernel lifetime consumed through a registered computation read. */
    readonly minimumLifetimeOrdinal: number | null = null,
  ) {}

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

/** Store revision captured when a staged operation consumes one exact committed entry. */
export class KernelCommittedEntryRevision {
  constructor(
    readonly actualKind: string | null,
    readonly mutationOrdinal: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {}
}

/** Exact staged lookup plus the foreign committed revision that supplied it, when one did. */
export class StagedKernelRead<TValue> {
  constructor(
    readonly value: TValue | null,
    readonly committedRevision: KernelCommittedEntryRevision | null,
  ) {}
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
  ) {}
}

/** Result of atomically replacing one prior manifest. */
export class KernelPublicationReplacement {
  constructor(
    readonly manifest: KernelPublicationManifest,
    readonly decisions: readonly KernelPublicationDecision[],
  ) {}
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
export class StagedKernelPublicationContext implements KernelPublicationContext {
  private records = new Map<KernelRecordHandle, KernelStoreRecord>();
  private productDetails = new Map<ProductHandle, KernelProductDetailPublication<unknown>>();
  private hotDetails = new Map<HotDetailHandle, KernelHotDetailPublication<unknown>>();
  private productDetailAdmissionSnapshots = new Map<ProductHandle, KernelProductDetailAdmissionSnapshot>();
  private hotDetailAdmissionSnapshots = new Map<HotDetailHandle, KernelHotDetailAdmissionSnapshot>();
  private recordMutationOrdinals = new Map<KernelRecordHandle, number>();
  private productDetailMutationOrdinals = new Map<ProductHandle, number>();
  private hotDetailMutationOrdinals = new Map<HotDetailHandle, number>();
  private readonly previousRecordHandles: ReadonlySet<KernelRecordHandle>;
  private readonly previousProductDetailHandles: ReadonlySet<ProductHandle>;
  private readonly previousHotDetailHandles: ReadonlySet<HotDetailHandle>;
  private readonly baseKernelCounts: SemanticRuntimeKernelCountSnapshot;
  private nextMutationOrdinal = 0;
  private failedPublication: Error | null = null;

  constructor(
    private readonly store: KernelStore,
    previous: KernelPublicationManifest,
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
      return new StagedKernelRead(staged, null);
    }
    if (this.previousRecordHandles.has(handle)) {
      return new StagedKernelRead<KernelStoreRecord>(null, null);
    }
    const committed = this.store.read(handle);
    return new StagedKernelRead(
      committed,
      new KernelCommittedEntryRevision(
        committed?.kind ?? null,
        this.store.readRecordRevision(handle),
        this.store.readRecordLifetimeOrdinal(handle),
      ),
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
    const existing = existingEntry?.slot.detailKind === slot.detailKind
      ? existingEntry.detail as TDetail
      : null;
    if (staged == null) {
      const committedRevision = this.previousProductDetailHandles.has(productHandle)
        ? null
        : admission?.committedRevision ?? new KernelCommittedEntryRevision(
            existingEntry?.slot.detailKind ?? null,
            this.store.productDetails.readMutationOrdinal(productHandle),
            this.store.productDetails.readLifetimeOrdinal(productHandle),
          );
      return new StagedKernelRead(existing, committedRevision);
    }
    if (staged.slot.detailKind !== slot.detailKind) {
      return new StagedKernelRead<TDetail>(null, null);
    }
    return staged.admission === KernelDetailAdmission.IfAbsent && existing != null
      ? new StagedKernelRead(existing, admission?.committedRevision ?? null)
      : new StagedKernelRead(staged.detail as TDetail, null);
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
    const existing = existingEntry?.slot.detailKind === slot.detailKind
      ? existingEntry.detail as TDetail
      : null;
    if (staged == null) {
      const committedRevision = this.previousHotDetailHandles.has(handle)
        ? null
        : admission?.committedRevision ?? new KernelCommittedEntryRevision(
            existingEntry?.slot.detailKind ?? null,
            this.store.hotDetails.readMutationOrdinal(handle),
            this.store.hotDetails.readLifetimeOrdinal(handle),
          );
      return new StagedKernelRead(existing, committedRevision);
    }
    if (staged.slot.detailKind !== slot.detailKind) {
      return new StagedKernelRead<TDetail>(null, null);
    }
    return staged.admission === KernelDetailAdmission.IfAbsent && existing != null
      ? new StagedKernelRead(existing, admission?.committedRevision ?? null)
      : new StagedKernelRead(staged.detail as TDetail, null);
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
    this.assertHealthy();
    try {
      if (plan.productDetailAdmissionSnapshots.length > 0 || plan.hotDetailAdmissionSnapshots.length > 0) {
        throw new Error('A staged publication cannot import admission snapshots from another transaction.');
      }
      const records = new Map(this.records);
      const productDetails = new Map(this.productDetails);
      const hotDetails = new Map(this.hotDetails);
      const productDetailAdmissionSnapshots = new Map(this.productDetailAdmissionSnapshots);
      const hotDetailAdmissionSnapshots = new Map(this.hotDetailAdmissionSnapshots);
      const recordMutationOrdinals = new Map(this.recordMutationOrdinals);
      const productDetailMutationOrdinals = new Map(this.productDetailMutationOrdinals);
      const hotDetailMutationOrdinals = new Map(this.hotDetailMutationOrdinals);
      let nextMutationOrdinal = this.nextMutationOrdinal;

      for (const record of plan.batch.records) {
        const handle = record.handle;
        if (records.has(handle)) {
          throw new Error(`Staged publication emitted duplicate kernel record ${handle}.`);
        }
        records.set(handle, record);
        recordMutationOrdinals.set(handle, nextMutationOrdinal++);
      }
      for (const publication of plan.productDetails) {
        if (this.stageProductDetail(publication, productDetails, productDetailAdmissionSnapshots)) {
          productDetailMutationOrdinals.set(publication.productHandle, nextMutationOrdinal++);
        }
      }
      for (const publication of plan.hotDetails) {
        if (this.stageHotDetail(publication, hotDetails, hotDetailAdmissionSnapshots)) {
          hotDetailMutationOrdinals.set(publication.handle, nextMutationOrdinal++);
        }
      }

      this.records = records;
      this.productDetails = productDetails;
      this.hotDetails = hotDetails;
      this.productDetailAdmissionSnapshots = productDetailAdmissionSnapshots;
      this.hotDetailAdmissionSnapshots = hotDetailAdmissionSnapshots;
      this.recordMutationOrdinals = recordMutationOrdinals;
      this.productDetailMutationOrdinals = productDetailMutationOrdinals;
      this.hotDetailMutationOrdinals = hotDetailMutationOrdinals;
      this.nextMutationOrdinal = nextMutationOrdinal;
    } catch (error) {
      this.failedPublication = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  toPlan(label: string): KernelPublicationPlan {
    this.assertHealthy();
    return new KernelPublicationPlan(
      new KernelStoreBatch(
        [...this.records.values()],
        label,
      ),
      [...this.productDetails.values()],
      [...this.hotDetails.values()],
      [...this.productDetailAdmissionSnapshots.values()],
      [...this.hotDetailAdmissionSnapshots.values()],
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

  private stageProductDetail(
    publication: KernelProductDetailPublication<unknown>,
    productDetails: Map<ProductHandle, KernelProductDetailPublication<unknown>>,
    admissionSnapshots: Map<ProductHandle, KernelProductDetailAdmissionSnapshot>,
  ): boolean {
    const existing = productDetails.get(publication.productHandle) ?? null;
    if (existing == null) {
      const admission = this.productDetailAdmissionSnapshot(publication, admissionSnapshots);
      if (publication.admission === KernelDetailAdmission.Required && admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.productHandle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      productDetails.set(publication.productHandle, publication);
      return true;
    }
    if (existing.slot.detailKind !== publication.slot.detailKind) {
      throw new Error(
        `Staged publication emitted conflicting product details for ${publication.productHandle}: `
        + `${existing.slot.detailKind} and ${publication.slot.detailKind}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      return false;
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
      return true;
    }
    throw new Error(`Staged publication emitted duplicate product detail ${publication.productHandle}.`);
  }

  private stageHotDetail(
    publication: KernelHotDetailPublication<unknown>,
    hotDetails: Map<HotDetailHandle, KernelHotDetailPublication<unknown>>,
    admissionSnapshots: Map<HotDetailHandle, KernelHotDetailAdmissionSnapshot>,
  ): boolean {
    const existing = hotDetails.get(publication.handle) ?? null;
    if (existing == null) {
      const admission = this.hotDetailAdmissionSnapshot(publication, admissionSnapshots);
      if (publication.admission === KernelDetailAdmission.Required && admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.handle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      hotDetails.set(publication.handle, publication);
      return true;
    }
    if (existing.slot.detailKind !== publication.slot.detailKind) {
      throw new Error(
        `Staged publication emitted conflicting hot details for ${publication.handle}: `
        + `${existing.slot.detailKind} and ${publication.slot.detailKind}.`,
      );
    }
    if (existing.ownerProductHandle !== publication.ownerProductHandle) {
      throw new Error(
        `Staged publication emitted conflicting owners for hot detail ${publication.handle}: `
        + `${existing.ownerProductHandle} and ${publication.ownerProductHandle}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      return false;
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
      return true;
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
      if (expectedEntry != null && expectedEntry.slot.detailKind !== publication.slot.detailKind) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.productHandle} already has `
          + `${expectedEntry.slot.detailKind}.`,
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
      if (expectedEntry != null && expectedEntry.slot.detailKind !== publication.slot.detailKind) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.handle} already has `
          + `${expectedEntry.slot.detailKind}.`,
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

  private assertHealthy(): void {
    if (this.failedPublication != null) {
      throw new Error(
        `Staged publication cannot continue after a failed write: ${this.failedPublication.message}`,
      );
    }
  }
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
