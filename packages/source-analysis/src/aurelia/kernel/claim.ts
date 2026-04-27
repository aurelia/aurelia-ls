import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from './handles.js';
import type { KernelVocabularyKey } from './vocabulary.js';

export const enum ClaimRecordKind {
  /** A single typed assertion about the app or framework semantics. */
  SemanticClaim = 'semantic-claim',
  /** A compact grouping of claims that should be cached or projected together. */
  ClaimSet = 'claim-set',
}

/** App-semantic endpoint for a claim edge; predicate vocabulary defines the directional meaning. */
export type ClaimEndpointHandle = AddressHandle | IdentityHandle | ProductHandle;

/** Typed assertion that records one semantic relationship and the provenance for why it exists. */
export class SemanticClaim {
  /** String discriminator for serialized semantic-claim records. */
  readonly kind = ClaimRecordKind.SemanticClaim;

  constructor(
    /** Store-local handle for this claim record. */
    readonly handle: ClaimHandle,
    /** Subject being described by the claim. */
    readonly subjectHandle: ClaimEndpointHandle,
    /** Controlled vocabulary key describing the relationship being asserted. */
    readonly predicateKey: KernelVocabularyKey,
    /** Target endpoint of the assertion. */
    readonly objectHandle: ClaimEndpointHandle,
    /** Provenance handle explaining why this claim exists. */
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Group of related claims produced by one scan, materialization, or projection boundary. */
export class ClaimSet {
  /** String discriminator for serialized claim-set records. */
  readonly kind = ClaimRecordKind.ClaimSet;

  constructor(
    /** Store-local handle for this claim set. */
    readonly handle: ClaimHandle,
    /** Claim handles that should travel together for this boundary. */
    readonly claimHandles: readonly ClaimHandle[] = [],
    /** Optional summary for AI-readable app maps and debugging views. */
    readonly summary: string | null = null,
  ) {}
}
