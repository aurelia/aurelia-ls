import type {
  ClosabilityStatus,
  CompletenessFamily,
  LookupDomain,
  PositionFamily,
  PositionGatingTier,
  ResourceKind,
  SiteKind,
  TraitKind,
  WitnessFamily,
} from "../shared/enums.js";
import type { DegradationTargetCategory } from "../shared/degradation-targets.js";
import type { ExtensionIdentifier, GovernedClosureState } from "../shared/families.js";
import type { NodeKindTag } from "../shared/node-kinds.js";

export const CLAIM_FAMILY_CATEGORIES = [
  "resource-interface",
  "dependency-stage",
  "position-classification",
  "correctness",
  "witness-completeness",
  "governed-semantic",
] as const;

export type ClaimFamilyCategory = (typeof CLAIM_FAMILY_CATEGORIES)[number];

export const FAMILY_STATUSES = [
  "attractor-derived",
  "provisional",
  "open",
  "deferred",
  "extension",
] as const;

export type FamilyStatus = (typeof FAMILY_STATUSES)[number];

export const EVALUATOR_GROUP_IDS = [
  "observation",
  "subject-convergence",
  "admission",
  "scope",
  "template-interpretation",
] as const;

export type EvaluatorGroupId = (typeof EVALUATOR_GROUP_IDS)[number];

export const FAMILY_STAGE_VALUES = [
  "1",
  "2-4",
  "4-5",
  "3",
  "5",
  "6",
  "7",
  "9",
  "any",
  "open",
  "deferred",
] as const;

export type FamilyStage = (typeof FAMILY_STAGE_VALUES)[number];

export interface QueryableCatalog<TEntry, TKey extends string | number> {
  readonly entries: readonly TEntry[];
  readonly byKey: ReadonlyMap<TKey, TEntry>;
}

export interface ResourceKindDefinition {
  readonly kind: ResourceKind;
  readonly description: string;
  readonly identityFamilyId: string;
  readonly fieldFamilyId?: string;
  readonly declarationSurfaceIds: readonly string[];
  readonly localToOwner?: boolean;
}

export interface FieldSchemaDefinition {
  readonly schemaId: string;
  readonly resourceKind: ResourceKind;
  readonly fieldPath: string;
  readonly valueType: string;
  readonly owningFamilyId: string;
  readonly notes?: string;
}

export interface TraitSchemaDefinition {
  readonly traitKind: TraitKind;
  readonly valueType: string;
  readonly description: string;
  readonly notes?: string;
}

export interface GovernedSlotDefinition {
  readonly slotName: string;
  readonly valueType: string;
  readonly meaning: string;
}

export interface GovernedFamilyDefinition {
  readonly familyId: ExtensionIdentifier;
  readonly claimFamilyId: string;
  readonly description: string;
  readonly keyConstructor: string;
  readonly closureStates: readonly GovernedClosureState[];
  readonly dependencies: readonly string[];
  readonly slotNames: readonly string[];
  readonly slots: readonly GovernedSlotDefinition[];
}

export interface DeclarationSurfaceDefinition {
  readonly surfaceId: string;
  readonly description: string;
  readonly resourceKinds: readonly ResourceKind[];
}

export interface VocabularyEntryDefinition<TId extends string = string> {
  readonly id: TId;
  readonly meaning: string;
  readonly valueType?: string;
  readonly notes?: string;
}

export interface VocabularyCatalogDefinition<TId extends string = string> {
  readonly catalogId: string;
  readonly description: string;
  readonly source: string;
  readonly entries: readonly VocabularyEntryDefinition<TId>[];
}

export interface GrammarShapeDefinition {
  readonly classificationFamilyId: string;
  readonly gatingTier: PositionGatingTier;
  readonly description: string;
  readonly completenessFamily: CompletenessFamily;
  readonly positionFamilies: readonly PositionFamily[];
}

export interface PositionFamilyDefinition {
  readonly family: PositionFamily;
  readonly gatingTier: PositionGatingTier;
  readonly classificationFamilyId: string;
  readonly description: string;
}

export interface WitnessFamilyDefinition {
  readonly family: WitnessFamily;
  readonly claimFamilyId: string;
  readonly closability: ClosabilityStatus;
  readonly description: string;
}

export interface ScopeFamilyDefinition {
  readonly scopeId: "resource-scope" | "template-scope";
  readonly claimFamilyId: string;
  readonly completenessFamily: CompletenessFamily;
  readonly lookupLaw: string;
  readonly subjectKey: string;
  readonly dependencies: readonly string[];
}

export interface ClosureContractDefinition {
  readonly contractId: string;
  readonly familyId: string;
  readonly kind: "declaration-surface" | "support-bundle" | "completeness" | "governed";
  readonly closability: ClosabilityStatus;
  readonly description: string;
  readonly blockingDependencies: readonly string[];
  readonly degradationCategory?: DegradationTargetCategory;
}

export interface ClaimFamilyDefinition {
  readonly familyId: string;
  readonly ordinal: number;
  readonly category: ClaimFamilyCategory;
  readonly nodeKind: NodeKindTag;
  readonly keyConstructor: string;
  readonly stage: FamilyStage;
  readonly producingEvaluatorGroups: readonly EvaluatorGroupId[];
  readonly positiveAssertion: string;
  readonly entityFamily: string;
  readonly dependencies: readonly string[];
  readonly completenessConditions: string;
  readonly degradationTarget: string;
  readonly status: FamilyStatus;
  readonly incomingEdgeClasses: readonly string[];
  readonly sourceInputs?: string;
  readonly analysis?: string;
  readonly output?: string;
  readonly crossFamilyDependencies?: readonly string[];
  readonly correctnessConditions?: string;
}

export interface SubjectModelExtension {
  readonly extensionId: ExtensionIdentifier;
  readonly claimFamilies?: readonly ClaimFamilyDefinition[];
  readonly resourceKinds?: readonly ResourceKindDefinition[];
  readonly fieldSchemas?: readonly FieldSchemaDefinition[];
  readonly traitSchemas?: readonly TraitSchemaDefinition[];
  readonly governedFamilies?: readonly GovernedFamilyDefinition[];
  readonly declarationSurfaces?: readonly DeclarationSurfaceDefinition[];
  readonly vocabularies?: readonly VocabularyCatalogDefinition[];
  readonly grammarShapes?: readonly GrammarShapeDefinition[];
  readonly positionFamilies?: readonly PositionFamilyDefinition[];
  readonly witnessFamilies?: readonly WitnessFamilyDefinition[];
  readonly scopeFamilies?: readonly ScopeFamilyDefinition[];
  readonly closureContracts?: readonly ClosureContractDefinition[];
}

export interface SubjectModelRegistry {
  readonly claimFamilies: readonly ClaimFamilyDefinition[];
  readonly claimFamiliesById: ReadonlyMap<string, ClaimFamilyDefinition>;
  readonly claimFamiliesByNodeKind: ReadonlyMap<NodeKindTag, readonly ClaimFamilyDefinition[]>;
  readonly claimFamiliesByEvaluatorGroup: ReadonlyMap<EvaluatorGroupId, readonly ClaimFamilyDefinition[]>;
  readonly claimFamiliesByCategory: ReadonlyMap<ClaimFamilyCategory, readonly ClaimFamilyDefinition[]>;
  readonly resourceKinds: readonly ResourceKindDefinition[];
  readonly resourceKindsByKind: ReadonlyMap<ResourceKind, ResourceKindDefinition>;
  readonly fieldSchemas: readonly FieldSchemaDefinition[];
  readonly fieldSchemasById: ReadonlyMap<string, FieldSchemaDefinition>;
  readonly fieldSchemasByResourceKind: ReadonlyMap<ResourceKind, readonly FieldSchemaDefinition[]>;
  readonly traitSchemas: readonly TraitSchemaDefinition[];
  readonly traitSchemasByKind: ReadonlyMap<TraitKind, TraitSchemaDefinition>;
  readonly governedFamilies: readonly GovernedFamilyDefinition[];
  readonly governedFamiliesById: ReadonlyMap<string, GovernedFamilyDefinition>;
  readonly declarationSurfaces: readonly DeclarationSurfaceDefinition[];
  readonly declarationSurfacesById: ReadonlyMap<string, DeclarationSurfaceDefinition>;
  readonly vocabularies: readonly VocabularyCatalogDefinition[];
  readonly vocabulariesById: ReadonlyMap<string, VocabularyCatalogDefinition>;
  readonly grammarShapes: readonly GrammarShapeDefinition[];
  readonly grammarShapesByClassificationFamilyId: ReadonlyMap<string, GrammarShapeDefinition>;
  readonly positionFamilies: readonly PositionFamilyDefinition[];
  readonly positionFamiliesByFamily: ReadonlyMap<PositionFamily, PositionFamilyDefinition>;
  readonly witnessFamilies: readonly WitnessFamilyDefinition[];
  readonly witnessFamiliesByFamily: ReadonlyMap<WitnessFamily, WitnessFamilyDefinition>;
  readonly scopeFamilies: readonly ScopeFamilyDefinition[];
  readonly scopeFamiliesById: ReadonlyMap<string, ScopeFamilyDefinition>;
  readonly closureContracts: readonly ClosureContractDefinition[];
  readonly closureContractsById: ReadonlyMap<string, ClosureContractDefinition>;
  readonly extensions: readonly SubjectModelExtension[];
  readonly extensionFamilies: readonly ExtensionIdentifier[];
}
