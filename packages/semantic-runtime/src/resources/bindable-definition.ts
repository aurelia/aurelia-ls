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

/** Complete authorable binding-mode vocabulary shared by bindable metadata consumers. */
export const BINDABLE_BINDING_MODES = [
  BindableBindingMode.Default,
  BindableBindingMode.OneTime,
  BindableBindingMode.ToView,
  BindableBindingMode.FromView,
  BindableBindingMode.TwoWay,
] as const;

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
  | 'nullable'
  | 'set'
  | 'source'
  | 'type';

export class BindableSetterDefinition {
  constructor(
    readonly kind: BindableSetterKind,
    readonly target: ResourceTargetReference | null = null,
    /** Explicit nullish-coercion policy; null means absent or inapplicable. */
    readonly nullable: boolean | null = null,
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
    /** Source address for the runtime property name token, when known. */
    readonly nameSourceAddressHandle: AddressHandle | null = sourceAddressHandle,
    /** Source address for an explicitly authored public attribute alias token, when known. */
    readonly attributeSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored callback name token, when known. */
    readonly callbackSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored binding mode expression, when known. */
    readonly modeSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored setter/interceptor expression, when known. */
    readonly setSourceAddressHandle: AddressHandle | null = null,
    /** TypeScript property targeted by this bindable metadata, when the owner type proves one. */
    readonly propertyTarget: ResourceTargetReference | null = null,
    /** TypeScript callback member targeted by this bindable metadata, when the owner type proves one. */
    readonly callbackTarget: ResourceTargetReference | null = null,
    /** Source address for an explicitly authored coercion type expression, when known. */
    readonly typeSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored nullable coercion policy, when known. */
    readonly nullableSourceAddressHandle: AddressHandle | null = null,
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
    /** Source address for the runtime property name token, when known. */
    readonly nameSourceAddressHandle: AddressHandle | null = sourceAddressHandle,
    /** Source address for an explicitly authored public attribute alias token, when known. */
    readonly attributeSourceAddressHandle: AddressHandle | null = null,
    /** TypeScript property targeted by this bindable metadata, when the owner type proves one. */
    readonly propertyTarget: ResourceTargetReference | null = null,
  ) {}
}

export const enum BindableContributionKind {
  Decorator = 'decorator',
  StaticBindables = 'static-bindables',
  RuntimePartial = 'runtime-partial',
  InheritedMetadata = 'inherited-metadata',
  Convention = 'convention',
  LocalTemplate = 'local-template',
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
    /** Source address for the runtime property name token, when known. */
    readonly nameSourceAddressHandle: AddressHandle | null = sourceAddressHandle,
    /** Source address for an explicitly authored public attribute alias token, when known. */
    readonly attributeSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored callback name token, when known. */
    readonly callbackSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored binding mode expression, when known. */
    readonly modeSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored setter/interceptor expression, when known. */
    readonly setSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored coercion type expression, when known. */
    readonly typeSourceAddressHandle: AddressHandle | null = null,
    /** Source address for an explicitly authored nullable coercion policy, when known. */
    readonly nullableSourceAddressHandle: AddressHandle | null = null,
  ) {}
}
