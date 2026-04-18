export const AUTHORITY_ENTITY_KINDS = [
  'repo',
  'package',
  'directory',
  'file',
  'symbol',
  'type',
  'export',
  'claim',
  'session',
] as const;

export const LOCATOR_KINDS = [
  'entity-id',
  'package-name',
  'package-dir',
  'file-path',
  'symbol-name',
  'type-name',
  'export-name',
] as const;

export const AUTHORITY_EVIDENCE_KINDS = [
  'structural',
  'semantic',
  'evaluator',
  'projection',
  'host',
  'operator',
] as const;

export const SPEND_THRESHOLDS = [
  'preserved-knowledge',
  'admissible-claim',
  'consumer-safe-action',
] as const;

export const RETREAT_CAUSE_KINDS = [
  'source-change',
  'profile-change',
  'projection-stale',
  'authority-gap',
  'runtime-only',
  'cost-ceiling',
] as const;

export const NO_CLAIM_KINDS = [
  'not-found',
  'blocked',
  'unsupported',
  'open-boundary',
  'stale',
  'unavailable',
] as const;

export const AUTHORITY_OUTCOME_KINDS = [
  'claim',
  'ambiguity',
  'no-claim',
] as const;

export type AuthorityEntityKind =
  typeof AUTHORITY_ENTITY_KINDS[number];

export type LocatorKind =
  typeof LOCATOR_KINDS[number];

export type AuthorityEvidenceKind =
  typeof AUTHORITY_EVIDENCE_KINDS[number];

export type SpendThreshold =
  typeof SPEND_THRESHOLDS[number];

export type RetreatCauseKind =
  typeof RETREAT_CAUSE_KINDS[number];

export type NoClaimKind =
  typeof NO_CLAIM_KINDS[number];

export type AuthorityOutcomeKind =
  typeof AUTHORITY_OUTCOME_KINDS[number];

export interface EntityRef {
  readonly kind: AuthorityEntityKind;
  readonly id: string;
  readonly label?: string;
}

export interface Locator {
  readonly kind: LocatorKind;
  readonly value: string;
  readonly label?: string;
}

export interface NarrowingAxis {
  readonly kind: string;
  readonly label: string;
  readonly values?: readonly string[];
}

export interface AuthorityEvidence {
  readonly kind: AuthorityEvidenceKind;
  readonly label: string;
  readonly detail?: string;
  readonly refs?: readonly string[];
}

export interface RetreatCause {
  readonly kind: RetreatCauseKind;
  readonly detail: string;
}

export interface AmbiguitySet<TCandidate> {
  readonly locator: Locator;
  readonly summary: string;
  readonly candidates: readonly TCandidate[];
  readonly narrowingAxes?: readonly NarrowingAxis[];
}

export interface NoClaim {
  readonly kind: NoClaimKind;
  readonly locator: Locator;
  readonly summary: string;
  readonly spendThreshold: SpendThreshold;
  readonly evidence: readonly AuthorityEvidence[];
  readonly retreatCauses?: readonly RetreatCause[];
}

export interface ClaimedAuthorityOutcome<TValue> {
  readonly kind: 'claim';
  readonly locator: Locator;
  readonly spendThreshold: SpendThreshold;
  readonly value: TValue;
  readonly evidence: readonly AuthorityEvidence[];
}

export interface AmbiguousAuthorityOutcome<TCandidate> {
  readonly kind: 'ambiguity';
  readonly locator: Locator;
  readonly spendThreshold: SpendThreshold;
  readonly ambiguity: AmbiguitySet<TCandidate>;
  readonly evidence: readonly AuthorityEvidence[];
}

export interface NoClaimAuthorityOutcome {
  readonly kind: 'no-claim';
  readonly locator: Locator;
  readonly spendThreshold: SpendThreshold;
  readonly noClaim: NoClaim;
  readonly evidence: readonly AuthorityEvidence[];
}

export type AuthorityOutcome<TValue, TCandidate = TValue> =
  | ClaimedAuthorityOutcome<TValue>
  | AmbiguousAuthorityOutcome<TCandidate>
  | NoClaimAuthorityOutcome;

