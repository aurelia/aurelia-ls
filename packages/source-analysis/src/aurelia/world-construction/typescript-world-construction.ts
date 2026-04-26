import type { ConfigurationContribution } from '../configurations/index.js';
import type { ResourceDefinition, ResourceDefinitionKind } from '../resources/index.js';
import type { ResourceReferenceRef, ContainerWorldRef } from '../refs.js';
import type { ContainerStateEntry, ContainerStateOpenSeam } from '../registrations/index.js';

export const TYPESCRIPT_WORLD_CONSTRUCTION_OPEN_SEAM_KINDS = [
  'world-placement-open',
  'production-state-open',
  'registry-state-open',
  'renderer-state-open',
  'resource-registration-state-open',
  'resource-definition-match-open',
] as const;

export type TypeScriptWorldConstructionOpenSeamKind =
  typeof TYPESCRIPT_WORLD_CONSTRUCTION_OPEN_SEAM_KINDS[number];

export class TypeScriptWorldConstructionOpenSeam {
  constructor(
    readonly kind: TypeScriptWorldConstructionOpenSeamKind,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class TypeScriptWorldConstruction {
  constructor(
    readonly id: string,
    readonly ownerContribution: ConfigurationContribution,
    readonly world: ContainerWorldRef,
    readonly containerStateEntries: readonly ContainerStateEntry[] = [],
    readonly containerStateOpenSeams: readonly ContainerStateOpenSeam[] = [],
    readonly visibleResources: readonly ResourceDefinition[] = [],
    readonly openSeams: readonly TypeScriptWorldConstructionOpenSeam[] = [],
  ) {}

  readVisibleResourcesByKind<TKind extends ResourceDefinitionKind>(
    kind: TKind,
  ): readonly Extract<ResourceDefinition, { kind: TKind }>[] {
    return this.visibleResources.filter(
      (current): current is Extract<ResourceDefinition, { kind: TKind }> => current.kind === kind,
    );
  }

  findResourceDefinition(
    kind: ResourceDefinitionKind,
    name: string,
  ): ResourceDefinition | null {
    return this.visibleResources.find((current) =>
      current.kind === kind && readResourceDefinitionNames(current).includes(name)
    ) ?? null;
  }

  resolveResourceReference(
    reference: ResourceReferenceRef,
  ): ResourceDefinition | null {
    if (reference.resourceKind === 'unknown' || reference.name == null) {
      return null;
    }
    if (reference.key != null) {
      const keyed = this.visibleResources.find((current) => current.key?.id === reference.key?.id) ?? null;
      if (keyed != null) {
        return keyed;
      }
    }
    return this.findResourceDefinition(reference.resourceKind, reference.name);
  }
}

function readResourceDefinitionNames(
  definition: ResourceDefinition,
): readonly string[] {
  const names: string[] = [];
  if ('name' in definition && typeof definition.name === 'string') {
    names.push(definition.name);
  }
  if ('aliases' in definition) {
    names.push(...definition.aliases);
  }
  return names;
}
