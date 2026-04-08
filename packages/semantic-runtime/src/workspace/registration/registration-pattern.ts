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
  LateBoundDynamicCompositionLookup = 8
}

export const enum RegistrationSupportBehaviorKind {
  ClaimAndClose = 1,
  ClaimWithQualifiers = 2,
  DetectAndDeclareOpen = 3,
  DetectAndDeclareUnsupported = 4,
  DetectRuntimeOnlyBoundary = 5
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
    public readonly materializationTiming: MaterializationTimingKind
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
    public readonly reasonIds: readonly string[],
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
