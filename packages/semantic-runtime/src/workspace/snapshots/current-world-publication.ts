import type { WorldFrame } from "../../query/framing/world-frame.js";
import {
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import {
  type ContributorClassKind,
  type CurrentWorldActivityStatusKind,
  type SummaryReachabilityScopeKind,
  type SummaryStatusKind,
  WorldFrameHandle,
  WorldSnapshotSummary
} from "../handoff/world-context-shapes.js";
import {
  type ConsultedWorldHandle,
  WorldParticipationFrontierKind
} from "../registration/consulted-world.js";
import type { ConsultedBoundaryRef } from "../routes/consulted-boundary.js";
import {
  CurrentWorldActivityStateKind,
  ResourceAdmissionStatusKind,
  type PublishedResourceDefinition,
  type UnderclosedResourceDefinition
} from "../resources/resource-definition.js";
import type {
  ActiveExtensionActivation,
  GeneratedTemplateVocabularyMember,
  UnderclosedExtensionActivation
} from "../extensions/extension-activation.js";
import {
  RegistrationSupportBehaviorKind,
  type ActiveRegistrationPattern,
  type UnderclosedRegistrationPattern
} from "../registration/registration-pattern.js";
import type { WorkspacePackageRef } from "../packages/workspace-package.js";
import type { UnderclosedTemplateSourceAssociation } from "../templates/template-source-association.js";

const WORLD_SEED_PREFIX = "world-seed";

export class CurrentWorldPublication {
  public readonly recognizedResourceCount: number;
  public readonly admittedResourceCount: number;
  public readonly activeResourceCount: number;
  public readonly underclosedResourceCount: number;
  public readonly activeExtensionCount: number;
  public readonly admittedGeneratedVocabularyCount: number;
  public readonly underclosedGeneratedVocabularyCount: number;
  public readonly activeRegistrationPatternCount: number;
  public readonly closedRegistrationPatternCount: number;
  public readonly qualifiedRegistrationPatternCount: number;
  public readonly underclosedRegistrationPatternCount: number;
  public readonly openRegistrationPatternCount: number;
  public readonly unsupportedRegistrationBoundaryCount: number;
  public readonly runtimeOnlyRegistrationBoundaryCount: number;
  public readonly associatedTemplateCount: number;
  public readonly explicitNoViewCount: number;
  public readonly underclosedTemplateAssociationCount: number;

  public constructor(
    public readonly consultedWorld: ConsultedWorldHandle,
    public readonly consultedPackage: WorkspacePackageRef,
    public readonly frontier: WorldParticipationFrontierKind,
    public readonly resources: readonly PublishedResourceDefinition[],
    public readonly underclosedResources: readonly UnderclosedResourceDefinition[],
    public readonly activeExtensions: readonly ActiveExtensionActivation[],
    public readonly underclosedExtensions: readonly UnderclosedExtensionActivation[],
    public readonly generatedVocabulary: readonly GeneratedTemplateVocabularyMember[],
    public readonly activeRegistrationPatterns: readonly ActiveRegistrationPattern[],
    public readonly underclosedRegistrationPatterns: readonly UnderclosedRegistrationPattern[],
    public readonly underclosedTemplateAssociations: readonly UnderclosedTemplateSourceAssociation[],
    public readonly declarationWitnessRef: string,
    public readonly closureRef: string,
    public readonly scannedContributorClasses: readonly ContributorClassKind[],
    public readonly scannedContributorRefs: readonly string[],
    public readonly outOfBoundaryCandidateRefs: readonly string[],
    public readonly recognitionStatus: SummaryStatusKind,
    public readonly admissionStatus: SummaryStatusKind,
    public readonly currentWorldActivityStatus: CurrentWorldActivityStatusKind,
    public readonly reachabilityScopes: readonly SummaryReachabilityScopeKind[],
    public readonly declarationWitnessStatus: SummaryStatusKind,
    public readonly searchedWorldCompletenessStatus: SummaryStatusKind,
    public readonly openStateStatus: SummaryStatusKind
  ) {
    this.recognizedResourceCount = resources.length;
    this.admittedResourceCount = resources.filter(
      (resource) => resource.admissionStatus === ResourceAdmissionStatusKind.Admitted
    ).length;
    this.activeResourceCount = resources.filter(
      (resource) => resource.currentWorldActivityState === CurrentWorldActivityStateKind.Active
    ).length;
    this.underclosedResourceCount = underclosedResources.length;
    this.activeExtensionCount = activeExtensions.length;
    this.admittedGeneratedVocabularyCount = generatedVocabulary.length;
    this.underclosedGeneratedVocabularyCount = underclosedExtensions.length;
    this.activeRegistrationPatternCount = activeRegistrationPatterns.length;
    this.closedRegistrationPatternCount = activeRegistrationPatterns.filter(
      (pattern) => pattern.behavior === RegistrationSupportBehaviorKind.ClaimAndClose
    ).length;
    this.qualifiedRegistrationPatternCount = activeRegistrationPatterns.filter(
      (pattern) => pattern.behavior === RegistrationSupportBehaviorKind.ClaimWithQualifiers
    ).length;
    this.underclosedRegistrationPatternCount = underclosedRegistrationPatterns.length;
    this.openRegistrationPatternCount = underclosedRegistrationPatterns.filter(
      (pattern) => pattern.behavior === RegistrationSupportBehaviorKind.ClaimWithQualifiers ||
        pattern.behavior === RegistrationSupportBehaviorKind.DetectAndDeclareOpen
    ).length;
    this.unsupportedRegistrationBoundaryCount = underclosedRegistrationPatterns.filter(
      (pattern) => pattern.behavior === RegistrationSupportBehaviorKind.DetectAndDeclareUnsupported
    ).length;
    this.runtimeOnlyRegistrationBoundaryCount = underclosedRegistrationPatterns.filter(
      (pattern) => pattern.behavior === RegistrationSupportBehaviorKind.DetectRuntimeOnlyBoundary
    ).length;
    this.associatedTemplateCount = resources.filter(
      (resource) => resource.templateAssociation?.hasTemplateSource === true
    ).length;
    this.explicitNoViewCount = resources.filter(
      (resource) => resource.templateAssociation?.hasTemplateSource === false
    ).length;
    this.underclosedTemplateAssociationCount = underclosedTemplateAssociations.length;
  }

  public createWorldFrameHandle(
    worldFrame: WorldFrame
  ): WorldFrameHandle {
    return new WorldFrameHandle(
      worldFrame.kind,
      worldFrame.version,
      this.consultedWorld.worldRef,
      createInheritedWorldSeedRef(worldFrame),
      this.consultedWorld.consultedBoundary,
      this.consultedWorld.searchedBoundaries,
      this.consultedWorld.consultationRole,
      this.consultedWorld.worldRegime,
      this.consultedWorld.worldOwnerOrConstructorBasis,
      this.consultedWorld.registrationPath,
      this.consultedWorld.constructorArchetypes,
      this.consultedWorld.admissionRegime,
      this.consultedWorld.lookupRegime,
      this.consultedWorld.materializationTiming,
      this.consultedWorld.namingSurfaces
    );
  }

  public createWorldSnapshotSummary(
    worldFrame: WorldFrame,
    publishedClaimCount: number
  ): WorldSnapshotSummary {
    return new WorldSnapshotSummary(
      worldFrame.kind,
      worldFrame.version,
      publishedClaimCount,
      1,
      this.recognizedResourceCount,
      this.admittedResourceCount,
      this.activeResourceCount,
      this.underclosedResourceCount,
      this.activeExtensionCount,
      this.admittedGeneratedVocabularyCount,
      this.underclosedGeneratedVocabularyCount,
      this.activeRegistrationPatternCount,
      this.closedRegistrationPatternCount,
      this.qualifiedRegistrationPatternCount,
      this.underclosedRegistrationPatternCount,
      this.openRegistrationPatternCount,
      this.unsupportedRegistrationBoundaryCount,
      this.runtimeOnlyRegistrationBoundaryCount,
      this.associatedTemplateCount,
      this.explicitNoViewCount,
      this.underclosedTemplateAssociationCount,
      this.scannedContributorClasses,
      this.scannedContributorRefs,
      supportingBoundariesOf(this.consultedWorld),
      this.outOfBoundaryCandidateRefs,
      this.recognitionStatus,
      this.admissionStatus,
      this.currentWorldActivityStatus,
      this.reachabilityScopes,
      this.declarationWitnessStatus,
      this.searchedWorldCompletenessStatus,
      this.openStateStatus
    );
  }

  public get claimOutcome(): ClaimOutcomeKind {
    return this.frontier === WorldParticipationFrontierKind.TerminalOpen
      ? ClaimOutcomeKind.NoClaim
      : ClaimOutcomeKind.Present;
  }

  public get claimQualifier(): ClaimQualifierKind {
    switch (this.frontier) {
      case WorldParticipationFrontierKind.WorldQualified:
      case WorldParticipationFrontierKind.TerminalOpen:
      case WorldParticipationFrontierKind.OpenPlaceholder:
        return ClaimQualifierKind.WorldOpen;
      default:
        return ClaimQualifierKind.None;
    }
  }

  public get closureStatus(): ClosureStatusKind {
    switch (this.frontier) {
      case WorldParticipationFrontierKind.ClosedBaseline:
      case WorldParticipationFrontierKind.CurrentWorldSensitive:
        return ClosureStatusKind.Closed;
      case WorldParticipationFrontierKind.WorldQualified:
        return ClosureStatusKind.Qualified;
      case WorldParticipationFrontierKind.TerminalOpen:
        return ClosureStatusKind.Open;
      case WorldParticipationFrontierKind.OpenPlaceholder:
        return ClosureStatusKind.Partial;
      default:
        return ClosureStatusKind.Open;
    }
  }
}

function supportingBoundariesOf(
  consultedWorld: ConsultedWorldHandle
): readonly ConsultedBoundaryRef[] {
  const boundaries = [
    consultedWorld.consultedBoundary,
    ...consultedWorld.searchedBoundaries
  ];
  const deduped = new Map<string, ConsultedBoundaryRef>();

  for (const boundary of boundaries) {
    deduped.set(`${boundary.kind}:${boundary.id}`, boundary);
  }

  return [...deduped.values()];
}

function createInheritedWorldSeedRef(
  worldFrame: WorldFrame
): string {
  return `${WORLD_SEED_PREFIX}:${worldFrame.kind}:${worldFrame.version}`;
}
