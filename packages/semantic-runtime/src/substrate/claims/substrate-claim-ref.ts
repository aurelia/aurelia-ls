import type {
  ClaimHomeKind,
  ClaimTruthStatusKind,
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import type { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import type { AuthoredOccurrenceBasis } from "../../syntax/occurrences/authored-occurrence-basis.js";
import {
  ContributorClassKind,
  CurrentWorldActivityStatusKind,
  SummaryReachabilityScopeKind,
  SummaryStatusKind
} from "../../workspace/handoff/world-context-shapes.js";
import type { WorldSnapshotSummary } from "../../workspace/handoff/current-world-context.js";
import type { ConsultedBoundaryRef } from "../../workspace/routes/consulted-boundary.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";

const EMPTY_CONTRIBUTOR_CLASSES: readonly ContributorClassKind[] = [];
const EMPTY_STRING_REFS: readonly string[] = [];
const EMPTY_BOUNDARIES: readonly ConsultedBoundaryRef[] = [];
const EMPTY_REACHABILITY_SCOPES: readonly SummaryReachabilityScopeKind[] = [];
const EMPTY_ANCHORED_SUPPORT_OPEN_REASONS: readonly AnchoredSupportOpenReasonKind[] = [];
const EMPTY_ANCHORED_SUPPORT_SECTIONS: readonly AnchoredSupportSectionKind[] = [];
const ROOT_LOCAL_IDENTITY = "root";
const ANCHORED_SUPPORT_REF_PREFIX = "anchor";

export interface SubstrateClaimRef {
  readonly home: ClaimHomeKind;
  readonly worldVersion: number;
  readonly localIdentity?: string;
}

export interface CurrentWorldSummaryValueOptions {
  readonly publishedClaimCount: number;
  readonly consultedPackageCount: number;
  readonly recognizedResourceCount: number;
  readonly admittedResourceCount: number;
  readonly activeResourceCount: number;
  readonly underclosedResourceCount: number;
  readonly activeExtensionCount: number;
  readonly admittedGeneratedVocabularyCount: number;
  readonly underclosedGeneratedVocabularyCount: number;
  readonly activeRegistrationPatternCount: number;
  readonly closedRegistrationPatternCount: number;
  readonly qualifiedRegistrationPatternCount: number;
  readonly underclosedRegistrationPatternCount: number;
  readonly openRegistrationPatternCount: number;
  readonly unsupportedRegistrationBoundaryCount: number;
  readonly runtimeOnlyRegistrationBoundaryCount: number;
  readonly associatedTemplateCount: number;
  readonly explicitNoViewCount: number;
  readonly underclosedTemplateAssociationCount: number;
  readonly scannedContributorClasses?: readonly ContributorClassKind[];
  readonly scannedContributorRefs?: readonly string[];
  readonly supportingBoundaries?: readonly ConsultedBoundaryRef[];
  readonly outOfBoundaryCandidateRefs?: readonly string[];
  readonly recognitionStatus?: SummaryStatusKind;
  readonly admissionStatus?: SummaryStatusKind;
  readonly currentWorldActivityStatus?: CurrentWorldActivityStatusKind;
  readonly reachabilityScopes?: readonly SummaryReachabilityScopeKind[];
  readonly declarationWitnessStatus?: SummaryStatusKind;
  readonly searchedWorldCompletenessStatus?: SummaryStatusKind;
  readonly openStateStatus?: SummaryStatusKind;
}

export interface CurrentWorldSummaryValue extends CurrentWorldSummaryValueOptions {
  readonly scannedContributorClasses: readonly ContributorClassKind[];
  readonly scannedContributorRefs: readonly string[];
  readonly supportingBoundaries: readonly ConsultedBoundaryRef[];
  readonly outOfBoundaryCandidateRefs: readonly string[];
  readonly recognitionStatus: SummaryStatusKind;
  readonly admissionStatus: SummaryStatusKind;
  readonly currentWorldActivityStatus: CurrentWorldActivityStatusKind;
  readonly reachabilityScopes: readonly SummaryReachabilityScopeKind[];
  readonly declarationWitnessStatus: SummaryStatusKind;
  readonly searchedWorldCompletenessStatus: SummaryStatusKind;
  readonly openStateStatus: SummaryStatusKind;
}

export const enum AnchoredSupportOpenReasonKind {
  SectionSupportOpen = 1,
  CurrentWorldSensitive = 2
}

export const enum AnchoredSupportSectionKind {
  PolicyConfig = 1,
  StructuredSupportBundle = 2,
  OpaqueHooks = 3
}

export const enum AnchoredSupportAnchorKind {
  CustomElement = 1
}

export class AnchoredSupportBasis {
  public constructor(
    public readonly anchorRef: string,
    public readonly resolvedIdentityRefs: readonly string[],
    public readonly inheritedDeclarationWitnessRef: string,
    public readonly openReasonKinds: readonly AnchoredSupportOpenReasonKind[] =
      EMPTY_ANCHORED_SUPPORT_OPEN_REASONS,
    public readonly blockedSupportSections: readonly AnchoredSupportSectionKind[] =
      EMPTY_ANCHORED_SUPPORT_SECTIONS,
    public readonly supportBundleRef?: string,
    public readonly supportWitnessRef?: string,
    public readonly carriedMemberRefs: readonly string[] = EMPTY_STRING_REFS,
    public readonly semanticAttachmentRefs: readonly string[] = EMPTY_STRING_REFS
  ) {}
}

export function createAnchoredSupportAnchorRef(
  worldRef: string,
  kind: AnchoredSupportAnchorKind,
  canonicalIdentity: string
): string {
  return [
    ANCHORED_SUPPORT_REF_PREFIX,
    worldRef,
    toAnchoredSupportAnchorKindSegment(kind),
    canonicalIdentity
  ].join(":");
}

export interface SemanticClaimPayload {
  readonly currentWorldSummary?: CurrentWorldSummaryValue;
  readonly currentWorldPublication?: CurrentWorldPublication;
  readonly authoredOccurrenceBasis?: AuthoredOccurrenceBasis;
  readonly anchoredSupportBasis?: AnchoredSupportBasis;
}

export interface PublishedSubstrateClaim {
  readonly ref: SubstrateClaimRef;
  readonly truthStatus?: ClaimTruthStatusKind;
  readonly outcome: ClaimOutcomeKind;
  readonly qualifier: ClaimQualifierKind;
  readonly closureStatus: ClosureStatusKind;
  readonly payload?: SemanticClaimPayload;
}

export function createSubstrateClaimRef(
  home: ClaimHomeKind,
  worldVersion: number,
  localIdentity?: string
): SubstrateClaimRef {
  return {
    home,
    worldVersion,
    localIdentity
  };
}

export function createCurrentWorldSummaryValue(
  value: CurrentWorldSummaryValueOptions
): CurrentWorldSummaryValue {
  return {
    ...value,
    scannedContributorClasses: value.scannedContributorClasses ?? EMPTY_CONTRIBUTOR_CLASSES,
    scannedContributorRefs: value.scannedContributorRefs ?? EMPTY_STRING_REFS,
    supportingBoundaries: value.supportingBoundaries ?? EMPTY_BOUNDARIES,
    outOfBoundaryCandidateRefs: value.outOfBoundaryCandidateRefs ?? EMPTY_STRING_REFS,
    recognitionStatus: value.recognitionStatus ?? SummaryStatusKind.OpenPlaceholder,
    admissionStatus: value.admissionStatus ?? SummaryStatusKind.OpenPlaceholder,
    currentWorldActivityStatus: value.currentWorldActivityStatus ??
      CurrentWorldActivityStatusKind.Closed,
    reachabilityScopes: value.reachabilityScopes ?? EMPTY_REACHABILITY_SCOPES,
    declarationWitnessStatus: value.declarationWitnessStatus ??
      SummaryStatusKind.OpenPlaceholder,
    searchedWorldCompletenessStatus: value.searchedWorldCompletenessStatus ??
      SummaryStatusKind.OpenPlaceholder,
    openStateStatus: value.openStateStatus ?? SummaryStatusKind.OpenPlaceholder
  };
}

export function createCurrentWorldSummaryValueFromSnapshot(
  snapshotSummary: WorldSnapshotSummary
): CurrentWorldSummaryValue {
  return createCurrentWorldSummaryValue(
    {
      publishedClaimCount: snapshotSummary.publishedClaimCount,
      consultedPackageCount: snapshotSummary.consultedPackageCount,
      recognizedResourceCount: snapshotSummary.recognizedResourceCount,
      admittedResourceCount: snapshotSummary.admittedResourceCount,
      activeResourceCount: snapshotSummary.activeResourceCount,
      underclosedResourceCount: snapshotSummary.underclosedResourceCount,
      activeExtensionCount: snapshotSummary.activeExtensionCount,
      admittedGeneratedVocabularyCount: snapshotSummary.admittedGeneratedVocabularyCount,
      underclosedGeneratedVocabularyCount: snapshotSummary.underclosedGeneratedVocabularyCount,
      activeRegistrationPatternCount: snapshotSummary.activeRegistrationPatternCount,
      closedRegistrationPatternCount: snapshotSummary.closedRegistrationPatternCount,
      qualifiedRegistrationPatternCount: snapshotSummary.qualifiedRegistrationPatternCount,
      underclosedRegistrationPatternCount: snapshotSummary.underclosedRegistrationPatternCount,
      openRegistrationPatternCount: snapshotSummary.openRegistrationPatternCount,
      unsupportedRegistrationBoundaryCount: snapshotSummary.unsupportedRegistrationBoundaryCount,
      runtimeOnlyRegistrationBoundaryCount: snapshotSummary.runtimeOnlyRegistrationBoundaryCount,
      associatedTemplateCount: snapshotSummary.associatedTemplateCount,
      explicitNoViewCount: snapshotSummary.explicitNoViewCount,
      underclosedTemplateAssociationCount: snapshotSummary.underclosedTemplateAssociationCount,
      scannedContributorClasses: snapshotSummary.scannedContributorClasses,
      scannedContributorRefs: snapshotSummary.scannedContributorRefs,
      supportingBoundaries: snapshotSummary.supportingBoundaries,
      outOfBoundaryCandidateRefs: snapshotSummary.outOfBoundaryCandidateRefs,
      recognitionStatus: snapshotSummary.recognitionStatus,
      admissionStatus: snapshotSummary.admissionStatus,
      currentWorldActivityStatus: snapshotSummary.currentWorldActivityStatus,
      reachabilityScopes: snapshotSummary.reachabilityScopes,
      declarationWitnessStatus: snapshotSummary.declarationWitnessStatus,
      searchedWorldCompletenessStatus: snapshotSummary.searchedWorldCompletenessStatus,
      openStateStatus: snapshotSummary.openStateStatus
    }
  );
}

export function createSemanticClaimPayload(
  payload: SemanticClaimPayload
): SemanticClaimPayload | undefined {
  return payload.currentWorldSummary === undefined &&
    payload.currentWorldPublication === undefined &&
    payload.authoredOccurrenceBasis === undefined &&
    payload.anchoredSupportBasis === undefined
    ? undefined
    : payload;
}

export function getSubstrateClaimKey(ref: SubstrateClaimRef): string {
  return `${ref.home}:${ref.worldVersion}:${ref.localIdentity ?? ROOT_LOCAL_IDENTITY}`;
}

export function getSubstrateClaim(
  claims: ReadonlyMap<string, PublishedSubstrateClaim>,
  ref: SubstrateClaimRef
): PublishedSubstrateClaim | undefined {
  return claims.get(getSubstrateClaimKey(ref));
}

function toAnchoredSupportAnchorKindSegment(
  kind: AnchoredSupportAnchorKind
): string {
  switch (kind) {
    case AnchoredSupportAnchorKind.CustomElement:
      return "custom-element";
  }

  throw new Error(`Unsupported anchored support anchor kind: ${kind}`);
}
