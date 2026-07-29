import {
  defineHotDetailDescriptor,
  defineProductDetailDescriptor,
} from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  RuntimeBindingExpressionAccessResolution,
} from './runtime-binding-expression-access-resolution.js';
import type { RuntimeExpressionAccessUse } from './runtime-expression-access-use.js';
import type {
  TemplateExpressionAccessOccurrence,
} from './template-expression-access-occurrence.js';

/** Inert occupancy identities for runtime-expression product details. */
export const RuntimeExpressionDetailDescriptors = {
  AccessUse: defineProductDetailDescriptor<RuntimeExpressionAccessUse>(
    KernelVocabulary.RuntimeExpression.AccessUse.key,
    'runtime-expression.access-use',
    'Source-backed expression access paired with its runtime owner, operation slot, and execution semantics.',
  ),
} as const;

/** Inert identities for high-cardinality expression children owned by existing parse/binding products. */
export const RuntimeExpressionHotDetailDescriptors = {
  TemplateAccessOccurrence: defineHotDetailDescriptor<
    TemplateExpressionAccessOccurrence,
    typeof KernelVocabulary.Template.ExpressionParse.key
  >(
    KernelVocabulary.Template.ExpressionParse.key,
    'template.expression-access-occurrence',
    'One authored access token owned by a canonical template expression parse.',
  ),
  BindingAccessResolution: defineHotDetailDescriptor<
    RuntimeBindingExpressionAccessResolution,
    typeof KernelVocabulary.Binding.RuntimeBinding.key
  >(
    KernelVocabulary.Binding.RuntimeBinding.key,
    'runtime-expression.binding-access-resolution',
    'One authored template access interpreted in one rendered binding evaluation context.',
  ),
} as const;
