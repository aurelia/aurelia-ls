import type { IssueSeverity, TrustKind } from './outcome-algebra.js';
import type {
  FocusKind,
  InquiryEpisode,
  Inquiry,
  QuestionRoute,
  ReadMode,
} from './inquiry-model.js';
import type {
  PackageRouteClass,
  PackageRouteKind,
  PackageRootKind,
} from './reachability.js';
import type { AnswerBlockImportance } from './answer-document.js';

export const CONSUMER_KINDS = [
  'human',
  'machine',
] as const;

export const AUDIT_METRICS = [
  'outbound-count',
  'declaration-count',
  'export-count',
  'public-surface',
  'exercise-root-count',
  'production-root-count',
  'grounded-production-root-count',
  'builder-count',
  'wrapper-count',
  'card-literal-count',
  'summary-site-count',
  'ref-interface-count',
  'card-interface-count',
] as const;

export type ConsumerKind =
  typeof CONSUMER_KINDS[number];

export type AuditMetric =
  typeof AUDIT_METRICS[number];

export interface InquiryOrdering {
  readonly issueSeverity: readonly IssueSeverity[];
  readonly trust: readonly TrustKind[];
  readonly routeClass: readonly PackageRouteClass[];
  readonly routeKind: readonly PackageRouteKind[];
  readonly rootKind: readonly PackageRootKind[];
  readonly blockImportance: readonly AnswerBlockImportance[];
}

export interface AuditMetricOrders {
  readonly candidateEntry: readonly AuditMetric[];
  readonly exerciseOnly: readonly AuditMetric[];
  readonly publicSurface: readonly AuditMetric[];
  readonly coordination: readonly AuditMetric[];
  readonly presentation: readonly AuditMetric[];
}

export interface InquiryLimits {
  readonly summaryLineCount: number;
  readonly relatedRefCount: number;
  readonly continuationCount: number;
  readonly blockCount: number;
  readonly listItemCount: number;
  readonly findingCount: number;
  readonly findingEvidenceCount: number;
  readonly witnessCount: number;
  readonly refListCount: number;
  readonly factCount: number;
}

export interface InquiryPolicy {
  readonly focusKind: FocusKind;
  readonly inquiryEpisode: InquiryEpisode;
  readonly questionRoute: QuestionRoute;
  readonly readMode: ReadMode;
  readonly consumer: ConsumerKind;
  readonly limits: InquiryLimits;
  readonly ordering: InquiryOrdering;
  readonly auditMetricOrders: AuditMetricOrders;
}

export interface ResolveInquiryPolicyDefaults {
  readonly focusKind: FocusKind;
  readonly inquiryEpisode: InquiryEpisode;
  readonly readMode: ReadMode;
  readonly consumer?: ConsumerKind;
}

export const DEFAULT_INQUIRY_ORDERING: InquiryOrdering = {
  issueSeverity: ['error', 'warning', 'info'],
  trust: ['grounded', 'qualified', 'frontier', 'unavailable'],
  routeClass: ['production', 'exercise', 'candidate'],
  routeKind: ['dependency-import', 'executable-handoff'],
  rootKind: ['public-api', 'manifest-bin', 'exercise', 'candidate-entry'],
  blockImportance: ['primary', 'supporting', 'detail'],
};

const SUMMARY_CARD_LIMITS: InquiryLimits = {
  summaryLineCount: 3,
  relatedRefCount: 10,
  continuationCount: 5,
  blockCount: 5,
  listItemCount: 5,
  findingCount: 5,
  findingEvidenceCount: 2,
  witnessCount: 3,
  refListCount: 6,
  factCount: 5,
};

const FOCUS_CARD_LIMITS: InquiryLimits = {
  summaryLineCount: 4,
  relatedRefCount: 12,
  continuationCount: 6,
  blockCount: 6,
  listItemCount: 6,
  findingCount: 6,
  findingEvidenceCount: 3,
  witnessCount: 4,
  refListCount: 8,
  factCount: 6,
};

const SUPPORTING_EVIDENCE_LIMITS: InquiryLimits = {
  summaryLineCount: 5,
  relatedRefCount: 12,
  continuationCount: 6,
  blockCount: 8,
  listItemCount: 8,
  findingCount: 8,
  findingEvidenceCount: 4,
  witnessCount: 5,
  refListCount: 10,
  factCount: 8,
};

const SNAPSHOT_LIMITS: InquiryLimits = {
  summaryLineCount: 4,
  relatedRefCount: 14,
  continuationCount: 6,
  blockCount: 10,
  listItemCount: 12,
  findingCount: 12,
  findingEvidenceCount: 8,
  witnessCount: 8,
  refListCount: 12,
  factCount: 12,
};

const BASE_AUDIT_METRIC_ORDERS: AuditMetricOrders = {
  candidateEntry: ['outbound-count', 'declaration-count', 'export-count', 'public-surface'],
  exerciseOnly: ['exercise-root-count', 'declaration-count', 'export-count', 'outbound-count'],
  publicSurface: ['grounded-production-root-count', 'production-root-count', 'declaration-count', 'export-count'],
  coordination: ['builder-count', 'wrapper-count', 'card-literal-count', 'summary-site-count'],
  presentation: ['ref-interface-count', 'card-interface-count', 'card-literal-count', 'summary-site-count'],
};

export function resolveInquiryPolicy(
  query: Inquiry,
  defaults: ResolveInquiryPolicyDefaults,
): InquiryPolicy {
  const readMode = query.readMode ?? defaults.readMode;
  const inquiryEpisode = query.inquiryEpisode ?? defaults.inquiryEpisode;
  const consumer = defaults.consumer ?? (readMode === 'snapshot' ? 'machine' : 'human');

  return {
    focusKind: defaults.focusKind,
    inquiryEpisode,
    questionRoute: query.questionRoute,
    readMode,
    consumer,
    limits: limitsForPolicy(readMode, inquiryEpisode),
    ordering: DEFAULT_INQUIRY_ORDERING,
    auditMetricOrders: auditMetricOrdersForPolicy(readMode, inquiryEpisode),
  };
}

export function compareByPrecedence<T extends string>(
  precedence: readonly T[],
  left: T,
  right: T,
): number {
  return precedenceIndex(precedence, left) - precedenceIndex(precedence, right);
}

export function compareNumbersDescending(left: number, right: number): number {
  return right - left;
}

export function compareStringsAscending(left: string, right: string): number {
  return left.localeCompare(right);
}

export function compareBooleansDescending(left: boolean, right: boolean): number {
  return Number(right) - Number(left);
}

function precedenceIndex<T extends string>(
  precedence: readonly T[],
  value: T,
): number {
  const index = precedence.indexOf(value);
  return index >= 0 ? index : precedence.length;
}

function limitsForPolicy(
  readMode: ReadMode,
  inquiryEpisode: InquiryEpisode,
): InquiryLimits {
  const base = readMode === 'summary-card'
    ? SUMMARY_CARD_LIMITS
    : readMode === 'supporting-evidence'
      ? SUPPORTING_EVIDENCE_LIMITS
      : readMode === 'snapshot'
        ? SNAPSHOT_LIMITS
        : FOCUS_CARD_LIMITS;

  if (inquiryEpisode === 'inventory-and-audit-sweep') {
    return {
      ...base,
      findingCount: Math.max(base.findingCount, 6),
      findingEvidenceCount: Math.max(base.findingEvidenceCount, 3),
    };
  }

  if (inquiryEpisode === 'bounded-closure-explanation') {
    return {
      ...base,
      witnessCount: Math.max(base.witnessCount, 4),
      continuationCount: Math.max(base.continuationCount, 6),
    };
  }

  return base;
}

function auditMetricOrdersForPolicy(
  readMode: ReadMode,
  inquiryEpisode: InquiryEpisode,
): AuditMetricOrders {
  if (readMode === 'supporting-evidence' || inquiryEpisode === 'delta-and-reread-floor') {
    return {
      ...BASE_AUDIT_METRIC_ORDERS,
      coordination: ['builder-count', 'wrapper-count', 'summary-site-count', 'card-literal-count'],
      presentation: ['ref-interface-count', 'card-interface-count', 'summary-site-count', 'card-literal-count'],
    };
  }

  return BASE_AUDIT_METRIC_ORDERS;
}
