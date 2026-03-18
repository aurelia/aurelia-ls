import type {
  BoundaryLevel,
  CompletenessFamily,
  LookupDomain,
  PositionFamily,
  ResourceKind,
  TraitKind,
} from "./enums.js";
import type { ExtensionIdentifier } from "./families.js";

export interface ResourceKey {
  readonly kind: ResourceKind;
  readonly canonicalName: string;
}

export interface AttributePatternKey {
  readonly kind: "attribute-pattern";
  readonly pattern: string;
  readonly symbols: readonly string[];
}

export interface LocalCustomElementKey {
  readonly kind: "local-custom-element";
  readonly ownerResourceKey: ResourceKey;
  readonly localName: string;
}

export type EntityKey = ResourceKey | AttributePatternKey | LocalCustomElementKey;

export interface BindableKey {
  readonly ownerResourceKey: ResourceKey;
  readonly propertyName: string;
}

export interface BindableTraitKey {
  readonly bindableKey: BindableKey;
  readonly traitKind: TraitKind;
}

export interface Position {
  readonly line: number;
  readonly character: number;
}

export interface OccurrenceAnchor {
  readonly documentUri: string;
  readonly position: Position;
}

export interface ConsultedContext {
  readonly scopeChainRef: string;
  readonly boundaryIdentifier: string;
}

export interface ConsultedWorld {
  readonly worldIdentifier: string;
  readonly boundaryIdentifier: string;
}

export interface OccurrenceKey {
  readonly consultedContext: ConsultedContext;
  readonly occurrenceAnchor: OccurrenceAnchor;
  readonly family: PositionFamily;
}

export interface LookupKey {
  readonly occurrenceKey: OccurrenceKey;
  readonly lookupDomain: LookupDomain;
  readonly lookupName: string;
}

export const RELATION_KINDS = [
  "duplicate-registration",
  "type-contradiction",
  "subject-derived-resource-misuse",
  "governed-resource-misuse",
  "controller-linkage",
  "binding-behavior-misuse",
  "binding-command-misuse",
  "semantic-non-iterable",
] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

export interface RelationKey {
  readonly lhsKey: EntityKey | OccurrenceKey;
  readonly rhsKey: EntityKey | OccurrenceKey | string;
  readonly relationKind: RelationKind;
}

export interface GovernedSemanticKey {
  readonly subjectKey: EntityKey;
  readonly governedFamily: ExtensionIdentifier;
}

export interface AdmissionKey {
  readonly consultedWorld: ConsultedWorld;
  readonly subjectKey: EntityKey;
}

export interface ReachabilityKey {
  readonly consultedContext: ConsultedContext;
  readonly subjectKey: EntityKey;
}

export interface CompletenessKeyContextSurface {
  readonly scopingPattern: "context-surface";
  readonly consultedContext: ConsultedContext;
  readonly surface: string;
  readonly completenessFamily: CompletenessFamily;
}

export interface CompletenessKeyWorldFamily {
  readonly scopingPattern: "world-family";
  readonly consultedWorld: ConsultedWorld;
  readonly resourceFamily: ResourceKind;
  readonly completenessFamily: CompletenessFamily;
}

export interface CompletenessKeyContextBoundary {
  readonly scopingPattern: "context-boundary";
  readonly consultedContext: ConsultedContext;
  readonly boundaryLevel: BoundaryLevel;
  readonly completenessFamily: CompletenessFamily;
}

export interface CompletenessKeyWorldResource {
  readonly scopingPattern: "world-resource";
  readonly consultedWorld: ConsultedWorld;
  readonly resourceKey: EntityKey;
  readonly completenessFamily: CompletenessFamily;
}

export interface CompletenessKeyContextType {
  readonly scopingPattern: "context-type";
  readonly consultedContext: ConsultedContext;
  readonly typeClosureBoundary: string;
  readonly completenessFamily: CompletenessFamily;
}

export interface CompletenessKeyWorldVocabulary {
  readonly scopingPattern: "world-vocabulary";
  readonly consultedWorld: ConsultedWorld;
  readonly vocabularyFamily: string;
  readonly completenessFamily: CompletenessFamily;
}

export type CompletenessKey =
  | CompletenessKeyContextSurface
  | CompletenessKeyWorldFamily
  | CompletenessKeyContextBoundary
  | CompletenessKeyWorldResource
  | CompletenessKeyContextType
  | CompletenessKeyWorldVocabulary;

export interface OpenBoundaryKey {
  readonly targetFamilyId: string;
  readonly subjectKey: EntityKey | OccurrenceKey;
  readonly blockedDependency: string;
}

export interface DeclarationWitnessKey {
  readonly subjectKey: EntityKey;
  readonly declarationFormSet: string;
}

export interface SupportBundleKey {
  readonly targetFamilyId: string;
  readonly subjectKey: EntityKey;
}
