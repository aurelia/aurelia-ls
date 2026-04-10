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
  RegistrationPathKind,
  type ConsultedWorldHandle
} from "../registration/consulted-world.js";
import type { WorkspacePackageRef } from "../packages/workspace-package.js";
import type { CustomElementScanResult } from "../registration/custom-element-declaration-scanner.js";
import type { ExtensionConfigurationScanResult } from "../registration/extension-configuration-scanner.js";
import {
  RegistrationPatternFamilyKind,
  RegistrationTransitionClassId
} from "../registration/registration-pattern.js";
import type {
  ActiveRegistrationPattern,
  RegistrationPatternScanResult,
  UnderclosedRegistrationPattern
} from "../registration/registration-pattern.js";
import type { TemplateSourceAssociationScanResult } from "../registration/template-source-association-scanner.js";
import { TemplateViewStrategyKind } from "../templates/template-source-association.js";
import { CurrentWorldProducerBasisAssembler } from "./current-world-producer-basis.js";

export class CurrentWorldPublicationAssembler {
  readonly #producerBasisAssembler = new CurrentWorldProducerBasisAssembler();

  public publishCurrentWorldPublication(
    consultedWorld: ConsultedWorldHandle,
    consultedPackage: WorkspacePackageRef,
    resourceScan: CustomElementScanResult,
    extensionScan: ExtensionConfigurationScanResult,
    registrationScan: RegistrationPatternScanResult,
    templateAssociations: TemplateSourceAssociationScanResult
  ): CurrentWorldPublication {
    const producerBasis = this.#producerBasisAssembler.assess(
      resourceScan,
      extensionScan,
      registrationScan,
      templateAssociations
    );
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
        producerBasis.frontier,
        templateAssociations.findAssociation(customElement)
      )
    );

    return new CurrentWorldPublication(
      consultedWorld,
      consultedPackage,
      producerBasis.frontier,
      resources,
      resourceScan.underclosedResources,
      extensionScan.activeExtensions,
      extensionScan.underclosedExtensions,
      extensionScan.generatedVocabulary,
      registrationScan.activeRegistrationPatterns,
      registrationScan.underclosedRegistrationPatterns,
      templateAssociations.underclosedAssociations,
      producerBasis.createDeclarationWitnessRef(consultedWorld),
      producerBasis.createClosureRef(consultedWorld),
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
      producerBasis.recognitionStatus,
      producerBasis.admissionStatus,
      producerBasis.currentWorldActivityStatus,
      collectReachabilityScopes(resources, registrationScan),
      producerBasis.declarationWitnessStatus,
      producerBasis.searchedWorldCompletenessStatus,
      producerBasis.openStateStatus
    );
  }
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
      || registrationPatterns.some(
        (pattern) => pattern.family === RegistrationPatternFamilyKind.RouteConfigAdmissionWorld
      )
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
    registrationPatterns.some((pattern) => pattern.lookupRegime === LookupRegimeKind.RegistryLocalOnly) ||
    registrationPatterns.some(
      (pattern) => pattern.metadata.transitionClassId === RegistrationTransitionClassId.AliasLinkage
    )
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
