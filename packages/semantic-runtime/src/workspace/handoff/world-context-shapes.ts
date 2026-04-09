import type { WorldFrame } from "../../query/framing/world-frame.js";
import type { ConsultedBoundaryRef } from "../routes/consulted-boundary.js";
import type {
  AdmissionRegimeKind,
  ConsultationRoleKind,
  ConstructorArchetypeKind,
  LookupRegimeKind,
  MaterializationTimingKind,
  NamingSurfaceKind,
  RegistrationPathKind,
  WorldRegimeKind
} from "../registration/consulted-world.js";

export const enum ContributorClassKind {
  ExplicitSourceDeclarations = 1,
  RegistryCarriers = 2,
  ModuleIntakeCarriers = 3,
  ConfigurationEmittedMembers = 4,
  ConventionPolicyBroadening = 5,
  NamingAndAliasConvergence = 6
}

export const enum SummaryStatusKind {
  Closed = 1,
  ClosableOpen = 2,
  TerminalOpen = 3,
  OpaqueCarried = 4,
  OpenPlaceholder = 5
}

export const enum CurrentWorldActivityStatusKind {
  Closed = 1,
  CurrentWorldSensitive = 2,
  TerminalOpen = 3
}

export const enum SummaryReachabilityScopeKind {
  ResourceCurrentPlusRoot = 1,
  TemplateLocal = 2,
  GenericDiAncestor = 3,
  RegistryLocalOnly = 4,
  OwnerBoundedLocal = 5,
  AnalyzedModuleSelection = 6
}

export const enum RescanTriggerKind {
  LocalDeclarationEdit = 1,
  ModuleExportOrTransformEdit = 2,
  AliasOrRegistryEdit = 3,
  ConfigurationOrBuilderEdit = 4,
  ConventionPolicyEdit = 5,
  BoundaryPlanEdit = 6,
  TimingOrBranchActivationEdit = 7,
  St3ClassificationDelta = 8
}

export const enum ChangedBasisClassKind {
  Declaration = 1,
  ModuleIntake = 2,
  Registry = 3,
  Configuration = 4,
  Convention = 5,
  BoundaryPlan = 6,
  TimingBranch = 7,
  ClassificationDelta = 8
}

export const enum RescanScopeKind {
  OwnerLocalThenPackage = 1,
  ModuleIntakeWorldsAndAdmissionBridges = 2,
  RegistryOrPackageWorlds = 3,
  ConstructorEmissionWorlds = 4,
  ConventionMediatedWorlds = 5,
  BoundaryStackThenContributorPlanning = 6,
  CurrentWorldActivityAndReachability = 7,
  RerouteAuthorityEntrySeed = 8
}

export class WorldFrameHandle {
  public constructor(
    public readonly kind: WorldFrame["kind"],
    public readonly version: number,
    public readonly worldRef: string,
    public readonly inheritedWorldSeedRef: string,
    public readonly consultedBoundary: ConsultedBoundaryRef,
    public readonly searchedBoundaries: readonly ConsultedBoundaryRef[],
    public readonly consultationRole: ConsultationRoleKind,
    public readonly worldRegime: WorldRegimeKind,
    public readonly worldOwnerOrConstructorBasis: string,
    public readonly registrationPath: RegistrationPathKind,
    public readonly constructorArchetypes: readonly ConstructorArchetypeKind[],
    public readonly admissionRegime: AdmissionRegimeKind,
    public readonly lookupRegime: LookupRegimeKind,
    public readonly materializationTiming: MaterializationTimingKind,
    public readonly namingSurfaces: readonly NamingSurfaceKind[]
  ) {}
}

export class WorldSnapshotSummary {
  public constructor(
    public readonly kind: WorldFrame["kind"],
    public readonly version: number,
    public readonly publishedClaimCount: number,
    public readonly consultedPackageCount: number,
    public readonly recognizedResourceCount: number,
    public readonly admittedResourceCount: number,
    public readonly activeResourceCount: number,
    public readonly underclosedResourceCount: number,
    public readonly activeExtensionCount: number,
    public readonly admittedGeneratedVocabularyCount: number,
    public readonly underclosedGeneratedVocabularyCount: number,
    public readonly activeRegistrationPatternCount: number,
    public readonly closedRegistrationPatternCount: number,
    public readonly qualifiedRegistrationPatternCount: number,
    public readonly underclosedRegistrationPatternCount: number,
    public readonly openRegistrationPatternCount: number,
    public readonly unsupportedRegistrationBoundaryCount: number,
    public readonly runtimeOnlyRegistrationBoundaryCount: number,
    public readonly associatedTemplateCount: number,
    public readonly explicitNoViewCount: number,
    public readonly underclosedTemplateAssociationCount: number,
    public readonly scannedContributorClasses: readonly ContributorClassKind[],
    public readonly scannedContributorRefs: readonly string[],
    public readonly supportingBoundaries: readonly ConsultedBoundaryRef[],
    public readonly outOfBoundaryCandidateRefs: readonly string[],
    public readonly recognitionStatus: SummaryStatusKind,
    public readonly admissionStatus: SummaryStatusKind,
    public readonly currentWorldActivityStatus: CurrentWorldActivityStatusKind,
    public readonly reachabilityScopes: readonly SummaryReachabilityScopeKind[],
    public readonly declarationWitnessStatus: SummaryStatusKind,
    public readonly searchedWorldCompletenessStatus: SummaryStatusKind,
    public readonly openStateStatus: SummaryStatusKind
  ) {}
}

export class RescanSignal {
  public constructor(
    public readonly trigger: RescanTriggerKind,
    public readonly scope: RescanScopeKind,
    public readonly changedBasisClass: ChangedBasisClassKind
  ) {}
}

export class RescanBasis {
  public constructor(
    public readonly reasonMask: number,
    public readonly signals: readonly RescanSignal[]
  ) {}
}
