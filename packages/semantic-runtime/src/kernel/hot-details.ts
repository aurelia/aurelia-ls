import {
  applyObjectFieldNormalizations,
  prepareObjectFieldNormalization,
  type PreparedObjectFieldNormalization,
} from './object-field-normalization.js';

declare const hotDetailSlotBrand: unique symbol;

type AllocateOrdinal = () => number;

/**
 * Typed hot-sidecar slot for analysis-epoch details that should not be promoted into durable kernel products.
 *
 * Use this for child surfaces whose lifetime is owned by a richer product detail, such as TypeChecker members on a
 * projected type shape. If a detail needs product-kind navigation, claims, provenance, or cross-inquiry durability,
 * it should remain a real product detail instead.
 */
export class HotDetailSlot<TDetail> {
  declare readonly [hotDetailSlotBrand]: TDetail;

  constructor(
    /** Stable slot key for diagnostics, inquiry traces, and telemetry. */
    readonly detailKind: string,
    /** Human/AI-readable explanation of what this hot detail contains and why it is not a product. */
    readonly summary: string,
  ) {}
}

/** Typed exact-handle hot-detail read shared by committed and staged analysis views. */
export interface HotDetailReadView {
  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: string): TDetail | null;
}

/** One typed hot detail object attached to an epoch-local handle. */
export class HotDetailEntry<TDetail> {
  constructor(
    /** Epoch-local handle used by in-process follow-up analysis. */
    readonly handle: string,
    /** Slot that typed and admitted this detail. */
    readonly slot: HotDetailSlot<TDetail>,
    /** Rich in-memory model for materializer and inquiry use. */
    readonly detail: TDetail,
  ) {}
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
    readonly normalizations: readonly PreparedObjectFieldNormalization[],
  ) {}
}

/** Hot-detail entry whose fallible field normalization completed before live catalog mutation. */
export class PreparedHotDetailEntry<TDetail> {
  constructor(
    readonly entry: HotDetailEntry<TDetail>,
    readonly binding: HotDetailEntryBinding,
  ) {}
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
    return new HotDetailEntryBinding(null, entry, []);
  }
  const existing = hotDetailEntryByDetail.get(detail);
  if (existing != null && existing.handle !== entry.handle) {
    throw new Error(`Hot detail is already bound to ${existing.handle}; cannot rebind to ${entry.handle}.`);
  }
  return new HotDetailEntryBinding(
    detail,
    entry,
    prepareHotDetailHandleEchoes(detail, entry),
  );
}

function admitHotDetailEntryBinding(binding: HotDetailEntryBinding): void {
  if (binding.detail != null) {
    hotDetailEntryByDetail.set(binding.detail, binding.entry);
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
): string {
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
    prepareObjectFieldNormalization(detail, 'productHandle', entry.handle, hotDetailHandleAccessor, 'Hot detail'),
  ].filter((candidate): candidate is PreparedObjectFieldNormalization => candidate != null);
}

function hotDetailHandleGetter(this: object): string {
  return requireHotDetailEntry(this, 'hot detail').handle;
}

/** Hot in-memory catalog keyed by handles that do not have to be committed materialized products. */
export class HotDetailCatalog {
  private readonly entriesByHandle = new Map<string, HotDetailEntry<unknown>>();
  private readonly handlesByDetailKind = new Map<string, Set<string>>();
  private readonly handleOrder: string[] = [];
  private readonly lifetimeOrdinalByHandle = new Map<string, number>();
  private readonly mutationOrdinalByHandle = new Map<string, number>();

  constructor(
    private readonly allocateLifetimeOrdinal: AllocateOrdinal,
    private readonly allocateMutationOrdinal: AllocateOrdinal,
  ) {}

  add<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: string,
    detail: TDetail,
  ): HotDetailEntry<TDetail> {
    return this.addAtLifetime(slot, handle, detail, this.allocateLifetimeOrdinal());
  }

  /** Attach a detail while inheriting the explicit lifetime of a replacement publication. */
  addAtLifetime<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: string,
    detail: TDetail,
    lifetimeOrdinal: number,
  ): HotDetailEntry<TDetail> {
    const entry = this.prepareEntry(slot, handle, detail);
    applyObjectFieldNormalizations(entry.binding.normalizations);
    return this.addPreparedAtLifetime(entry, lifetimeOrdinal);
  }

  /** Normalize a candidate detail completely before a replacement mutates any live catalog. */
  prepareEntry<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: string,
    detail: TDetail,
  ): PreparedHotDetailEntry<TDetail> {
    const existing = this.entriesByHandle.get(handle);
    if (existing != null) {
      if (existing.slot.detailKind !== slot.detailKind) {
        throw new Error(`Hot detail ${handle} already has slot ${existing.slot.detailKind}; cannot attach ${slot.detailKind}.`);
      }
      throw new Error(`Duplicate hot detail for ${handle}.`);
    }
    return this.prepareReplacementEntry(slot, handle, detail);
  }

  /** Prepare a replacement for an entry removed by the same publication transaction. */
  prepareReplacementEntry<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: string,
    detail: TDetail,
  ): PreparedHotDetailEntry<TDetail> {
    const entry = new HotDetailEntry(handle, slot, detail);
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
    const entry = prepared.entry;
    const handle = entry.handle;
    const slot = entry.slot;
    admitHotDetailEntryBinding(prepared.binding);
    this.entriesByHandle.set(handle, entry as HotDetailEntry<unknown>);
    this.handleOrder.push(handle);
    this.lifetimeOrdinalByHandle.set(handle, lifetimeOrdinal);
    this.mutationOrdinalByHandle.set(handle, this.allocateMutationOrdinal());
    this.addHandleForSlot(slot, handle);
    return entry;
  }

  addIfAbsent<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: string,
    detail: TDetail,
  ): HotDetailEntry<TDetail> {
    const existing = this.entriesByHandle.get(handle);
    if (existing == null) {
      return this.add(slot, handle, detail);
    }
    if (existing.slot.detailKind !== slot.detailKind) {
      throw new Error(`Hot detail ${handle} already has slot ${existing.slot.detailKind}; cannot attach ${slot.detailKind}.`);
    }
    return existing as HotDetailEntry<TDetail>;
  }

  read<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: string,
  ): TDetail | null {
    const entry = this.entriesByHandle.get(handle);
    if (entry == null || entry.slot.detailKind !== slot.detailKind) {
      return null;
    }
    return entry.detail as TDetail;
  }

  /** Read the unexpanded entry when replacement code only knows the epoch-local handle. */
  readEntry(handle: string): HotDetailEntry<unknown> | null {
    return this.entriesByHandle.get(handle) ?? null;
  }

  /** Lifetime shared by the committed publication that owns this entry. */
  readLifetimeOrdinal(handle: string): number | null {
    return this.lifetimeOrdinalByHandle.get(handle) ?? null;
  }

  /** Advance an admitted detail with the complete publication closure that owns it. */
  promoteLifetimeOrdinal(handle: string, lifetimeOrdinal: number): void {
    this.lifetimeOrdinalByHandle.set(handle, lifetimeOrdinal);
  }

  readBySlot<TDetail>(
    slot: HotDetailSlot<TDetail>,
  ): readonly HotDetailEntry<TDetail>[] {
    return [...(this.handlesByDetailKind.get(slot.detailKind) ?? [])]
      .map((handle) => this.entriesByHandle.get(handle) ?? null)
      .filter((entry): entry is HotDetailEntry<unknown> => entry != null)
      .map((entry) => entry as HotDetailEntry<TDetail>);
  }

  readEntries(): readonly HotDetailEntry<unknown>[] {
    return [...this.entriesByHandle.values()];
  }

  readEntriesChangedSince(marker: number): readonly HotDetailEntry<unknown>[] {
    return this.handleOrder
      .filter((handle) => (this.mutationOrdinalByHandle.get(handle) ?? -1) >= marker)
      .map((handle) => this.entriesByHandle.get(handle) ?? null)
      .filter((entry): entry is HotDetailEntry<unknown> => entry != null);
  }

  get size(): number {
    return this.entriesByHandle.size;
  }

  readDetailKindCounts(): ReadonlyMap<string, number> {
    return new Map([...this.handlesByDetailKind.entries()]
      .map(([detailKind, handles]) => [detailKind, handles.size]));
  }

  remove(handle: string): HotDetailEntry<unknown> | null {
    const entry = this.entriesByHandle.get(handle) ?? null;
    if (entry == null) {
      return null;
    }
    this.entriesByHandle.delete(handle);
    const orderIndex = this.handleOrder.indexOf(handle);
    if (orderIndex >= 0) {
      this.handleOrder.splice(orderIndex, 1);
    }
    this.lifetimeOrdinalByHandle.delete(handle);
    this.mutationOrdinalByHandle.delete(handle);
    const handles = this.handlesByDetailKind.get(entry.slot.detailKind);
    handles?.delete(handle);
    if (handles?.size === 0) {
      this.handlesByDetailKind.delete(entry.slot.detailKind);
    }
    return entry;
  }

  removeAtOrAfterLifetime(marker: number): number {
    let removed = 0;
    for (const handle of [...this.handleOrder].reverse()) {
      if ((this.lifetimeOrdinalByHandle.get(handle) ?? -1) >= marker && this.remove(handle) != null) {
        removed += 1;
      }
    }
    return removed;
  }

  private addHandleForSlot(
    slot: HotDetailSlot<unknown>,
    handle: string,
  ): void {
    let handles = this.handlesByDetailKind.get(slot.detailKind);
    if (handles === undefined) {
      handles = new Set();
      this.handlesByDetailKind.set(slot.detailKind, handles);
    }
    handles.add(handle);
  }
}

export function defineHotDetailSlot<TDetail>(
  detailKind: string,
  summary: string,
): HotDetailSlot<TDetail> {
  return new HotDetailSlot(detailKind, summary);
}
