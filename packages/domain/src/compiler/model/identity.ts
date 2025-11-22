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
export type TemplateId = StringId<"TemplateId">;
export type SourceFileId = StringId<"SourceFileId">;
export type NormalizedPath = StringId<"NormalizedPath">;
export type UriString = StringId<"UriString">;

// TODO: Builder currently hardcodes 'html'. Add ns detection for SVG/MathML when needed.
export type Namespace = "html" | "svg" | "mathml";

export function brandString<TBrand extends string>(value: string): StringId<TBrand> {
  return value as StringId<TBrand>;
}

export function brandNumber<TBrand extends string>(value: number): NumericId<TBrand> {
  return value as NumericId<TBrand>;
}

export function unbrand<T>(value: Branded<T, string>): T {
  return value as T;
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
  return brandString<"NormalizedPath">(normalized);
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
