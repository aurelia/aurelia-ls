import type { ProductHandle } from '../kernel/handles.js';
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

  const detailEntry = store.productDetails.readEntry(query.productHandle);
  const result = new ProductDetailResult(product, detailEntry);
  const claimHandles = unique([
    ...store.readClaimsForSubject(product.handle),
    ...store.readClaimsForObject(product.handle),
  ]);
  const provenanceHandles = [product.provenanceHandle];
  const projection = new InquiryProjection(
    detailEntry == null ? InquiryProjectionKind.Handles : query.projection.projectionKind,
    [
      new InquiryExpansion(
        InquiryExpansionKind.ProductDetail,
        [product.handle],
        [product.handle],
        detailEntry == null
          ? 'The product envelope is present, but no typed detail is registered for this product.'
          : `Expanded product detail slot ${detailEntry.slot.detailKind}.`,
      ),
    ],
  );
  const continuations = claimHandles.length === 0
    ? []
    : [
      new InquiryContinuation(
        InquiryContinuationKind.InspectClaimNeighborhood,
        'Inspect claims adjacent to this product.',
        query,
      ),
    ];

  return new InquiryAnswer(
    detailEntry == null ? InquiryOutcomeKind.Partial : InquiryOutcomeKind.Hit,
    locus,
    detailEntry == null
      ? `Product ${product.handle} has no typed detail registered.`
      : `Expanded ${detailEntry.slot.detailKind} for ${product.handle}.`,
    KernelExactBasis,
    result,
    [],
    provenanceHandles,
    claimHandles,
    [],
    continuations,
    null,
    projection,
  );
}

function unique<TValue>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}
