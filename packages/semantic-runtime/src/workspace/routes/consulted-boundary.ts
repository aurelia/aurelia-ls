export const enum ConsultedBoundaryKind {
  OwnerLocal = 1,
  Package = 2,
  Workspace = 3,
  ModuleIntake = 4,
  ExternalDependency = 5
}

export class ConsultedBoundaryRef {
  public constructor(
    public readonly kind: ConsultedBoundaryKind,
    public readonly id: string
  ) {}
}
