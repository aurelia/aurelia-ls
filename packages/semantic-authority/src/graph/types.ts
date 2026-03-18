import type { CompletenessFamily, ReferenceKind } from "../shared/enums.js";
import type {
  AdmissionKey,
  BoundaryKey,
  BindableKey,
  BindableTraitKey,
  ConsultedWorld,
  DeclarationWitnessKey,
  GovernedSemanticKey,
  LookupKey,
  OccurrenceAnchor,
  OccurrenceKey,
  OpenBoundaryKey,
  ReachabilityKey,
  RelationKey,
  ResourceKey,
  SupportBundleKey,
} from "../shared/keys.js";
import type {
  ClaimState,
  DegradationTarget,
  FamilyTag,
  RetentionTier,
  RevisionToken,
  ValidityState,
} from "../shared/types.js";

export interface FieldFactKey {
  readonly keyKind: "field-fact";
  readonly resourceKey: ResourceKey;
  readonly fieldPath: string;
}

export interface VocabularyEntryKey {
  readonly keyKind: "vocabulary-entry";
  readonly vocabularyFamily: string;
  readonly entryIdentity: string;
}

export interface ObservationKey {
  readonly keyKind: "observation";
  readonly documentUri: string;
  readonly position: OccurrenceAnchor;
  readonly sourceSurface: string;
}

export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

export interface ReferenceSite {
  readonly documentUri: string;
  readonly span: TextSpan;
  readonly siteKind: string;
}

export interface ReferenceEntryKey {
  readonly keyKind: "reference-entry";
  readonly subjectEntityKey: GraphEntityKey;
  readonly referenceKind: ReferenceKind;
  readonly site: ReferenceSite;
}

export interface BridgeArtifactKey {
  readonly keyKind: "bridge-artifact";
  readonly entityKey: GraphEntityKey;
  readonly artifactKind: string;
}

export interface CompletenessKey {
  readonly keyKind: "completeness";
  readonly boundaryKey: BoundaryKey;
  readonly completenessFamily: CompletenessFamily;
}

export type GraphEntityKey =
  | ResourceKey
  | FieldFactKey
  | BindableKey
  | BindableTraitKey
  | OccurrenceKey
  | VocabularyEntryKey;

export type NodeKey =
  | ResourceKey
  | FieldFactKey
  | BindableKey
  | BindableTraitKey
  | AdmissionKey
  | ReachabilityKey
  | OccurrenceKey
  | LookupKey
  | RelationKey
  | ObservationKey
  | DeclarationWitnessKey
  | SupportBundleKey
  | CompletenessKey
  | GovernedSemanticKey
  | OpenBoundaryKey
  | ReferenceEntryKey
  | BridgeArtifactKey;

export const NODE_KIND_TAGS = [
  "resource-identity",
  "field-fact",
  "bindable-identity",
  "bindable-trait",
  "admission",
  "reachability",
  "position-classification",
  "correctness-finding",
  "open-boundary",
  "witness",
  "completeness-witness",
  "governed-semantic",
  "observation",
  "reference-entry",
  "bridge-artifact",
] as const;

export type NodeKindTag = (typeof NODE_KIND_TAGS)[number];

export interface ClaimNodeBase {
  readonly key: NodeKey;
  readonly nodeKind: NodeKindTag;
  readonly familyTag: FamilyTag;
  claimState: ClaimState;
  validityState: ValidityState;
  revisionToken: RevisionToken;
  retentionTier: RetentionTier;
}

export interface GraphNodeIdentity {
  readonly key: NodeKey;
  readonly nodeKind: NodeKindTag;
}

export interface ConsultedWorldScope {
  readonly consultedWorld: ConsultedWorld;
}

export interface DegradableNode {
  readonly degradationTarget: DegradationTarget | null;
}
