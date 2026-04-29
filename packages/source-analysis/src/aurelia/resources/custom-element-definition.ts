import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import type { BindableDefinition, BindableDefinitionContribution } from './bindable-definition.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type {
  InstructionReference,
  ResourceAliasDefinition,
  ResourceDependencyReference,
  ResourceTargetReference,
} from './resource-reference.js';
import type { WatchDefinition, WatchDefinitionContribution } from './watch-definition.js';

export const enum CustomElementCaptureKind {
  None = 'none',
  All = 'all',
  Predicate = 'predicate',
  Open = 'open',
}

export const enum CustomElementTemplateKind {
  None = 'none',
  Markup = 'markup',
  DomNode = 'dom-node',
  Open = 'open',
}

export const enum ShadowRootMode {
  Open = 'open',
  Closed = 'closed',
}

export type CustomElementDefinitionField =
  | 'target'
  | 'name'
  | 'aliases'
  | 'key'
  | 'capture'
  | 'template'
  | 'instructions'
  | 'dependencies'
  | 'injectable'
  | 'needsCompile'
  | 'surrogates'
  | 'bindables'
  | 'containerless'
  | 'shadowOptions'
  | 'hasSlots'
  | 'enhance'
  | 'watches'
  | 'strict'
  | 'processContent';

export class CustomElementCaptureDefinition {
  constructor(
    readonly kind: CustomElementCaptureKind,
    readonly predicateTarget: ResourceTargetReference | null = null,
  ) {}
}

export class CustomElementTemplateDefinition {
  constructor(
    readonly kind: CustomElementTemplateKind,
    readonly markup: string | null = null,
    readonly addressHandle: AddressHandle | null = null,
  ) {}
}

export class ShadowOptionsDefinition {
  constructor(
    readonly mode: ShadowRootMode,
  ) {}
}

export const enum CustomElementDefinitionContributionKind {
  Header = 'header',
  DefinitionObject = 'definition-object',
  TypeStaticProperty = 'type-static-property',
  Annotation = 'annotation',
  BindableMetadata = 'bindable-metadata',
  WatchMetadata = 'watch-metadata',
  Convention = 'convention',
}

// TODO(resource-convergence): This is a provisional field-contribution envelope. Once convergence has real producers,
// decide whether contributions should become per-origin variants, per-field patches, or another tighter shape.
export class CustomElementDefinitionContribution {
  constructor(
    readonly contributionKind: CustomElementDefinitionContributionKind,
    readonly target: ResourceTargetReference | null = null,
    readonly name: string | null = null,
    readonly aliases: readonly ResourceAliasDefinition[] = [],
    readonly key: string | null = null,
    readonly capture: CustomElementCaptureDefinition | null = null,
    readonly template: CustomElementTemplateDefinition | null = null,
    readonly instructions: readonly InstructionReference[] = [],
    readonly dependencies: readonly ResourceDependencyReference[] = [],
    readonly injectable: IdentityHandle | null = null,
    readonly needsCompile: boolean | null = null,
    readonly surrogates: readonly InstructionReference[] = [],
    readonly bindables: readonly BindableDefinitionContribution[] = [],
    readonly containerless: boolean | null = null,
    readonly shadowOptions: ShadowOptionsDefinition | null = null,
    readonly hasSlots: boolean | null = null,
    readonly enhance: boolean | null = null,
    readonly watches: readonly WatchDefinitionContribution[] = [],
    readonly strict: boolean | null = null,
    readonly processContent: ResourceTargetReference | null = null,
    readonly fieldProvenance: readonly FieldProvenance<CustomElementDefinitionField>[] = [],
  ) {}
}

@auLink('runtime-html:CustomElementDefinition')
export class CustomElementDefinition {
  get type(): ResourceDefinitionKind.CustomElement { return ResourceDefinitionKind.CustomElement; }

  constructor(
    /** Product handle for the materialized definition product, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Identity for this resource definition. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the carrier or framework catalog that produced this definition. */
    readonly sourceAddressHandle: AddressHandle | null,
    readonly target: ResourceTargetReference,
    readonly name: string,
    readonly aliases: readonly ResourceAliasDefinition[],
    readonly key: string,
    readonly capture: CustomElementCaptureDefinition,
    readonly template: CustomElementTemplateDefinition | null,
    readonly instructions: readonly InstructionReference[],
    readonly dependencies: readonly ResourceDependencyReference[],
    readonly injectable: IdentityHandle | null,
    readonly needsCompile: boolean,
    readonly surrogates: readonly InstructionReference[],
    readonly bindables: readonly BindableDefinition[],
    readonly containerless: boolean,
    readonly shadowOptions: ShadowOptionsDefinition | null,
    readonly hasSlots: boolean,
    readonly enhance: boolean,
    readonly watches: readonly WatchDefinition[],
    readonly strict: boolean | null,
    readonly processContent: ResourceTargetReference | null,
    readonly contributions: readonly CustomElementDefinitionContribution[] = [],
    readonly fieldProvenance: readonly FieldProvenance<CustomElementDefinitionField>[] = [],
  ) {}
}
