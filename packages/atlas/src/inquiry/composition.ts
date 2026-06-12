import type { BasisKind } from "./basis.js";
import type { LensId } from "./lens.js";
import type { SourceRange } from "./locus.js";
import type {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
} from "../framework/relationships.js";
import type {
  AuLinkFrameworkTargetStatus,
  SourceDeclarationKind,
} from "../source/index.js";

/** Schema marker for answers that expose entity-centered claim composition. */
export const SEMANTIC_COMPOSITION_SCHEMA_VERSION =
  "atlas-semantic-composition-v0" as const;

/** Composition entity kinds that do not come directly from framework endpoints or TypeScript declarations. */
export const SemanticEntityKind = {
  /** Semantic-runtime class that carries an auLink mirror anchor. */
  ProductClass: "product-class",
  /** Framework symbol referenced by an auLink id before an exact declaration candidate is known. */
  FrameworkTarget: "framework-target",
  /** Framework-side symbol identity used for stable actor ids across type/value declaration pairs. */
  FrameworkSymbol: "framework-symbol",
} as const;

/** Composition endpoint kind vocabulary. */
export type SemanticEntityKind =
  | FrameworkRelationshipEndpointKind
  | SourceDeclarationKind
  | (typeof SemanticEntityKind)[keyof typeof SemanticEntityKind];

/** Stable reference to one semantic actor or claim endpoint. */
export interface SemanticEntityRef {
  /** Stable answer-local entity id. */
  readonly id: string;
  /** Controlled endpoint kind such as symbol, method, di-key, resource, declaration kind, or product-class. */
  readonly kind: SemanticEntityKind;
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

/** Composition-only claim families that are not produced by framework relationship atoms. */
export const SemanticClaimFamily = {
  /** Product-to-framework mirror claims emitted from auLink anchors. */
  Bridge: "bridge",
} as const;

/** Claim family; framework families stay in the framework enum and composition adds only non-framework bridges. */
export type SemanticClaimFamily =
  | FrameworkRelationshipFamily
  | (typeof SemanticClaimFamily)[keyof typeof SemanticClaimFamily];

/** Answer-level predicates that do not originate in a framework relationship enum. */
export const SemanticClaimPredicate = {
  MirrorsFrameworkTarget: "mirrors-framework-target",
} as const;

/** Signed predicate asserted from subject to object. */
export type SemanticClaimPredicate =
  | FrameworkRelationshipRelation
  | (typeof SemanticClaimPredicate)[keyof typeof SemanticClaimPredicate];

/** Answer-level mechanisms that do not originate in a framework relationship enum. */
export const SemanticClaimMechanism = {
  AuLink: "aulink",
} as const;

/** Answer-level claim mechanism; framework mechanisms are preserved by value and bridge mechanisms are explicit. */
export type SemanticClaimMechanism =
  | FrameworkRelationshipMechanism
  | (typeof SemanticClaimMechanism)[keyof typeof SemanticClaimMechanism];

/** Answer-level phases that do not originate in a framework relationship enum. */
export const SemanticClaimPhase = {
  SemanticMapping: "semantic-mapping",
} as const;

/** Answer-level claim phase; framework phases are preserved by value and bridge phases are explicit. */
export type SemanticClaimPhase =
  | FrameworkRelationshipPhase
  | (typeof SemanticClaimPhase)[keyof typeof SemanticClaimPhase];

/** Answer-level claim closure; framework closure and auLink target status are the current producing vocabularies. */
export type SemanticClaimClosure =
  | FrameworkRelationshipClosure
  | AuLinkFrameworkTargetStatus;

/** One signed semantic claim in an answer-level composition graph. */
export interface SemanticClaim {
  /** Stable claim id in the current source basis. */
  readonly id: string;
  /** Broad domain family that owns this claim, such as di, rendering, lifecycle, bridge, or product. */
  readonly family: SemanticClaimFamily;
  /** Signed predicate asserted from subject to object. */
  readonly predicate: SemanticClaimPredicate;
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
  readonly sourceLens: LensId;
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
