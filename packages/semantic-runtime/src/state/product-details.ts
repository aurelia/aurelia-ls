import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { StateGetterBinding, StateStoreConfiguration } from './model.js';
import type { StateIssue } from './state-issue.js';

/** Typed detail slots for @aurelia/state products consumed by authoring inquiries. */
export const StateProductDetails = {
  StoreConfiguration: defineProductDetailSlot<StateStoreConfiguration>(
    KernelVocabulary.State.StoreConfiguration.key,
    'state.store-configuration',
    '@aurelia/state store configuration admitted from StateDefaultConfiguration builder calls.',
  ),
  GetterBinding: defineProductDetailSlot<StateGetterBinding>(
    KernelVocabulary.State.GetterBinding.key,
    'state.getter-binding',
    '@aurelia/state StateGetterBinding created by @fromState(...) for field/setter targets.',
  ),
  Issue: defineProductDetailSlot<StateIssue>(
    KernelVocabulary.State.Issue.key,
    'state.issue',
    '@aurelia/state issue discovered while materializing store configuration or registry registration semantics.',
  ),
} as const;
