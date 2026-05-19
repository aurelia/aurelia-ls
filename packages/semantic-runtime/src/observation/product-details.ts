import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  RuntimeBindingDataFlow,
  RuntimeBindingObservedDependency,
  RuntimeBindingValueChannel,
} from './runtime-binding-observation.js';
import type { RuntimeWatcherObservedDependency } from './runtime-watcher-observation.js';
import type { ObservationIssue } from './observation-issue.js';
import type { ComputedObservationDefinition } from './computed-observation.js';
import type {
  ComputedObserverObservedDependency,
  ComputedObserverSource,
} from './computed-observer-source.js';
import type {
  RuntimeEffect,
  RuntimeEffectObservedDependency,
} from './runtime-effect.js';
import type { ProxyObservableEscape } from './proxy-observable-escape.js';

/**
 * Typed detail slots for observer, value-channel, and binding data-flow products.
 *
 * Observation materializers own these slots even when the framework-shaped binding classes remain in the template
 * runtime model. This keeps target observation/data-flow products discoverable without forcing callers through the
 * broader template product-detail surface.
 */
export const ObservationProductDetails = {
  Issue: defineProductDetailSlot<ObservationIssue>(
    KernelVocabulary.Observation.Issue.key,
    'observation.issue',
    'Source-backed observation issue detail.',
  ),
  RuntimeBindingValueChannel: defineProductDetailSlot<RuntimeBindingValueChannel>(
    KernelVocabulary.Binding.ValueChannel.key,
    'binding.value-channel',
    'Runtime binding observer/accessor value-channel detail consumed by data-flow emulation.',
  ),
  RuntimeBindingDataFlow: defineProductDetailSlot<RuntimeBindingDataFlow>(
    KernelVocabulary.Binding.DataFlow.key,
    'binding.data-flow',
    'Runtime binding data-flow detail connecting source expression scope lookup to target observation facts.',
  ),
  RuntimeBindingObservedDependency: defineProductDetailSlot<RuntimeBindingObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'binding.observed-dependency',
    'Runtime binding source-side dependency read collected through template connectable observation.',
  ),
  RuntimeWatcherObservedDependency: defineProductDetailSlot<RuntimeWatcherObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'binding.runtime-watcher-observed-dependency',
    'Runtime watcher dependency read collected through controller-owned watcher execution.',
  ),
  ComputedObserverSource: defineProductDetailSlot<ComputedObserverSource>(
    KernelVocabulary.Observation.SourceObserver.key,
    'observation.computed-observer-source',
    'Source-backed ComputedObserver or ControlledComputedObserver selection for an authored getter.',
  ),
  ComputedObserverObservedDependency: defineProductDetailSlot<ComputedObserverObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'observation.computed-observer-observed-dependency',
    'Source-backed computed-observer dependency read collected by getter or explicit dependency execution.',
  ),
  ComputedObservationDefinition: defineProductDetailSlot<ComputedObservationDefinition>(
    KernelVocabulary.Observation.ComputedDefinition.key,
    'observation.computed-definition',
    'Source-backed @computed getter or method dependency declaration.',
  ),
  RuntimeEffect: defineProductDetailSlot<RuntimeEffect>(
    KernelVocabulary.Observation.RuntimeEffect.key,
    'observation.runtime-effect',
    'Source-level IEffect created by Observation.watch(...) or Observation.run(...).',
  ),
  RuntimeEffectObservedDependency: defineProductDetailSlot<RuntimeEffectObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'observation.runtime-effect-observed-dependency',
    'Source-level Observation.watch/run dependency read collected by expression, function-key, or RunEffect execution.',
  ),
  ProxyObservableEscape: defineProductDetailSlot<ProxyObservableEscape>(
    KernelVocabulary.Observation.ProxyObservableEscape.key,
    'observation.proxy-observable-escape',
    'Source-level ProxyObservable.getRaw(...) or ProxyObservable.unwrap(...) escape call.',
  ),
} as const;
