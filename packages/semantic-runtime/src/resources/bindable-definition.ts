import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import type { ResourceTargetReference } from './resource-reference.js';

export const enum BindableBindingMode {
  Default = 'default',
  OneTime = 'oneTime',
  ToView = 'toView',
  FromView = 'fromView',
  TwoWay = 'twoWay',
}

export const enum BindableSetterKind {
  /** Runtime default setter with no authored interceptor. */
  Default = 'default',
  /** Authored or imported interceptor function. */
  Function = 'function',
  /** Setter produced from type-coercion metadata. */
  TypeCoercion = 'type-coercion',
  /** Setter could not be classified without executing user code. */
  Open = 'open',
}

export type BindableDefinitionField =
  | 'attribute'
  | 'callback'
  | 'mode'
  | 'name'
  | 'set'
  | 'source';

export class BindableSetterDefinition {
  constructor(
    readonly kind: BindableSetterKind,
    readonly target: ResourceTargetReference | null = null,
  ) {}
}

@auLink('runtime-html:BindableDefinition')
export class BindableDefinition {
  constructor(
    readonly attribute: string,
    readonly callback: string,
    readonly mode: BindableBindingMode,
    readonly name: string,
    readonly set: BindableSetterDefinition,
    /** Source address for the bindable declaration or metadata entry, when known. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BindableDefinitionField>[] = [],
  ) {}
}

/** Compiler-facing reference to a bindable nested inside a resource definition. */
export class BindableDefinitionReference {
  constructor(
    /** Product handle for the owning resource definition, when materialized. */
    readonly ownerDefinitionProductHandle: ProductHandle | null,
    /** Runtime property name targeted by the bindable. */
    readonly name: string,
    /** Attribute name that maps to the bindable. */
    readonly attribute: string,
    /** Source address for the bindable declaration, when known. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Whether this bindable was synthesized from a custom attribute default property. */
    readonly isImplicitDefault: boolean = false,
  ) {}
}

export const enum BindableContributionKind {
  Decorator = 'decorator',
  StaticBindables = 'static-bindables',
  RuntimePartial = 'runtime-partial',
  InheritedMetadata = 'inherited-metadata',
  Convention = 'convention',
}

export class BindableDefinitionContribution {
  constructor(
    readonly contributionKind: BindableContributionKind,
    readonly propertyName: string,
    readonly attribute: string | null,
    readonly callback: string | null,
    readonly mode: BindableBindingMode | null,
    readonly name: string | null,
    readonly set: BindableSetterDefinition | null,
    /** Source address for this contribution, when known. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BindableDefinitionField>[] = [],
  ) {}
}
