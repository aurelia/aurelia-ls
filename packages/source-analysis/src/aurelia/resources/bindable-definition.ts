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
  | 'set';

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
    readonly fieldProvenance: readonly FieldProvenance<BindableDefinitionField>[] = [],
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
    readonly fieldProvenance: readonly FieldProvenance<BindableDefinitionField>[] = [],
  ) {}
}
