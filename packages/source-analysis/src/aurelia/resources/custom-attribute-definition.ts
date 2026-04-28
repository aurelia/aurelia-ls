import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import type { BindableDefinition, BindableDefinitionContribution } from './bindable-definition.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type {
  ResourceAliasDefinition,
  ResourceDependencyReference,
  ResourceTargetReference,
} from './resource-reference.js';
import type { WatchDefinition, WatchDefinitionContribution } from './watch-definition.js';

export const enum CustomAttributeContainerStrategy {
  Reuse = 'reuse',
  New = 'new',
}

export type CustomAttributeDefinitionField =
  | 'target'
  | 'name'
  | 'aliases'
  | 'key'
  | 'isTemplateController'
  | 'bindables'
  | 'noMultiBindings'
  | 'watches'
  | 'dependencies'
  | 'containerStrategy'
  | 'defaultProperty';

export const enum CustomAttributeDefinitionContributionKind {
  Header = 'header',
  DefinitionObject = 'definition-object',
  TypeStaticProperty = 'type-static-property',
  Annotation = 'annotation',
  BindableMetadata = 'bindable-metadata',
  WatchMetadata = 'watch-metadata',
  Convention = 'convention',
}

// TODO(resource-convergence): This mirrors the custom-element contribution envelope until convergence pressure tells
// us whether resource contributions want per-origin variants, per-field patches, or another tighter representation.
export class CustomAttributeDefinitionContribution {
  constructor(
    readonly contributionKind: CustomAttributeDefinitionContributionKind,
    readonly target: ResourceTargetReference | null = null,
    readonly name: string | null = null,
    readonly aliases: readonly ResourceAliasDefinition[] = [],
    readonly key: string | null = null,
    readonly isTemplateController: boolean | null = null,
    readonly bindables: readonly BindableDefinitionContribution[] = [],
    readonly noMultiBindings: boolean | null = null,
    readonly watches: readonly WatchDefinitionContribution[] = [],
    readonly dependencies: readonly ResourceDependencyReference[] = [],
    readonly containerStrategy: CustomAttributeContainerStrategy | null = null,
    readonly defaultProperty: string | null = null,
    readonly fieldProvenance: readonly FieldProvenance<CustomAttributeDefinitionField>[] = [],
  ) {}
}

@auLink('runtime-html:CustomAttributeDefinition')
export class CustomAttributeDefinition {
  get type(): ResourceDefinitionKind.CustomAttribute { return ResourceDefinitionKind.CustomAttribute; }

  constructor(
    readonly target: ResourceTargetReference,
    readonly name: string,
    readonly aliases: readonly ResourceAliasDefinition[],
    readonly key: string,
    readonly isTemplateController: boolean,
    readonly bindables: readonly BindableDefinition[],
    readonly noMultiBindings: boolean,
    readonly watches: readonly WatchDefinition[],
    readonly dependencies: readonly ResourceDependencyReference[],
    readonly containerStrategy: CustomAttributeContainerStrategy,
    readonly defaultProperty: string,
    readonly contributions: readonly CustomAttributeDefinitionContribution[] = [],
    readonly fieldProvenance: readonly FieldProvenance<CustomAttributeDefinitionField>[] = [],
  ) {}
}
