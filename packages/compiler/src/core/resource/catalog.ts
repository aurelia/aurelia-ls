/**
 * Catalog Assembly — Building ResourceCatalogGreen from sources
 *
 * Assembles name-indexed catalogs from resource collections
 * (builtins, manifests, graph conclusions). The catalog is the
 * query-optimized shape that template analysis consumes.
 */

import type {
  ResourceGreen,
  CustomElementGreen,
  CustomAttributeGreen,
  TemplateControllerGreen,
  ValueConverterGreen,
  BindingBehaviorGreen,
  ResourceCatalogGreen,
  VocabularyGreen,
  ScopeCompleteness,
  ScopedCatalogGreen,
} from './types.js';

/**
 * Build a ResourceCatalogGreen from a flat list of resources.
 *
 * Resources are indexed by name (case-preserving). Later entries
 * override earlier ones for the same name — this enables
 * convergence ordering (builtins first, then source analysis).
 */
export function buildCatalog(resources: readonly ResourceGreen[]): ResourceCatalogGreen {
  const elements: Record<string, CustomElementGreen> = {};
  const attributes: Record<string, CustomAttributeGreen> = {};
  const controllers: Record<string, TemplateControllerGreen> = {};
  const valueConverters: Record<string, ValueConverterGreen> = {};
  const bindingBehaviors: Record<string, BindingBehaviorGreen> = {};

  for (const r of resources) {
    const key = r.name;
    switch (r.kind) {
      case 'custom-element': elements[key] = r; break;
      case 'custom-attribute': attributes[key] = r; break;
      case 'template-controller': controllers[key] = r; break;
      case 'value-converter': valueConverters[key] = r; break;
      case 'binding-behavior': bindingBehaviors[key] = r; break;
    }
  }

  return { elements, attributes, controllers, valueConverters, bindingBehaviors };
}

/**
 * Merge multiple catalogs. Later catalogs override earlier ones
 * for the same resource name — this implements evidence priority
 * (builtins < manifest < source analysis).
 */
export function mergeCatalogs(...catalogs: readonly ResourceCatalogGreen[]): ResourceCatalogGreen {
  const elements: Record<string, CustomElementGreen> = {};
  const attributes: Record<string, CustomAttributeGreen> = {};
  const controllers: Record<string, TemplateControllerGreen> = {};
  const valueConverters: Record<string, ValueConverterGreen> = {};
  const bindingBehaviors: Record<string, BindingBehaviorGreen> = {};

  for (const cat of catalogs) {
    Object.assign(elements, cat.elements);
    Object.assign(attributes, cat.attributes);
    Object.assign(controllers, cat.controllers);
    Object.assign(valueConverters, cat.valueConverters);
    Object.assign(bindingBehaviors, cat.bindingBehaviors);
  }

  return { elements, attributes, controllers, valueConverters, bindingBehaviors };
}

/**
 * Create a ScopedCatalogGreen for a specific template context.
 *
 * In the simplest case (builtins only, no scope restrictions),
 * all resources are visible and the scope is complete.
 */
export function scopedCatalog(
  catalog: ResourceCatalogGreen,
  completeness?: ScopeCompleteness,
): ScopedCatalogGreen {
  return {
    resources: catalog,
    completeness: completeness ?? { complete: true, gaps: [] },
  };
}
