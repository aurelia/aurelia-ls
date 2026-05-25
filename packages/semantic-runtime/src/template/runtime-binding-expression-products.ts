import type { ProductHandle } from '../kernel/handles.js';
import {
  InterpolationBinding,
  type RuntimeBinding,
} from './runtime-binding.js';

/** Expression parse products owned by a runtime binding; interpolation bindings carry the full interpolation parse. */
export function expressionProductHandlesForRuntimeBinding(
  binding: RuntimeBinding,
): readonly ProductHandle[] {
  return 'expressionProductHandle' in binding
    ? (binding.expressionProductHandle == null ? [] : [binding.expressionProductHandle])
    : binding instanceof InterpolationBinding
      ? binding.expressionProductHandles
      : [];
}
