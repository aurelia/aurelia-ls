export const REF_KINDS = [
  'program',
  'source-file',
  'source-node',
  'symbol',
  'key',
  'container-world',
  'registration',
  'template',
  'compiled-template',
  'template-node',
  'template-location',
  'resource-reference',
] as const;

export type RefKind =
  typeof REF_KINDS[number];

export class SourceSpan {
  constructor(
    readonly start: number,
    readonly end: number,
  ) {}
}

export class ProgramRef {
  readonly kind = 'program' as const;

  constructor(
    readonly id: string,
    readonly repoRoot: string,
    readonly tsconfigPath: string | null,
  ) {}
}

export class SourceFileRef {
  readonly kind = 'source-file' as const;

  constructor(
    readonly id: string,
    readonly program: ProgramRef,
    readonly path: string,
  ) {}

  get programId(): string {
    return this.program.id;
  }
}

export class SourceNodeRef {
  readonly kind = 'source-node' as const;

  constructor(
    readonly id: string,
    readonly file: SourceFileRef,
    readonly nodeKind: string,
    readonly span: SourceSpan,
  ) {}
}

export class SymbolRef {
  readonly kind = 'symbol' as const;

  constructor(
    readonly id: string,
    readonly file: SourceFileRef | null,
    readonly name: string | null,
    readonly exportedAs: readonly string[],
    readonly declaration: SourceNodeRef | null,
  ) {}
}

export const KEY_REF_KINDS = [
  'interface-symbol',
  'constructable',
  'resource',
  'resolver',
  'object',
  'property',
] as const;

export type KeyRefKind =
  typeof KEY_REF_KINDS[number];

export class KeyRef {
  readonly kind = 'key' as const;

  constructor(
    readonly id: string,
    readonly keyKind: KeyRefKind,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly debugName: string | null,
  ) {}
}

export class ContainerWorldRef {
  readonly kind = 'container-world' as const;

  constructor(
    readonly id: string,
    readonly owner: SymbolRef | SourceNodeRef | null,
    readonly parentId: string | null,
  ) {}
}

export class RegistrationRef {
  readonly kind = 'registration' as const;

  constructor(
    readonly id: string,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly source: SourceNodeRef,
    readonly world: ContainerWorldRef,
    readonly key: KeyRef | null,
  ) {}
}

export class TemplateRef {
  readonly kind = 'template' as const;

  constructor(
    readonly id: string,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly file: SourceFileRef,
    readonly span: SourceSpan | null,
  ) {}
}

export class CompiledTemplateRef {
  readonly kind = 'compiled-template' as const;

  constructor(
    readonly id: string,
    readonly template: TemplateRef,
    readonly world: ContainerWorldRef,
  ) {}
}

export const TEMPLATE_NODE_REF_KINDS = [
  'element',
  'attribute',
  'binding',
  'text',
  'let',
  'unknown',
] as const;

export type TemplateNodeRefKind =
  typeof TEMPLATE_NODE_REF_KINDS[number];

export class TemplateNodeRef {
  readonly kind = 'template-node' as const;

  constructor(
    readonly id: string,
    readonly template: TemplateRef,
    readonly nodeKind: TemplateNodeRefKind,
    readonly path: readonly number[],
    readonly source: SourceNodeRef | null,
  ) {}
}

export class TemplateLocationRef {
  readonly kind = 'template-location' as const;

  constructor(
    readonly id: string,
    readonly template: TemplateRef,
    readonly offset: number,
    readonly target: TemplateNodeRef | ResourceReferenceRef | null,
  ) {}
}

export const RESOURCE_REFERENCE_REF_KINDS = [
  'custom-element',
  'custom-attribute',
  'template-controller',
  'value-converter',
  'binding-behavior',
  'binding-command',
  'unknown',
] as const;

export type ResourceReferenceRefKind =
  typeof RESOURCE_REFERENCE_REF_KINDS[number];

export class ResourceReferenceRef {
  readonly kind = 'resource-reference' as const;

  constructor(
    readonly id: string,
    readonly node: TemplateNodeRef,
    readonly resourceKind: ResourceReferenceRefKind,
    readonly key: KeyRef | null,
    readonly name: string | null,
  ) {}
}

export type T_Ref =
  | ProgramRef
  | SourceFileRef
  | SourceNodeRef
  | SymbolRef
  | KeyRef
  | ContainerWorldRef
  | RegistrationRef
  | TemplateRef
  | CompiledTemplateRef
  | TemplateNodeRef
  | TemplateLocationRef
  | ResourceReferenceRef;
