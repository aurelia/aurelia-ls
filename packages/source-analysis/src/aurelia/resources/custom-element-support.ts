import type { KeyRef, SourceNodeRef } from '../refs.js';

export const CUSTOM_ELEMENT_SUPPORT_FIELD_KINDS = [
  'name',
  'aliases',
  'key',
  'capture',
  'containerless',
  'shadow-options',
  'process-content',
  'bindables',
  'dependencies',
  'template',
] as const;

export type CustomElementSupportFieldKind =
  typeof CUSTOM_ELEMENT_SUPPORT_FIELD_KINDS[number];

export const CUSTOM_ELEMENT_SUPPORT_CARRIER_KINDS = [
  'annotation-decorator',
  'bindable-decorator',
  'static-au-property',
  'static-own-property',
  'default',
  'open',
] as const;

export type CustomElementSupportCarrierKind =
  typeof CUSTOM_ELEMENT_SUPPORT_CARRIER_KINDS[number];

export const CUSTOM_ELEMENT_CAPTURE_KINDS = [
  'none',
  'boolean',
  'predicate',
  'open',
] as const;

export type CustomElementCaptureKind =
  typeof CUSTOM_ELEMENT_CAPTURE_KINDS[number];

export const CUSTOM_ELEMENT_PROCESS_CONTENT_KINDS = [
  'none',
  'function-hook',
  'string-key',
  'symbol-key',
  'open',
] as const;

export type CustomElementProcessContentKind =
  typeof CUSTOM_ELEMENT_PROCESS_CONTENT_KINDS[number];

export const CUSTOM_ELEMENT_TEMPLATE_SOURCE_KINDS = [
  'none',
  'inline-string',
  'expression-reference',
  'open',
] as const;

export type CustomElementTemplateSourceKind =
  typeof CUSTOM_ELEMENT_TEMPLATE_SOURCE_KINDS[number];

export const CUSTOM_ELEMENT_DEPENDENCY_SOURCE_KINDS = [
  'literal-array',
  'merged-array',
  'array-reference',
  'call-result',
  'open-expression',
] as const;

export type CustomElementDependencySourceKind =
  typeof CUSTOM_ELEMENT_DEPENDENCY_SOURCE_KINDS[number];

export const CUSTOM_ELEMENT_DEPENDENCY_LINK_SEED_KINDS = [
  'identifier-name',
  'property-access-name',
  'string-key',
  'open-expression',
] as const;

export type CustomElementDependencyLinkSeedKind =
  typeof CUSTOM_ELEMENT_DEPENDENCY_LINK_SEED_KINDS[number];

// This is the support-bundle contribution layer. A single field can have more
// than one contributor, so these are not "the answer" by themselves.
export class CustomElementFieldWitness {
  constructor(
    readonly field: CustomElementSupportFieldKind,
    readonly carrier: CustomElementSupportCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {}
}

// Provenance is field-level and names both the selected contributor and the
// full contributor set so later layers can explain or reopen the selection.
export class CustomElementFieldProvenance {
  constructor(
    readonly field: CustomElementSupportFieldKind,
    readonly mode: 'selected' | 'merged' | 'presence-only',
    readonly selected: CustomElementFieldWitness | null,
    readonly contributors: readonly CustomElementFieldWitness[] = [],
    readonly note: string | null = null,
  ) {}
}

// Identity is the earliest safe CE row: canonical naming and key space.
export class CustomElementIdentity {
  constructor(
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly key: KeyRef | null = null,
    readonly provenance: readonly CustomElementFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: CustomElementSupportFieldKind,
  ): CustomElementFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

// Policy fields affect CE behavior, but they do not share the same closure law
// as bindables, dependencies, or template-source ingress.
export class CustomElementPolicy {
  constructor(
    readonly captureKind: CustomElementCaptureKind = 'open',
    readonly containerless: boolean | null = null,
    readonly shadowMode: 'open' | 'closed' | null = null,
    readonly processContentKind: CustomElementProcessContentKind = 'open',
    readonly provenance: readonly CustomElementFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: CustomElementSupportFieldKind,
  ): CustomElementFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

// Dependencies participate in child world construction, so keep them separate
// from ordinary service DI or generic value materialization.
export class CustomElementDependencyEntry {
  constructor(
    readonly referenceName: string | null,
    readonly sourceKind: CustomElementDependencySourceKind,
    readonly linkSeedKind: CustomElementDependencyLinkSeedKind,
    readonly witness: CustomElementFieldWitness,
    readonly note: string | null = null,
  ) {}
}

export class CustomElementDependencySource {
  constructor(
    readonly kind: CustomElementDependencySourceKind,
    readonly witness: CustomElementFieldWitness,
    readonly referenceName: string | null = null,
    readonly linkSeedKind: CustomElementDependencyLinkSeedKind = 'open-expression',
    readonly note: string | null = null,
  ) {}
}

export class CustomElementDependencyContribution {
  constructor(
    readonly sources: readonly CustomElementDependencySource[] = [],
    readonly entries: readonly CustomElementDependencyEntry[] = [],
    readonly provenance: readonly CustomElementFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(): CustomElementFieldProvenance | null {
    return this.provenance.find((current) => current.field === 'dependencies') ?? null;
  }
}

// Template source is declaration ingress only. It is deliberately separate
// from compiled instruction output.
export class CustomElementTemplateSource {
  constructor(
    readonly kind: CustomElementTemplateSourceKind,
    readonly inlineText: string | null = null,
    readonly referenceName: string | null = null,
    readonly provenance: CustomElementFieldProvenance | null = null,
    readonly note: string | null = null,
  ) {}
}
