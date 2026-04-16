import type {
  SourceAnalysisClaimHomeId,
  SourceAnalysisClaimId,
} from './claim-lattice.js';
import type { SourceAnalysisSubstrateNodeId } from './substrate.js';

export const SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION = 'v0alpha1' as const;

export const SOURCE_ANALYSIS_OUTCOME_TAGS = [
  'hit',
  'miss-unknown-shape',
  'ambiguous',
  'reroute',
  'open-boundary',
  'stale',
  'unsupported',
  'error',
] as const;

export const SOURCE_ANALYSIS_TRUST_KINDS = [
  'grounded',
  'qualified',
  'frontier',
  'unavailable',
] as const;

export const SOURCE_ANALYSIS_CLOSURE_BASIS_KINDS = [
  'substrate',
  'claim',
  'route',
  'freshness',
  'boundary',
] as const;

export const SOURCE_ANALYSIS_ISSUE_SEVERITIES = [
  'info',
  'warning',
  'error',
] as const;

export const SOURCE_ANALYSIS_ISSUE_ORIGINS = [
  'shape',
  'freshness',
  'boundary',
  'infrastructure',
  'query',
] as const;

export const SOURCE_ANALYSIS_CONTINUATION_KINDS = [
  'narrow',
  'widen',
  'reroute',
  'refresh',
  'materialize',
  'inspect-support',
] as const;

export type SourceAnalysisOutcomeTag =
  typeof SOURCE_ANALYSIS_OUTCOME_TAGS[number];

export type SourceAnalysisTrustKind =
  typeof SOURCE_ANALYSIS_TRUST_KINDS[number];

export type SourceAnalysisClosureBasisKind =
  typeof SOURCE_ANALYSIS_CLOSURE_BASIS_KINDS[number];

export type SourceAnalysisIssueSeverity =
  typeof SOURCE_ANALYSIS_ISSUE_SEVERITIES[number];

export type SourceAnalysisIssueOrigin =
  typeof SOURCE_ANALYSIS_ISSUE_ORIGINS[number];

export type SourceAnalysisContinuationKind =
  typeof SOURCE_ANALYSIS_CONTINUATION_KINDS[number];

export interface SourceAnalysisTrustProfile {
  readonly kind: SourceAnalysisTrustKind;
  readonly summary?: string;
}

export interface SourceAnalysisClosureBasis {
  readonly kind: SourceAnalysisClosureBasisKind;
  readonly summary: string;
  readonly claimIds?: readonly SourceAnalysisClaimId[];
  readonly claimHomeIds?: readonly SourceAnalysisClaimHomeId[];
  readonly substrateNodeIds?: readonly SourceAnalysisSubstrateNodeId[];
  readonly provenanceRefs?: readonly string[];
}

export interface SourceAnalysisIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: SourceAnalysisIssueSeverity;
  readonly origin: SourceAnalysisIssueOrigin;
}

export interface SourceAnalysisContinuation {
  readonly kind: SourceAnalysisContinuationKind;
  readonly label: string;
  readonly description?: string;
  readonly targetFocusRef?: string;
  readonly targetQuestionRoute?: string;
}

export interface SourceAnalysisOutcome<TResult = unknown> {
  readonly schemaVersion: typeof SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION;
  readonly tag: SourceAnalysisOutcomeTag;
  readonly summary: string;
  readonly trust: SourceAnalysisTrustProfile;
  readonly value?: TResult;
  readonly closureBasis: readonly SourceAnalysisClosureBasis[];
  readonly issues: readonly SourceAnalysisIssue[];
  readonly continuations: readonly SourceAnalysisContinuation[];
}
