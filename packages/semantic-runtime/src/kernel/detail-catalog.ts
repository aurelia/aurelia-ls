type AllocateOrdinal = () => number;

/** Shared storage and lifetime mechanics for typed detail catalogs. */
export class DetailCatalog<
  THandle extends string,
  TEntry,
> {
  private readonly entriesByHandle = new Map<THandle, TEntry>();
  private readonly handlesByDetailKind = new Map<string, Set<THandle>>();
  private readonly handleOrder: THandle[] = [];
  private readonly lifetimeOrdinalByHandle = new Map<THandle, number>();
  private readonly mutationOrdinalByHandle = new Map<THandle, number>();

  constructor(
    private readonly handleForEntry: (entry: TEntry) => THandle,
    private readonly detailKindForEntry: (entry: TEntry) => string,
    private readonly allocateMutationOrdinal: AllocateOrdinal,
    private readonly onAdd: (entry: TEntry) => void = () => {},
    private readonly onRemove: (entry: TEntry) => void = () => {},
  ) {}

  add(entry: TEntry, lifetimeOrdinal: number): TEntry {
    const handle = this.handleForEntry(entry);
    if (this.entriesByHandle.has(handle)) {
      throw new Error(`Duplicate detail catalog entry for ${handle}.`);
    }
    const detailKind = this.detailKindForEntry(entry);
    this.entriesByHandle.set(handle, entry);
    this.handleOrder.push(handle);
    this.lifetimeOrdinalByHandle.set(handle, lifetimeOrdinal);
    this.mutationOrdinalByHandle.set(handle, this.allocateMutationOrdinal());
    let handles = this.handlesByDetailKind.get(detailKind);
    if (handles === undefined) {
      handles = new Set();
      this.handlesByDetailKind.set(detailKind, handles);
    }
    handles.add(handle);
    this.onAdd(entry);
    return entry;
  }

  read(handle: THandle): TEntry | null {
    return this.entriesByHandle.get(handle) ?? null;
  }

  readByDetailKind(detailKind: string): readonly TEntry[] {
    return [...(this.handlesByDetailKind.get(detailKind) ?? [])]
      .map((handle) => this.entriesByHandle.get(handle))
      .filter((entry): entry is TEntry => entry !== undefined);
  }

  readEntries(): readonly TEntry[] {
    return [...this.entriesByHandle.values()];
  }

  readEntriesChangedSince(marker: number): readonly TEntry[] {
    return this.handleOrder
      .filter((handle) => (this.mutationOrdinalByHandle.get(handle) ?? -1) >= marker)
      .map((handle) => this.entriesByHandle.get(handle))
      .filter((entry): entry is TEntry => entry !== undefined);
  }

  readLifetimeOrdinal(handle: THandle): number | null {
    return this.lifetimeOrdinalByHandle.get(handle) ?? null;
  }

  /** Exact mutation revision for one positive or negative detail lookup. */
  readMutationOrdinal(handle: THandle): number | null {
    return this.mutationOrdinalByHandle.get(handle) ?? null;
  }

  promoteLifetimeOrdinal(handle: THandle, lifetimeOrdinal: number): void {
    this.lifetimeOrdinalByHandle.set(handle, lifetimeOrdinal);
  }

  get size(): number {
    return this.entriesByHandle.size;
  }

  readDetailKindCounts(): ReadonlyMap<string, number> {
    return new Map([...this.handlesByDetailKind.entries()]
      .map(([detailKind, handles]) => [detailKind, handles.size]));
  }

  remove(handle: THandle): TEntry | null {
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
    const detailKind = this.detailKindForEntry(entry);
    const handles = this.handlesByDetailKind.get(detailKind);
    handles?.delete(handle);
    if (handles?.size === 0) {
      this.handlesByDetailKind.delete(detailKind);
    }
    this.onRemove(entry);
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

  removeUnretainedAtOrAfterLifetime(
    marker: number,
    retainedHandles: ReadonlySet<THandle>,
  ): number {
    let removed = 0;
    for (const handle of [...this.handleOrder].reverse()) {
      if (
        !retainedHandles.has(handle)
        && (this.lifetimeOrdinalByHandle.get(handle) ?? -1) >= marker
        && this.remove(handle) != null
      ) {
        removed += 1;
      }
    }
    return removed;
  }
}
