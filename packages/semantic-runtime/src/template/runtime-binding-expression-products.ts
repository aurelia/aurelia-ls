import type { ProductHandle } from '../kernel/handles.js';
import {
  InterpolationBinding,
  type RuntimeBinding,
} from './runtime-binding.js';

/** Expression products owned by a runtime binding, including every interpolation hole. */
export function expressionProductHandlesForRuntimeBinding(
  binding: RuntimeBinding,
): readonly ProductHandle[] {
  return 'expressionProductHandle' in binding
    ? (binding.expressionProductHandle == null ? [] : [binding.expressionProductHandle])
    : binding instanceof InterpolationBinding
      ? binding.expressionProductHandles
      : [];
}
