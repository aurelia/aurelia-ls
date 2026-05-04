import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  MaterializationHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from './handles.js';
import type { ProductKindKey } from './vocabulary.js';

/** Owner of a materialization pass, such as a resource identity or source/template address. */
export type MaterializationOwnerHandle = IdentityHandle | AddressHandle;

/**
 * Concrete product envelope produced by a materialization phase.
 *
 * This envelope deliberately does not carry arbitrary product payload. Rich
 * product details live in domain-owned objects today and should move
 * into typed product-detail records or catalogs when durable inquiry expansion
 * needs them. Do not use this record as a shortcut for unmodeled semantics.
 */
export class MaterializedProduct {
  /** String discriminator for serialized materialized-product records. */
  readonly kind = 'materialized-product' as const;

  constructor(
    /** Store-local handle for this materialized product. */
    readonly handle: ProductHandle,
    /** Controlled vocabulary key describing the product kind. */
    readonly productKindKey: ProductKindKey,
    /** Optional semantic identity handle for the product when it can be referred to later. */
    readonly identityHandle: IdentityHandle | null,
    /** Optional navigation/explanation address handle for the product. */
    readonly addressHandle: AddressHandle | null,
    /** Provenance handle explaining why this product exists. */
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Result of one materialization phase, including products and unresolved pressure. */
export class MaterializationRecord {
  /** String discriminator for serialized materialization records. */
  readonly kind = 'materialization-record' as const;

  constructor(
    /** Store-local handle for this materialization record. */
    readonly handle: MaterializationHandle,
    /** Semantic or source owner handle being materialized. */
    readonly ownerHandle: MaterializationOwnerHandle,
    /** Product handles produced by this materialization. */
    readonly productHandles: readonly ProductHandle[] = [],
    /** Claim handles produced alongside or across products. */
    readonly claimHandles: readonly ClaimHandle[] = [],
    /** Open seam handles left for diagnostics, AI explanation, or later passes. */
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}
