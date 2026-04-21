import type {
  BindableEntry,
  CustomAttributeDefinition,
  CustomAttributeFieldProvenance,
  TemplateControllerDefinition,
} from '../resources/index.js';

export const COMPILER_ATTRIBUTE_BINDABLE_INFO_ORIGIN_KINDS = [
  'authored-entry',
  'synthesized-default-property',
] as const;

export type CompilerAttributeBindableInfoOriginKind =
  typeof COMPILER_ATTRIBUTE_BINDABLE_INFO_ORIGIN_KINDS[number];

export const COMPILER_ATTRIBUTE_PRIMARY_BINDABLE_MODE_KINDS = [
  'selected-authored',
  'synthesized-default-property',
  'open',
] as const;

export type CompilerAttributePrimaryBindableModeKind =
  typeof COMPILER_ATTRIBUTE_PRIMARY_BINDABLE_MODE_KINDS[number];

export const COMPILER_ATTRIBUTE_BINDABLES_INFO_OPEN_SEAM_KINDS = [
  'authored-bindable-name-open',
  'default-property-selection-open',
] as const;

export type CompilerAttributeBindablesInfoOpenSeamKind =
  typeof COMPILER_ATTRIBUTE_BINDABLES_INFO_OPEN_SEAM_KINDS[number];

export class CompilerAttributeBindablesInfoOpenSeam {
  constructor(
    readonly kind: CompilerAttributeBindablesInfoOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeBindableInfoEntry {
  constructor(
    readonly name: string,
    readonly attribute: string,
    readonly origin: CompilerAttributeBindableInfoOriginKind,
    readonly sourceBindable: BindableEntry | null = null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributePrimaryBindableProvenance {
  constructor(
    readonly mode: CompilerAttributePrimaryBindableModeKind,
    readonly selected: CompilerAttributeBindableInfoEntry | null,
    readonly defaultPropertyName: string | null,
    readonly defaultPropertyProvenance: CustomAttributeFieldProvenance | null = null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeBindablesInfo {
  private readonly byAttr = new Map<string, CompilerAttributeBindableInfoEntry>();
  private readonly byName = new Map<string, CompilerAttributeBindableInfoEntry>();

  constructor(
    readonly resource: CustomAttributeDefinition | TemplateControllerDefinition,
    readonly entries: readonly CompilerAttributeBindableInfoEntry[] = [],
    readonly primary: CompilerAttributeBindableInfoEntry | null = null,
    readonly primaryProvenance: CompilerAttributePrimaryBindableProvenance | null = null,
    readonly openSeams: readonly CompilerAttributeBindablesInfoOpenSeam[] = [],
    readonly note: string | null = null,
  ) {
    for (const current of entries) {
      this.byAttr.set(current.attribute, current);
      this.byName.set(current.name, current);
    }
  }

  readByAttr(
    name: string,
  ): CompilerAttributeBindableInfoEntry | null {
    return this.byAttr.get(name) ?? null;
  }

  readByName(
    name: string,
  ): CompilerAttributeBindableInfoEntry | null {
    return this.byName.get(name) ?? null;
  }
}
