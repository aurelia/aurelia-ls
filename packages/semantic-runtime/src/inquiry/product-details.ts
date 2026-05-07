import type {
  ClaimHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { MaterializedProduct } from '../kernel/materialization.js';
import type { ProductDetailEntry } from '../kernel/product-details.js';
import type { KernelStore } from '../kernel/store.js';
import {
  InquiryAnswer,
  InquiryContinuation,
  InquiryContinuationKind,
  InquiryExpansion,
  InquiryExpansionKind,
  InquiryOutcomeKind,
  InquiryProjection,
  InquiryProjectionKind,
} from './answer.js';
import { KernelExactBasis } from './basis.js';
import { KernelRecordInquiryLocus } from './locus.js';

export class ProductDetailQuery {
  readonly kind = 'product-detail' as const;

  constructor(
    /** Product handle whose typed detail should be expanded. */
    readonly productHandle: ProductHandle,
    /** Projection requested by the caller. */
    readonly projection: InquiryProjection = new InquiryProjection(InquiryProjectionKind.Detail),
  ) {}
}

export class ProductDetailResult {
  constructor(
    /** Durable materialized-product envelope. */
    readonly product: MaterializedProduct,
    /** Typed in-memory detail sidecar, when the producing layer registered one. */
    readonly detailEntry: ProductDetailEntry<unknown> | null,
  ) {}
}

/** Expand a materialized-product handle through the typed hot detail catalog. */
export function answerProductDetail(
  store: KernelStore,
  query: ProductDetailQuery,
): InquiryAnswer<ProductDetailResult | null, ProductDetailQuery> {
  const locus = new KernelRecordInquiryLocus(query.productHandle);
  const product = store.readProduct(query.productHandle);
  if (product == null) {
    return missingProductDetailAnswer(query, locus);
  }

  const detailEntry = store.productDetails.readEntry(query.productHandle);
  const result = new ProductDetailResult(product, detailEntry);
  const claimHandles = productDetailClaimHandles(store, product);

  return new InquiryAnswer(
    productDetailOutcome(detailEntry),
    locus,
    productDetailSummary(product, detailEntry),
    KernelExactBasis,
    result,
    [],
    [product.provenanceHandle],
    claimHandles,
    [],
    productDetailContinuations(query, claimHandles),
    null,
    productDetailProjection(query, product, detailEntry),
  );
}

function missingProductDetailAnswer(
  query: ProductDetailQuery,
  locus: KernelRecordInquiryLocus,
): InquiryAnswer<ProductDetailResult | null, ProductDetailQuery> {
  return new InquiryAnswer(
    InquiryOutcomeKind.Miss,
    locus,
    'No materialized product exists for the selected handle.',
    KernelExactBasis,
    null,
    [],
    [],
    [],
    [],
    [],
    null,
    query.projection,
  );
}

function productDetailClaimHandles(
  store: KernelStore,
  product: MaterializedProduct,
): readonly ClaimHandle[] {
  return unique([
    ...store.readClaimsForSubject(product.handle),
    ...store.readClaimsForObject(product.handle),
  ]);
}

function productDetailOutcome(
  detailEntry: ProductDetailEntry<unknown> | null,
): InquiryOutcomeKind {
  return detailEntry == null ? InquiryOutcomeKind.Partial : InquiryOutcomeKind.Hit;
}

function productDetailSummary(
  product: MaterializedProduct,
  detailEntry: ProductDetailEntry<unknown> | null,
): string {
  return detailEntry == null
    ? `Product ${product.handle} has no typed detail registered.`
    : `Expanded ${detailEntry.slot.detailKind} for ${product.handle}.`;
}

function productDetailProjection(
  query: ProductDetailQuery,
  product: MaterializedProduct,
  detailEntry: ProductDetailEntry<unknown> | null,
): InquiryProjection {
  return new InquiryProjection(
    detailEntry == null ? InquiryProjectionKind.Handles : query.projection.projectionKind,
    [
      new InquiryExpansion(
        InquiryExpansionKind.ProductDetail,
        [product.handle],
        [product.handle],
        productDetailExpansionSummary(detailEntry),
      ),
    ],
  );
}

function productDetailExpansionSummary(
  detailEntry: ProductDetailEntry<unknown> | null,
): string {
  return detailEntry == null
    ? 'The product envelope is present, but no typed detail is registered for this product.'
    : `Expanded product detail slot ${detailEntry.slot.detailKind}.`;
}

function productDetailContinuations(
  query: ProductDetailQuery,
  claimHandles: readonly ClaimHandle[],
): readonly InquiryContinuation<ProductDetailQuery>[] {
  return claimHandles.length === 0
    ? []
    : [
      new InquiryContinuation(
        InquiryContinuationKind.InspectClaimNeighborhood,
        'Inspect claims adjacent to this product.',
        query,
      ),
    ];
}

function unique<TValue>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}
