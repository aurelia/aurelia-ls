import type { ConsultedWorldHandle, WorldParticipationFrontierKind } from "../registration/consulted-world.js";
import {
  CurrentWorldActivityStateKind,
  ResourceAdmissionStatusKind,
  type PublishedResourceDefinition
} from "../resources/resource-definition.js";
import type { WorkspacePackageRef } from "../packages/workspace-package.js";

export class CurrentWorldPublication {
  public readonly recognizedResourceCount: number;
  public readonly admittedResourceCount: number;
  public readonly activeResourceCount: number;

  public constructor(
    public readonly consultedWorld: ConsultedWorldHandle,
    public readonly consultedPackage: WorkspacePackageRef,
    public readonly frontier: WorldParticipationFrontierKind,
    public readonly resources: readonly PublishedResourceDefinition[],
    public readonly declarationWitnessRef: string,
    public readonly completenessRef: string
  ) {
    this.recognizedResourceCount = resources.length;
    this.admittedResourceCount = resources.filter(
      (resource) => resource.admissionStatus === ResourceAdmissionStatusKind.Admitted
    ).length;
    this.activeResourceCount = resources.filter(
      (resource) => resource.currentWorldActivityState === CurrentWorldActivityStateKind.Active
    ).length;
  }
}
