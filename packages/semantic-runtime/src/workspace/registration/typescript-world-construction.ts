import path from "node:path";
import ts from "typescript";
import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import {
  getQuestionRouteAuthoredOccurrenceTarget,
  getQuestionRouteClaimRoute,
  type QuestionRoute
} from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";
import { createLineageRef, type LineageRef } from "../../substrate/lineage/lineage-ref.js";
import {
  type CurrentWorldSummaryValue,
  type PublishedSubstrateClaim,
  type SubstrateClaimRef
} from "../../substrate/claims/substrate-claim-ref.js";
import {
  createAuthoredOccurrenceBasisClaim,
  createCurrentWorldSummaryClaim
} from "../../substrate/storage/substrate-storage.js";
import {
  TypeScriptProjectPort,
  type TypeScriptProjectGeneration
} from "../../typescript/programs/typescript-project-port.js";
import { WorkspacePackageRef } from "../packages/workspace-package.js";
import { ConsultedBoundaryKind, ConsultedBoundaryRef } from "../routes/consulted-boundary.js";
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
import { CurrentWorldPublicationAssembler } from "../snapshots/current-world-publication-assembler.js";
import type { CurrentWorldPublication } from "../snapshots/current-world-publication.js";
import { CustomElementDeclarationScanner } from "./custom-element-declaration-scanner.js";
import { ExtensionConfigurationScanner } from "./extension-configuration-scanner.js";
import { RegistrationPatternScanner } from "./registration-pattern-scanner.js";
import type { RegistrationPatternScanResult } from "./registration-pattern.js";
import { TemplateSourceAssociationScanner } from "./template-source-association-scanner.js";
import { AuthoredOccurrenceBasisPublisher } from "../../syntax/occurrences/authored-occurrence-basis-publisher.js";

export class TypeScriptWorldConstruction {
  readonly #projectPort: TypeScriptProjectPort;
  readonly #publicationAssembler = new CurrentWorldPublicationAssembler();
  readonly #declarationScanner = new CustomElementDeclarationScanner();
  readonly #extensionConfigurationScanner = new ExtensionConfigurationScanner();
  readonly #registrationPatternScanner = new RegistrationPatternScanner();
  readonly #templateAssociationScanner = new TemplateSourceAssociationScanner();
  readonly #authoredOccurrenceBasisPublisher = new AuthoredOccurrenceBasisPublisher();

  public constructor(projectPort: TypeScriptProjectPort) {
    this.#projectPort = projectPort;
  }

  public publishCurrentWorldPublication(
    questionRoute: QuestionRoute,
    worldFrame: WorldFrame
  ): CurrentWorldPublication | undefined {
    return this.publishCurrentWorldPublicationForHome(
      getQuestionRouteClaimRoute(questionRoute).home,
      worldFrame.version
    );
  }

  public readPublishedClaim(
    questionRoute: QuestionRoute,
    worldVersion: number
  ): PublishedSubstrateClaim | undefined {
    const claimRoute = getQuestionRouteClaimRoute(questionRoute);
    const authoredOccurrenceTarget = getQuestionRouteAuthoredOccurrenceTarget(
      questionRoute
    );

    switch (claimRoute.home) {
      case ClaimHomeKind.CurrentWorldSummary: {
        const publication = this.publishCurrentWorldPublicationForHome(
          claimRoute.home,
          worldVersion
        );

        if (publication === undefined) {
          return undefined;
        }

        return createCurrentWorldSummaryClaim(
          claimRoute.home,
          worldVersion,
          createCurrentWorldSummary(publication),
          publication
        );
      }
      case ClaimHomeKind.AuthoredOccurrenceBasis: {
        const publication = this.publishCurrentWorldPublicationForHome(
          ClaimHomeKind.CurrentWorldSummary,
          worldVersion
        );
        if (publication === undefined) {
          return undefined;
        }

        const basisDecision = this.#authoredOccurrenceBasisPublisher.publish(
          questionRoute,
          publication
        );

        return createAuthoredOccurrenceBasisClaim(
          claimRoute.home,
          worldVersion,
          authoredOccurrenceTarget === undefined
            ? undefined
            : `${authoredOccurrenceTarget.templateSourceRef}:${authoredOccurrenceTarget.offset}`,
          createCurrentWorldSummary(publication),
          publication,
          basisDecision.outcome,
          basisDecision.qualifier,
          basisDecision.closureStatus,
          basisDecision.basis
        );
      }
      default:
        return undefined;
    }
  }

  public readLineage(ref: SubstrateClaimRef): LineageRef | undefined {
    if (
      ref.home !== ClaimHomeKind.CurrentWorldSummary &&
      ref.home !== ClaimHomeKind.AuthoredOccurrenceBasis
    ) {
      return undefined;
    }

    return createLineageRef(ref.home, ref.worldVersion, ref.localIdentity);
  }

  public publishCurrentWorldPublicationForHome(
    home: ClaimHomeKind,
    worldVersion: number
  ): CurrentWorldPublication | undefined {
    const generation = this.#projectPort.publishCurrentGeneration();
    if (generation === undefined) {
      return undefined;
    }

    const consultedPackage = resolveConsultedPackage(generation);
    const resourceScan = this.#declarationScanner.scan(generation);
    const extensionScan = this.#extensionConfigurationScanner.scan(generation);
    const registrationScan = this.#registrationPatternScanner.scan(generation);
    const templateAssociations = this.#templateAssociationScanner.scan(
      generation,
      resourceScan.recognizedElements
    );
    const boundary = new ConsultedBoundaryRef(
      ConsultedBoundaryKind.Package,
      consultedPackage.rootPath
    );
    const worldRef = [
      "consulted-world",
      consultedPackage.packageName ?? "anonymous-package",
      `${worldVersion}`
    ].join(":");
    const consultedWorld = new ConsultedWorldHandle(
      worldRef,
      boundary,
      [boundary],
      selectConsultationRole(home),
      selectWorldRegime(registrationScan),
      consultedPackage.rootPath,
      selectRegistrationPath(extensionScan, registrationScan),
      selectConstructorArchetypes(extensionScan, registrationScan),
      selectAdmissionRegime(extensionScan, registrationScan),
      selectLookupRegime(registrationScan),
      selectMaterializationTiming(registrationScan),
      [NamingSurfaceKind.ExportName, NamingSurfaceKind.ResourceName]
    );

    return this.#publicationAssembler.publishCurrentWorldPublication(
      consultedWorld,
      consultedPackage,
      resourceScan,
      extensionScan,
      registrationScan,
      templateAssociations
    );
  }
}

export function createCurrentWorldSummary(
  publication: CurrentWorldPublication
): CurrentWorldSummaryValue {
  return {
    publishedClaimCount: 1,
    consultedPackageCount: 1,
    recognizedResourceCount: publication.recognizedResourceCount,
    admittedResourceCount: publication.admittedResourceCount,
    activeResourceCount: publication.activeResourceCount,
    underclosedResourceCount: publication.underclosedResourceCount,
    activeExtensionCount: publication.activeExtensionCount,
    admittedGeneratedVocabularyCount: publication.admittedGeneratedVocabularyCount,
    underclosedGeneratedVocabularyCount: publication.underclosedGeneratedVocabularyCount,
    activeRegistrationPatternCount: publication.activeRegistrationPatternCount,
    closedRegistrationPatternCount: publication.closedRegistrationPatternCount,
    qualifiedRegistrationPatternCount: publication.qualifiedRegistrationPatternCount,
    underclosedRegistrationPatternCount: publication.underclosedRegistrationPatternCount,
    openRegistrationPatternCount: publication.openRegistrationPatternCount,
    unsupportedRegistrationBoundaryCount: publication.unsupportedRegistrationBoundaryCount,
    runtimeOnlyRegistrationBoundaryCount: publication.runtimeOnlyRegistrationBoundaryCount,
    associatedTemplateCount: publication.associatedTemplateCount,
    explicitNoViewCount: publication.explicitNoViewCount,
    underclosedTemplateAssociationCount: publication.underclosedTemplateAssociationCount
  };
}

function selectConsultationRole(
  home: ClaimHomeKind
): ConsultationRoleKind {
  return home === ClaimHomeKind.CurrentWorldSummary ||
    home === ClaimHomeKind.AuthoredOccurrenceBasis
    ? ConsultationRoleKind.CurrentWorldActiveLocalWorld
    : ConsultationRoleKind.AdmittedRegistrationWorld;
}

function resolveConsultedPackage(
  generation: TypeScriptProjectGeneration
): WorkspacePackageRef {
  const projectRoot = generation.projectRoot ?? resolveCommonProjectRoot(generation.program);
  const manifestPath = path.join(projectRoot, "package.json");

  if (!ts.sys.fileExists(manifestPath)) {
    return new WorkspacePackageRef(projectRoot);
  }

  try {
    const manifestText = ts.sys.readFile(manifestPath);
    if (manifestText === undefined) {
      return new WorkspacePackageRef(projectRoot);
    }

    const manifest = JSON.parse(manifestText) as { readonly name?: string };
    return new WorkspacePackageRef(projectRoot, manifest.name);
  } catch {
    return new WorkspacePackageRef(projectRoot);
  }
}

function resolveCommonProjectRoot(program: ts.Program): string {
  const semanticFiles = program.getSourceFiles().filter(
    (sourceFile) => !sourceFile.isDeclarationFile && !isTypeScriptLibraryFile(sourceFile.fileName)
  );
  if (semanticFiles.length === 0) {
    return "/";
  }

  const directories = semanticFiles.map((sourceFile) => path.dirname(sourceFile.fileName));
  let commonRoot = directories[0] ?? "/";

  for (const directory of directories.slice(1)) {
    while (!directory.startsWith(commonRoot) && commonRoot.length > 1) {
      commonRoot = path.dirname(commonRoot);
    }
  }

  return commonRoot;
}

function isTypeScriptLibraryFile(fileName: string): boolean {
  return fileName.includes("/node_modules/typescript/lib/") ||
    fileName.includes("\\node_modules\\typescript\\lib\\");
}

function selectWorldRegime(
  registrationScan: RegistrationPatternScanResult
): WorldRegimeKind {
  const regimes = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ].map((pattern) => pattern.worldRegime);

  if (regimes.includes(WorldRegimeKind.OwnerBoundedLocal)) {
    return WorldRegimeKind.OwnerBoundedLocal;
  }

  if (regimes.includes(WorldRegimeKind.RegistryCarrier)) {
    return WorldRegimeKind.RegistryCarrier;
  }

  if (regimes.includes(WorldRegimeKind.ConstructorEmission)) {
    return WorldRegimeKind.ConstructorEmission;
  }

  return WorldRegimeKind.DefinitionMerge;
}

function selectRegistrationPath(
  extensionScan: {
    readonly activeExtensionCount: number;
    readonly underclosedGeneratedVocabularyCount: number;
  },
  registrationScan: RegistrationPatternScanResult
): RegistrationPathKind {
  const paths = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ].map((pattern) => pattern.registrationPath);

  if (paths.includes(RegistrationPathKind.KernelRegistration)) {
    return RegistrationPathKind.KernelRegistration;
  }

  if (paths.includes(RegistrationPathKind.RegistryInsertion)) {
    return RegistrationPathKind.RegistryInsertion;
  }

  if (paths.includes(RegistrationPathKind.ConfigurationEmission)) {
    return RegistrationPathKind.ConfigurationEmission;
  }

  return extensionScan.activeExtensionCount > 0 ||
    extensionScan.underclosedGeneratedVocabularyCount > 0
    ? RegistrationPathKind.ConfigurationEmission
    : RegistrationPathKind.ResourceRegistration;
}

function selectConstructorArchetypes(
  extensionScan: {
    readonly activeExtensionCount: number;
    readonly underclosedGeneratedVocabularyCount: number;
  },
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

  if (archetypes.size === 0) {
    archetypes.add(ConstructorArchetypeKind.AggregateBundle);
  }

  return [...archetypes].sort((left, right) => left - right);
}

function selectAdmissionRegime(
  extensionScan: {
    readonly activeExtensionCount: number;
    readonly underclosedGeneratedVocabularyCount: number;
  },
  registrationScan: RegistrationPatternScanResult
): AdmissionRegimeKind {
  const registrationPatterns = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ];

  if (
    extensionScan.activeExtensionCount > 0 ||
    extensionScan.underclosedGeneratedVocabularyCount > 0 ||
    registrationPatterns.some(
      (pattern) => pattern.registrationPath === RegistrationPathKind.ConfigurationEmission
    )
  ) {
    return AdmissionRegimeKind.ExtensionQualified;
  }

  return AdmissionRegimeKind.FrameworkNative;
}

function selectLookupRegime(
  registrationScan: RegistrationPatternScanResult
): LookupRegimeKind {
  const lookupRegimes = [
    ...registrationScan.underclosedRegistrationPatterns,
    ...registrationScan.activeRegistrationPatterns
  ].map((pattern) => pattern.lookupRegime);

  if (lookupRegimes.includes(LookupRegimeKind.OwnerBoundedLocal)) {
    return LookupRegimeKind.OwnerBoundedLocal;
  }

  if (lookupRegimes.includes(LookupRegimeKind.RegistryLocalOnly)) {
    return LookupRegimeKind.RegistryLocalOnly;
  }

  if (lookupRegimes.includes(LookupRegimeKind.GenericDiAncestor)) {
    return LookupRegimeKind.GenericDiAncestor;
  }

  return LookupRegimeKind.CurrentPlusRootResource;
}

function selectMaterializationTiming(
  registrationScan: RegistrationPatternScanResult
): MaterializationTimingKind {
  const timings = [
    ...registrationScan.underclosedRegistrationPatterns,
    ...registrationScan.activeRegistrationPatterns
  ].map((pattern) => pattern.materializationTiming);

  if (timings.includes(MaterializationTimingKind.RenderTimeBranch)) {
    return MaterializationTimingKind.RenderTimeBranch;
  }

  if (timings.includes(MaterializationTimingKind.LifecycleSlotGated)) {
    return MaterializationTimingKind.LifecycleSlotGated;
  }

  if (timings.includes(MaterializationTimingKind.ChildWorldBranched)) {
    return MaterializationTimingKind.ChildWorldBranched;
  }

  if (timings.includes(MaterializationTimingKind.PreRuntimePreprocess)) {
    return MaterializationTimingKind.PreRuntimePreprocess;
  }

  return MaterializationTimingKind.Eager;
}
