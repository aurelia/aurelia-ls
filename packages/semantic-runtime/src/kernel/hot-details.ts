import {
  applyObjectFieldNormalizations,
  prepareObjectFieldNormalization,
  restoreObjectFieldNormalizations,
  type PreparedObjectFieldNormalization,
} from './object-field-normalization.js';
import { DetailCatalog } from './detail-catalog.js';
import type { HotDetailHandle, ProductHandle } from './handles.js';
import {
  sameMaterializedProductEnvelope,
  type MaterializedProduct,
} from './materialization.js';
import type { ProductKindKey } from './vocabulary.js';
import {
  type KernelDetailReferenceClosure,
  type KernelDetailReferenceProjector,
} from './detail-references.js';
import type { HotDetailDescriptor } from './detail-descriptors.js';
import type {
  KernelComparablePublicationDecision,
  KernelDetailComparator,
  KernelPublicationComparisonContext,
} from './publication-comparison.js';

declare const hotDetailSlotBrand: unique symbol;

type AllocateOrdinal = () => number;
type AssertMutationAllowed = () => void;
type ObserveHotDetailHandle = (handle: HotDetailHandle) => void;

/**
 * Typed hot-sidecar slot for analysis-epoch details that should not be promoted into durable kernel products.
 *
 * Use this for child surfaces whose lifetime is owned by a richer product detail, such as TypeChecker members on a
 * projected type shape. If a detail needs product-kind navigation, claims, provenance, or cross-inquiry durability,
 * it should remain a real product detail instead.
 */
export class HotDetailSlot<
  TDetail,
  TOwnerProductKind extends ProductKindKey = ProductKindKey,
> {
  declare readonly [hotDetailSlotBrand]: TDetail;
  private readonly referenceProjector: KernelDetailReferenceProjector<unknown>;
  private readonly comparator: KernelDetailComparator<unknown> | null;

  constructor(
    /** Inert occupancy identity safe to import without pulling in the executable projector graph. */
    readonly descriptor: HotDetailDescriptor<TDetail, TOwnerProductKind>,
    /** Exact non-owner kernel entries required by this child payload. */
    referenceProjector: KernelDetailReferenceProjector<TDetail>,
    /** Slot-owned semantic and witness comparison for fresh replacement candidates. */
    comparator: KernelDetailComparator<TDetail> | null = null,
  ) {
    this.referenceProjector = referenceProjector as KernelDetailReferenceProjector<unknown>;
    this.comparator = comparator as KernelDetailComparator<unknown> | null;
    Object.freeze(this);
  }

  get surface(): HotDetailDescriptor<TDetail, TOwnerProductKind>['surface'] {
    return this.descriptor.surface;
  }

  get ownerProductKindKey(): TOwnerProductKind {
    return this.descriptor.ownerProductKindKey;
  }

  get detailKind(): string {
    return this.descriptor.detailKind;
  }

  get summary(): string {
    return this.descriptor.summary;
  }

  /** Project the canonical structural closure before publication admits the detail. */
  referencesFor(detail: TDetail): KernelDetailReferenceClosure {
    return this.referenceProjector(detail);
  }

  compare(
    previous: TDetail,
    next: TDetail,
    context: KernelPublicationComparisonContext,
  ): KernelComparablePublicationDecision | null {
    return this.comparator?.(previous, next, context) ?? null;
  }
}

/** Typed exact-handle hot-detail read shared by committed and staged analysis views. */
export interface HotDetailReadView {
  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null;
}

/** One typed hot detail object attached to an epoch-local handle. */
export class HotDetailEntry<TDetail> {
  constructor(
    /** Durable product envelope that owns this lightweight child detail. */
    readonly owner: MaterializedProduct,
    /** Epoch-local handle used by in-process follow-up analysis. */
    readonly handle: HotDetailHandle,
    /** Slot that typed and admitted this detail. */
    readonly slot: HotDetailSlot<TDetail>,
    /** Rich in-memory model for materializer and inquiry use. */
    readonly detail: TDetail,
    /** Frozen non-owner kernel closure projected by the typed slot. */
    readonly references: KernelDetailReferenceClosure,
  ) {
    Object.freeze(this);
  }

  get ownerProductHandle(): ProductHandle {
    return this.owner.handle;
  }
}

const hotDetailEntryByDetail = new WeakMap<object, HotDetailEntry<unknown>>();

const hotDetailHandleAccessor = {
  configurable: true,
  enumerable: false,
  get: hotDetailHandleGetter,
} as const;

class HotDetailEntryBinding {
  constructor(
    readonly detail: object | null,
    readonly entry: HotDetailEntry<unknown>,
    readonly previousEntry: HotDetailEntry<unknown> | null,
    readonly normalizations: readonly PreparedObjectFieldNormalization[],
  ) {}
}

/** Hot-detail entry whose fallible field normalization completed before live catalog mutation. */
export class PreparedHotDetailEntry<TDetail> {
  constructor(
    readonly entry: HotDetailEntry<TDetail>,
    readonly binding: HotDetailEntryBinding,
  ) {}

  /** Make the candidate owner visible to final validators without admitting the catalog entry. */
  admitBinding(): void {
    admitHotDetailEntryBinding(this.binding);
  }

  /** Apply the reversible descriptor and weak-owner lease needed by a staged candidate read. */
  admitCandidateBinding(): void {
    applyObjectFieldNormalizations(this.binding.normalizations);
    this.admitBinding();
  }

  /** Whether provisional admission cannot change the owner observed through an already-committed detail object. */
  get canAdmitBindingBeforeCommit(): boolean {
    return this.binding.previousEntry == null
      || sameMaterializedProductEnvelope(this.binding.previousEntry.owner, this.binding.entry.owner);
  }

  /** Restore the weak owner that preceded provisional final-validation admission. */
  restoreBinding(): void {
    restoreHotDetailEntryBinding(this.binding);
  }

  /** Restore the exact caller-owned object state that preceded a staged candidate read. */
  restoreCandidateBinding(): void {
    this.restoreBinding();
    restoreObjectFieldNormalizations(this.binding.normalizations);
  }
}

/**
 * Bind a hot detail object to the epoch-local catalog entry that owns it.
 *
 * Hot details are intentionally not durable kernel products, but the catalog entry is still the owner for their
 * follow-up handle. Detail classes may expose that handle for ergonomic in-process navigation; catalog admission
 * normalizes exact own-field echoes into a getter so hot sidecars do not duplicate the same long handle string.
 */
export function bindHotDetailEntry<TDetail>(
  detail: TDetail,
  entry: HotDetailEntry<TDetail>,
): TDetail {
  const binding = prepareHotDetailEntryBinding(detail, entry);
  applyObjectFieldNormalizations(binding.normalizations);
  admitHotDetailEntryBinding(binding);
  return detail;
}

/** Complete every fallible normalization step without changing the detail's current catalog owner. */
function prepareHotDetailEntryBinding(
  detail: unknown,
  entry: HotDetailEntry<unknown>,
): HotDetailEntryBinding {
  if (detail == null || typeof detail !== 'object') {
    return new HotDetailEntryBinding(null, entry, null, []);
  }
  const existing = hotDetailEntryByDetail.get(detail);
  if (
    existing != null
    && (
      existing.handle !== entry.handle
      || existing.slot !== entry.slot
      || existing.ownerProductHandle !== entry.ownerProductHandle
    )
  ) {
    throw new Error(
      `Hot detail is already bound to ${existing.handle} under ${existing.ownerProductHandle}; cannot rebind to `
      + `${entry.handle} under ${entry.ownerProductHandle}.`,
    );
  }
  return new HotDetailEntryBinding(
    detail,
    entry,
    existing ?? null,
    prepareHotDetailHandleEchoes(detail, entry),
  );
}

function admitHotDetailEntryBinding(binding: HotDetailEntryBinding): void {
  if (binding.detail != null) {
    hotDetailEntryByDetail.set(binding.detail, binding.entry);
  }
}

function restoreHotDetailEntryBinding(binding: HotDetailEntryBinding): void {
  if (binding.detail == null) {
    return;
  }
  if (binding.previousEntry == null) {
    hotDetailEntryByDetail.delete(binding.detail);
  } else {
    hotDetailEntryByDetail.set(binding.detail, binding.previousEntry);
  }
}

export function readHotDetailEntry(detail: unknown): HotDetailEntry<unknown> | null {
  return detail == null || typeof detail !== 'object'
    ? null
    : hotDetailEntryByDetail.get(detail) ?? null;
}

export function requireHotDetailEntry(
  detail: unknown,
  detailKind: string,
): HotDetailEntry<unknown> {
  const entry = readHotDetailEntry(detail);
  if (entry == null) {
    throw new Error(`Hot detail ${detailKind} is not bound to a hot-detail catalog entry.`);
  }
  return entry;
}

export function hotDetailHandle(
  detail: unknown,
  detailKind: string,
): HotDetailHandle {
  return requireHotDetailEntry(detail, detailKind).handle;
}

function prepareHotDetailHandleEchoes<TDetail>(
  detail: TDetail,
  entry: HotDetailEntry<TDetail>,
): readonly PreparedObjectFieldNormalization[] {
  if (detail == null || typeof detail !== 'object') {
    return [];
  }
  return [
    prepareObjectFieldNormalization(detail, 'handle', entry.handle, hotDetailHandleAccessor, 'Hot detail'),
    prepareObjectFieldNormalization(detail, 'detailHandle', entry.handle, hotDetailHandleAccessor, 'Hot detail'),
  ].filter((candidate): candidate is PreparedObjectFieldNormalization => candidate != null);
}

function hotDetailHandleGetter(this: object): HotDetailHandle {
  return requireHotDetailEntry(this, 'hot detail').handle;
}

/** Hot in-memory catalog of lightweight children owned by committed materialized products. */
export class HotDetailCatalog {
  private readonly catalog: DetailCatalog<HotDetailHandle, HotDetailEntry<unknown>>;
  private readonly handlesByOwnerProduct = new Map<ProductHandle, Set<HotDetailHandle>>();

  constructor(
    private readonly readProduct: (handle: ProductHandle) => MaterializedProduct | null,
    private readonly allocateLifetimeOrdinal: AllocateOrdinal,
    allocateMutationOrdinal: AllocateOrdinal,
    private readonly assertMutationAllowed: AssertMutationAllowed,
    observeBornEntry: ObserveHotDetailHandle = () => {},
    observeBorrowedEntry: ObserveHotDetailHandle = () => {},
    forgetEntry: ObserveHotDetailHandle = () => {},
  ) {
    this.catalog = new DetailCatalog(
      (entry) => entry.handle,
      (entry) => entry.slot.detailKind,
      allocateMutationOrdinal,
      (entry) => {
        this.addHandleForOwner(entry.ownerProductHandle, entry.handle);
        observeBornEntry(entry.handle);
      },
      (entry) => {
        this.removeHandleForOwner(entry.ownerProductHandle, entry.handle);
        forgetEntry(entry.handle);
      },
    );
    this.observeBorrowedEntry = observeBorrowedEntry;
  }

  private readonly observeBorrowedEntry: ObserveHotDetailHandle;

  add<TDetail>(
    slot: HotDetailSlot<TDetail>,
    ownerProductHandle: ProductHandle,
    handle: HotDetailHandle,
    detail: TDetail,
  ): HotDetailEntry<TDetail> {
    this.assertMutationAllowed();
    return this.addAtLifetime(slot, ownerProductHandle, handle, detail, this.allocateLifetimeOrdinal());
  }

  /** Attach a detail while inheriting the explicit lifetime of a replacement publication. */
  addAtLifetime<TDetail>(
    slot: HotDetailSlot<TDetail>,
    ownerProductHandle: ProductHandle,
    handle: HotDetailHandle,
    detail: TDetail,
    lifetimeOrdinal: number,
  ): HotDetailEntry<TDetail> {
    this.assertMutationAllowed();
    const owner = this.readProduct(ownerProductHandle);
    if (owner == null) {
      throw new Error(`Cannot attach hot detail ${slot.detailKind}; owner product ${ownerProductHandle} is not committed.`);
    }
    const entry = this.prepareEntry(slot, owner, handle, detail);
    applyObjectFieldNormalizations(entry.binding.normalizations);
    return this.addPreparedAtLifetime(entry, lifetimeOrdinal);
  }

  /** Normalize a candidate detail completely before a replacement mutates any live catalog. */
  prepareEntry<TDetail>(
    slot: HotDetailSlot<TDetail>,
    owner: MaterializedProduct,
    handle: HotDetailHandle,
    detail: TDetail,
  ): PreparedHotDetailEntry<TDetail> {
    const existing = this.catalog.read(handle);
    if (existing != null) {
      if (existing.slot !== slot) {
        throw new Error(
          `Hot detail ${handle} already has slot ${existing.slot.detailKind}; `
          + `cannot attach a different ${slot.detailKind} slot contract.`,
        );
      }
      throw new Error(`Duplicate hot detail for ${handle}.`);
    }
    return this.prepareReplacementEntry(slot, owner, handle, detail);
  }

  /** Prepare a replacement for an entry removed by the same publication transaction. */
  prepareReplacementEntry<TDetail>(
    slot: HotDetailSlot<TDetail>,
    owner: MaterializedProduct,
    handle: HotDetailHandle,
    detail: TDetail,
    references: KernelDetailReferenceClosure = slot.referencesFor(detail),
  ): PreparedHotDetailEntry<TDetail> {
    if (owner.productKindKey !== slot.ownerProductKindKey) {
      throw new Error(
        `Cannot attach hot detail ${slot.detailKind}; owner product ${owner.handle} has kind `
        + `${owner.productKindKey}, expected ${slot.ownerProductKindKey}.`,
      );
    }
    const entry = new HotDetailEntry(owner, handle, slot, detail, references);
    return new PreparedHotDetailEntry(
      entry,
      prepareHotDetailEntryBinding(detail, entry),
    );
  }

  /** Admit an already-normalized entry after every fallible preparation step has completed. */
  addPreparedAtLifetime<TDetail>(
    prepared: PreparedHotDetailEntry<TDetail>,
    lifetimeOrdinal: number,
  ): HotDetailEntry<TDetail> {
    this.assertMutationAllowed();
    const entry = prepared.entry;
    this.catalog.add(entry, lifetimeOrdinal);
    prepared.admitBinding();
    return entry;
  }

  addIfAbsent<TDetail>(
    slot: HotDetailSlot<TDetail>,
    ownerProductHandle: ProductHandle,
    handle: HotDetailHandle,
    detail: TDetail,
  ): HotDetailEntry<TDetail> {
    this.assertMutationAllowed();
    const existing = this.catalog.read(handle);
    if (existing == null) {
      return this.add(slot, ownerProductHandle, handle, detail);
    }
    if (existing.slot !== slot) {
      throw new Error(
        `Hot detail ${handle} already has slot ${existing.slot.detailKind}; `
        + `cannot reuse it through a different ${slot.detailKind} slot contract.`,
      );
    }
    if (existing.ownerProductHandle !== ownerProductHandle) {
      throw new Error(
        `Hot detail ${handle} is owned by ${existing.ownerProductHandle}; cannot reuse it for ${ownerProductHandle}.`,
      );
    }
    this.observeBorrowedEntry(existing.handle);
    return existing as HotDetailEntry<TDetail>;
  }

  read<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: HotDetailHandle,
  ): TDetail | null {
    const entry = this.catalog.read(handle);
    if (entry == null || entry.slot !== slot) {
      return null;
    }
    return entry.detail as TDetail;
  }

  /** Read the unexpanded entry when replacement code only knows the epoch-local handle. */
  readEntry(handle: HotDetailHandle): HotDetailEntry<unknown> | null {
    return this.catalog.read(handle);
  }

  /** Lifetime shared by the committed publication that owns this entry. */
  readLifetimeOrdinal(handle: HotDetailHandle): number | null {
    return this.catalog.readLifetimeOrdinal(handle);
  }

  /** Exact catalog revision for one hot-detail handle. */
  readMutationOrdinal(handle: HotDetailHandle): number | null {
    return this.catalog.readMutationOrdinal(handle);
  }

  /** Advance an admitted detail with the complete publication closure that owns it. */
  promoteLifetimeOrdinal(handle: HotDetailHandle, lifetimeOrdinal: number): void {
    this.assertMutationAllowed();
    this.catalog.promoteLifetimeOrdinal(handle, lifetimeOrdinal);
  }

  readBySlot<TDetail>(
    slot: HotDetailSlot<TDetail>,
  ): readonly HotDetailEntry<TDetail>[] {
    return this.catalog.readByDetailKind(slot.detailKind)
      .filter((entry) => entry.slot === slot)
      .map((entry) => entry as HotDetailEntry<TDetail>);
  }

  readByOwnerProduct(ownerProductHandle: ProductHandle): readonly HotDetailEntry<unknown>[] {
    return [...(this.handlesByOwnerProduct.get(ownerProductHandle) ?? [])]
      .map((handle) => this.catalog.read(handle))
      .filter((entry): entry is HotDetailEntry<unknown> => entry != null);
  }

  readEntries(): readonly HotDetailEntry<unknown>[] {
    return this.catalog.readEntries();
  }

  readEntriesChangedSince(marker: number): readonly HotDetailEntry<unknown>[] {
    return this.catalog.readEntriesChangedSince(marker);
  }

  get size(): number {
    return this.catalog.size;
  }

  readDetailKindCounts(): ReadonlyMap<string, number> {
    return this.catalog.readDetailKindCounts();
  }

  remove(handle: HotDetailHandle): HotDetailEntry<unknown> | null {
    this.assertMutationAllowed();
    return this.catalog.remove(handle);
  }

  removeAtOrAfterLifetime(marker: number): number {
    this.assertMutationAllowed();
    return this.catalog.removeAtOrAfterLifetime(marker);
  }

  /** Remove direct/unowned details after a lifetime boundary while preserving active computation publications. */
  removeUnretainedAtOrAfterLifetime(
    marker: number,
    retainedHandles: ReadonlySet<HotDetailHandle>,
  ): number {
    this.assertMutationAllowed();
    return this.catalog.removeUnretainedAtOrAfterLifetime(marker, retainedHandles);
  }

  private addHandleForOwner(
    ownerProductHandle: ProductHandle,
    handle: HotDetailHandle,
  ): void {
    let handles = this.handlesByOwnerProduct.get(ownerProductHandle);
    if (handles === undefined) {
      handles = new Set();
      this.handlesByOwnerProduct.set(ownerProductHandle, handles);
    }
    handles.add(handle);
  }

  private removeHandleForOwner(
    ownerProductHandle: ProductHandle,
    handle: HotDetailHandle,
  ): void {
    const handles = this.handlesByOwnerProduct.get(ownerProductHandle);
    handles?.delete(handle);
    if (handles?.size === 0) {
      this.handlesByOwnerProduct.delete(ownerProductHandle);
    }
  }
}

export function defineHotDetailSlot<
  TDetail,
  TOwnerProductKind extends ProductKindKey = ProductKindKey,
>(
  descriptor: HotDetailDescriptor<TDetail, TOwnerProductKind>,
  referenceProjector: KernelDetailReferenceProjector<TDetail>,
  comparator: KernelDetailComparator<TDetail> | null = null,
): HotDetailSlot<TDetail, TOwnerProductKind> {
  return new HotDetailSlot(descriptor, referenceProjector, comparator);
}
