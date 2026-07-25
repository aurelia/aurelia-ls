import type { ParameterizedRegistry, RegistryValue } from './registry.js';
import type { Resolver } from './resolver.js';

export const enum DiRegistrationEvidenceAuthority {
  /** Registration dispatch had no closed source or evaluator authority. */
  None = 'none',
  /** The reached source admission supplied the strongest available dispatch facts. */
  Admission = 'admission',
  /** Exact candidate-local evaluator evidence determined runtime dispatch. */
  Evaluation = 'evaluation',
}

/** Reusable runtime objects whose `register(container)` behavior can be applied more than once. */
export type DiRegistrationValueProduct =
  | Resolver
  | RegistryValue
  | ParameterizedRegistry;
