import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import {
  NamedResourceDefinitionContributionKind,
  ResourceDefinitionKind,
} from './resource-kind.js';
import type { ResourceAliasDefinition, ResourceTargetReference } from './resource-reference.js';

export type ValueConverterDefinitionField =
  | 'target'
  | 'name'
  | 'aliases'
  | 'key';

// TODO(resource-convergence): Keep this contribution envelope provisional until value-converter convergers
// show whether thin resources want per-origin variants, per-field patches, or a shared named-resource contribution.
export class ValueConverterDefinitionContribution {
  constructor(
    readonly contributionKind: NamedResourceDefinitionContributionKind,
    readonly target: ResourceTargetReference | null = null,
    readonly name: string | null = null,
    readonly aliases: readonly ResourceAliasDefinition[] = [],
    readonly key: string | null = null,
    readonly fieldProvenance: readonly FieldProvenance<ValueConverterDefinitionField>[] = [],
  ) {}
}

@auLink('runtime-html:ValueConverterDefinition')
export class ValueConverterDefinition {
  get type(): ResourceDefinitionKind.ValueConverter { return ResourceDefinitionKind.ValueConverter; }

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
    readonly contributions: readonly ValueConverterDefinitionContribution[] = [],
    readonly fieldProvenance: readonly FieldProvenance<ValueConverterDefinitionField>[] = [],
  ) {}
}
