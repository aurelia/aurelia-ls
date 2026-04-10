import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import type { WorkspacePackageRef } from "../packages/workspace-package.js";
import { ConsultedBoundaryKind, ConsultedBoundaryRef } from "../routes/consulted-boundary.js";
import type { CustomElementScanResult } from "./custom-element-declaration-scanner.js";
import {
  AdmissionRegimeKind,
  ConsultationRoleKind,
  ConstructorArchetypeKind,
  ConsultedWorldHandle,
  LookupRegimeKind,
  MaterializationTimingKind,
  NamingSurfaceKind,
  RegistrationPathKind,
  WorldRegimeKind
} from "./consulted-world.js";
import type { ExtensionConfigurationScanResult } from "./extension-configuration-scanner.js";
import type { RegistrationPatternScanResult } from "./registration-pattern.js";

const CONSULTED_WORLD_REF_PREFIX = "consulted-world";
const WORLD_BASIS_REF_PREFIX = "current-world-basis";

export class CurrentWorldConstructionPlan {
  public readonly consultationRole: ConsultationRoleKind;
  public readonly worldRegime: WorldRegimeKind;
  public readonly registrationPath: RegistrationPathKind;
  public readonly constructorArchetypes: readonly ConstructorArchetypeKind[];
  public readonly admissionRegime: AdmissionRegimeKind;
  public readonly lookupRegime: LookupRegimeKind;
  public readonly materializationTiming: MaterializationTimingKind;
  public readonly namingSurfaces: readonly NamingSurfaceKind[];

  readonly #hasResourcePressure: boolean;
  readonly #hasExtensionPressure: boolean;

  public constructor(
    home: ClaimHomeKind,
    resourceScan: CustomElementScanResult,
    extensionScan: ExtensionConfigurationScanResult,
    registrationScan: RegistrationPatternScanResult
  ) {
    this.#hasResourcePressure = resourceScan.recognizedElements.length > 0 ||
      resourceScan.underclosedResources.length > 0;
    this.#hasExtensionPressure = extensionScan.activeExtensionCount > 0 ||
      extensionScan.underclosedGeneratedVocabularyCount > 0;
    this.consultationRole = selectConsultationRole(
      home,
      this.#hasResourcePressure,
      this.#hasExtensionPressure,
      registrationScan
    );
    this.worldRegime = selectWorldRegime(
      registrationScan,
      this.#hasResourcePressure,
      this.#hasExtensionPressure
    );
    this.registrationPath = selectRegistrationPath(
      registrationScan,
      this.#hasResourcePressure,
      this.#hasExtensionPressure
    );
    this.constructorArchetypes = selectConstructorArchetypes(
      extensionScan,
      registrationScan
    );
    this.admissionRegime = selectAdmissionRegime(
      this.registrationPath,
      this.#hasResourcePressure,
      this.#hasExtensionPressure
    );
    this.lookupRegime = selectLookupRegime(
      registrationScan,
      this.#hasResourcePressure,
      this.#hasExtensionPressure
    );
    this.materializationTiming = selectMaterializationTiming(
      registrationScan,
      this.#hasResourcePressure,
      this.#hasExtensionPressure
    );
    this.namingSurfaces = selectNamingSurfaces(
      this.#hasResourcePressure,
      this.#hasExtensionPressure,
      registrationScan
    );
  }

  public createConsultedWorldHandle(
    consultedPackage: WorkspacePackageRef,
    worldVersion: number
  ): ConsultedWorldHandle {
    const consultedBoundary = new ConsultedBoundaryRef(
      ConsultedBoundaryKind.Package,
      consultedPackage.rootPath
    );
    const worldRef = [
      CONSULTED_WORLD_REF_PREFIX,
      consultedPackage.packageName ?? "anonymous-package",
      `${worldVersion}`
    ].join(":");

    return new ConsultedWorldHandle(
      worldRef,
      consultedBoundary,
      [consultedBoundary],
      this.consultationRole,
      this.worldRegime,
      createWorldOwnerOrConstructorBasisRef(
        consultedPackage,
        this.worldRegime,
        this.registrationPath
      ),
      this.registrationPath,
      this.constructorArchetypes,
      this.admissionRegime,
      this.lookupRegime,
      this.materializationTiming,
      this.namingSurfaces
    );
  }
}

function selectConsultationRole(
  home: ClaimHomeKind,
  hasResourcePressure: boolean,
  hasExtensionPressure: boolean,
  registrationScan: RegistrationPatternScanResult
): ConsultationRoleKind {
  const targetsCurrentWorld = home === ClaimHomeKind.CurrentWorldSummary ||
    home === ClaimHomeKind.AuthoredOccurrenceBasis;
  if (!targetsCurrentWorld) {
    return ConsultationRoleKind.AdmittedRegistrationWorld;
  }

  return hasResourcePressure ||
    hasExtensionPressure ||
    registrationScan.activeRegistrationPatterns.length > 0
    ? ConsultationRoleKind.CurrentWorldActiveLocalWorld
    : registrationScan.underclosedRegistrationPatterns.length > 0
      ? ConsultationRoleKind.AdmittedRegistrationWorld
      : ConsultationRoleKind.CurrentWorldActiveLocalWorld;
}

function selectWorldRegime(
  registrationScan: RegistrationPatternScanResult,
  hasResourcePressure: boolean,
  hasExtensionPressure: boolean
): WorldRegimeKind {
  const regimes = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ].map((pattern) => pattern.worldRegime);

  for (const regime of [
    WorldRegimeKind.OwnerBoundedLocal,
    WorldRegimeKind.RegistryCarrier,
    WorldRegimeKind.ModuleIntake,
    WorldRegimeKind.ConstructorEmission,
    WorldRegimeKind.ConventionMediated,
    WorldRegimeKind.DefinitionMerge
  ]) {
    if (regimes.includes(regime)) {
      return regime;
    }
  }

  if (hasExtensionPressure) {
    return WorldRegimeKind.ConstructorEmission;
  }

  if (hasResourcePressure) {
    return WorldRegimeKind.DefinitionMerge;
  }

  return WorldRegimeKind.Unspecified;
}

function selectRegistrationPath(
  registrationScan: RegistrationPatternScanResult,
  hasResourcePressure: boolean,
  hasExtensionPressure: boolean
): RegistrationPathKind {
  const paths = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ].map((pattern) => pattern.registrationPath);

  for (const path of [
    RegistrationPathKind.KernelRegistration,
    RegistrationPathKind.RegistryInsertion,
    RegistrationPathKind.AnalyzedModuleSelection,
    RegistrationPathKind.ConfigurationEmission,
    RegistrationPathKind.ConventionBridge,
    RegistrationPathKind.ResourceRegistration
  ]) {
    if (paths.includes(path)) {
      return path;
    }
  }

  if (hasExtensionPressure) {
    return RegistrationPathKind.ConfigurationEmission;
  }

  if (hasResourcePressure) {
    return RegistrationPathKind.ResourceRegistration;
  }

  return RegistrationPathKind.Unspecified;
}

function selectConstructorArchetypes(
  extensionScan: ExtensionConfigurationScanResult,
  registrationScan: RegistrationPatternScanResult
): readonly ConstructorArchetypeKind[] {
  const archetypes = new Set<ConstructorArchetypeKind>();

  for (const pattern of registrationScan.activeRegistrationPatterns) {
    for (const archetype of pattern.constructorArchetypes) {
      archetypes.add(archetype);
    }
  }

  for (const pattern of registrationScan.underclosedRegistrationPatterns) {
    for (const archetype of pattern.constructorArchetypes) {
      archetypes.add(archetype);
    }
  }

  if (
    extensionScan.activeExtensionCount > 0 ||
    extensionScan.underclosedGeneratedVocabularyCount > 0
  ) {
    archetypes.add(ConstructorArchetypeKind.AggregateBundle);
    archetypes.add(ConstructorArchetypeKind.CustomizedDefault);
    archetypes.add(ConstructorArchetypeKind.GeneratedSyntax);
  }

  return [...archetypes].sort((left, right) => left - right);
}

function selectAdmissionRegime(
  registrationPath: RegistrationPathKind,
  hasResourcePressure: boolean,
  hasExtensionPressure: boolean
): AdmissionRegimeKind {
  if (
    registrationPath === RegistrationPathKind.ConventionBridge
  ) {
    return AdmissionRegimeKind.ProductNativeConventions;
  }

  if (
    registrationPath === RegistrationPathKind.ConfigurationEmission ||
    hasExtensionPressure
  ) {
    return AdmissionRegimeKind.ExtensionQualified;
  }

  if (hasResourcePressure || registrationPath !== RegistrationPathKind.Unspecified) {
    return AdmissionRegimeKind.FrameworkNative;
  }

  return AdmissionRegimeKind.Unspecified;
}

function selectLookupRegime(
  registrationScan: RegistrationPatternScanResult,
  hasResourcePressure: boolean,
  hasExtensionPressure: boolean
): LookupRegimeKind {
  const lookupRegimes = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ].map((pattern) => pattern.lookupRegime);

  for (const lookupRegime of [
    LookupRegimeKind.OwnerBoundedLocal,
    LookupRegimeKind.RegistryLocalOnly,
    LookupRegimeKind.GenericDiAncestor,
    LookupRegimeKind.AnalyzedModuleSelection,
    LookupRegimeKind.OwnOnlyResource,
    LookupRegimeKind.CurrentPlusRootResource
  ]) {
    if (lookupRegimes.includes(lookupRegime)) {
      return lookupRegime;
    }
  }

  if (hasResourcePressure || hasExtensionPressure) {
    return LookupRegimeKind.CurrentPlusRootResource;
  }

  return LookupRegimeKind.Unspecified;
}

function selectMaterializationTiming(
  registrationScan: RegistrationPatternScanResult,
  hasResourcePressure: boolean,
  hasExtensionPressure: boolean
): MaterializationTimingKind {
  const timings = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ].map((pattern) => pattern.materializationTiming);

  for (const timing of [
    MaterializationTimingKind.RenderTimeBranch,
    MaterializationTimingKind.LifecycleSlotGated,
    MaterializationTimingKind.ChildWorldBranched,
    MaterializationTimingKind.PreRuntimePreprocess,
    MaterializationTimingKind.Eager
  ]) {
    if (timings.includes(timing)) {
      return timing;
    }
  }

  if (hasResourcePressure || hasExtensionPressure) {
    return MaterializationTimingKind.Eager;
  }

  return MaterializationTimingKind.Unspecified;
}

function selectNamingSurfaces(
  hasResourcePressure: boolean,
  hasExtensionPressure: boolean,
  registrationScan: RegistrationPatternScanResult
): readonly NamingSurfaceKind[] {
  return hasResourcePressure ||
    hasExtensionPressure ||
    registrationScan.activeRegistrationPatterns.length > 0 ||
    registrationScan.underclosedRegistrationPatterns.length > 0
    ? [NamingSurfaceKind.ExportName, NamingSurfaceKind.ResourceName]
    : [];
}

function createWorldOwnerOrConstructorBasisRef(
  consultedPackage: WorkspacePackageRef,
  worldRegime: WorldRegimeKind,
  registrationPath: RegistrationPathKind
): string {
  return [
    WORLD_BASIS_REF_PREFIX,
    consultedPackage.packageName ?? consultedPackage.rootPath,
    `${worldRegime}`,
    `${registrationPath}`
  ].join(":");
}
