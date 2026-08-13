import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { BuiltInResource } from '../resources/built-in-resources.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import { ResourceDefinitionHeaderEmission } from '../resources/resource-definition-header-emission.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionHeaderDetail } from '../resources/product-details.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { runtimeResourceKeyForKind } from '../resources/resource-kind.js';
import type { TemplateResourceScope } from './compiler-world.js';
import type {
  TemplateVisibleResource,
  TemplateVisibleResourceReference,
} from './compiler-world-reference.js';

type ReadableTemplateVisibleResource =
  | TemplateVisibleResource
  | TemplateVisibleResourceReference;

export function findVisibleTemplateResource(
  resourceScope: TemplateResourceScope | null,
  resourceKind: ResourceDefinitionKind,
  name: string,
): TemplateVisibleResource | null {
  if (resourceScope == null) return null;
  const lookupKey = runtimeResourceKeyForKind(resourceKind, name);
  if (lookupKey != null) {
    if (resourceScope.blockedLookups.some((candidate) => candidate.lookupKey === lookupKey)) {
      return null;
    }
    const lookup = resourceScope.lookups.find((candidate) => candidate.lookupKey === lookupKey) ?? null;
    if (lookup != null) return lookup.winner;
  }
  return resourceScope.syntaxResources.find((resource) =>
    resource.resourceKind === resourceKind
    && (resource.name === name || resource.aliases.includes(name))
  ) ?? null;
}

/** Read framework catalog identity from the selected visible header without reconstructing definition lineage. */
export function readBuiltInVisibleTemplateResource(
  store: ProductDetailReadView,
  resource: ReadableTemplateVisibleResource | null,
): BuiltInResource | null {
  const header = readVisibleTemplateResourceHeader(store, resource);
  return header == null || header instanceof ResourceDefinitionHeaderEmission ? null : header;
}

/** Hydrate the current header behind a compiler-visible catalog entry without assuming its ownership lane. */
export function readVisibleTemplateResourceHeader(
  store: ProductDetailReadView,
  resource: ReadableTemplateVisibleResource | null,
): ResourceDefinitionHeaderDetail | null {
  const productHandle = resource?.resourceProductHandle ?? null;
  return productHandle == null
    ? null
    : store.readProductDetail(ResourceProductDetails.DefinitionHeader, productHandle);
}

/** Hydrate the current full definition behind a compiler-visible catalog entry. */
export function readVisibleTemplateResourceDefinition(
  store: ProductDetailReadView,
  resource: ReadableTemplateVisibleResource | null,
): FullResourceDefinition | null {
  const productHandle = resource?.definitionProductHandle ?? null;
  return productHandle == null
    ? null
    : store.readProductDetail(ResourceProductDetails.Definition, productHandle);
}
