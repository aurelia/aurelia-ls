import type {
  ClaimHomeId,
  ClaimId,
} from './claim-lattice.js';
import type { SubstrateNodeId } from './substrate.js';

export const OUTCOME_SCHEMA_VERSION = 'v0alpha1' as const;

export const OUTCOME_TAGS = [
  'hit',
  'miss-unknown-shape',
  'ambiguous',
  'reroute',
  'open-boundary',
  'stale',
  'unsupported',
  'error',
] as const;

export const TRUST_KINDS = [
  'grounded',
  'qualified',
  'frontier',
  'unavailable',
] as const;

export const CLOSURE_BASIS_KINDS = [
  'substrate',
  'claim',
  'route',
  'freshness',
  'boundary',
] as const;

export const ISSUE_SEVERITIES = [
  'info',
  'warning',
  'error',
] as const;

export const ISSUE_ORIGINS = [
  'shape',
  'freshness',
  'boundary',
  'infrastructure',
  'query',
] as const;

export const CONTINUATION_KINDS = [
  'narrow',
  'widen',
  'reroute',
  'refresh',
  'materialize',
  'inspect-support',
] as const;

export type OutcomeTag =
  typeof OUTCOME_TAGS[number];

export type TrustKind =
  typeof TRUST_KINDS[number];

export type ClosureBasisKind =
  typeof CLOSURE_BASIS_KINDS[number];

export type IssueSeverity =
  typeof ISSUE_SEVERITIES[number];

export type IssueOrigin =
  typeof ISSUE_ORIGINS[number];

export type ContinuationKind =
  typeof CONTINUATION_KINDS[number];

export interface TrustProfile {
  readonly kind: TrustKind;
  readonly summary?: string;
}

export interface ClosureBasis {
  readonly kind: ClosureBasisKind;
  readonly summary: string;
  readonly claimIds?: readonly ClaimId[];
  readonly claimHomeIds?: readonly ClaimHomeId[];
  readonly substrateNodeIds?: readonly SubstrateNodeId[];
  readonly provenanceRefs?: readonly string[];
}

export interface Issue {
  readonly code: string;
  readonly message: string;
  readonly severity: IssueSeverity;
  readonly origin: IssueOrigin;
}

export interface Continuation {
  readonly kind: ContinuationKind;
  readonly label: string;
  readonly description?: string;
  readonly targetFocusRef?: string;
  readonly targetQuestionRoute?: string;
}

export interface Outcome<TResult = unknown> {
  readonly schemaVersion: typeof OUTCOME_SCHEMA_VERSION;
  readonly tag: OutcomeTag;
  readonly summary: string;
  readonly trust: TrustProfile;
  readonly value?: TResult;
  readonly closureBasis: readonly ClosureBasis[];
  readonly issues: readonly Issue[];
  readonly continuations: readonly Continuation[];
}
