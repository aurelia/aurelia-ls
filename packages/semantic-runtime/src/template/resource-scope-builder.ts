import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import {
  taxonomyResourceKindForDefinition,
  type FullResourceDefinition,
} from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { ResourceDependencyReference } from '../resources/resource-reference.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from '../resources/resource-kind.js';
import {
  TemplateResourceScopeExclusion,
  TemplateResourceScopeExclusionReason,
  TemplateResourceScopeLane,
  TemplateResourceScopeBlockedLookup,
  TemplateResourceScopeLookup,
  TemplateResourceScopeResolution,
} from './compiler-world.js';
import {
  sameTemplateVisibleResource,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import type { TemplateResourceVisibilityKind } from './compiler-world-reference.js';

export function visibleResourceForDefinition(
  definition: FullResourceDefinition,
  visibilityKind: TemplateResourceVisibilityKind,
  fallbackSourceAddressHandle: AddressHandle | null,
): TemplateVisibleResource | null {
  if (definition.productHandle == null || definition.type === ResourceDefinitionKind.AttributePattern) {
    return null;
  }
  const resourceKind = taxonomyResourceKindForDefinition(definition);
  return new TemplateVisibleResource(
    resourceKind,
    definition.name,
    definition.aliases.map((alias) => alias.name),
    definition.productHandle,
    definition.identityHandle,
    definition.productHandle,
    visibilityKind,
    fallbackSourceAddressHandle ?? definition.sourceAddressHandle,
  );
}

export function mergeVisibleResourceScopes(
  preferred: readonly TemplateVisibleResource[],
  inherited: readonly TemplateVisibleResource[],
): readonly TemplateVisibleResource[] {
  return mergeVisibleResourceScopeResolution(
    preferred,
    inherited,
    [],
    inferredLookupRows(inherited, TemplateResourceScopeLane.Inherited),
  ).resources;
}

/**
 * Merge a derived compiler scope while retaining every distinct contender rejected by runtime-key precedence.
 * Repeated views of the same semantic product are normalization, not losing contenders.
 * Winner ordering is deliberately identical to the historical resource-only merge.
 */
export function mergeVisibleResourceScopeResolution(
  preferred: readonly TemplateVisibleResource[],
  inherited: readonly TemplateVisibleResource[],
  inheritedExclusions: readonly TemplateResourceScopeExclusion[] = [],
  inheritedLookups: readonly TemplateResourceScopeLookup[] = inferredLookupRows(
    inherited,
    TemplateResourceScopeLane.Inherited,
  ),
  inheritedBlockedLookups: readonly TemplateResourceScopeBlockedLookup[] = [],
  /** Additional compiler-context membership that owns no lookup key; inherited context members always persist. */
  retainedContextResources: readonly TemplateVisibleResource[] | null = null,
): TemplateResourceScopeResolution {
  if (
    preferred.length === 0
    && (
      retainedContextResources == null
      || retainedContextResources.every((retained) =>
        inherited.some((resource) => sameTemplateVisibleResource(resource, retained))
      )
    )
  ) {
    return new TemplateResourceScopeResolution(
      inherited,
      inheritedExclusions,
      inheritedLookups,
      inheritedBlockedLookups,
    );
  }
  const inheritedContextResources = inherited.filter((resource) =>
    !inheritedLookups.some((lookup) => sameTemplateVisibleResource(lookup.winner, resource))
  );
  const contextResources = distinctVisibleResources([
    ...inheritedContextResources,
    ...(retainedContextResources ?? []),
  ]);
  const localLookups = new Map<string, TemplateResourceScopeLookup>();
  const localBlockedLookups = new Map<string, TemplateResourceScopeBlockedLookup>();
  // Every parent row becomes inherited relative to this derived compiler scope, irrespective of the lane it had in
  // its own scope. Keeping the parent's local label here would misidentify the losing contender to explanations.
  const inheritedByKey = new Map(inheritedLookups.map((lookup) => [
    lookup.lookupKey,
    new TemplateResourceScopeLookup(
      lookup.lookupKey,
      lookup.winner,
      TemplateResourceScopeLane.Inherited,
      lookup.sourceAddressHandle,
    ),
  ]));
  const inheritedBlockedByKey = new Map(inheritedBlockedLookups.map((lookup) => [
    lookup.lookupKey,
    new TemplateResourceScopeBlockedLookup(
      lookup.lookupKey,
      TemplateResourceScopeLane.Inherited,
      lookup.sourceAddressHandle,
    ),
  ]));
  const localResources: TemplateVisibleResource[] = [];
  const exclusions: TemplateResourceScopeExclusion[] = inheritedExclusions.map((exclusion) =>
    new TemplateResourceScopeExclusion(
      exclusion.reason,
      TemplateResourceScopeLane.Inherited,
      TemplateResourceScopeLane.Inherited,
      exclusion.lookupKeys,
      exclusion.winner,
      exclusion.loser,
      exclusion.winnerKeySourceAddressHandle,
      exclusion.loserKeySourceAddressHandle,
    )
  );
  for (const resource of preferred) {
    const lookupKeys = visibleResourceLookupKeys(resource);
    // Preferred definitions execute in a child container. Even a product already visible from the parent must spend
    // its local keys: a later preferred contender observes that local registration, not the inherited row.
    const primaryKey = lookupKeys[0] ?? null;
    const primaryWinner = primaryKey == null ? null : localLookups.get(primaryKey) ?? null;
    if (primaryKey != null && (primaryWinner != null || localBlockedLookups.has(primaryKey))) {
      if (primaryWinner != null && !sameResourceProduct(primaryWinner.winner, resource)) {
        exclusions.push(scopeLookupConflict(primaryWinner, resource, [primaryKey]));
      }
      if (isAttributeRegistrationResource(resource)) {
        blockRemainingLocalAliases(
          lookupKeys.slice(1),
          localLookups,
          localBlockedLookups,
          resource.sourceAddressHandle,
        );
      }
      continue;
    }

    let admitted = false;
    for (const lookupKey of lookupKeys) {
      const winner = localLookups.get(lookupKey) ?? null;
      if (winner != null) {
        if (!sameResourceProduct(winner.winner, resource)) {
          exclusions.push(scopeLookupConflict(winner, resource, [lookupKey]));
        }
        continue;
      }
      if (localBlockedLookups.has(lookupKey)) {
        continue;
      }
      localLookups.set(lookupKey, new TemplateResourceScopeLookup(
        lookupKey,
        resource,
        TemplateResourceScopeLane.Local,
        resource.sourceAddressHandle,
      ));
      admitted = true;
    }
    if (admitted) {
      localResources.push(resource);
    }
  }

  for (const [lookupKey, local] of localLookups) {
    const parent = inheritedByKey.get(lookupKey) ?? null;
    if (parent != null && !sameResourceProduct(local.winner, parent.winner)) {
      exclusions.push(new TemplateResourceScopeExclusion(
        TemplateResourceScopeExclusionReason.LookupKeyConflict,
        local.lane,
        parent.lane,
        [lookupKey],
        local.winner,
        parent.winner,
        local.sourceAddressHandle,
        parent.sourceAddressHandle,
      ));
    }
  }

  const effectiveLookups = new Map(inheritedByKey);
  const effectiveBlockedLookups = new Map(inheritedBlockedByKey);
  for (const [lookupKey, local] of localLookups) {
    effectiveLookups.set(lookupKey, local);
    effectiveBlockedLookups.delete(lookupKey);
  }
  for (const [lookupKey, blocked] of localBlockedLookups) {
    effectiveLookups.delete(lookupKey);
    effectiveBlockedLookups.set(lookupKey, blocked);
  }
  const lookupResources = distinctLookupWinners([
    ...localResources,
    ...inherited,
  ], effectiveLookups.values());
  const effectiveResources = distinctVisibleResources([
    ...contextResources,
    ...lookupResources,
  ]);
  const winnerByLookupKey = new Map([...effectiveLookups].map(([key, lookup]) => [
    key,
    new ResourceScopeWinner(lookup.winner, lookup.lane, lookup.sourceAddressHandle),
  ]));
  return new TemplateResourceScopeResolution(
    effectiveResources,
    terminalScopeExclusions(exclusions, winnerByLookupKey),
    [...effectiveLookups.values()],
    [...effectiveBlockedLookups.values()],
  );
}

function distinctVisibleResources(
  resources: readonly TemplateVisibleResource[],
): readonly TemplateVisibleResource[] {
  const distinct: TemplateVisibleResource[] = [];
  for (const resource of resources) {
    if (!distinct.some((candidate) => sameTemplateVisibleResource(candidate, resource))) {
      distinct.push(resource);
    }
  }
  return distinct;
}

function isAttributeRegistrationResource(resource: TemplateVisibleResource): boolean {
  return resource.resourceKind === ResourceDefinitionKind.CustomAttribute
    || resource.resourceKind === ResourceDefinitionKind.TemplateController;
}

function blockRemainingLocalAliases(
  lookupKeys: readonly string[],
  localLookups: ReadonlyMap<string, TemplateResourceScopeLookup>,
  localBlockedLookups: Map<string, TemplateResourceScopeBlockedLookup>,
  sourceAddressHandle: AddressHandle | null,
): void {
  for (const lookupKey of lookupKeys) {
    if (!localLookups.has(lookupKey) && !localBlockedLookups.has(lookupKey)) {
      localBlockedLookups.set(lookupKey, new TemplateResourceScopeBlockedLookup(
        lookupKey,
        TemplateResourceScopeLane.Local,
        sourceAddressHandle,
      ));
    }
  }
}

function sameResourceProduct(
  left: TemplateVisibleResource,
  right: TemplateVisibleResource,
): boolean {
  return left.resourceProductHandle != null
    && left.resourceProductHandle === right.resourceProductHandle;
}

function scopeLookupConflict(
  winner: TemplateResourceScopeLookup,
  loser: TemplateVisibleResource,
  lookupKeys: readonly string[],
): TemplateResourceScopeExclusion {
  return new TemplateResourceScopeExclusion(
    TemplateResourceScopeExclusionReason.LookupKeyConflict,
    winner.lane,
    TemplateResourceScopeLane.Local,
    lookupKeys,
    winner.winner,
    loser,
    winner.sourceAddressHandle,
    loser.sourceAddressHandle,
  );
}

function distinctLookupWinners(
  preferredOrder: readonly TemplateVisibleResource[],
  lookups: Iterable<TemplateResourceScopeLookup>,
): readonly TemplateVisibleResource[] {
  const effectiveWinners = [...lookups].map((lookup) => lookup.winner);
  const resources: TemplateVisibleResource[] = [];
  const seenProducts = new Set<ProductHandle>();
  for (const resource of preferredOrder) {
    if (!effectiveWinners.some((winner) => sameTemplateVisibleResource(winner, resource))) {
      continue;
    }
    const handle = resource.resourceProductHandle;
    if (handle != null && seenProducts.has(handle)) {
      continue;
    }
    if (handle != null) seenProducts.add(handle);
    resources.push(resource);
  }
  return resources;
}

function inferredLookupRows(
  resources: readonly TemplateVisibleResource[],
  lane: TemplateResourceScopeLane,
): readonly TemplateResourceScopeLookup[] {
  return resources.flatMap((resource) => visibleResourceLookupKeys(resource).map((lookupKey) =>
    new TemplateResourceScopeLookup(lookupKey, resource, lane, resource.sourceAddressHandle)
  ));
}

/**
 * Rebase inherited conflict witnesses onto the winner that owns each key in the resulting scope.
 * A derived local winner can displace an inherited winner that had already displaced an older contender;
 * retaining the intermediate witness would make an exact availability explanation name a resource that is no
 * longer effective. The original losing contender, its lane, and its source remain unchanged.
 */
function terminalScopeExclusions(
  exclusions: readonly TemplateResourceScopeExclusion[],
  winnerByLookupKey: ReadonlyMap<string, ResourceScopeWinner>,
): readonly TemplateResourceScopeExclusion[] {
  const terminal: TemplateResourceScopeExclusion[] = [];
  for (const exclusion of exclusions) {
    if (
      exclusion.reason !== TemplateResourceScopeExclusionReason.LookupKeyConflict
      || exclusion.lookupKeys.length === 0
    ) {
      terminal.push(exclusion);
      continue;
    }

    const keysByWinner = new Map<ResourceScopeWinner, string[]>();
    for (const lookupKey of exclusion.lookupKeys) {
      const winner = winnerByLookupKey.get(lookupKey);
      if (winner == null) {
        continue;
      }
      const lookupKeys = keysByWinner.get(winner) ?? [];
      lookupKeys.push(lookupKey);
      keysByWinner.set(winner, lookupKeys);
    }

    if (
      keysByWinner.size === 1
      && exclusion.lookupKeys.length === keysByWinner.values().next().value?.length
      && sameTemplateVisibleResource(keysByWinner.keys().next().value!.resource, exclusion.winner)
    ) {
      terminal.push(exclusion);
      continue;
    }

    for (const [winner, lookupKeys] of keysByWinner) {
      if (sameResourceProduct(winner.resource, exclusion.loser)) {
        continue;
      }
      terminal.push(new TemplateResourceScopeExclusion(
        exclusion.reason,
        winner.lane,
        exclusion.loserLane,
        lookupKeys,
        winner.resource,
        exclusion.loser,
        winner.sourceAddressHandle,
        exclusion.loserKeySourceAddressHandle,
      ));
    }
  }
  return terminal;
}

export function directDependencyDefinitions(
  definition: FullResourceDefinition,
  resourceDefinitions: ResourceDefinitionIndex | null,
): readonly FullResourceDefinition[] {
  if (resourceDefinitions == null) {
    return [];
  }
  const definitions: FullResourceDefinition[] = [];
  const seen = new Set<ProductHandle>();
  for (const dependency of resourceDependencyReferences(definition)) {
    for (const dependencyDefinition of resourceDefinitions.lookupAllByDependencyReference(dependency)) {
      if (dependencyDefinition.productHandle == null || seen.has(dependencyDefinition.productHandle)) {
        continue;
      }
      seen.add(dependencyDefinition.productHandle);
      definitions.push(dependencyDefinition);
    }
  }
  return definitions;
}

export function visibleResourceLookupKeys(
  resource: TemplateVisibleResource,
): readonly string[] {
  const keys: string[] = [];
  for (const name of [resource.name, ...resource.aliases]) {
    const key = runtimeResourceKeyForKind(resource.resourceKind, name);
    if (key != null) {
      keys.push(key);
    }
  }
  return keys;
}

class ResourceScopeWinner {
  constructor(
    readonly resource: TemplateVisibleResource,
    readonly lane: TemplateResourceScopeLane,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

function resourceDependencyReferences(
  definition: FullResourceDefinition,
): readonly ResourceDependencyReference[] {
  if (definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition) {
    return definition.dependencies;
  }
  return [];
}
