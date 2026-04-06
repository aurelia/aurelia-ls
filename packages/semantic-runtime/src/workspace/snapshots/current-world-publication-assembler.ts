import {
  CurrentWorldActivityStateKind,
  PublishedResourceDefinition,
  ResourceAdmissionStatusKind,
  ResourceDefinitionKind,
  ResourceRecognitionStatusKind,
  ReachabilityScopeKind
} from "../resources/resource-definition.js";
import { CurrentWorldPublication } from "./current-world-publication.js";
import {
  type ConsultedWorldHandle,
  WorldParticipationFrontierKind
} from "../registration/consulted-world.js";
import type { WorkspacePackageRef } from "../packages/workspace-package.js";
import type { CustomElementScanResult } from "../registration/custom-element-declaration-scanner.js";
import type { ExtensionConfigurationScanResult } from "../registration/extension-configuration-scanner.js";

export class CurrentWorldPublicationAssembler {
  public publishCurrentWorldPublication(
    consultedWorld: ConsultedWorldHandle,
    consultedPackage: WorkspacePackageRef,
    resourceScan: CustomElementScanResult,
    extensionScan: ExtensionConfigurationScanResult
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
        deriveResourceFrontier(resourceScan, extensionScan)
      )
    );

    const frontier = derivePublicationFrontier(resources.length, resourceScan.underclosedResources.length, extensionScan);
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
      createDeclarationWitnessRef(packageIdentity, frontier),
      createClosureRef(packageIdentity, frontier)
    );
  }
}

function deriveResourceFrontier(
  resourceScan: CustomElementScanResult,
  extensionScan: ExtensionConfigurationScanResult
): WorldParticipationFrontierKind {
  if (
    resourceScan.underclosedResources.length === 0 &&
    extensionScan.underclosedGeneratedVocabularyCount === 0
  ) {
    return WorldParticipationFrontierKind.CurrentWorldSensitive;
  }

  return WorldParticipationFrontierKind.WorldQualified;
}

function derivePublicationFrontier(
  recognizedResourceCount: number,
  underclosedResourceCount: number,
  extensionScan: ExtensionConfigurationScanResult
): WorldParticipationFrontierKind {
  const recognizedBasisCount = recognizedResourceCount +
    extensionScan.activeExtensionCount +
    extensionScan.admittedGeneratedVocabularyCount;
  const underclosedBasisCount = underclosedResourceCount +
    extensionScan.underclosedGeneratedVocabularyCount;

  if (underclosedBasisCount === 0) {
    return recognizedBasisCount === 0
      ? WorldParticipationFrontierKind.ClosedBaseline
      : WorldParticipationFrontierKind.CurrentWorldSensitive;
  }

  return recognizedBasisCount === 0
    ? WorldParticipationFrontierKind.OpenPlaceholder
    : WorldParticipationFrontierKind.WorldQualified;
}

function createDeclarationWitnessRef(
  packageIdentity: string,
  frontier: WorldParticipationFrontierKind
): string {
  switch (frontier) {
    case WorldParticipationFrontierKind.WorldQualified:
    case WorldParticipationFrontierKind.OpenPlaceholder:
      return `declaration-witness:qualified:${packageIdentity}`;
    case WorldParticipationFrontierKind.TerminalOpen:
      return `declaration-witness:open:${packageIdentity}`;
    default:
      return `declaration-witness:closed:${packageIdentity}`;
  }
}

function createClosureRef(
  packageIdentity: string,
  frontier: WorldParticipationFrontierKind
): string {
  switch (frontier) {
    case WorldParticipationFrontierKind.WorldQualified:
      return `closure:world-qualified:${packageIdentity}`;
    case WorldParticipationFrontierKind.OpenPlaceholder:
      return `closure:open-placeholder:${packageIdentity}`;
    case WorldParticipationFrontierKind.TerminalOpen:
      return `closure:terminal-open:${packageIdentity}`;
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return `closure:current-world-sensitive:${packageIdentity}`;
    case WorldParticipationFrontierKind.ClosedBaseline:
    default:
      return `closure:closed-baseline:${packageIdentity}`;
  }
}
