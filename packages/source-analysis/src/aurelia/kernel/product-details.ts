import type { ProductHandle } from './handles.js';
import type { MaterializedProduct } from './materialization.js';
import type { ProductKindKey } from './vocabulary.js';

declare const productDetailSlotBrand: unique symbol;

/**
 * Typed hot-sidecar slot for rich product details.
 *
 * This is not a kernel record and not a payload escape hatch. A slot is a product-owned contract that says which
 * rich in-memory model may hydrate a materialized-product envelope of a specific kind.
 */
export class ProductDetailSlot<
  TDetail,
  TProductKind extends ProductKindKey = ProductKindKey,
> {
  declare readonly [productDetailSlotBrand]: TDetail;

  constructor(
    /** Product kind whose materialized-product envelope this detail can hydrate. */
    readonly productKindKey: TProductKind,
    /** Stable slot key for diagnostics, inquiry traces, and MCP projection. */
    readonly detailKind: string,
    /** Human/AI-readable explanation of what this detail object contains. */
    readonly summary: string,
  ) {}
}

/** One typed detail object attached to a materialized-product handle. */
export class ProductDetailEntry<
  TDetail,
  TProductKind extends ProductKindKey = ProductKindKey,
> {
  constructor(
    /** Product handle whose durable envelope owns this detail. */
    readonly productHandle: ProductHandle,
    /** Slot that typed and admitted this detail. */
    readonly slot: ProductDetailSlot<TDetail, TProductKind>,
    /** Rich in-memory product model for materializer and inquiry use. */
    readonly detail: TDetail,
  ) {}
}

type ReadProduct = (handle: ProductHandle) => MaterializedProduct | null;

/** Hot in-memory catalog for typed product details keyed by durable product handles. */
export class ProductDetailCatalog {
  private readonly entriesByHandle = new Map<ProductHandle, ProductDetailEntry<unknown>>();
  private readonly handlesByDetailKind = new Map<string, Set<ProductHandle>>();

  constructor(
    private readonly readProduct: ReadProduct,
  ) {}

  /** Attach a typed detail to an already-committed materialized product. */
  add<TDetail, TProductKind extends ProductKindKey>(
    slot: ProductDetailSlot<TDetail, TProductKind>,
    productHandle: ProductHandle,
    detail: TDetail,
  ): ProductDetailEntry<TDetail, TProductKind> {
    const product = this.readProduct(productHandle);
    if (product == null) {
      throw new Error(`Cannot attach product detail ${slot.detailKind}; product ${productHandle} is not committed.`);
    }
    if (product.productKindKey !== slot.productKindKey) {
      throw new Error(
        `Cannot attach product detail ${slot.detailKind}; product ${productHandle} has kind ` +
        `${product.productKindKey}, expected ${slot.productKindKey}.`,
      );
    }
    if (this.entriesByHandle.has(productHandle)) {
      throw new Error(`Duplicate product detail for ${productHandle}.`);
    }

    const entry = new ProductDetailEntry(productHandle, slot, detail);
    this.entriesByHandle.set(productHandle, entry as ProductDetailEntry<unknown>);
    this.addHandleForSlot(slot, productHandle);
    return entry;
  }

  /** Attach a detail unless the same slot has already hydrated this product. */
  addIfAbsent<TDetail, TProductKind extends ProductKindKey>(
    slot: ProductDetailSlot<TDetail, TProductKind>,
    productHandle: ProductHandle,
    detail: TDetail,
  ): ProductDetailEntry<TDetail, TProductKind> {
    const existing = this.entriesByHandle.get(productHandle);
    if (existing == null) {
      return this.add(slot, productHandle, detail);
    }
    if (existing.slot.detailKind !== slot.detailKind) {
      throw new Error(
        `Product ${productHandle} already has detail ${existing.slot.detailKind}; cannot attach ${slot.detailKind}.`,
      );
    }
    return existing as ProductDetailEntry<TDetail, TProductKind>;
  }

  /** Read a detail through the slot that owns its type contract. */
  read<TDetail, TProductKind extends ProductKindKey>(
    slot: ProductDetailSlot<TDetail, TProductKind>,
    productHandle: ProductHandle,
  ): TDetail | null {
    const entry = this.entriesByHandle.get(productHandle);
    if (entry == null || entry.slot.detailKind !== slot.detailKind) {
      return null;
    }
    return entry.detail as TDetail;
  }

  /** Read the unexpanded detail entry when the caller only knows a product handle. */
  readEntry(productHandle: ProductHandle): ProductDetailEntry<unknown> | null {
    return this.entriesByHandle.get(productHandle) ?? null;
  }

  /** Read all details attached through one typed slot. */
  readBySlot<TDetail, TProductKind extends ProductKindKey>(
    slot: ProductDetailSlot<TDetail, TProductKind>,
  ): readonly ProductDetailEntry<TDetail, TProductKind>[] {
    return [...(this.handlesByDetailKind.get(slot.detailKind) ?? [])]
      .map((handle) => this.entriesByHandle.get(handle) ?? null)
      .filter((entry): entry is ProductDetailEntry<unknown> => entry != null)
      .map((entry) => entry as ProductDetailEntry<TDetail, TProductKind>);
  }

  readEntries(): readonly ProductDetailEntry<unknown>[] {
    return [...this.entriesByHandle.values()];
  }

  private addHandleForSlot(
    slot: ProductDetailSlot<unknown>,
    productHandle: ProductHandle,
  ): void {
    let handles = this.handlesByDetailKind.get(slot.detailKind);
    if (handles === undefined) {
      handles = new Set();
      this.handlesByDetailKind.set(slot.detailKind, handles);
    }
    handles.add(productHandle);
  }
}

export function defineProductDetailSlot<
  TDetail,
  TProductKind extends ProductKindKey = ProductKindKey,
>(
  productKindKey: TProductKind,
  detailKind: string,
  summary: string,
): ProductDetailSlot<TDetail, TProductKind> {
  return new ProductDetailSlot(productKindKey, detailKind, summary);
}
