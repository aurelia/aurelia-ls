import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { BuiltInResource } from '../resources/built-in-resources.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import { ResourceDefinitionHeaderEmission } from '../resources/resource-definition-header-emission.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
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

/** Read framework catalog identity from the selected visible header without reconstructing definition lineage. */
export function readBuiltInVisibleTemplateResource(
  store: ProductDetailReadView,
  resource: TemplateVisibleResource | null,
): BuiltInResource | null {
  const productHandle = resource?.resourceProductHandle ?? null;
  if (productHandle == null) {
    return null;
  }
  const header = store.readProductDetail(ResourceProductDetails.DefinitionHeader, productHandle);
  return header == null || header instanceof ResourceDefinitionHeaderEmission ? null : header;
}

/** Hydrate the current full definition behind a compiler-visible catalog entry. */
export function readVisibleTemplateResourceDefinition(
  store: ProductDetailReadView,
  resource: TemplateVisibleResource | null,
): FullResourceDefinition | null {
  const productHandle = resource?.definitionProductHandle ?? null;
  return productHandle == null
    ? null
    : store.readProductDetail(ResourceProductDetails.Definition, productHandle);
}
