import type { WorldParticipationFrontierKind } from "../registration/consulted-world.js";

export const enum ResourceDefinitionKind {
  CustomElement = 1
}

export const enum ResourceRecognitionStatusKind {
  Recognized = 1
}

export const enum ResourceAdmissionStatusKind {
  Admitted = 1,
  CandidateOnly = 2,
  Unadmitted = 3
}

export const enum CurrentWorldActivityStateKind {
  Active = 1,
  Inactive = 2,
  CurrentWorldSensitive = 3
}

export const enum ReachabilityScopeKind {
  ResourceCurrentPlusRoot = 1,
  TemplateLocal = 2
}

export class PublishedResourceDefinition {
  public constructor(
    public readonly kind: ResourceDefinitionKind,
    public readonly className: string,
    public readonly exportName: string,
    public readonly resourceName: string,
    public readonly fileName: string,
    public readonly recognitionStatus: ResourceRecognitionStatusKind,
    public readonly admissionStatus: ResourceAdmissionStatusKind,
    public readonly currentWorldActivityState: CurrentWorldActivityStateKind,
    public readonly reachabilityScope: ReachabilityScopeKind,
    public readonly frontier: WorldParticipationFrontierKind
  ) {}
}
