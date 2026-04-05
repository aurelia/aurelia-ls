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

export interface RecognizedCustomElement {
  readonly className: string;
  readonly exportName: string;
  readonly resourceName: string;
  readonly fileName: string;
}

export class ResourceAdmissionEvaluator {
  public publishCurrentWorldPublication(
    consultedWorld: ConsultedWorldHandle,
    consultedPackage: WorkspacePackageRef,
    customElements: readonly RecognizedCustomElement[]
  ): CurrentWorldPublication {
    const resources = customElements.map(
      (customElement) => new PublishedResourceDefinition(
        ResourceDefinitionKind.CustomElement,
        customElement.className,
        customElement.exportName,
        customElement.resourceName,
        customElement.fileName,
        ResourceRecognitionStatusKind.Recognized,
        ResourceAdmissionStatusKind.Admitted,
        CurrentWorldActivityStateKind.CurrentWorldSensitive,
        ReachabilityScopeKind.ResourceCurrentPlusRoot,
        WorldParticipationFrontierKind.CurrentWorldSensitive
      )
    );

    const frontier = resources.length === 0
      ? WorldParticipationFrontierKind.ClosedBaseline
      : WorldParticipationFrontierKind.CurrentWorldSensitive;
    const packageIdentity = consultedPackage.packageName ?? consultedPackage.rootPath;

    return new CurrentWorldPublication(
      consultedWorld,
      consultedPackage,
      frontier,
      resources,
      `declaration-witness:${packageIdentity}`,
      `completeness:${packageIdentity}`
    );
  }
}
