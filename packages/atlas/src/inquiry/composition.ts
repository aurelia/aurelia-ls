import type { BasisKind } from "./basis.js";
import type { SourceRange } from "./locus.js";

/** Schema marker for answers that expose entity-centered claim composition. */
export const SEMANTIC_COMPOSITION_SCHEMA_VERSION =
  "atlas-semantic-composition-v0" as const;

/** Stable reference to one semantic actor or claim endpoint. */
export interface SemanticEntityRef {
  /** Stable answer-local entity id. */
  readonly id: string;
  /** Domain-local endpoint kind such as symbol, method, di-key, resource, or product-class. */
  readonly kind: string;
  /** Human-readable actor or endpoint name. */
  readonly name: string;
  /** Package id when the entity is framework or product source-backed. */
  readonly packageId?: string;
  /** Package name when available. */
  readonly packageName?: string;
  /** Exact source declaration or expression when available. */
  readonly source?: SourceRange;
  /** Alternate names that should be considered part of this actor in the answer. */
  readonly aliases?: readonly string[];
}

/** Answer-level claim family; source substrates may use framework, product, bridge, or app-specific families. */
export type SemanticClaimFamily = string;

/** Answer-level claim mechanism; source substrates may map this from their own mechanism vocabulary. */
export type SemanticClaimMechanism = string;

/** Answer-level claim phase; source substrates may map this from their own phase vocabulary. */
export type SemanticClaimPhase = string;

/** Answer-level claim closure; source substrates may map this from their own closure/status vocabulary. */
export type SemanticClaimClosure = string;

/** One signed semantic claim in an answer-level composition graph. */
export interface SemanticClaim {
  /** Stable claim id in the current source basis. */
  readonly id: string;
  /** Broad domain family that owns this claim, such as di, rendering, lifecycle, bridge, or product. */
  readonly family: SemanticClaimFamily;
  /** Signed predicate asserted from subject to object. */
  readonly predicate: string;
  /** Source/runtime mechanism, when the producing substrate has one. */
  readonly mechanism?: SemanticClaimMechanism;
  /** Semantic or runtime phase, when the producing substrate has one. */
  readonly phase?: SemanticClaimPhase;
  /** Package id that owns the source evidence for the claim. */
  readonly packageId?: string;
  /** Package name that owns the source evidence for the claim. */
  readonly packageName?: string;
  /** Subject endpoint for the claim. */
  readonly subject: SemanticEntityRef;
  /** Object endpoint for the claim. */
  readonly object: SemanticEntityRef;
  /** Lens that owns the row this claim was projected from. */
  readonly sourceLens: string;
  /** Projection that owns the row this claim was projected from. */
  readonly sourceProjection: string;
  /** Basis kinds that support the claim. */
  readonly basis: readonly BasisKind[];
  /** Closure/evidence class from the source substrate, when available. */
  readonly closure?: SemanticClaimClosure;
  /** Exact source evidence for the claim. */
  readonly source?: SourceRange;
  /** Source row id before answer-level normalization. */
  readonly sourceRowId?: string;
  /** Grounded claim summary. */
  readonly summary: string;
}

/** Actor row returned by composition lenses. */
export interface SemanticActorRow extends SemanticEntityRef {
  /** Number of returned claims where this actor appears as subject or object. */
  readonly claimCount: number;
  /** Claim families touching this actor. */
  readonly claimFamilies: Readonly<Record<string, number>>;
  /** auLink ids touching this actor when known. */
  readonly auLinkIds: readonly string[];
  /** Human-facing actor summary. */
  readonly summary: string;
}

/** Shared answer payload shape for entity-centered semantic composition. */
export interface SemanticCompositionValue {
  /** Schema marker for composition consumers. */
  readonly schemaVersion: typeof SEMANTIC_COMPOSITION_SCHEMA_VERSION;
  /** Query terms that selected the returned induced graph. */
  readonly queryTerms: readonly string[];
  /** Number of actors after filtering. */
  readonly actorCount: number;
  /** Number of claims after filtering. */
  readonly claimCount: number;
  /** Claim counts grouped by broad family. */
  readonly claimFamilies: Readonly<Record<string, number>>;
  /** Claim counts grouped by predicate. */
  readonly predicates: Readonly<Record<string, number>>;
  /** Claim counts grouped by phase when present. */
  readonly phases: Readonly<Record<string, number>>;
  /** Actor rows, when projected. */
  readonly actors?: readonly SemanticActorRow[];
  /** Signed claim rows, when projected. */
  readonly claims?: readonly SemanticClaim[];
}
