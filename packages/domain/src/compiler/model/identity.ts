/* =======================================================================================
 * Identity primitives (brands, deterministic ids, hierarchical generators)
 * ---------------------------------------------------------------------------------------
 * - Central place for string/number brands used across compiler phases
 * - Deterministic hashing helpers for stable ExprId/NodeId generation
 * - Small helpers for hierarchical ids (templates/dom tree)
 * ======================================================================================= */

export type Brand<T extends string> = { readonly __brand: T };
export type Branded<TValue, TBrand extends string> = TValue & Brand<TBrand>;

export type StringId<TBrand extends string> = Branded<string, TBrand>;
export type NumericId<TBrand extends string> = Branded<number, TBrand>;

export type NodeId = StringId<"NodeId">; // e.g. '0/2/1', '0/3#text@0', '0/1@attr:value'
export type ExprId = StringId<"ExprId">; // deterministic (e.g., hash of file+loc+expressionType+code)
export type FrameId = NumericId<"FrameId">;
export type HydrationId = NumericId<"HydrationId">;
export type TemplateId = StringId<"TemplateId">;
export type SourceFileId = StringId<"SourceFileId">;
export type NormalizedPath = StringId<"NormalizedPath">;
export type UriString = StringId<"UriString">;
export type ExprIdMap<TValue> = IdMap<"ExprId", TValue>;
export type ReadonlyExprIdMap<TValue> = ReadonlyIdMap<"ExprId", TValue>;
export type ExprIdMapLike<TValue> = IdMapLike<"ExprId", TValue>;

export function exprIdMapGet<TValue>(map: ExprIdMapLike<TValue>, id: ExprId): TValue | undefined {
  return idMapGet<"ExprId", TValue>(map, id);
}

export function toExprIdMap<TValue>(map: ExprIdMapLike<TValue>): ExprIdMap<TValue> {
  return toIdMap<"ExprId", TValue>(map);
}
export type IdRecord<TBrand extends string, TValue> = Readonly<Record<StringId<TBrand>, TValue>>;
export type IdMapLike<TBrand extends string, TValue> =
  | ReadonlyMap<StringId<TBrand>, TValue>
  | IdRecord<TBrand, TValue>
  | null
  | undefined;
export type IdMap<TBrand extends string, TValue> = Map<StringId<TBrand>, TValue>;
export type ReadonlyIdMap<TBrand extends string, TValue> = ReadonlyMap<StringId<TBrand>, TValue>;

// TODO: Builder currently hardcodes 'html'. Add ns detection for SVG/MathML when needed.
export type Namespace = "html" | "svg" | "mathml";

export function brandString<TBrand extends string>(value: string): StringId<TBrand> {
  return value as StringId<TBrand>;
}

/** Convert a branded string id to its unbranded string key (for Records/Map keys). */
export function idKey<TBrand extends string>(value: StringId<TBrand>): string {
  return unbrand(value);
}

/** Brand a previously persisted key back into the expected id brand. */
export function idFromKey<TBrand extends string>(key: string): StringId<TBrand> {
  return brandString<TBrand>(key);
}

export function brandNumber<TBrand extends string>(value: number): NumericId<TBrand> {
  return value as NumericId<TBrand>;
}

export function unbrand<T>(value: Branded<T, string>): T {
  return value as T;
}

export function idMapGet<TBrand extends string, TValue>(
  map: IdMapLike<TBrand, TValue>,
  id: StringId<TBrand>,
): TValue | undefined {
  if (!map) return undefined;
  if (isIdMap(map)) return map.get(id);
  const record: IdRecord<TBrand, TValue> = map;
  return record[id];
}

export function toIdMap<TBrand extends string, TValue>(map: IdMapLike<TBrand, TValue>): IdMap<TBrand, TValue> {
  if (!map) return new Map();
  if (isIdMap(map)) return new Map(map);
  const record: IdRecord<TBrand, TValue> = map;
  const result = new Map<StringId<TBrand>, TValue>();
  const recordKeys = Object.keys(record);
  for (const key of recordKeys) {
    const brandedKey = idFromKey<TBrand>(key);
    if (!Object.prototype.hasOwnProperty.call(record, brandedKey)) continue;
    const value = record[brandedKey];
    if (value === undefined) continue;
    result.set(brandedKey, value);
  }
  return result;
}

export function idMapEntries<TBrand extends string, TValue>(
  map: IdMapLike<TBrand, TValue>,
): Iterable<[StringId<TBrand>, TValue]> {
  if (!map) return [];
  if (isIdMap(map)) return map.entries();
  const record: IdRecord<TBrand, TValue> = map;
  const entries: Array<[StringId<TBrand>, TValue]> = [];
  const recordKeys = Object.keys(record);
  for (const key of recordKeys) {
    const brandedKey = idFromKey<TBrand>(key);
    if (!Object.prototype.hasOwnProperty.call(record, brandedKey)) continue;
    const value = record[brandedKey];
    if (value === undefined) continue;
    entries.push([brandedKey, value]);
  }
  return entries;
}

function isIdMap<TBrand extends string, TValue>(
  map: IdMapLike<TBrand, TValue>,
): map is ReadonlyMap<StringId<TBrand>, TValue> {
  return map instanceof Map;
}

/**
 * Deterministic, fast 64-bit-ish hash for generating branded ids.
 * This is intentionally non-cryptographic and matches the previous implementation.
 */
export function hashIdentity(source: string): string {
  let h1 = 0x9e3779b1 | 0;
  let h2 = 0x85ebca77 | 0;

  for (let i = 0; i < source.length; i++) {
    const c = source.charCodeAt(i);
    h1 = (h1 ^ c) * 0x27d4eb2d;
    h2 = (h2 ^ c) * 0x165667b1;
  }

  const asUintHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${asUintHex(h1)}${asUintHex(h2)}`;
}

export function stableHash(source: string | readonly string[]): string {
  const key = typeof source === "string" ? source : source.join("|");
  return hashIdentity(key);
}

export function deterministicStringId<TBrand extends string>(
  prefix: string,
  payload: string | readonly string[],
): StringId<TBrand> {
  return `${prefix}_${stableHash(payload)}` as StringId<TBrand>;
}

export function normalizePathForId(filePath: string): NormalizedPath {
  const normalized = filePath.split("\\").join("/");
  const canonical = process.platform === "win32" ? normalized.toLowerCase() : normalized;
  return brandString<"NormalizedPath">(canonical);
}

export function toSourceFileId(filePath: string): SourceFileId {
  return brandString<"SourceFileId">(normalizePathForId(filePath));
}

/**
 * Generic helper for hierarchical id generation (e.g., NodeId).
 * Stack-based because templates are traversed depth-first.
 */
export class HierarchicalIdBuilder<TBrand extends string> {
  private readonly stack: number[] = [];

  public constructor(
    private readonly root: string = "0",
    private readonly delimiter: string = "/",
  ) {}

  public push(index: number): StringId<TBrand> {
    this.stack.push(index);
    return this.current();
  }

  public pop(): void {
    this.stack.pop();
  }

  public current(): StringId<TBrand> {
    return (this.stack.length === 0
      ? this.root
      : `${this.root}${this.delimiter}${this.stack.join(this.delimiter)}`) as StringId<TBrand>;
  }

  public withSuffix(suffix: string): StringId<TBrand> {
    return `${this.current()}${suffix}` as StringId<TBrand>;
  }
}

// Back-compat/semantic helper for DOM traversal.
export class NodeIdGen extends HierarchicalIdBuilder<"NodeId"> {
  public constructor() {
    super("0", "/");
  }

  // Backwards-compatible helper; aligns with previous API.
  public pushElement(index: number): StringId<"NodeId"> {
    return this.push(index);
  }
}

/**
 * DOM-aware id allocator that keeps element/text/comment sibling counts aligned with traversal.
 * Ensures callers don't hand-roll suffix counters per level.
 */
export class DomIdAllocator {
  private readonly ids = new NodeIdGen();
  private readonly siblings: Array<{ element: number; text: number; comment: number }> = [];

  public enterChildren(): void {
    this.siblings.push({ element: 0, text: 0, comment: 0 });
  }

  public exitChildren(): void {
    this.siblings.pop();
  }

  public nextElement(): NodeId {
    const idx = this.currentSiblings().element++;
    return this.ids.pushElement(idx);
  }

  public exitElement(): void {
    this.ids.pop();
  }

  public nextText(): NodeId {
    const idx = this.currentSiblings().text++;
    return this.ids.withSuffix(`#text@${idx}`);
  }

  public nextComment(): NodeId {
    const idx = this.currentSiblings().comment++;
    return this.ids.withSuffix(`#comment@${idx}`);
  }

  public current(): NodeId {
    return this.ids.current();
  }

  public withSuffix(suffix: string): NodeId {
    return this.ids.withSuffix(suffix);
  }

  public withinChildren<T>(callback: () => T): T {
    this.enterChildren();
    try {
      return callback();
    } finally {
      this.exitChildren();
    }
  }

  private currentSiblings(): { element: number; text: number; comment: number } {
    const current = this.siblings[this.siblings.length - 1];
    if (!current) throw new Error("No active child list; call enterChildren() first.");
    return current;
  }
}

/** Pair a template id with a node id for cross-template stability. */
export interface NodeAddress {
  template: TemplateId;
  node: NodeId;
}

export class NodeAddressBuilder {
  private readonly ids = new NodeIdGen();

  public constructor(private readonly template: TemplateId) {}

  public push(index: number): NodeAddress {
    return { template: this.template, node: this.ids.push(index) };
  }

  public pop(): void {
    this.ids.pop();
  }

  public current(): NodeAddress {
    return { template: this.template, node: this.ids.current() };
  }

  public withSuffix(suffix: string): NodeAddress {
    return { template: this.template, node: this.ids.withSuffix(suffix) };
  }
}

/** Sequential allocator for FrameId to centralize numbering logic. */
export class SequentialIdAllocator<TBrand extends string> {
  private next: number;

  public constructor(start = 0) {
    this.next = start;
  }

  public allocate(): NumericId<TBrand> {
    const id = brandNumber<TBrand>(this.next);
    this.next += 1;
    return id;
  }
}

export class FrameIdAllocator extends SequentialIdAllocator<"FrameId"> {}

/** Sequential allocator for hydration ids (SSR markers). */
export class HydrationIdAllocator extends SequentialIdAllocator<"HydrationId"> {}
