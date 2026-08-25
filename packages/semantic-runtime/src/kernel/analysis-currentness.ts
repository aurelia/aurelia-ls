export const SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE =
  'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED' as const;

/** Why an admitted semantic computation could not produce one current answer. */
export type SemanticRuntimeAnalysisCurrentnessReason =
  | 'query-answer-lease-changed'
  | 'answer-proof-changed'
  | 'analysis-lifetime-changed'
  | 'generation-changed'
  | 'computation-superseded'
  | 'computation-inputs-changed'
  | 'computation-currentness-changed';

/** JSON-safe semantic facts shared by IDE, MCP, and future AOT consumers. */
export interface SemanticRuntimeAnalysisCurrentnessFailure {
  readonly code: typeof SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE;
  readonly reason: SemanticRuntimeAnalysisCurrentnessReason;
  readonly message: string;
  readonly answerLeaseKind: string | null;
  readonly invalidGenerationKeys: readonly string[];
  readonly changedReadKeys: readonly string[];
  readonly changedFacets: readonly string[];
  readonly changedSemanticFactKeys: readonly string[];
}

export interface SemanticRuntimeAnalysisCurrentnessErrorInput {
  readonly message: string;
  readonly cause?: unknown;
  readonly reason: SemanticRuntimeAnalysisCurrentnessReason;
  readonly answerLeaseKind?: string | null;
  readonly invalidGenerationKeys?: readonly string[];
  readonly changedReadKeys?: readonly string[];
  readonly changedFacets?: readonly string[];
  readonly changedSemanticFactKeys?: readonly string[];
}

/**
 * Nominal signal that semantic work lost an intended currentness race.
 *
 * This is distinct from an arbitrary host, mapping, or invariant failure. Consumers may ask the caller to reissue an
 * operation only for this exact type; they must never infer currentness from error text or from a later stale receipt.
 */
export class SemanticRuntimeAnalysisCurrentnessError extends Error {
  readonly code = SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE;
  readonly reason: SemanticRuntimeAnalysisCurrentnessReason;
  readonly answerLeaseKind: string | null;
  readonly invalidGenerationKeys: readonly string[];
  readonly changedReadKeys: readonly string[];
  readonly changedFacets: readonly string[];
  readonly changedSemanticFactKeys: readonly string[];

  constructor(input: SemanticRuntimeAnalysisCurrentnessErrorInput) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = 'SemanticRuntimeAnalysisCurrentnessError';
    this.reason = input.reason;
    this.answerLeaseKind = input.answerLeaseKind ?? null;
    this.invalidGenerationKeys = normalizedCurrentnessKeys(input.invalidGenerationKeys ?? []);
    this.changedReadKeys = normalizedCurrentnessKeys(input.changedReadKeys ?? []);
    this.changedFacets = normalizedCurrentnessKeys(input.changedFacets ?? []);
    this.changedSemanticFactKeys = normalizedCurrentnessKeys(input.changedSemanticFactKeys ?? []);
  }
}

/** Nominal recognition only; do not classify an arbitrary wrapper by walking its cause chain. */
export function isSemanticRuntimeAnalysisCurrentnessError(
  error: unknown,
): error is SemanticRuntimeAnalysisCurrentnessError {
  return error instanceof SemanticRuntimeAnalysisCurrentnessError;
}

/** Detach the shared facts without attaching consumer-specific retry or presentation policy. */
export function semanticRuntimeAnalysisCurrentnessFailure(
  error: SemanticRuntimeAnalysisCurrentnessError,
): SemanticRuntimeAnalysisCurrentnessFailure {
  return Object.freeze({
    code: error.code,
    reason: error.reason,
    message: error.message,
    answerLeaseKind: error.answerLeaseKind,
    invalidGenerationKeys: normalizedCurrentnessKeys(error.invalidGenerationKeys),
    changedReadKeys: normalizedCurrentnessKeys(error.changedReadKeys),
    changedFacets: normalizedCurrentnessKeys(error.changedFacets),
    changedSemanticFactKeys: normalizedCurrentnessKeys(error.changedSemanticFactKeys),
  });
}

function normalizedCurrentnessKeys(keys: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(keys)].sort((left, right) => left.localeCompare(right)));
}
