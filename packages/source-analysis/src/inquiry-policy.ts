import type { SourceAnalysisIssueSeverity, SourceAnalysisTrustKind } from './outcome-algebra.js';
import type {
  SourceAnalysisFocusKind,
  SourceAnalysisInquiryEpisode,
  SourceAnalysisQuery,
  SourceAnalysisQuestionRoute,
  SourceAnalysisReadMode,
} from './query-model.js';
import type {
  SourceAnalysisPackageRouteClass,
  SourceAnalysisPackageRouteKind,
  SourceAnalysisPackageRootKind,
} from './reachability.js';
import type { SourceAnalysisAnswerBlockImportance } from './answer-document.js';

export const SOURCE_ANALYSIS_CONSUMER_KINDS = [
  'human',
  'machine',
] as const;

export const SOURCE_ANALYSIS_AUDIT_METRICS = [
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

export type SourceAnalysisConsumerKind =
  typeof SOURCE_ANALYSIS_CONSUMER_KINDS[number];

export type SourceAnalysisAuditMetric =
  typeof SOURCE_ANALYSIS_AUDIT_METRICS[number];

export interface SourceAnalysisInquiryOrdering {
  readonly issueSeverity: readonly SourceAnalysisIssueSeverity[];
  readonly trust: readonly SourceAnalysisTrustKind[];
  readonly routeClass: readonly SourceAnalysisPackageRouteClass[];
  readonly routeKind: readonly SourceAnalysisPackageRouteKind[];
  readonly rootKind: readonly SourceAnalysisPackageRootKind[];
  readonly blockImportance: readonly SourceAnalysisAnswerBlockImportance[];
}

export interface SourceAnalysisAuditMetricOrders {
  readonly candidateEntry: readonly SourceAnalysisAuditMetric[];
  readonly exerciseOnly: readonly SourceAnalysisAuditMetric[];
  readonly publicSurface: readonly SourceAnalysisAuditMetric[];
  readonly coordination: readonly SourceAnalysisAuditMetric[];
  readonly presentation: readonly SourceAnalysisAuditMetric[];
}

export interface SourceAnalysisInquiryLimits {
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

export interface SourceAnalysisInquiryPolicy {
  readonly focusKind: SourceAnalysisFocusKind;
  readonly inquiryEpisode: SourceAnalysisInquiryEpisode;
  readonly questionRoute: SourceAnalysisQuestionRoute;
  readonly readMode: SourceAnalysisReadMode;
  readonly consumer: SourceAnalysisConsumerKind;
  readonly limits: SourceAnalysisInquiryLimits;
  readonly ordering: SourceAnalysisInquiryOrdering;
  readonly auditMetricOrders: SourceAnalysisAuditMetricOrders;
}

export interface ResolveSourceAnalysisInquiryPolicyDefaults {
  readonly focusKind: SourceAnalysisFocusKind;
  readonly inquiryEpisode: SourceAnalysisInquiryEpisode;
  readonly readMode: SourceAnalysisReadMode;
  readonly consumer?: SourceAnalysisConsumerKind;
}

export const DEFAULT_SOURCE_ANALYSIS_INQUIRY_ORDERING: SourceAnalysisInquiryOrdering = {
  issueSeverity: ['error', 'warning', 'info'],
  trust: ['grounded', 'qualified', 'frontier', 'unavailable'],
  routeClass: ['production', 'exercise', 'candidate'],
  routeKind: ['dependency-import', 'parse-import', 'executable-handoff'],
  rootKind: ['public-api', 'manifest-bin', 'exercise', 'candidate-entry'],
  blockImportance: ['primary', 'supporting', 'detail'],
};

const SUMMARY_CARD_LIMITS: SourceAnalysisInquiryLimits = {
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

const FOCUS_CARD_LIMITS: SourceAnalysisInquiryLimits = {
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

const SUPPORTING_EVIDENCE_LIMITS: SourceAnalysisInquiryLimits = {
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

const SNAPSHOT_LIMITS: SourceAnalysisInquiryLimits = {
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

const BASE_AUDIT_METRIC_ORDERS: SourceAnalysisAuditMetricOrders = {
  candidateEntry: ['outbound-count', 'declaration-count', 'export-count', 'public-surface'],
  exerciseOnly: ['exercise-root-count', 'declaration-count', 'export-count', 'outbound-count'],
  publicSurface: ['grounded-production-root-count', 'production-root-count', 'declaration-count', 'export-count'],
  coordination: ['builder-count', 'wrapper-count', 'card-literal-count', 'summary-site-count'],
  presentation: ['ref-interface-count', 'card-interface-count', 'card-literal-count', 'summary-site-count'],
};

export function resolveSourceAnalysisInquiryPolicy(
  query: SourceAnalysisQuery,
  defaults: ResolveSourceAnalysisInquiryPolicyDefaults,
): SourceAnalysisInquiryPolicy {
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
    ordering: DEFAULT_SOURCE_ANALYSIS_INQUIRY_ORDERING,
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
  readMode: SourceAnalysisReadMode,
  inquiryEpisode: SourceAnalysisInquiryEpisode,
): SourceAnalysisInquiryLimits {
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
  readMode: SourceAnalysisReadMode,
  inquiryEpisode: SourceAnalysisInquiryEpisode,
): SourceAnalysisAuditMetricOrders {
  if (readMode === 'supporting-evidence' || inquiryEpisode === 'delta-and-reread-floor') {
    return {
      ...BASE_AUDIT_METRIC_ORDERS,
      coordination: ['builder-count', 'wrapper-count', 'summary-site-count', 'card-literal-count'],
      presentation: ['ref-interface-count', 'card-interface-count', 'summary-site-count', 'card-literal-count'],
    };
  }

  return BASE_AUDIT_METRIC_ORDERS;
}
