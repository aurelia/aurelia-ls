import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type { ResourceAliasDefinition, ResourceTargetReference } from './resource-reference.js';

export type ValueConverterDefinitionField =
  | 'target'
  | 'name'
  | 'aliases'
  | 'key';

export const enum ValueConverterDefinitionContributionKind {
  Header = 'header',
  DefinitionObject = 'definition-object',
  TypeStaticProperty = 'type-static-property',
  Annotation = 'annotation',
  Convention = 'convention',
}

// TODO(resource-convergence): Keep this contribution envelope provisional until value-converter convergence producers
// show whether thin resources want per-origin variants, per-field patches, or a shared named-resource contribution.
export class ValueConverterDefinitionContribution {
  constructor(
    readonly contributionKind: ValueConverterDefinitionContributionKind,
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
    readonly target: ResourceTargetReference,
    readonly name: string,
    readonly aliases: readonly ResourceAliasDefinition[],
    readonly key: string,
    readonly contributions: readonly ValueConverterDefinitionContribution[] = [],
    readonly fieldProvenance: readonly FieldProvenance<ValueConverterDefinitionField>[] = [],
  ) {}
}
