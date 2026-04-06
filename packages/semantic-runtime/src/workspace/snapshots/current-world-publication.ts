import {
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import {
  type ConsultedWorldHandle,
  WorldParticipationFrontierKind
} from "../registration/consulted-world.js";
import {
  CurrentWorldActivityStateKind,
  ResourceAdmissionStatusKind,
  type PublishedResourceDefinition,
  type UnderclosedResourceDefinition
} from "../resources/resource-definition.js";
import type { WorkspacePackageRef } from "../packages/workspace-package.js";

export class CurrentWorldPublication {
  public readonly recognizedResourceCount: number;
  public readonly admittedResourceCount: number;
  public readonly activeResourceCount: number;
  public readonly underclosedResourceCount: number;

  public constructor(
    public readonly consultedWorld: ConsultedWorldHandle,
    public readonly consultedPackage: WorkspacePackageRef,
    public readonly frontier: WorldParticipationFrontierKind,
    public readonly resources: readonly PublishedResourceDefinition[],
    public readonly underclosedResources: readonly UnderclosedResourceDefinition[],
    public readonly declarationWitnessRef: string,
    public readonly closureRef: string
  ) {
    this.recognizedResourceCount = resources.length;
    this.admittedResourceCount = resources.filter(
      (resource) => resource.admissionStatus === ResourceAdmissionStatusKind.Admitted
    ).length;
    this.activeResourceCount = resources.filter(
      (resource) => resource.currentWorldActivityState === CurrentWorldActivityStateKind.Active
    ).length;
    this.underclosedResourceCount = underclosedResources.length;
  }

  public get claimOutcome(): ClaimOutcomeKind {
    return this.frontier === WorldParticipationFrontierKind.TerminalOpen
      ? ClaimOutcomeKind.NoClaim
      : ClaimOutcomeKind.Present;
  }

  public get claimQualifier(): ClaimQualifierKind {
    switch (this.frontier) {
      case WorldParticipationFrontierKind.WorldQualified:
      case WorldParticipationFrontierKind.TerminalOpen:
      case WorldParticipationFrontierKind.OpenPlaceholder:
        return ClaimQualifierKind.WorldOpen;
      default:
        return ClaimQualifierKind.None;
    }
  }

  public get closureStatus(): ClosureStatusKind {
    switch (this.frontier) {
      case WorldParticipationFrontierKind.ClosedBaseline:
      case WorldParticipationFrontierKind.CurrentWorldSensitive:
        return ClosureStatusKind.Closed;
      case WorldParticipationFrontierKind.WorldQualified:
        return ClosureStatusKind.Qualified;
      case WorldParticipationFrontierKind.TerminalOpen:
        return ClosureStatusKind.Open;
      case WorldParticipationFrontierKind.OpenPlaceholder:
        return ClosureStatusKind.Partial;
      default:
        return ClosureStatusKind.Open;
    }
  }
}
