import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from './handles.js';
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
    /** Stable slot key for diagnostics, inquiry traces, and tooling projection. */
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
    /** Durable materialized-product envelope that owns this detail. */
    readonly product: MaterializedProduct,
    /** Slot that typed and admitted this detail. */
    readonly slot: ProductDetailSlot<TDetail, TProductKind>,
    /** Rich in-memory product model for materializer and inquiry use. */
    readonly detail: TDetail,
  ) {}

  /** Product handle whose durable envelope owns this detail. */
  get productHandle(): ProductHandle {
    return this.product.handle;
  }
}

type ReadProduct = (handle: ProductHandle) => MaterializedProduct | null;
type ProductDetailWithHandle = { readonly productHandle: ProductHandle };

const productEnvelopeByDetail = new WeakMap<object, MaterializedProduct>();

const productHandleAccessor = {
  configurable: true,
  enumerable: false,
  get: productDetailProductHandleGetter,
} as const;

const identityHandleAccessor = {
  configurable: true,
  enumerable: false,
  get: productDetailIdentityHandleGetter,
} as const;

const optionalIdentityHandleAccessor = {
  configurable: true,
  enumerable: false,
  get: productDetailOptionalIdentityHandleGetter,
} as const;

const addressHandleAccessor = {
  configurable: true,
  enumerable: false,
  get: productDetailAddressHandleGetter,
} as const;

const provenanceHandleAccessor = {
  configurable: true,
  enumerable: false,
  get: productDetailProvenanceHandleGetter,
} as const;

/**
 * Bind a rich product-detail object to the materialized-product envelope that owns it.
 *
 * Detail models should only store domain facts. Handles that already live on the product envelope can be exposed through
 * getters backed by this weak association, which keeps hot detail objects from duplicating long handle strings.
 */
export function bindProductDetailEnvelope<TDetail>(
  detail: TDetail,
  product: MaterializedProduct,
): TDetail {
  if (detail == null || typeof detail !== 'object') {
    return detail;
  }
  const existing = productEnvelopeByDetail.get(detail);
  if (existing != null && existing.handle !== product.handle) {
    throw new Error(`Product detail is already bound to ${existing.handle}; cannot rebind to ${product.handle}.`);
  }
  productEnvelopeByDetail.set(detail, product);
  hideEnvelopeHandleEchoes(detail, product);
  return detail;
}

export function readProductDetailEnvelope(detail: unknown): MaterializedProduct | null {
  return detail == null || typeof detail !== 'object'
    ? null
    : productEnvelopeByDetail.get(detail) ?? null;
}

export function requireProductDetailEnvelope(
  detail: unknown,
  detailKind: string,
): MaterializedProduct {
  const product = readProductDetailEnvelope(detail);
  if (product == null) {
    throw new Error(`Product detail ${detailKind} is not bound to a materialized-product envelope.`);
  }
  return product;
}

export function productDetailHandle(
  detail: unknown,
  detailKind: string,
): ProductHandle {
  return requireProductDetailEnvelope(detail, detailKind).handle;
}

export function productDetailIdentityHandle(
  detail: unknown,
  detailKind: string,
): IdentityHandle {
  const identityHandle = requireProductDetailEnvelope(detail, detailKind).identityHandle;
  if (identityHandle == null) {
    throw new Error(`Product detail ${detailKind} is bound to a product without an identity handle.`);
  }
  return identityHandle;
}

export function productDetailOptionalIdentityHandle(
  detail: unknown,
  detailKind: string,
): IdentityHandle | null {
  return requireProductDetailEnvelope(detail, detailKind).identityHandle;
}

export function productDetailAddressHandle(
  detail: unknown,
  detailKind: string,
): AddressHandle | null {
  return requireProductDetailEnvelope(detail, detailKind).addressHandle;
}

export function productDetailRequiredAddressHandle(
  detail: unknown,
  detailKind: string,
): AddressHandle {
  const addressHandle = productDetailAddressHandle(detail, detailKind);
  if (addressHandle == null) {
    throw new Error(`Product detail ${detailKind} is bound to a product without an address handle.`);
  }
  return addressHandle;
}

export function productDetailProvenanceHandle(
  detail: unknown,
  detailKind: string,
): ProvenanceHandle {
  return requireProductDetailEnvelope(detail, detailKind).provenanceHandle;
}

function hideEnvelopeHandleEchoes(
  detail: object,
  product: MaterializedProduct,
): void {
  hideEnvelopeHandleEcho(detail, 'productHandle', product.handle, productHandleAccessor);
  hideEnvelopeHandleEcho(detail, 'identityHandle', product.identityHandle, identityHandleAccessor);
  hideEnvelopeHandleEcho(detail, 'primaryIdentityHandle', product.identityHandle, optionalIdentityHandleAccessor);
  hideEnvelopeHandleEcho(detail, 'sourceAddressHandle', product.addressHandle, addressHandleAccessor);
  hideEnvelopeHandleEcho(detail, 'addressHandle', product.addressHandle, addressHandleAccessor);
  hideEnvelopeHandleEcho(detail, 'hostAddressHandle', product.addressHandle, addressHandleAccessor);
  hideEnvelopeHandleEcho(detail, 'provenanceHandle', product.provenanceHandle, provenanceHandleAccessor);
}

function hideEnvelopeHandleEcho<TValue>(
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

function productDetailProductHandleGetter(this: object): ProductHandle {
  return requireProductDetailEnvelope(this, 'product detail').handle;
}

function productDetailIdentityHandleGetter(this: object): IdentityHandle {
  const identityHandle = requireProductDetailEnvelope(this, 'product detail').identityHandle;
  if (identityHandle == null) {
    throw new Error('Product detail is bound to a product without an identity handle.');
  }
  return identityHandle;
}

function productDetailOptionalIdentityHandleGetter(this: object): IdentityHandle | null {
  return requireProductDetailEnvelope(this, 'product detail').identityHandle;
}

function productDetailAddressHandleGetter(this: object): AddressHandle | null {
  return requireProductDetailEnvelope(this, 'product detail').addressHandle;
}

function productDetailProvenanceHandleGetter(this: object): ProvenanceHandle {
  return requireProductDetailEnvelope(this, 'product detail').provenanceHandle;
}

/** Hot in-memory catalog for typed product details keyed by durable product handles. */
export class ProductDetailCatalog {
  private readonly entriesByHandle = new Map<ProductHandle, ProductDetailEntry<unknown>>();
  private readonly handlesByDetailKind = new Map<string, Set<ProductHandle>>();
  private readonly handleOrder: ProductHandle[] = [];

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

    bindProductDetailEnvelope(detail, product);
    const entry = new ProductDetailEntry(product, slot, detail);
    this.entriesByHandle.set(productHandle, entry as ProductDetailEntry<unknown>);
    this.handleOrder.push(productHandle);
    this.addHandleForSlot(slot, productHandle);
    return entry;
  }

  /** Attach a typed detail collection whose members carry their own product handles. */
  addAll<TDetail extends ProductDetailWithHandle, TProductKind extends ProductKindKey>(
    slot: ProductDetailSlot<TDetail, TProductKind>,
    details: Iterable<TDetail>,
  ): readonly ProductDetailEntry<TDetail, TProductKind>[] {
    const entries: ProductDetailEntry<TDetail, TProductKind>[] = [];
    for (const detail of details) {
      entries.push(this.add(slot, detail.productHandle, detail));
    }
    return entries;
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

  /** Attach a detail collection unless each product already has the same slot. */
  addAllIfAbsent<TDetail extends ProductDetailWithHandle, TProductKind extends ProductKindKey>(
    slot: ProductDetailSlot<TDetail, TProductKind>,
    details: Iterable<TDetail>,
  ): readonly ProductDetailEntry<TDetail, TProductKind>[] {
    const entries: ProductDetailEntry<TDetail, TProductKind>[] = [];
    for (const detail of details) {
      entries.push(this.addIfAbsent(slot, detail.productHandle, detail));
    }
    return entries;
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

  readEntriesSince(marker: number): readonly ProductDetailEntry<unknown>[] {
    return this.handleOrder
      .slice(marker)
      .map((handle) => this.entriesByHandle.get(handle) ?? null)
      .filter((entry): entry is ProductDetailEntry<unknown> => entry != null);
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

  remove(productHandle: ProductHandle): ProductDetailEntry<unknown> | null {
    const entry = this.entriesByHandle.get(productHandle) ?? null;
    if (entry == null) {
      return null;
    }
    this.entriesByHandle.delete(productHandle);
    const handles = this.handlesByDetailKind.get(entry.slot.detailKind);
    handles?.delete(productHandle);
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
