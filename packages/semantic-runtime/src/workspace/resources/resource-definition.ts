import type { WorldParticipationFrontierKind } from "../registration/consulted-world.js";
import type { AssociatedTemplateSource } from "../templates/template-source-association.js";

export const enum ResourceDefinitionKind {
  CustomElement = 1
}

export const enum ResourceDeclarationSurfaceKind {
  Decorator = 1,
  StaticMetadata = 2,
  DefineCall = 3
}

export const enum ResourceDeclarationClosureKind {
  DeclaredExplicit = 1,
  SourceAnalyzable = 2,
  RuntimeOnly = 3
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
    public readonly declarationSurface: ResourceDeclarationSurfaceKind,
    public readonly declarationClosure: ResourceDeclarationClosureKind,
    public readonly recognitionStatus: ResourceRecognitionStatusKind,
    public readonly admissionStatus: ResourceAdmissionStatusKind,
    public readonly currentWorldActivityState: CurrentWorldActivityStateKind,
    public readonly reachabilityScope: ReachabilityScopeKind,
    public readonly frontier: WorldParticipationFrontierKind,
    public readonly templateAssociation?: AssociatedTemplateSource
  ) {}
}

export class UnderclosedResourceDefinition {
  public constructor(
    public readonly kind: ResourceDefinitionKind,
    public readonly className: string,
    public readonly exportName: string,
    public readonly fileName: string,
    public readonly declarationSurface: ResourceDeclarationSurfaceKind,
    public readonly declarationClosure: ResourceDeclarationClosureKind,
    public readonly note: string
  ) {}
}

export class RecognizedCustomElement {
  public constructor(
    public readonly className: string,
    public readonly exportName: string,
    public readonly resourceName: string,
    public readonly fileName: string,
    public readonly declarationSurface: ResourceDeclarationSurfaceKind,
    public readonly declarationClosure: ResourceDeclarationClosureKind
  ) {}
}
