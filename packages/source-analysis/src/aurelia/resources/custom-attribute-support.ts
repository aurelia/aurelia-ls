import type { KeyRef, SourceNodeRef } from '../refs.js';

export const CUSTOM_ATTRIBUTE_SUPPORT_FIELD_KINDS = [
  'name',
  'aliases',
  'bindables',
  'default-property',
  'no-multi-bindings',
  'dependencies',
  'container-strategy',
  'is-template-controller',
] as const;

export type CustomAttributeSupportFieldKind =
  typeof CUSTOM_ATTRIBUTE_SUPPORT_FIELD_KINDS[number];

export const CUSTOM_ATTRIBUTE_SUPPORT_CARRIER_KINDS = [
  'annotation-decorator',
  'bindable-decorator',
  'static-au-property',
  'static-own-property',
  'default',
  'open',
] as const;

export type CustomAttributeSupportCarrierKind =
  typeof CUSTOM_ATTRIBUTE_SUPPORT_CARRIER_KINDS[number];

export const CUSTOM_ATTRIBUTE_BINDABLE_FIELD_KINDS = [
  'name',
  'attribute',
  'callback',
  'mode',
  'set',
  'type',
  'nullable',
] as const;

export type CustomAttributeBindableFieldKind =
  typeof CUSTOM_ATTRIBUTE_BINDABLE_FIELD_KINDS[number];

export const CUSTOM_ATTRIBUTE_BINDABLE_INTERCEPTOR_KINDS = [
  'default-noop',
  'explicit-set',
  'type-coercer',
  'open',
] as const;

export type CustomAttributeBindableInterceptorKind =
  typeof CUSTOM_ATTRIBUTE_BINDABLE_INTERCEPTOR_KINDS[number];

export const CUSTOM_ATTRIBUTE_DEPENDENCY_SOURCE_KINDS = [
  'literal-array',
  'merged-array',
  'array-reference',
  'call-result',
  'open-expression',
] as const;

export type CustomAttributeDependencySourceKind =
  typeof CUSTOM_ATTRIBUTE_DEPENDENCY_SOURCE_KINDS[number];

export const CUSTOM_ATTRIBUTE_DEPENDENCY_LINK_SEED_KINDS = [
  'identifier-name',
  'property-access-name',
  'string-key',
  'open-expression',
] as const;

export type CustomAttributeDependencyLinkSeedKind =
  typeof CUSTOM_ATTRIBUTE_DEPENDENCY_LINK_SEED_KINDS[number];

export class CustomAttributeFieldWitness {
  constructor(
    readonly field: CustomAttributeSupportFieldKind,
    readonly carrier: CustomAttributeSupportCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributeBindableFieldWitness {
  constructor(
    readonly field: CustomAttributeBindableFieldKind,
    readonly carrier: CustomAttributeSupportCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributeFieldProvenance {
  constructor(
    readonly field: CustomAttributeSupportFieldKind,
    readonly mode: 'selected' | 'merged' | 'presence-only',
    readonly selected: CustomAttributeFieldWitness | null,
    readonly contributors: readonly CustomAttributeFieldWitness[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributeBindableFieldProvenance {
  constructor(
    readonly field: CustomAttributeBindableFieldKind,
    readonly mode: 'selected' | 'presence-only',
    readonly selected: CustomAttributeBindableFieldWitness | null,
    readonly contributors: readonly CustomAttributeBindableFieldWitness[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributeIdentity {
  constructor(
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly key: KeyRef | null = null,
    readonly provenance: readonly CustomAttributeFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: CustomAttributeSupportFieldKind,
  ): CustomAttributeFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

export class CustomAttributeBindableEntry {
  constructor(
    readonly name: string | null,
    readonly attribute: string | null = null,
    readonly callback: string | null = null,
    readonly mode: string | number | null = null,
    readonly interceptorKind: CustomAttributeBindableInterceptorKind = 'open',
    readonly typeReferenceName: string | null = null,
    readonly nullable: boolean | null = null,
    readonly provenance: readonly CustomAttributeBindableFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  get witness(): CustomAttributeBindableFieldWitness | null {
    return this.readProvenance('name')?.selected ?? null;
  }

  readProvenance(
    field: CustomAttributeBindableFieldKind,
  ): CustomAttributeBindableFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

export class CustomAttributeBindableSurface {
  constructor(
    readonly entries: readonly CustomAttributeBindableEntry[] = [],
    readonly provenance: readonly CustomAttributeFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(): CustomAttributeFieldProvenance | null {
    return this.provenance.find((current) => current.field === 'bindables') ?? null;
  }
}

// TODO: framework source confirms that custom-attribute and template-controller
// `definition.dependencies` are registered into the attribute controller
// container at runtime, but we do not yet know the full downstream product
// consequence beyond that registration step. Keep this carrier provisional
// until we can show clearer behavior than "runtime container input".
export class CustomAttributeDependencyEntry {
  constructor(
    readonly referenceName: string | null,
    readonly sourceKind: CustomAttributeDependencySourceKind,
    readonly linkSeedKind: CustomAttributeDependencyLinkSeedKind,
    readonly witness: CustomAttributeFieldWitness,
    readonly note: string | null = null,
  ) {}
}

export class CustomAttributeDependencyContribution {
  constructor(
    readonly entries: readonly CustomAttributeDependencyEntry[] = [],
    readonly provenance: readonly CustomAttributeFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(): CustomAttributeFieldProvenance | null {
    return this.provenance.find((current) => current.field === 'dependencies') ?? null;
  }
}

// This is the CA/TC support-bundle policy slice. The fields here are exactly
// the ones that later stage-7 classification/lowering pressure needs, while
// still keeping the full source/provenance trail that runtime would normally
// collapse away.
export class CustomAttributePolicy {
  constructor(
    readonly defaultProperty: string | null = null,
    readonly noMultiBindings: boolean | null = null,
    readonly containerStrategy: 'reuse' | 'new' | null = null,
    readonly isTemplateController: boolean | null = null,
    readonly provenance: readonly CustomAttributeFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: CustomAttributeSupportFieldKind,
  ): CustomAttributeFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}
