import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type { ResourceAliasDefinition, ResourceTargetReference } from './resource-reference.js';

export type BindingCommandDefinitionField =
  | 'target'
  | 'name'
  | 'aliases'
  | 'key';

export const enum BindingCommandDefinitionContributionKind {
  Header = 'header',
  DefinitionObject = 'definition-object',
  TypeStaticProperty = 'type-static-property',
  Annotation = 'annotation',
  Convention = 'convention',
}

// TODO(resource-convergence): Keep this contribution envelope provisional until binding-command convergers
// show whether thin resources want per-origin variants, per-field patches, or a shared named-resource contribution.
export class BindingCommandDefinitionContribution {
  constructor(
    readonly contributionKind: BindingCommandDefinitionContributionKind,
    readonly target: ResourceTargetReference | null = null,
    readonly name: string | null = null,
    readonly aliases: readonly ResourceAliasDefinition[] = [],
    readonly key: string | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BindingCommandDefinitionField>[] = [],
  ) {}
}

@auLink('template-compiler:BindingCommandDefinition')
export class BindingCommandDefinition {
  get type(): ResourceDefinitionKind.BindingCommand { return ResourceDefinitionKind.BindingCommand; }

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
    readonly contributions: readonly BindingCommandDefinitionContribution[] = [],
    readonly fieldProvenance: readonly FieldProvenance<BindingCommandDefinitionField>[] = [],
  ) {}
}
