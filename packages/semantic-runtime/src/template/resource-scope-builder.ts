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
  sameTemplateVisibleResource,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from './compiler-world-reference.js';

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
    definition.sourceAddressHandle ?? fallbackSourceAddressHandle,
  );
}

export function addVisibleDefinitionResource(
  resources: TemplateVisibleResource[],
  seenLookupKeys: Set<string>,
  seenResourceProducts: Set<ProductHandle>,
  definition: FullResourceDefinition,
  visibilityKind: TemplateResourceVisibilityKind,
  fallbackSourceAddressHandle: AddressHandle | null,
  position: 'front' | 'back' = 'back',
): boolean {
  const resource = visibleResourceForDefinition(
    definition,
    visibilityKind,
    fallbackSourceAddressHandle,
  );
  if (resource == null || visibleResourceAlreadySeen(resource, seenLookupKeys, seenResourceProducts)) {
    return false;
  }
  rememberVisibleResource(resource, seenLookupKeys, seenResourceProducts);
  if (position === 'front') {
    resources.unshift(resource);
  } else {
    resources.push(resource);
  }
  return true;
}

export function mergeVisibleResourceScopes(
  preferred: readonly TemplateVisibleResource[],
  inherited: readonly TemplateVisibleResource[],
): readonly TemplateVisibleResource[] {
  const effective: TemplateVisibleResource[] = [];
  const seenLookupKeys = new Set<string>();
  const seenResourceProducts = new Set<ProductHandle>();
  for (const resource of [...preferred, ...inherited]) {
    if (visibleResourceAlreadySeen(resource, seenLookupKeys, seenResourceProducts)) {
      continue;
    }
    rememberVisibleResource(resource, seenLookupKeys, seenResourceProducts);
    effective.push(resource);
  }

  // An exact preferred row wins no new lookup over the inherited row. Keep such winners in inherited order so
  // adding an already-global dependency does not manufacture a different compiler scope; new and shadowing
  // preferred rows retain their precedence at the front.
  const stableInherited: TemplateVisibleResource[] = [];
  const stableWinners = new Set<TemplateVisibleResource>();
  for (const inheritedResource of inherited) {
    const winner = effective.find((resource) =>
      !stableWinners.has(resource) && sameTemplateVisibleResource(resource, inheritedResource)
    );
    if (winner != null) {
      stableWinners.add(winner);
      stableInherited.push(winner);
    }
  }
  return [
    ...effective.filter((resource) => !stableWinners.has(resource)),
    ...stableInherited,
  ];
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

function visibleResourceAlreadySeen(
  resource: TemplateVisibleResource,
  seenLookupKeys: ReadonlySet<string>,
  seenResourceProducts: ReadonlySet<ProductHandle>,
): boolean {
  if (resource.resourceProductHandle != null && seenResourceProducts.has(resource.resourceProductHandle)) {
    return true;
  }
  return visibleResourceLookupKeys(resource).some((key) => seenLookupKeys.has(key));
}

function rememberVisibleResource(
  resource: TemplateVisibleResource,
  seenLookupKeys: Set<string>,
  seenResourceProducts: Set<ProductHandle>,
): void {
  if (resource.resourceProductHandle != null) {
    seenResourceProducts.add(resource.resourceProductHandle);
  }
  for (const key of visibleResourceLookupKeys(resource)) {
    seenLookupKeys.add(key);
  }
}

function visibleResourceLookupKeys(
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

function resourceDependencyReferences(
  definition: FullResourceDefinition,
): readonly ResourceDependencyReference[] {
  if (definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition) {
    return definition.dependencies;
  }
  return [];
}
