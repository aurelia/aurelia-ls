import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from './handles.js';
import type { ClaimPredicateKey } from './vocabulary.js';

/** App-semantic endpoint for a claim edge; predicate vocabulary defines the directional meaning. */
export type ClaimEndpointHandle = AddressHandle | IdentityHandle | ProductHandle;

/** Typed assertion that records one semantic relationship and the provenance for why it exists. */
export class SemanticClaim {
  /** String discriminator for serialized semantic-claim records. */
  readonly kind = 'semantic-claim' as const;

  constructor(
    /** Store-local handle for this claim record. */
    readonly handle: ClaimHandle,
    /** Subject being described by the claim. */
    readonly subjectHandle: ClaimEndpointHandle,
    /** Controlled vocabulary key describing the relationship being asserted. */
    readonly predicateKey: ClaimPredicateKey,
    /** Target endpoint of the assertion. */
    readonly objectHandle: ClaimEndpointHandle,
    /** Provenance handle explaining why this claim exists. */
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

export function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
}

export function nullableClaim(claim: SemanticClaim | null): readonly SemanticClaim[] {
  return claim == null ? [] : [claim];
}
