import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { TemplateResourceScope } from './compiler-world.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';

export function findVisibleTemplateResource(
  resourceScope: TemplateResourceScope | null,
  resourceKind: ResourceDefinitionKind,
  name: string,
): TemplateVisibleResource | null {
  return resourceScope?.resources.find((resource) =>
    resource.resourceKind === resourceKind
    && (resource.name === name || resource.aliases.includes(name))
  ) ?? null;
}

