import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { StateGetterBinding, StateStoreConfiguration } from './model.js';
import type { StateIssue } from './state-issue.js';

/** Inert occupancy identities for @aurelia/state product details. */
export const StateDetailDescriptors = {
  StoreConfiguration: defineProductDetailDescriptor<StateStoreConfiguration>(
    KernelVocabulary.State.StoreConfiguration.key,
    'state.store-configuration',
    '@aurelia/state store configuration admitted from StateDefaultConfiguration builder calls.',
  ),
  GetterBinding: defineProductDetailDescriptor<StateGetterBinding>(
    KernelVocabulary.State.GetterBinding.key,
    'state.getter-binding',
    '@aurelia/state StateGetterBinding created by @fromState(...) for field/setter targets.',
  ),
  Issue: defineProductDetailDescriptor<StateIssue>(
    KernelVocabulary.State.Issue.key,
    'state.issue',
    '@aurelia/state issue discovered while materializing store configuration or registry registration semantics.',
  ),
} as const;
