import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  BuiltInResource,
  BuiltInResourceCatalog,
  ConfiguredBuiltInResourceCatalogSelection,
} from './built-in-resources.js';
import type {
  FullResourceDefinition,
} from './resource-definition.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';

export type ResourceDefinitionHeaderDetail =
  | ResourceDefinitionHeaderEmission
  | BuiltInResource;

/** Typed detail slots for resource products before DI and template compiler visibility spend them. */
export const ResourceProductDetails = {
  DefinitionHeader: defineProductDetailSlot<ResourceDefinitionHeaderDetail>(
    KernelVocabulary.Resource.DefinitionHeader.key,
    'resource.definition-header',
    'Recognized or built-in resource definition header detail.',
  ),
  Definition: defineProductDetailSlot<FullResourceDefinition>(
    KernelVocabulary.Resource.Definition.key,
    'resource.definition',
    'Fully converged resource metadata definition detail.',
  ),
  BuiltInCatalog: defineProductDetailSlot<BuiltInResourceCatalog>(
    KernelVocabulary.Resource.BuiltInCatalog.key,
    'resource.built-in-catalog',
    'Built-in resource catalog detail.',
  ),
  ConfiguredBuiltInResourceCatalogSelection: defineProductDetailSlot<ConfiguredBuiltInResourceCatalogSelection>(
    KernelVocabulary.Compiler.ConfiguredResourceCatalogSelection.key,
    'compiler.configured-resource-catalog-selection',
    'Configured built-in resource catalog selection detail.',
  ),
} as const;
