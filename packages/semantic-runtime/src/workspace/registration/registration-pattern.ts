import {
  ConstructorArchetypeKind,
  LookupRegimeKind,
  MaterializationTimingKind,
  RegistrationPathKind,
  WorldRegimeKind
} from "./consulted-world.js";

export const enum RegistrationPatternFamilyKind {
  AggregateBundle = 1,
  DirectRegistrationBuilderAliasBundle = 2,
  ConfiguredEmissionRegistry = 3,
  StagedBuilderFinalization = 4,
  LifecycleGatedRegistration = 5,
  RouteConfigAdmissionWorld = 6,
  CallbackLocalDynamicRegistration = 7,
  LateBoundDynamicCompositionLookup = 8,
  MixedRootConstructorStack = 9,
  RoutedRootWrapperAdmission = 10
}

export const enum RegistrationSupportBehaviorKind {
  ClaimAndClose = 1,
  ClaimWithQualifiers = 2,
  DetectAndDeclareOpen = 3,
  DetectAndDeclareUnsupported = 4,
  DetectRuntimeOnlyBoundary = 5
}

export const enum RegistrationTransitionClassId {
  KeySpaceAddition = 1,
  KeySpaceOverlay = 2,
  AliasLinkage = 3,
  MultiRegistrationAggregation = 4,
  BuilderHistoryAccumulation = 5,
  LifecycleSlotAttachment = 6,
  ChildWorldFork = 7,
  GeneratedSyntaxOrSettingsEmission = 8,
  RootStackComposition = 9,
  RouteShellAdmission = 10
}

export const enum RegistrationAnalyzabilityBandId {
  StaticallyClosable = 1,
  BoundedDeeperInterpretation = 2,
  ConventionAssisted = 3,
  HeuristicDetectionOnly = 4,
  RuntimeOnly = 5
}

export const enum RegistrationAnalyzabilityTierId {
  DeclaredExplicit = 1,
  GeneratedExplicit = 2,
  SourceAnalyzable = 3,
  TypeAssisted = 4,
  CandidateOnly = 5,
  RuntimeOnly = 6
}

export const enum RegistrationWitnessBasisId {
  PositivePresenceSupported = 1,
  SearchedSpaceWitnessed = 2,
  CompletenessLicensed = 3,
  AbsenceLicensable = 4,
  CompletenessBlocked = 5,
  TypedBasisBlocked = 6
}

export const enum RegistrationCompletenessPostureId {
  Closed = 1,
  ClosableOpen = 2,
  TerminalOpen = 3,
  OpaqueCarried = 4,
  OpenPlaceholder = 5
}

export const enum RegistrationTopologyRuntimeHookId {
  CurrentWorldActivity = 1,
  ChildWorldVisibility = 2,
  InheritedResourceVisibility = 3
}

export const enum RegistrationOpenResidualId {
  CallbackBodyOpaque = 1,
  DynamicKeyEmission = 2,
  LifecycleGatedActivity = 3,
  ChildWorldVisibilityQualified = 4,
  ExtensionQualifiedFront = 5,
  CompletenessOpen = 6,
  RuntimeOnlyExpansion = 7
}

export const enum RegistrationReasonKind {
  CallbackOpaquePayload = 1,
  RuntimeTopologyDependent = 2,
  DynamicLateBinding = 3,
  UserCodeExecutionDependent = 4,
  ImportedModuleSelectionDependent = 5,
  ActiveWorldScopeDependent = 6,
  LifecycleGateDependent = 7,
  RenderBranchDependent = 8
}

export class RegistrationPatternMetadata {
  public constructor(
    public readonly transitionClassId: RegistrationTransitionClassId,
    public readonly analyzabilityBandId: RegistrationAnalyzabilityBandId,
    public readonly analyzabilityTierId: RegistrationAnalyzabilityTierId,
    public readonly witnessBasisIds: readonly RegistrationWitnessBasisId[],
    public readonly completenessPostureId: RegistrationCompletenessPostureId,
    public readonly topologyRuntimeHookIds: readonly RegistrationTopologyRuntimeHookId[] = [],
    public readonly openResidualIds: readonly RegistrationOpenResidualId[] = []
  ) {}
}

export class ActiveRegistrationPattern {
  public constructor(
    public readonly family: RegistrationPatternFamilyKind,
    public readonly behavior: RegistrationSupportBehaviorKind.ClaimAndClose |
      RegistrationSupportBehaviorKind.ClaimWithQualifiers,
    public readonly registrationFileName: string,
    public readonly worldRegime: WorldRegimeKind,
    public readonly registrationPath: RegistrationPathKind,
    public readonly constructorArchetypes: readonly ConstructorArchetypeKind[],
    public readonly lookupRegime: LookupRegimeKind,
    public readonly materializationTiming: MaterializationTimingKind,
    public readonly metadata: RegistrationPatternMetadata
  ) {}
}

export class UnderclosedRegistrationPattern {
  public constructor(
    public readonly family: RegistrationPatternFamilyKind,
    public readonly behavior: RegistrationSupportBehaviorKind,
    public readonly registrationFileName: string,
    public readonly worldRegime: WorldRegimeKind,
    public readonly registrationPath: RegistrationPathKind,
    public readonly constructorArchetypes: readonly ConstructorArchetypeKind[],
    public readonly lookupRegime: LookupRegimeKind,
    public readonly materializationTiming: MaterializationTimingKind,
    public readonly metadata: RegistrationPatternMetadata,
    public readonly reasonIds: readonly RegistrationReasonKind[],
    public readonly note: string
  ) {}
}

export class RegistrationPatternScanResult {
  public readonly activeRegistrationPatternCount: number;
  public readonly closedRegistrationPatternCount: number;
  public readonly qualifiedRegistrationPatternCount: number;
  public readonly underclosedRegistrationPatternCount: number;
  public readonly openRegistrationPatternCount: number;
  public readonly unsupportedRegistrationBoundaryCount: number;
  public readonly runtimeOnlyRegistrationBoundaryCount: number;

  public constructor(
    public readonly activeRegistrationPatterns: readonly ActiveRegistrationPattern[],
    public readonly underclosedRegistrationPatterns: readonly UnderclosedRegistrationPattern[]
  ) {
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
  }
}
