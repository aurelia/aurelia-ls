declare const hotDetailSlotBrand: unique symbol;

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
  if (detail == null || typeof detail !== 'object') {
    return detail;
  }
  const existing = hotDetailEntryByDetail.get(detail);
  if (existing != null && existing.handle !== entry.handle) {
    throw new Error(`Hot detail is already bound to ${existing.handle}; cannot rebind to ${entry.handle}.`);
  }
  hotDetailEntryByDetail.set(detail, entry as HotDetailEntry<unknown>);
  hideHotDetailHandleEchoes(detail, entry);
  return detail;
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

function hideHotDetailHandleEchoes<TDetail>(
  detail: TDetail,
  entry: HotDetailEntry<TDetail>,
): void {
  if (detail == null || typeof detail !== 'object') {
    return;
  }
  hideHotDetailHandleEcho(detail, 'handle', entry.handle, hotDetailHandleAccessor);
  hideHotDetailHandleEcho(detail, 'productHandle', entry.handle, hotDetailHandleAccessor);
}

function hideHotDetailHandleEcho<TValue>(
  detail: object,
  field: string,
  envelopeValue: TValue,
  accessor: PropertyDescriptor,
): void {
  if (!Object.prototype.hasOwnProperty.call(detail, field)) {
    return;
  }
  const currentValue = (detail as Record<string, unknown>)[field];
  if (currentValue !== envelopeValue) {
    return;
  }
  Object.defineProperty(detail, field, accessor);
}

function hotDetailHandleGetter(this: object): string {
  return requireHotDetailEntry(this, 'hot detail').handle;
}

/** Hot in-memory catalog keyed by handles that do not have to be committed materialized products. */
export class HotDetailCatalog {
  private readonly entriesByHandle = new Map<string, HotDetailEntry<unknown>>();
  private readonly handlesByDetailKind = new Map<string, Set<string>>();
  private readonly handleOrder: string[] = [];

  add<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: string,
    detail: TDetail,
  ): HotDetailEntry<TDetail> {
    const existing = this.entriesByHandle.get(handle);
    if (existing != null) {
      if (existing.slot.detailKind !== slot.detailKind) {
        throw new Error(`Hot detail ${handle} already has slot ${existing.slot.detailKind}; cannot attach ${slot.detailKind}.`);
      }
      throw new Error(`Duplicate hot detail for ${handle}.`);
    }

    const entry = new HotDetailEntry(handle, slot, detail);
    bindHotDetailEntry(detail, entry);
    this.entriesByHandle.set(handle, entry as HotDetailEntry<unknown>);
    this.handleOrder.push(handle);
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

  readEntriesSince(marker: number): readonly HotDetailEntry<unknown>[] {
    return this.handleOrder
      .slice(marker)
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

  mark(): number {
    return this.handleOrder.length;
  }

  remove(handle: string): HotDetailEntry<unknown> | null {
    const entry = this.entriesByHandle.get(handle) ?? null;
    if (entry == null) {
      return null;
    }
    this.entriesByHandle.delete(handle);
    const handles = this.handlesByDetailKind.get(entry.slot.detailKind);
    handles?.delete(handle);
    if (handles?.size === 0) {
      this.handlesByDetailKind.delete(entry.slot.detailKind);
    }
    return entry;
  }

  removeSince(marker: number): number {
    let removed = 0;
    while (this.handleOrder.length > marker) {
      const handle = this.handleOrder.pop();
      if (handle != null && this.remove(handle) != null) {
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
