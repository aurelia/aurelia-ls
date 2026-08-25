import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ComputedObservationDefinition } from './computed-observation.js';
import type {
  ComputedObserverObservedDependency,
  ComputedObserverSource,
} from './computed-observer-source.js';
import type { ObservationIssue } from './observation-issue.js';
import type { ProxyObservableEscape } from './proxy-observable-escape.js';
import type {
  RuntimeBindingDataFlow,
  RuntimeBindingObservedDependency,
  RuntimeBindingValueChannel,
} from './runtime-binding-observation.js';
import type {
  RuntimeEffect,
  RuntimeEffectObservedDependency,
} from './runtime-effect.js';
import type { RuntimeWatcherObservedDependency } from './runtime-watcher-observation.js';

/** Inert occupancy identities for observation product details. */
export const ObservationDetailDescriptors = {
  Issue: defineProductDetailDescriptor<ObservationIssue>(
    KernelVocabulary.Observation.Issue.key,
    'observation.issue',
    'Source-backed observation issue detail.',
  ),
  RuntimeBindingValueChannel: defineProductDetailDescriptor<RuntimeBindingValueChannel>(
    KernelVocabulary.Binding.ValueChannel.key,
    'binding.value-channel',
    'Runtime binding observer/accessor value-channel detail consumed by data-flow emulation.',
  ),
  RuntimeBindingDataFlow: defineProductDetailDescriptor<RuntimeBindingDataFlow>(
    KernelVocabulary.Binding.DataFlow.key,
    'binding.data-flow',
    'Runtime binding data-flow detail connecting source expression scope lookup to target observation facts.',
  ),
  RuntimeBindingObservedDependency: defineProductDetailDescriptor<RuntimeBindingObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'binding.observed-dependency',
    'Runtime binding source-side dependency read collected through template connectable observation.',
  ),
  RuntimeWatcherObservedDependency: defineProductDetailDescriptor<RuntimeWatcherObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'binding.runtime-watcher-observed-dependency',
    'Runtime watcher dependency read collected through controller-owned watcher execution.',
  ),
  ComputedObserverSource: defineProductDetailDescriptor<ComputedObserverSource>(
    KernelVocabulary.Observation.SourceObserver.key,
    'observation.computed-observer-source',
    'Source-backed ComputedObserver or ControlledComputedObserver selection for an authored getter.',
  ),
  ComputedObserverObservedDependency: defineProductDetailDescriptor<ComputedObserverObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'observation.computed-observer-observed-dependency',
    'Source-backed computed-observer dependency read collected by getter or explicit dependency execution.',
  ),
  ComputedObservationDefinition: defineProductDetailDescriptor<ComputedObservationDefinition>(
    KernelVocabulary.Observation.ComputedDefinition.key,
    'observation.computed-definition',
    'Source-backed @computed getter or method dependency declaration.',
  ),
  RuntimeEffect: defineProductDetailDescriptor<RuntimeEffect>(
    KernelVocabulary.Observation.RuntimeEffect.key,
    'observation.runtime-effect',
    'Immutable source-level effect construction plan for Observation.watch(...) or Observation.run(...).',
  ),
  RuntimeEffectObservedDependency: defineProductDetailDescriptor<RuntimeEffectObservedDependency>(
    KernelVocabulary.Binding.ObservedDependency.key,
    'observation.runtime-effect-observed-dependency',
    'Source-level Observation.watch/run dependency read collected by expression, function-key, or RunEffect execution.',
  ),
  ProxyObservableEscape: defineProductDetailDescriptor<ProxyObservableEscape>(
    KernelVocabulary.Observation.ProxyObservableEscape.key,
    'observation.proxy-observable-escape',
    'Source-level ProxyObservable.getRaw(...) or ProxyObservable.unwrap(...) escape call.',
  ),
} as const;
