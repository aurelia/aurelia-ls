import type {
  CompletenessFamily,
  LookupDomain,
  ReferenceKind,
  ResourceKind,
  TraitKind,
} from "../shared/enums.js";
import type {
  BoundaryKey,
  ConsultedContext,
  ConsultedWorld,
  OccurrenceAnchor,
} from "../shared/keys.js";
import type { KnownGovernedFamilyId } from "../shared/families.js";
import type { FamilyTag } from "../shared/types.js";

export interface ResourceKey {
  readonly keyKind: "resource";
  readonly resourceKind: ResourceKind;
  readonly canonicalName: string;
  readonly ownerKey: ResourceKey | null;
}

export interface FieldFactKey {
  readonly keyKind: "field-fact";
  readonly resourceKey: ResourceKey;
  readonly fieldPath: string;
}

export interface BindableKey {
  readonly keyKind: "bindable";
  readonly ownerResourceKey: ResourceKey;
  readonly propertyName: string;
}

export interface BindableTraitKey {
  readonly keyKind: "bindable-trait";
  readonly bindableKey: BindableKey;
  readonly traitKind: TraitKind;
}

export interface VocabularyEntryKey {
  readonly keyKind: "vocabulary-entry";
  readonly vocabularyFamily: string;
  readonly entryIdentity: string;
}

export interface TemplateScopeSubjectKey {
  readonly occurrenceAnchor: OccurrenceAnchor;
  readonly identifierOrReferentKey: string;
}

export interface AdmissionKey {
  readonly keyKind: "admission";
  readonly consultedWorld: ConsultedWorld;
  readonly subjectKey: ResourceKey | VocabularyEntryKey;
}

export interface ReachabilityKey {
  readonly keyKind: "reachability";
  readonly consultedContext: ConsultedContext;
  readonly subjectKey: ResourceKey | TemplateScopeSubjectKey;
}

export interface OccurrenceKey {
  readonly keyKind: "occurrence";
  readonly consultedContext: ConsultedContext;
  readonly occurrenceAnchor: OccurrenceAnchor;
  readonly family: string;
}

export interface LookupKey {
  readonly keyKind: "lookup";
  readonly occurrenceKey: OccurrenceKey;
  readonly lookupFamily: LookupDomain;
  readonly lookupTarget: string;
}

export interface RelationKey {
  readonly keyKind: "relation";
  readonly sourceKey: GraphEntityKey;
  readonly targetKey: GraphEntityKey;
  readonly relationKind: string;
}

export interface ObservationKey {
  readonly keyKind: "observation";
  readonly documentUri: string;
  readonly position: OccurrenceAnchor;
  readonly sourceSurface: string;
}

export interface DeclarationWitnessKey {
  readonly keyKind: "declaration-witness";
  readonly subjectKey: GraphEntityKey;
  readonly declarationFormSet: string;
}

export interface SupportBundleKey {
  readonly keyKind: "support-bundle";
  readonly targetFamilyId: FamilyTag;
  readonly subjectKey: GraphEntityKey;
}

export interface CompletenessKey {
  readonly keyKind: "completeness";
  readonly boundaryKey: BoundaryKey;
  readonly completenessFamily: CompletenessFamily;
}

export interface GovernedSemanticKey {
  readonly keyKind: "governed-semantic";
  readonly resourceKey: ResourceKey;
  readonly governedFamily: KnownGovernedFamilyId;
}

export interface OpenBoundaryKey {
  readonly keyKind: "open-boundary";
  readonly targetFamilyId: FamilyTag;
  readonly subjectKey: GraphEntityKey;
  readonly blockedDependency: string;
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

export function serializeGraphResourceKey(key: ResourceKey): string {
  switch (key.resourceKind) {
    case "local-custom-element":
      if (key.ownerKey == null) {
        throw new Error("Graph local-custom-element ResourceKey requires ownerKey.");
      }

      return `resource:local-custom-element:${serializeGraphResourceKey(key.ownerKey)}/${key.canonicalName}`;
    case "attribute-pattern":
      return `resource:attribute-pattern:${key.canonicalName}`;
    default:
      return `resource:${key.resourceKind}:${key.canonicalName}`;
  }
}

export function serializeGraphFieldFactKey(key: FieldFactKey): string {
  return `field:${serializeGraphResourceKey(key.resourceKey)}:${key.fieldPath}`;
}

export function serializeGraphBindableKey(key: BindableKey): string {
  return `bindable:${serializeGraphResourceKey(key.ownerResourceKey)}:${key.propertyName}`;
}

export function serializeGraphBindableTraitKey(key: BindableTraitKey): string {
  return `bindable-trait:${serializeGraphBindableKey(key.bindableKey)}:${key.traitKind}`;
}

export function serializeGraphVocabularyEntryKey(key: VocabularyEntryKey): string {
  return `vocabulary-entry:${key.vocabularyFamily}:${key.entryIdentity}`;
}

export function serializeGraphAdmissionKey(key: AdmissionKey): string {
  return `admission:${key.consultedWorld}:${serializeGraphAdmissionSubjectKey(key.subjectKey)}`;
}

export function serializeGraphTemplateScopeSubjectKey(key: TemplateScopeSubjectKey): string {
  return `template-scope:${key.occurrenceAnchor}:${key.identifierOrReferentKey}`;
}

export function serializeGraphReachabilityKey(key: ReachabilityKey): string {
  return `reach:${key.consultedContext}:${serializeGraphReachabilitySubjectKey(key.subjectKey)}`;
}

export function serializeGraphOccurrenceKey(key: OccurrenceKey): string {
  return `occ:${key.consultedContext}:${key.occurrenceAnchor}:${key.family}`;
}

export function serializeGraphLookupKey(key: LookupKey): string {
  return `lookup:${serializeGraphOccurrenceKey(key.occurrenceKey)}:${key.lookupFamily}:${key.lookupTarget}`;
}

export function serializeGraphRelationKey(key: RelationKey): string {
  return `rel:${serializeGraphEntityKey(key.sourceKey)}:${serializeGraphEntityKey(key.targetKey)}:${key.relationKind}`;
}

export function serializeGraphObservationKey(key: ObservationKey): string {
  return `obs:${key.documentUri}:${key.position}:${key.sourceSurface}`;
}

export function serializeGraphDeclarationWitnessKey(key: DeclarationWitnessKey): string {
  return `decl-witness:${serializeGraphEntityKey(key.subjectKey)}:${key.declarationFormSet}`;
}

export function serializeGraphSupportBundleKey(key: SupportBundleKey): string {
  return `support-bundle:${key.targetFamilyId}:${serializeGraphEntityKey(key.subjectKey)}`;
}

export function serializeGraphCompletenessKey(key: CompletenessKey): string {
  return `completeness:${key.boundaryKey}:${key.completenessFamily}`;
}

export function serializeGraphGovernedSemanticKey(key: GovernedSemanticKey): string {
  return `governed:${serializeGraphResourceKey(key.resourceKey)}:${key.governedFamily}`;
}

export function serializeGraphOpenBoundaryKey(key: OpenBoundaryKey): string {
  return `open-boundary:${key.targetFamilyId}:${serializeGraphEntityKey(key.subjectKey)}:${key.blockedDependency}`;
}

export function serializeGraphReferenceEntryKey(key: ReferenceEntryKey): string {
  return `ref:${serializeGraphEntityKey(key.subjectEntityKey)}:${key.referenceKind}:${key.site.documentUri}:${key.site.span.start}:${key.site.span.end}`;
}

export function serializeGraphBridgeArtifactKey(key: BridgeArtifactKey): string {
  return `bridge:${serializeGraphEntityKey(key.entityKey)}:${key.artifactKind}`;
}

export function serializeGraphEntityKey(key: GraphEntityKey): string {
  switch (key.keyKind) {
    case "resource":
      return serializeGraphResourceKey(key);
    case "field-fact":
      return serializeGraphFieldFactKey(key);
    case "bindable":
      return serializeGraphBindableKey(key);
    case "bindable-trait":
      return serializeGraphBindableTraitKey(key);
    case "occurrence":
      return serializeGraphOccurrenceKey(key);
    case "vocabulary-entry":
      return serializeGraphVocabularyEntryKey(key);
  }
}

export function serializeGraphNodeKey(key: NodeKey): string {
  switch (key.keyKind) {
    case "resource":
      return serializeGraphResourceKey(key);
    case "field-fact":
      return serializeGraphFieldFactKey(key);
    case "bindable":
      return serializeGraphBindableKey(key);
    case "bindable-trait":
      return serializeGraphBindableTraitKey(key);
    case "admission":
      return serializeGraphAdmissionKey(key);
    case "reachability":
      return serializeGraphReachabilityKey(key);
    case "occurrence":
      return serializeGraphOccurrenceKey(key);
    case "lookup":
      return serializeGraphLookupKey(key);
    case "relation":
      return serializeGraphRelationKey(key);
    case "observation":
      return serializeGraphObservationKey(key);
    case "declaration-witness":
      return serializeGraphDeclarationWitnessKey(key);
    case "support-bundle":
      return serializeGraphSupportBundleKey(key);
    case "completeness":
      return serializeGraphCompletenessKey(key);
    case "governed-semantic":
      return serializeGraphGovernedSemanticKey(key);
    case "open-boundary":
      return serializeGraphOpenBoundaryKey(key);
    case "reference-entry":
      return serializeGraphReferenceEntryKey(key);
    case "bridge-artifact":
      return serializeGraphBridgeArtifactKey(key);
  }
}

function serializeGraphAdmissionSubjectKey(key: ResourceKey | VocabularyEntryKey): string {
  if (key.keyKind === "resource") {
    return serializeGraphResourceKey(key);
  }

  return serializeGraphVocabularyEntryKey(key);
}

function serializeGraphReachabilitySubjectKey(
  key: ResourceKey | TemplateScopeSubjectKey,
): string {
  if ("keyKind" in key) {
    return serializeGraphResourceKey(key);
  }

  return serializeGraphTemplateScopeSubjectKey(key);
}
