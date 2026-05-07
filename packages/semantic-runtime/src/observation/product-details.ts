import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  RuntimeBindingDataFlow,
  RuntimeBindingValueChannel,
} from './runtime-binding-observation.js';

/**
 * Typed detail slots for observer, value-channel, and binding data-flow products.
 *
 * Observation materializers own these slots even when the framework-shaped binding classes remain in the template
 * runtime model. This keeps target observation/data-flow products discoverable without forcing callers through the
 * broader template product-detail surface.
 */
export const ObservationProductDetails = {
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
} as const;
