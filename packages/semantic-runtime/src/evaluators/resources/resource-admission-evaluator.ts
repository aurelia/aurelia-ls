import { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import {
  CurrentWorldActivityStateKind,
  PublishedResourceDefinition,
  ResourceAdmissionStatusKind,
  ResourceDefinitionKind,
  ResourceRecognitionStatusKind,
  ReachabilityScopeKind
} from "../../workspace/resources/resource-definition.js";
import {
  type ConsultedWorldHandle,
  WorldParticipationFrontierKind
} from "../../workspace/registration/consulted-world.js";
import type { WorkspacePackageRef } from "../../workspace/packages/workspace-package.js";
import type { CustomElementScanResult } from "../../workspace/registration/custom-element-declaration-scanner.js";

export class ResourceAdmissionEvaluator {
  public publishCurrentWorldPublication(
    consultedWorld: ConsultedWorldHandle,
    consultedPackage: WorkspacePackageRef,
    scanResult: CustomElementScanResult
  ): CurrentWorldPublication {
    const resources = scanResult.recognizedElements.map(
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
        deriveResourceFrontier(scanResult)
      )
    );

    const frontier = derivePublicationFrontier(scanResult);
    const packageIdentity = consultedPackage.packageName ?? consultedPackage.rootPath;

    return new CurrentWorldPublication(
      consultedWorld,
      consultedPackage,
      frontier,
      resources,
      scanResult.underclosedResources,
      createDeclarationWitnessRef(packageIdentity, frontier),
      createClosureRef(packageIdentity, frontier)
    );
  }
}

function deriveResourceFrontier(
  scanResult: CustomElementScanResult
): WorldParticipationFrontierKind {
  if (scanResult.underclosedResources.length === 0) {
    return WorldParticipationFrontierKind.CurrentWorldSensitive;
  }

  return WorldParticipationFrontierKind.WorldQualified;
}

function derivePublicationFrontier(
  scanResult: CustomElementScanResult
): WorldParticipationFrontierKind {
  if (scanResult.underclosedResources.length === 0) {
    return scanResult.recognizedElements.length === 0
      ? WorldParticipationFrontierKind.ClosedBaseline
      : WorldParticipationFrontierKind.CurrentWorldSensitive;
  }

  return scanResult.recognizedElements.length === 0
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
