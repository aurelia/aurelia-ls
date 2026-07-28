import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { RuntimeExpressionAccessUse } from './runtime-expression-access-use.js';

/** Inert occupancy identities for runtime-expression product details. */
export const RuntimeExpressionDetailDescriptors = {
  AccessUse: defineProductDetailDescriptor<RuntimeExpressionAccessUse>(
    KernelVocabulary.RuntimeExpression.AccessUse.key,
    'runtime-expression.access-use',
    'Source-backed expression access paired with its runtime owner, operation slot, and execution semantics.',
  ),
} as const;
