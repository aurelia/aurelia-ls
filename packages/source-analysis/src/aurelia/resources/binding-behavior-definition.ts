import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type { ResourceAliasDefinition, ResourceTargetReference } from './resource-reference.js';

export type BindingBehaviorDefinitionField =
  | 'target'
  | 'name'
  | 'aliases'
  | 'key';

export const enum BindingBehaviorDefinitionContributionKind {
  Header = 'header',
  DefinitionObject = 'definition-object',
  TypeStaticProperty = 'type-static-property',
  Annotation = 'annotation',
  Convention = 'convention',
}

// TODO(resource-convergence): Keep this contribution envelope provisional until binding-behavior convergence producers
// show whether thin resources want per-origin variants, per-field patches, or a shared named-resource contribution.
export class BindingBehaviorDefinitionContribution {
  constructor(
    readonly contributionKind: BindingBehaviorDefinitionContributionKind,
    readonly target: ResourceTargetReference | null = null,
    readonly name: string | null = null,
    readonly aliases: readonly ResourceAliasDefinition[] = [],
    readonly key: string | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BindingBehaviorDefinitionField>[] = [],
  ) {}
}

@auLink('runtime-html:BindingBehaviorDefinition')
export class BindingBehaviorDefinition {
  get type(): ResourceDefinitionKind.BindingBehavior { return ResourceDefinitionKind.BindingBehavior; }

  constructor(
    readonly target: ResourceTargetReference,
    readonly name: string,
    readonly aliases: readonly ResourceAliasDefinition[],
    readonly key: string,
    readonly contributions: readonly BindingBehaviorDefinitionContribution[] = [],
    readonly fieldProvenance: readonly FieldProvenance<BindingBehaviorDefinitionField>[] = [],
  ) {}
}
