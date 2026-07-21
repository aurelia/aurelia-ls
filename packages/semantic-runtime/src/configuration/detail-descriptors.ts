import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationIssue } from './configuration-issue.js';
import type { ControllerProduct, ViewFactory } from './controller.js';
import type {
  BindingContext,
  BindingScope,
  OverrideContext,
} from './scope.js';

/** Inert occupancy identities for configuration product details. */
export const ConfigurationDetailDescriptors = {
  Controller: defineProductDetailDescriptor<ControllerProduct>(
    KernelVocabulary.Configuration.Controller.key,
    'configuration.controller',
    'Runtime-shaped controller detail with children, bindings, scope, and resource/container links.',
  ),
  ViewFactory: defineProductDetailDescriptor<ViewFactory>(
    KernelVocabulary.Configuration.ViewFactory.key,
    'configuration.view-factory',
    'Runtime IViewFactory detail that creates synthetic views from nested instruction sequences.',
  ),
  BindingContext: defineProductDetailDescriptor<BindingContext>(
    KernelVocabulary.Configuration.BindingContext.key,
    'configuration.binding-context',
    'Runtime-shaped binding context detail used by Scope lookup.',
  ),
  OverrideContext: defineProductDetailDescriptor<OverrideContext>(
    KernelVocabulary.Configuration.OverrideContext.key,
    'configuration.override-context',
    'Runtime-shaped override context detail used by Scope lookup.',
  ),
  BindingScope: defineProductDetailDescriptor<BindingScope>(
    KernelVocabulary.Configuration.BindingScope.key,
    'configuration.binding-scope',
    'Runtime-shaped Scope detail used by controller activation and binding expression lookup.',
  ),
  Issue: defineProductDetailDescriptor<ConfigurationIssue>(
    KernelVocabulary.Configuration.Issue.key,
    'configuration.issue',
    'Source-backed configuration issue with diagnostic authority.',
  ),
} as const;
