import {
  ContributorClassKind,
  CurrentWorldActivityStatusKind,
  SummaryReachabilityScopeKind,
  SummaryStatusKind
} from "../handoff/world-context-shapes.js";
import {
  CurrentWorldActivityStateKind,
  PublishedResourceDefinition,
  ResourceAdmissionStatusKind,
  ResourceDefinitionKind,
  ResourceRecognitionStatusKind,
  ReachabilityScopeKind,
  type PublishedResourceDefinition as PublishedResourceDefinitionType,
  type UnderclosedResourceDefinition
} from "../resources/resource-definition.js";
import { CurrentWorldPublication } from "./current-world-publication.js";
import {
  LookupRegimeKind,
  MaterializationTimingKind,
  RegistrationPathKind,
  type ConsultedWorldHandle,
  WorldParticipationFrontierKind
} from "../registration/consulted-world.js";
import type { WorkspacePackageRef } from "../packages/workspace-package.js";
import type { CustomElementScanResult } from "../registration/custom-element-declaration-scanner.js";
import type { ExtensionConfigurationScanResult } from "../registration/extension-configuration-scanner.js";
import {
  RegistrationPatternFamilyKind
} from "../registration/registration-pattern.js";
import type {
  ActiveRegistrationPattern,
  RegistrationPatternScanResult,
  UnderclosedRegistrationPattern
} from "../registration/registration-pattern.js";
import type { TemplateSourceAssociationScanResult } from "../registration/template-source-association-scanner.js";
import { TemplateViewStrategyKind } from "../templates/template-source-association.js";

const DECLARATION_WITNESS_REF_PREFIX = "declaration-witness";
const CLOSURE_REF_PREFIX = "closure";

export class CurrentWorldPublicationAssembler {
  public publishCurrentWorldPublication(
    consultedWorld: ConsultedWorldHandle,
    consultedPackage: WorkspacePackageRef,
    resourceScan: CustomElementScanResult,
    extensionScan: ExtensionConfigurationScanResult,
    registrationScan: RegistrationPatternScanResult,
    templateAssociations: TemplateSourceAssociationScanResult
  ): CurrentWorldPublication {
    const resources = resourceScan.recognizedElements.map(
      (customElement) => new PublishedResourceDefinition(
        ResourceDefinitionKind.CustomElement,
        customElement.className,
        customElement.exportName,
        customElement.resourceName,
        customElement.fileName,
        customElement.declarationSurface,
        customElement.declarationClosure,
        ResourceRecognitionStatusKind.Recognized,
        ResourceAdmissionStatusKind.Admitted,
        CurrentWorldActivityStateKind.CurrentWorldSensitive,
        ReachabilityScopeKind.ResourceCurrentPlusRoot,
        deriveResourceFrontier(resourceScan, extensionScan, registrationScan, templateAssociations),
        templateAssociations.findAssociation(customElement)
      )
    );

    const recognizedBasisCount = resources.length +
      extensionScan.activeExtensionCount +
      extensionScan.admittedGeneratedVocabularyCount +
      registrationScan.activeRegistrationPatternCount;
    const underclosedBasisCount = resourceScan.underclosedResources.length +
      extensionScan.underclosedGeneratedVocabularyCount +
      registrationScan.openRegistrationPatternCount +
      templateAssociations.underclosedAssociations.length;
    const terminalOpenBasisCount = registrationScan.unsupportedRegistrationBoundaryCount +
      registrationScan.runtimeOnlyRegistrationBoundaryCount;
    const frontier = derivePublicationFrontier(
      recognizedBasisCount,
      underclosedBasisCount,
      terminalOpenBasisCount
    );
    const packageIdentity = consultedPackage.packageName ?? consultedPackage.rootPath;

    return new CurrentWorldPublication(
      consultedWorld,
      consultedPackage,
      frontier,
      resources,
      resourceScan.underclosedResources,
      extensionScan.activeExtensions,
      extensionScan.underclosedExtensions,
      extensionScan.generatedVocabulary,
      registrationScan.activeRegistrationPatterns,
      registrationScan.underclosedRegistrationPatterns,
      templateAssociations.underclosedAssociations,
      createDeclarationWitnessRef(packageIdentity, frontier),
      createClosureRef(packageIdentity, frontier),
      collectScannedContributorClasses(
        resources,
        resourceScan.underclosedResources,
        extensionScan,
        registrationScan,
        templateAssociations
      ),
      collectScannedContributorRefs(
        resources,
        resourceScan.underclosedResources,
        extensionScan,
        registrationScan,
        templateAssociations
      ),
      [],
      deriveRecognitionStatus(recognizedBasisCount, underclosedBasisCount, terminalOpenBasisCount),
      deriveAdmissionStatus(frontier, recognizedBasisCount, underclosedBasisCount, terminalOpenBasisCount),
      deriveCurrentWorldActivityStatus(frontier, resources, registrationScan),
      collectReachabilityScopes(resources, registrationScan),
      deriveDeclarationWitnessStatus(recognizedBasisCount, underclosedBasisCount, terminalOpenBasisCount),
      deriveSearchedWorldCompletenessStatus(frontier, recognizedBasisCount, underclosedBasisCount, terminalOpenBasisCount),
      deriveOpenStateStatus(frontier, underclosedBasisCount)
    );
  }
}

function deriveResourceFrontier(
  resourceScan: CustomElementScanResult,
  extensionScan: ExtensionConfigurationScanResult,
  registrationScan: RegistrationPatternScanResult,
  templateAssociations: TemplateSourceAssociationScanResult
): WorldParticipationFrontierKind {
  if (
    resourceScan.underclosedResources.length === 0 &&
    extensionScan.underclosedGeneratedVocabularyCount === 0 &&
    registrationScan.underclosedRegistrationPatternCount === 0 &&
    templateAssociations.underclosedAssociations.length === 0
  ) {
    return WorldParticipationFrontierKind.CurrentWorldSensitive;
  }

  return WorldParticipationFrontierKind.WorldQualified;
}

function derivePublicationFrontier(
  recognizedBasisCount: number,
  underclosedBasisCount: number,
  terminalOpenBasisCount: number
): WorldParticipationFrontierKind {
  if (underclosedBasisCount === 0 && terminalOpenBasisCount === 0) {
    return recognizedBasisCount === 0
      ? WorldParticipationFrontierKind.ClosedBaseline
      : WorldParticipationFrontierKind.CurrentWorldSensitive;
  }

  if (recognizedBasisCount === 0 && underclosedBasisCount === 0) {
    return WorldParticipationFrontierKind.TerminalOpen;
  }

  return recognizedBasisCount === 0
    ? WorldParticipationFrontierKind.OpenPlaceholder
    : WorldParticipationFrontierKind.WorldQualified;
}

function collectScannedContributorClasses(
  resources: readonly PublishedResourceDefinitionType[],
  underclosedResources: readonly UnderclosedResourceDefinition[],
  extensionScan: ExtensionConfigurationScanResult,
  registrationScan: RegistrationPatternScanResult,
  templateAssociations: TemplateSourceAssociationScanResult
): readonly ContributorClassKind[] {
  const contributorClasses = new Set<ContributorClassKind>();
  const registrationPatterns = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ];

  if (resources.length > 0 || underclosedResources.length > 0) {
    contributorClasses.add(ContributorClassKind.ExplicitSourceDeclarations);
  }

  if (
    extensionScan.activeExtensionCount > 0 ||
    extensionScan.underclosedGeneratedVocabularyCount > 0 ||
    registrationPatterns.some((pattern) => pattern.registrationPath === RegistrationPathKind.ConfigurationEmission)
  ) {
    contributorClasses.add(ContributorClassKind.ConfigurationEmittedMembers);
  }

  if (
    registrationPatterns.some(
      (pattern) => pattern.registrationPath === RegistrationPathKind.KernelRegistration ||
        pattern.registrationPath === RegistrationPathKind.RegistryInsertion
    )
  ) {
    contributorClasses.add(ContributorClassKind.RegistryCarriers);
  }

  if (
    registrationPatterns.some((pattern) => pattern.registrationPath === RegistrationPathKind.AnalyzedModuleSelection)
  ) {
    contributorClasses.add(ContributorClassKind.ModuleIntakeCarriers);
  }

  if (
    resources.some((resource) => resource.templateAssociation?.viewStrategy === TemplateViewStrategyKind.ConventionalFile) ||
    templateAssociations.underclosedAssociations.some(
      (association) => association.viewStrategy === TemplateViewStrategyKind.ConventionalFile
    )
  ) {
    contributorClasses.add(ContributorClassKind.ConventionPolicyBroadening);
  }

  if (
    extensionScan.generatedVocabulary.length > 0 ||
    registrationPatterns.some((pattern) => pattern.lookupRegime === LookupRegimeKind.RegistryLocalOnly)
  ) {
    contributorClasses.add(ContributorClassKind.NamingAndAliasConvergence);
  }

  if (
    registrationPatterns.some(
      (pattern) => pattern.family === RegistrationPatternFamilyKind.MixedRootConstructorStack
    )
  ) {
    contributorClasses.add(ContributorClassKind.RootStackComposition);
  }

  if (
    registrationPatterns.some(
      (pattern) => pattern.family === RegistrationPatternFamilyKind.RoutedRootWrapperAdmission
    )
  ) {
    contributorClasses.add(ContributorClassKind.RouteShellAdmission);
  }

  return [...contributorClasses].sort((left, right) => left - right);
}

function collectScannedContributorRefs(
  resources: readonly PublishedResourceDefinitionType[],
  underclosedResources: readonly UnderclosedResourceDefinition[],
  extensionScan: ExtensionConfigurationScanResult,
  registrationScan: RegistrationPatternScanResult,
  templateAssociations: TemplateSourceAssociationScanResult
): readonly string[] {
  const refs = new Set<string>();

  for (const resource of resources) {
    refs.add(resource.fileName);
    if (resource.templateAssociation?.templateFileName !== undefined) {
      refs.add(resource.templateAssociation.templateFileName);
    }
  }

  for (const resource of underclosedResources) {
    refs.add(resource.fileName);
  }

  for (const extension of extensionScan.activeExtensions) {
    refs.add(extension.registrationFileName);
  }

  for (const extension of extensionScan.underclosedExtensions) {
    refs.add(extension.registrationFileName);
  }

  for (const pattern of registrationScan.activeRegistrationPatterns) {
    refs.add(pattern.registrationFileName);
  }

  for (const pattern of registrationScan.underclosedRegistrationPatterns) {
    refs.add(pattern.registrationFileName);
  }

  for (const association of templateAssociations.underclosedAssociations) {
    refs.add(association.fileName);
  }

  return [...refs].sort();
}

function deriveRecognitionStatus(
  recognizedBasisCount: number,
  underclosedBasisCount: number,
  terminalOpenBasisCount: number
): SummaryStatusKind {
  return recognizedBasisCount > 0 ||
    underclosedBasisCount > 0 ||
    terminalOpenBasisCount > 0
    ? SummaryStatusKind.Closed
    : SummaryStatusKind.OpenPlaceholder;
}

function deriveAdmissionStatus(
  frontier: WorldParticipationFrontierKind,
  recognizedBasisCount: number,
  underclosedBasisCount: number,
  terminalOpenBasisCount: number
): SummaryStatusKind {
  if (frontier === WorldParticipationFrontierKind.TerminalOpen) {
    return SummaryStatusKind.TerminalOpen;
  }

  if (recognizedBasisCount === 0 && underclosedBasisCount === 0 && terminalOpenBasisCount === 0) {
    return SummaryStatusKind.OpenPlaceholder;
  }

  return frontier === WorldParticipationFrontierKind.ClosedBaseline ||
      frontier === WorldParticipationFrontierKind.CurrentWorldSensitive
    ? SummaryStatusKind.Closed
    : SummaryStatusKind.ClosableOpen;
}

function deriveCurrentWorldActivityStatus(
  frontier: WorldParticipationFrontierKind,
  resources: readonly PublishedResourceDefinitionType[],
  registrationScan: RegistrationPatternScanResult
): CurrentWorldActivityStatusKind {
  if (frontier === WorldParticipationFrontierKind.TerminalOpen) {
    return CurrentWorldActivityStatusKind.TerminalOpen;
  }

  if (
    frontier === WorldParticipationFrontierKind.CurrentWorldSensitive ||
    resources.some(
      (resource) => resource.currentWorldActivityState === CurrentWorldActivityStateKind.CurrentWorldSensitive
    ) ||
    registrationScan.activeRegistrationPatterns.some(
      (pattern) => pattern.materializationTiming !== MaterializationTimingKind.Eager
    ) ||
    registrationScan.underclosedRegistrationPatterns.length > 0
  ) {
    return CurrentWorldActivityStatusKind.CurrentWorldSensitive;
  }

  return CurrentWorldActivityStatusKind.Closed;
}

function collectReachabilityScopes(
  resources: readonly PublishedResourceDefinitionType[],
  registrationScan: RegistrationPatternScanResult
): readonly SummaryReachabilityScopeKind[] {
  const reachabilityScopes = new Set<SummaryReachabilityScopeKind>();

  for (const resource of resources) {
    switch (resource.reachabilityScope) {
      case ReachabilityScopeKind.TemplateLocal:
        reachabilityScopes.add(SummaryReachabilityScopeKind.TemplateLocal);
        break;
      case ReachabilityScopeKind.ResourceCurrentPlusRoot:
      default:
        reachabilityScopes.add(SummaryReachabilityScopeKind.ResourceCurrentPlusRoot);
        break;
    }
  }

  const registrationPatterns = [
    ...registrationScan.activeRegistrationPatterns,
    ...registrationScan.underclosedRegistrationPatterns
  ];
  for (const pattern of registrationPatterns) {
    switch (pattern.lookupRegime) {
      case LookupRegimeKind.GenericDiAncestor:
        reachabilityScopes.add(SummaryReachabilityScopeKind.GenericDiAncestor);
        break;
      case LookupRegimeKind.RegistryLocalOnly:
        reachabilityScopes.add(SummaryReachabilityScopeKind.RegistryLocalOnly);
        break;
      case LookupRegimeKind.OwnerBoundedLocal:
        reachabilityScopes.add(SummaryReachabilityScopeKind.OwnerBoundedLocal);
        break;
      case LookupRegimeKind.AnalyzedModuleSelection:
        reachabilityScopes.add(SummaryReachabilityScopeKind.AnalyzedModuleSelection);
        break;
      case LookupRegimeKind.CurrentPlusRootResource:
      case LookupRegimeKind.OwnOnlyResource:
      default:
        reachabilityScopes.add(SummaryReachabilityScopeKind.ResourceCurrentPlusRoot);
        break;
    }
  }

  return [...reachabilityScopes].sort((left, right) => left - right);
}

function deriveDeclarationWitnessStatus(
  recognizedBasisCount: number,
  underclosedBasisCount: number,
  terminalOpenBasisCount: number
): SummaryStatusKind {
  return recognizedBasisCount > 0 ||
    underclosedBasisCount > 0 ||
    terminalOpenBasisCount > 0
    ? SummaryStatusKind.Closed
    : SummaryStatusKind.OpenPlaceholder;
}

function deriveSearchedWorldCompletenessStatus(
  frontier: WorldParticipationFrontierKind,
  recognizedBasisCount: number,
  underclosedBasisCount: number,
  terminalOpenBasisCount: number
): SummaryStatusKind {
  if (frontier === WorldParticipationFrontierKind.TerminalOpen) {
    return SummaryStatusKind.TerminalOpen;
  }

  if (recognizedBasisCount === 0 && underclosedBasisCount === 0 && terminalOpenBasisCount === 0) {
    return SummaryStatusKind.OpenPlaceholder;
  }

  return underclosedBasisCount === 0
    ? SummaryStatusKind.Closed
    : SummaryStatusKind.ClosableOpen;
}

function deriveOpenStateStatus(
  frontier: WorldParticipationFrontierKind,
  underclosedBasisCount: number
): SummaryStatusKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.TerminalOpen:
      return SummaryStatusKind.TerminalOpen;
    case WorldParticipationFrontierKind.OpenPlaceholder:
      return SummaryStatusKind.OpenPlaceholder;
    case WorldParticipationFrontierKind.WorldQualified:
      return SummaryStatusKind.ClosableOpen;
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
    case WorldParticipationFrontierKind.ClosedBaseline:
    default:
      return underclosedBasisCount === 0
        ? SummaryStatusKind.Closed
        : SummaryStatusKind.ClosableOpen;
  }
}

function createDeclarationWitnessRef(
  packageIdentity: string,
  frontier: WorldParticipationFrontierKind
): string {
  switch (frontier) {
    case WorldParticipationFrontierKind.WorldQualified:
    case WorldParticipationFrontierKind.OpenPlaceholder:
      return `${DECLARATION_WITNESS_REF_PREFIX}:qualified:${packageIdentity}`;
    case WorldParticipationFrontierKind.TerminalOpen:
      return `${DECLARATION_WITNESS_REF_PREFIX}:open:${packageIdentity}`;
    default:
      return `${DECLARATION_WITNESS_REF_PREFIX}:closed:${packageIdentity}`;
  }
}

function createClosureRef(
  packageIdentity: string,
  frontier: WorldParticipationFrontierKind
): string {
  switch (frontier) {
    case WorldParticipationFrontierKind.WorldQualified:
      return `${CLOSURE_REF_PREFIX}:world-qualified:${packageIdentity}`;
    case WorldParticipationFrontierKind.OpenPlaceholder:
      return `${CLOSURE_REF_PREFIX}:open-placeholder:${packageIdentity}`;
    case WorldParticipationFrontierKind.TerminalOpen:
      return `${CLOSURE_REF_PREFIX}:terminal-open:${packageIdentity}`;
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return `${CLOSURE_REF_PREFIX}:current-world-sensitive:${packageIdentity}`;
    case WorldParticipationFrontierKind.ClosedBaseline:
    default:
      return `${CLOSURE_REF_PREFIX}:closed-baseline:${packageIdentity}`;
  }
}
