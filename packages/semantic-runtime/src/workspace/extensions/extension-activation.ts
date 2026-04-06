export const enum ExtensionFamilyKind {
  I18n = 1
}

export const enum ExtensionConfigurationProfileKind {
  CustomizedDefault = 1,
  GeneratedSyntax = 2
}

export const enum GeneratedTemplateVocabularyKind {
  AttributePattern = 1,
  BindingCommand = 2
}

export const enum ExtensionAdmissionClosureKind {
  GeneratedExplicit = 1,
  SourceAnalyzable = 2,
  RuntimeOnly = 3
}

export class GeneratedTemplateVocabularyMember {
  public constructor(
    public readonly family: ExtensionFamilyKind,
    public readonly kind: GeneratedTemplateVocabularyKind,
    public readonly surfaceName: string,
    public readonly canonicalName: string,
    public readonly closureKind: ExtensionAdmissionClosureKind
  ) {}
}

export class ActiveExtensionActivation {
  public readonly admittedGeneratedVocabularyCount: number;

  public constructor(
    public readonly family: ExtensionFamilyKind,
    public readonly profiles: readonly ExtensionConfigurationProfileKind[],
    public readonly packageQualifier: string,
    public readonly registrationFileName: string,
    public readonly closureKind: ExtensionAdmissionClosureKind,
    public readonly generatedVocabulary: readonly GeneratedTemplateVocabularyMember[]
  ) {
    this.admittedGeneratedVocabularyCount = generatedVocabulary.length;
  }
}

export class UnderclosedExtensionActivation {
  public constructor(
    public readonly family: ExtensionFamilyKind | undefined,
    public readonly profiles: readonly ExtensionConfigurationProfileKind[],
    public readonly packageQualifier: string | undefined,
    public readonly registrationFileName: string,
    public readonly closureKind: ExtensionAdmissionClosureKind,
    public readonly note: string
  ) {}
}
