import { KernelPublicationSurface } from './publication-surface.js';
import type { ProductKindKey } from './vocabulary.js';

declare const productDetailDescriptorBrand: unique symbol;
declare const hotDetailDescriptorBrand: unique symbol;

/** Inert identity for one typed product-detail occupancy, independent from its executable projector. */
export class ProductDetailDescriptor<
  TDetail,
  TProductKind extends ProductKindKey = ProductKindKey,
> {
  declare readonly [productDetailDescriptorBrand]: TDetail;
  readonly surface = KernelPublicationSurface.ProductDetail;

  constructor(
    /** Product kind whose materialized-product envelope this detail may hydrate. */
    readonly productKindKey: TProductKind,
    /** Stable detail kind used by exact reads, validation, and dependency indexes. */
    readonly detailKind: string,
    /** Human/AI-readable explanation of the detail contract. */
    readonly summary: string,
  ) {
    Object.freeze(this);
  }
}

/** Inert identity for one typed hot-detail occupancy, independent from its executable projector. */
export class HotDetailDescriptor<
  TDetail,
  TOwnerProductKind extends ProductKindKey = ProductKindKey,
> {
  declare readonly [hotDetailDescriptorBrand]: TDetail;
  readonly surface = KernelPublicationSurface.HotDetail;

  constructor(
    /** Product kind whose materialized envelope owns this child detail. */
    readonly ownerProductKindKey: TOwnerProductKind,
    /** Stable detail kind used by exact reads, validation, and dependency indexes. */
    readonly detailKind: string,
    /** Human/AI-readable explanation of the hot-detail contract. */
    readonly summary: string,
  ) {
    Object.freeze(this);
  }
}

export function defineProductDetailDescriptor<
  TDetail,
  TProductKind extends ProductKindKey = ProductKindKey,
>(
  productKindKey: TProductKind,
  detailKind: string,
  summary: string,
): ProductDetailDescriptor<TDetail, TProductKind> {
  return new ProductDetailDescriptor(productKindKey, detailKind, summary);
}

export function defineHotDetailDescriptor<
  TDetail,
  TOwnerProductKind extends ProductKindKey = ProductKindKey,
>(
  ownerProductKindKey: TOwnerProductKind,
  detailKind: string,
  summary: string,
): HotDetailDescriptor<TDetail, TOwnerProductKind> {
  return new HotDetailDescriptor(ownerProductKindKey, detailKind, summary);
}
