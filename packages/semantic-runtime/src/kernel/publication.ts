import type { HotDetailReadView, HotDetailSlot } from './hot-details.js';
import type {
  KernelHandleFactory,
  KernelRecordHandle,
  ProductHandle,
} from './handles.js';
import type { ProductDetailReadView, ProductDetailSlot } from './product-details.js';
import type {
  KernelStore,
  KernelMaterializationReadView,
  KernelStoreRecord,
} from './store.js';
import type { MaterializationRecord } from './materialization.js';

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
    readonly handle: string,
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
  handle: string,
  detail: TDetail,
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
  compare: KernelDetailComparator<TDetail> | null = null,
): KernelHotDetailPublication<unknown> {
  return new KernelHotDetailPublication(
    slot,
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
  ) {}
}

/** Exact store entries currently owned by one committed computation. */
export class KernelPublicationManifest {
  static readonly empty = new KernelPublicationManifest();

  constructor(
    readonly recordHandles: readonly KernelRecordHandle[] = [],
    readonly productDetailHandles: readonly ProductHandle[] = [],
    readonly hotDetailHandles: readonly string[] = [],
    /** Stable lifetime inherited by every replacement of this logical publication. */
    readonly lifetimeOrdinal: number | null = null,
  ) {}
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

/** Required read/write boundary used by materializers in immediate or staged mode. */
export interface KernelPublicationContext
  extends KernelMaterializationReadView, ProductDetailReadView, HotDetailReadView {
  publish(plan: KernelPublicationPlan): void;
}

/** Run-local collector that keeps every materializer write invisible until lifecycle commit. */
export class StagedKernelPublicationContext implements KernelPublicationContext {
  private readonly plans: KernelPublicationPlan[] = [];
  private readonly records = new Map<KernelRecordHandle, KernelStoreRecord>();
  private readonly productDetails = new Map<ProductHandle, KernelProductDetailPublication<unknown>>();
  private readonly hotDetails = new Map<string, KernelHotDetailPublication<unknown>>();

  constructor(private readonly store: KernelStore) {}

  get handles(): KernelHandleFactory {
    return this.store.handles;
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    return this.records.get(handle) ?? this.store.read(handle);
  }

  readMaterializations(): readonly MaterializationRecord[] {
    const materializations = new Map(
      this.store.readMaterializations().map((record) => [record.handle, record]),
    );
    for (const record of this.records.values()) {
      if (record.kind === 'materialization-record') {
        materializations.set(record.handle, record);
      }
    }
    return [...materializations.values()];
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    const staged = this.productDetails.get(productHandle) ?? null;
    const existing = this.store.productDetails.read(slot, productHandle);
    if (staged == null) {
      return existing;
    }
    if (staged.slot.detailKind !== slot.detailKind) {
      return null;
    }
    return staged.admission === KernelDetailAdmission.IfAbsent && existing != null
      ? existing
      : staged.detail as TDetail;
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: string): TDetail | null {
    const staged = this.hotDetails.get(handle) ?? null;
    const existing = this.store.hotDetails.read(slot, handle);
    if (staged == null) {
      return existing;
    }
    if (staged.slot.detailKind !== slot.detailKind) {
      return null;
    }
    return staged.admission === KernelDetailAdmission.IfAbsent && existing != null
      ? existing
      : staged.detail as TDetail;
  }

  publish(plan: KernelPublicationPlan): void {
    for (const record of plan.batch.records) {
      const handle = record.handle;
      if (this.records.has(handle)) {
        throw new Error(`Staged publication emitted duplicate kernel record ${handle}.`);
      }
      this.records.set(handle, record);
    }
    for (const publication of plan.productDetails) {
      this.stageProductDetail(publication);
    }
    for (const publication of plan.hotDetails) {
      this.stageHotDetail(publication);
    }
    this.plans.push(plan);
  }

  toPlan(label: string): KernelPublicationPlan {
    return new KernelPublicationPlan(
      new KernelStoreBatch(
        this.plans.flatMap((plan) => plan.batch.records),
        label,
      ),
      this.plans.flatMap((plan) => plan.productDetails),
      this.plans.flatMap((plan) => plan.hotDetails),
    );
  }

  private stageProductDetail(publication: KernelProductDetailPublication<unknown>): void {
    const existing = this.productDetails.get(publication.productHandle) ?? null;
    if (existing == null) {
      this.productDetails.set(publication.productHandle, publication);
      return;
    }
    if (existing.slot.detailKind !== publication.slot.detailKind) {
      throw new Error(
        `Staged publication emitted conflicting product details for ${publication.productHandle}: `
        + `${existing.slot.detailKind} and ${publication.slot.detailKind}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      return;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      this.productDetails.set(publication.productHandle, publication);
      return;
    }
    throw new Error(`Staged publication emitted duplicate product detail ${publication.productHandle}.`);
  }

  private stageHotDetail(publication: KernelHotDetailPublication<unknown>): void {
    const existing = this.hotDetails.get(publication.handle) ?? null;
    if (existing == null) {
      this.hotDetails.set(publication.handle, publication);
      return;
    }
    if (existing.slot.detailKind !== publication.slot.detailKind) {
      throw new Error(
        `Staged publication emitted conflicting hot details for ${publication.handle}: `
        + `${existing.slot.detailKind} and ${publication.slot.detailKind}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      return;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      this.hotDetails.set(publication.handle, publication);
      return;
    }
    throw new Error(`Staged publication emitted duplicate hot detail ${publication.handle}.`);
  }
}
