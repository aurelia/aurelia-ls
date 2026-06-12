import { frameworkRawErrorAuthority } from '../kernel/framework-raw-error-authority.js';

/** Exact Aurelia raw Error sites modeled by the evaluation/framework-API substrate. */
export const EvaluationRawErrorAuthority = {
  /** `Metadata.define`; no metadata key was supplied after value and target type. */
  MetadataDefineWithoutKey: frameworkRawErrorAuthority(
    'metadata',
    'raw-new-error',
    'throw',
    'aurelia/packages/metadata/src/index.ts',
    30,
    "new Error('At least one key must be provided')",
  ),
} as const;

export type EvaluationRawErrorAuthority =
  typeof EvaluationRawErrorAuthority[keyof typeof EvaluationRawErrorAuthority];
