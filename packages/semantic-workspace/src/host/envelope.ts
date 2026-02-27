import type {
  ConfidenceLevel,
  ConvergenceRef,
  Degradation,
  FeatureResponse,
  GapRef,
  NotApplicable,
} from "@aurelia-ls/compiler/schema/types.js";
// ============================================================================
// Envelope Types
// ============================================================================

export type SchemaVersion = 'v1alpha1';

export type CommandStatus = 'ok' | 'degraded' | 'error';

export type PolicyProfile = 'ai.app' | 'ai.product' | 'tooling' | 'testing';

export interface EpistemicMetadata {
  /** Composite confidence for this response. */
  readonly confidence: ConfidenceLevel;
  /** Gaps that affect this response (actionable: what/why/how-to-close). */
  readonly gaps: readonly GapEnvelopeEntry[];
  /** Provenance references for follow-up queries. */
  readonly provenanceRefs: readonly ConvergenceRef[];
}

export interface GapEnvelopeEntry {
  readonly ref: GapRef;
  readonly what: string;
  readonly why: string;
  readonly howToClose: string | null;
}

export interface ResponseMeta {
  /** Workspace fingerprint at time of response. */
  readonly workspaceFingerprint: string;
  /** True when the result may be incomplete (scope gaps, analysis in progress). */
  readonly isIncomplete: boolean;
  /** Query execution duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * The canonical response envelope.
 *
 * Every command through the semantic authority API returns this shape.
 * The `result` field is command-specific; everything else is cross-cutting.
 */
export interface ResponseEnvelope<T = unknown> {
  readonly schemaVersion: SchemaVersion;
  readonly command: string;
  readonly status: CommandStatus;
  readonly result: T;
  readonly policy: {
    readonly profile: PolicyProfile;
  };
  readonly epistemic: EpistemicMetadata;
  readonly meta: ResponseMeta;
  readonly errors: readonly EnvelopeError[];
}

export interface EnvelopeError {
  readonly code: string;
  readonly message: string;
  readonly data?: unknown;
}

// ============================================================================
// Envelope Construction
// ============================================================================

export interface EnvelopeOptions {
  readonly command: string;
  readonly profile: PolicyProfile;
  readonly workspaceFingerprint: string;
}

/**
 * Wrap a FeatureResponse<T> in the canonical envelope.
 *
 * Maps the three-way FeatureResponse (result | Degradation | NotApplicable)
 * to the envelope's status/result/epistemic fields.
 */
export function wrapInEnvelope<T>(
  response: FeatureResponse<T>,
  confidence: ConfidenceLevel,
  gaps: readonly GapEnvelopeEntry[],
  provenanceRefs: readonly ConvergenceRef[],
  options: EnvelopeOptions,
  durationMs: number,
): ResponseEnvelope<T | null> {
  // Check for degradation
  if (isDegradation(response)) {
    return {
      schemaVersion: 'v1alpha1',
      command: options.command,
      status: 'degraded',
      result: null,
      policy: { profile: options.profile },
      epistemic: {
        confidence: 'none',
        gaps: [{
          ref: { resourceKey: '', field: '', __brand: 'GapRef' } as GapRef,
          what: response.what,
          why: response.why,
          howToClose: response.howToClose,
        }],
        provenanceRefs: [],
      },
      meta: {
        workspaceFingerprint: options.workspaceFingerprint,
        isIncomplete: true,
        durationMs,
      },
      errors: [],
    };
  }

  // Check for not applicable
  if (isNotApplicable(response)) {
    return {
      schemaVersion: 'v1alpha1',
      command: options.command,
      status: 'ok',
      result: null,
      policy: { profile: options.profile },
      epistemic: { confidence: 'high', gaps: [], provenanceRefs: [] },
      meta: {
        workspaceFingerprint: options.workspaceFingerprint,
        isIncomplete: false,
        durationMs,
      },
      errors: [],
    };
  }

  // Success
  return {
    schemaVersion: 'v1alpha1',
    command: options.command,
    status: gaps.length > 0 ? 'degraded' : 'ok',
    result: response,
    policy: { profile: options.profile },
    epistemic: { confidence, gaps, provenanceRefs },
    meta: {
      workspaceFingerprint: options.workspaceFingerprint,
      isIncomplete: gaps.length > 0,
      durationMs,
    },
    errors: [],
  };
}

/**
 * Create an error envelope.
 */
export function errorEnvelope(
  command: string,
  error: Error | string,
  options: EnvelopeOptions,
): ResponseEnvelope<null> {
  return {
    schemaVersion: 'v1alpha1',
    command,
    status: 'error',
    result: null,
    policy: { profile: options.profile },
    epistemic: { confidence: 'none', gaps: [], provenanceRefs: [] },
    meta: {
      workspaceFingerprint: options.workspaceFingerprint,
      isIncomplete: true,
      durationMs: 0,
    },
    errors: [{
      code: 'host/command-error',
      message: typeof error === 'string' ? error : error.message,
    }],
  };
}

// ============================================================================
// Type Guards (re-exported from compiler for convenience)
// ============================================================================

function isDegradation(response: unknown): response is Degradation {
  return response !== null && typeof response === 'object' && '__degraded' in (response as object);
}

function isNotApplicable(response: unknown): response is NotApplicable {
  return response !== null && typeof response === 'object' && '__notApplicable' in (response as object);
}
