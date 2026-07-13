import type { KernelStore } from '../kernel/store.js';
import type { BuiltInResource } from '../resources/built-in-resources.js';
import { readBuiltInResourceForDefinition } from '../resources/resource-definition-lineage.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { TemplateResourceScope } from './compiler-world.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';

export function findVisibleTemplateResource(
  resourceScope: TemplateResourceScope | null,
  resourceKind: ResourceDefinitionKind,
  name: string,
): TemplateVisibleResource | null {
  return resourceScope == null ? null : [
    ...resourceScope.resources,
    ...resourceScope.syntaxResources,
  ].find((resource) =>
    resource.resourceKind === resourceKind
    && (resource.name === name || resource.aliases.includes(name))
  ) ?? null;
}

/** Recover framework catalog identity without confusing an app resource that shadows a built-in lookup name. */
export function readBuiltInVisibleTemplateResource(
  store: KernelStore,
  resource: TemplateVisibleResource | null,
): BuiltInResource | null {
  const productHandle = resource?.definitionProductHandle ?? resource?.resourceProductHandle ?? null;
  return productHandle == null ? null : readBuiltInResourceForDefinition(store, productHandle);
}
