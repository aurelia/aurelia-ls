import type {
  AddressHandle,
  ClaimHandle,
  DerivationHandle,
  IdentityHandle,
  MaterializationHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from './handles.js';
import type { DerivationPhase } from './derivation.js';
import type { ProductKindKey } from './vocabulary.js';

export const enum MaterializationRecordKind {
  /** One concrete product produced by a materialization phase. */
  MaterializedProduct = 'materialized-product',
  /** The full result of materializing products, claims, derivations, and open seams. */
  MaterializationRecord = 'materialization-record',
}

export const enum MaterializationState {
  /** Use when materialization state has not been classified. */
  Unknown = 'unknown',
  /** All expected products were produced for the materialization phase. */
  Complete = 'complete',
  /** Useful products were produced, but some expected details remain open. */
  Partial = 'partial',
  /** The materialization mainly records unresolved pressure rather than final products. */
  Open = 'open',
  /** Products or derivations are invalid because required inputs or rules failed. */
  Invalid = 'invalid',
}

/** Owner of a materialization pass, such as a resource identity or source/template address. */
export type MaterializationOwnerHandle = IdentityHandle | AddressHandle;

/**
 * Concrete product envelope produced by a materialization phase.
 *
 * This envelope deliberately does not carry arbitrary product payload. Rich
 * product details live in producer-owned domain objects today and should move
 * into typed product-detail records or catalogs when durable inquiry expansion
 * needs them. Do not use this record as a shortcut for unmodeled semantics.
 */
export class MaterializedProduct {
  /** String discriminator for serialized materialized-product records. */
  readonly kind = MaterializationRecordKind.MaterializedProduct;

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
    /** Claim handles asserted by or about this product. */
    readonly claimHandles: readonly ClaimHandle[] = [],
  ) {}
}

/** Result of one materialization phase, including products and unresolved pressure. */
export class MaterializationRecord {
  /** String discriminator for serialized materialization records. */
  readonly kind = MaterializationRecordKind.MaterializationRecord;

  constructor(
    /** Store-local handle for this materialization record. */
    readonly handle: MaterializationHandle,
    /** Analysis phase that produced this materialization. */
    readonly phase: DerivationPhase,
    /** Semantic or source owner handle being materialized. */
    readonly ownerHandle: MaterializationOwnerHandle,
    /** Completeness/outcome state of the materialization result. */
    readonly state: MaterializationState,
    /** Product handles produced by this materialization. */
    readonly productHandles: readonly ProductHandle[] = [],
    /** Claim handles produced alongside or across products. */
    readonly claimHandles: readonly ClaimHandle[] = [],
    /** Derivation handles that explain how the materialization happened. */
    readonly derivationHandles: readonly DerivationHandle[] = [],
    /** Open seam handles left for diagnostics, AI explanation, or later passes. */
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}
