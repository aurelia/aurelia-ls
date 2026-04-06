export const enum TemplateViewStrategyKind {
  ConventionalFile = 1,
  InlineTemplate = 2,
  NoView = 3
}

export const enum TemplateSourceKind {
  ExternalFile = 1,
  InlineText = 2
}

export const enum TemplateAssociationClosureKind {
  DeclaredExplicit = 1,
  ConventionMediated = 2,
  SourceAnalyzable = 3,
  RuntimeOnly = 4
}

export class AssociatedTemplateSource {
  public readonly hasTemplateSource: boolean;

  public constructor(
    public readonly templateSourceRef: string | undefined,
    public readonly viewStrategy: TemplateViewStrategyKind,
    public readonly closureKind: TemplateAssociationClosureKind,
    public readonly sourceKind?: TemplateSourceKind,
    public readonly templateFileName?: string,
    public readonly templateText?: string
  ) {
    this.hasTemplateSource = templateSourceRef !== undefined;
  }
}

export class UnderclosedTemplateSourceAssociation {
  public constructor(
    public readonly className: string,
    public readonly exportName: string,
    public readonly resourceName: string,
    public readonly fileName: string,
    public readonly closureKind: TemplateAssociationClosureKind,
    public readonly note: string,
    public readonly viewStrategy?: TemplateViewStrategyKind
  ) {}
}
