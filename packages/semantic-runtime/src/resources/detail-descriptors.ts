import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  BuiltInResource,
  BuiltInResourceCatalog,
  ConfiguredBuiltInResourceCatalogSelection,
} from './built-in-resources.js';
import type { FullResourceDefinition } from './resource-definition.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import type { ResourceIssue } from './resource-issue.js';

export type ResourceDefinitionHeaderDetail =
  | ResourceDefinitionHeaderEmission
  | BuiltInResource;

/** Inert identities for rich resource occupancies, safe to import without projector execution. */
export const ResourceDetailDescriptors = {
  DefinitionHeader: defineProductDetailDescriptor<ResourceDefinitionHeaderDetail>(
    KernelVocabulary.Resource.DefinitionHeader.key,
    'resource.definition-header',
    'Recognized or built-in resource definition header detail.',
  ),
  Definition: defineProductDetailDescriptor<FullResourceDefinition>(
    KernelVocabulary.Resource.Definition.key,
    'resource.definition',
    'Fully converged resource metadata definition detail.',
  ),
  Issue: defineProductDetailDescriptor<ResourceIssue>(
    KernelVocabulary.Resource.Issue.key,
    'resource.issue',
    'Source-backed resource metadata issue detail.',
  ),
  BuiltInCatalog: defineProductDetailDescriptor<BuiltInResourceCatalog>(
    KernelVocabulary.Resource.BuiltInCatalog.key,
    'resource.built-in-catalog',
    'Built-in resource catalog detail.',
  ),
  ConfiguredBuiltInResourceCatalogSelection: defineProductDetailDescriptor<ConfiguredBuiltInResourceCatalogSelection>(
    KernelVocabulary.Compiler.ConfiguredResourceCatalogSelection.key,
    'compiler.configured-resource-catalog-selection',
    'Configured built-in resource catalog selection detail.',
  ),
} as const;
