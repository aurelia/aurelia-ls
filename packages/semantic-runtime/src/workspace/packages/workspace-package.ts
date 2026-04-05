export class WorkspacePackageRef {
  public constructor(
    public readonly rootPath: string,
    public readonly packageName?: string
  ) {}
}
