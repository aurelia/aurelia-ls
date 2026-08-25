import type {
  ClaimHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { MaterializedProduct } from '../kernel/materialization.js';
import type { ProductDetailEntry } from '../kernel/product-details.js';
import type { KernelStore } from '../kernel/store.js';
import {
  InquiryAnswer,
  InquiryAnswerCoverage,
  InquiryAnswerResult,
  InquiryAnswerSelection,
  InquiryContinuation,
  InquiryContinuationKind,
  InquiryExpansion,
  InquiryExpansionKind,
  InquiryProjection,
  InquiryProjectionKind,
} from './answer.js';
import { KernelExactBasis } from './basis.js';
import { uniqueValues } from '../collections.js';
import { KernelRecordInquiryLocus } from './locus.js';
import { CLAIM_NEIGHBORHOOD_CONTINUATION } from './continuation-intent.js';

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

/** Expand a materialized-product handle through the typed product-detail catalog. */
export function answerProductDetail(
  store: KernelStore,
  query: ProductDetailQuery,
): InquiryAnswer<ProductDetailResult | null, ProductDetailQuery> {
  const locus = new KernelRecordInquiryLocus(query.productHandle);
  const detailEntry = store.productDetails.readEntry(query.productHandle);
  const product = detailEntry?.product ?? store.readProduct(query.productHandle);
  if (product == null) {
    return missingProductDetailAnswer(query, locus);
  }

  const result = new ProductDetailResult(product, detailEntry);
  const claimHandles = productDetailClaimHandles(store, product);

  return new InquiryAnswer({
    result: InquiryAnswerResult.Answered,
    selection: InquiryAnswerSelection.Exact,
    coverage: detailEntry == null
      ? InquiryAnswerCoverage.Open
      : InquiryAnswerCoverage.Complete,
    locus,
    summary: productDetailSummary(product, detailEntry),
    basis: KernelExactBasis,
    value: result,
    provenanceHandles: [product.provenanceHandle],
    claimHandles,
    continuations: productDetailContinuations(query, claimHandles),
    projection: productDetailProjection(query, product, detailEntry),
  });
}

function missingProductDetailAnswer(
  query: ProductDetailQuery,
  locus: KernelRecordInquiryLocus,
): InquiryAnswer<ProductDetailResult | null, ProductDetailQuery> {
  return new InquiryAnswer({
    result: InquiryAnswerResult.Answered,
    selection: InquiryAnswerSelection.Absent,
    coverage: InquiryAnswerCoverage.Complete,
    locus,
    summary: 'No materialized product exists for the selected handle.',
    basis: KernelExactBasis,
    value: null,
    projection: query.projection,
  });
}

function productDetailClaimHandles(
  store: KernelStore,
  product: MaterializedProduct,
): readonly ClaimHandle[] {
  return uniqueValues([
    ...store.readClaimsForSubject(product.handle),
    ...store.readClaimsForObject(product.handle),
  ]);
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
        CLAIM_NEIGHBORHOOD_CONTINUATION,
      ),
    ];
}
