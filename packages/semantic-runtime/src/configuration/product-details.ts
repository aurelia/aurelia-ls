import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  BindingContext,
  BindingScope,
  OverrideContext,
} from './scope.js';
import type {
  ControllerProduct,
  ViewFactory,
} from './controller.js';
import type { ConfigurationIssue } from './configuration-issue.js';

/** Typed detail slots for configuration products used by later inquiry and compiler-world passes. */
export const ConfigurationProductDetails = {
  Controller: defineProductDetailSlot<ControllerProduct>(
    KernelVocabulary.Configuration.Controller.key,
    'configuration.controller',
    'Runtime-shaped controller detail with children, bindings, scope, and resource/container links.',
  ),
  ViewFactory: defineProductDetailSlot<ViewFactory>(
    KernelVocabulary.Configuration.ViewFactory.key,
    'configuration.view-factory',
    'Runtime IViewFactory detail that creates synthetic views from nested instruction sequences.',
  ),
  BindingContext: defineProductDetailSlot<BindingContext>(
    KernelVocabulary.Configuration.BindingContext.key,
    'configuration.binding-context',
    'Runtime-shaped binding context detail used by Scope lookup.',
  ),
  OverrideContext: defineProductDetailSlot<OverrideContext>(
    KernelVocabulary.Configuration.OverrideContext.key,
    'configuration.override-context',
    'Runtime-shaped override context detail used by Scope lookup.',
  ),
  BindingScope: defineProductDetailSlot<BindingScope>(
    KernelVocabulary.Configuration.BindingScope.key,
    'configuration.binding-scope',
    'Runtime-shaped Scope detail used by controller activation and binding expression lookup.',
  ),
  Issue: defineProductDetailSlot<ConfigurationIssue>(
    KernelVocabulary.Configuration.Issue.key,
    'configuration.issue',
    'Source-backed configuration issue with diagnostic authority.',
  ),
} as const;
