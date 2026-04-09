import type { ConsultedBoundaryRef } from "../routes/consulted-boundary.js";

export const enum ConsultationRoleKind {
  CandidateIntakeWorld = 1,
  AdmittedRegistrationWorld = 2,
  CurrentWorldActiveLocalWorld = 3
}

export const enum WorldRegimeKind {
  DefinitionMerge = 1,
  RegistryCarrier = 2,
  OwnerBoundedLocal = 3,
  ModuleIntake = 4,
  ConstructorEmission = 5,
  ConventionMediated = 6
}

export const enum RegistrationPathKind {
  KernelRegistration = 1,
  ResourceRegistration = 2,
  RegistryInsertion = 3,
  AnalyzedModuleSelection = 4,
  ConfigurationEmission = 5,
  ConventionBridge = 6
}

export const enum AdmissionRegimeKind {
  FrameworkNative = 1,
  LegacyConventionsTooling = 2,
  ExtensionQualified = 3,
  ProductNativeConventions = 4
}

export const enum ConstructorArchetypeKind {
  AggregateBundle = 1,
  CustomizedDefault = 2,
  ComposedLayer = 3,
  GeneratedSyntax = 4,
  StagedBuilder = 5,
  LifecycleAttached = 6,
  ChildWorldBranch = 7
}

export const enum LookupRegimeKind {
  CurrentPlusRootResource = 1,
  OwnOnlyResource = 2,
  GenericDiAncestor = 3,
  RegistryLocalOnly = 4,
  OwnerBoundedLocal = 5,
  AnalyzedModuleSelection = 6
}

export const enum MaterializationTimingKind {
  Eager = 1,
  PreRuntimePreprocess = 2,
  LifecycleSlotGated = 3,
  ChildWorldBranched = 4,
  RenderTimeBranch = 5
}

export const enum NamingSurfaceKind {
  ExportName = 1,
  ResourceName = 2
}

export const enum WorldParticipationFrontierKind {
  ClosedBaseline = 1,
  CurrentWorldSensitive = 2,
  WorldQualified = 3,
  TerminalOpen = 4,
  OpenPlaceholder = 5
}

export class ConsultedWorldHandle {
  public constructor(
    public readonly worldRef: string,
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
