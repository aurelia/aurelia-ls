import type { IssueSeverity, TrustKind } from './outcome-algebra.js';
import type {
  InquiryEpisode,
  Inquiry,
  PolicyFocusKind,
  QuestionRoute,
  PresentationReadMode,
  ReadMode,
} from './inquiry-model.js';
import { isPresentationReadMode } from './inquiry-model.js';
import type {
  PackageRouteClass,
  PackageRouteKind,
  PackageRootKind,
} from './reachability.js';
import type {
  AnswerRenderOrdering,
  AnswerRenderPolicy,
} from './answer-render-policy.js';
import {
  DEFAULT_ANSWER_RENDER_ORDERING,
  resolveAnswerRenderPolicy,
} from './answer-render-policy.js';

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

export interface InquiryPolicy extends AnswerRenderPolicy {
  readonly focusKind: PolicyFocusKind;
  readonly inquiryEpisode: InquiryEpisode;
  readonly questionRoute: QuestionRoute;
  readonly readMode: PresentationReadMode;
  readonly consumer: ConsumerKind;
  readonly limits: InquiryLimits;
  readonly ordering: InquiryOrdering;
  readonly auditMetricOrders: AuditMetricOrders;
}

export interface InquiryOrdering extends AnswerRenderOrdering {
  readonly issueSeverity: readonly IssueSeverity[];
  readonly trust: readonly TrustKind[];
  readonly routeClass: readonly PackageRouteClass[];
  readonly routeKind: readonly PackageRouteKind[];
  readonly rootKind: readonly PackageRootKind[];
}

export interface ResolveInquiryPolicyDefaults {
  readonly focusKind: PolicyFocusKind;
  readonly inquiryEpisode: InquiryEpisode;
  readonly readMode: PresentationReadMode;
  readonly consumer?: ConsumerKind;
}

export const DEFAULT_INQUIRY_ORDERING: InquiryOrdering = {
  ...DEFAULT_ANSWER_RENDER_ORDERING,
  issueSeverity: ['error', 'warning', 'info'],
  trust: ['grounded', 'qualified', 'frontier', 'unavailable'],
  routeClass: ['production', 'exercise', 'candidate'],
  routeKind: ['dependency-import', 'executable-handoff'],
  rootKind: ['public-api', 'manifest-bin', 'exercise', 'candidate-entry'],
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
  const readMode = resolvePresentationReadMode(query.readMode, defaults.readMode);
  const inquiryEpisode = query.inquiryEpisode ?? defaults.inquiryEpisode;
  const consumer = defaults.consumer ?? 'human';
  const renderPolicy = resolveAnswerRenderPolicy(readMode, inquiryEpisode);

  return {
    focusKind: defaults.focusKind,
    inquiryEpisode,
    questionRoute: query.questionRoute,
    readMode,
    consumer,
    limits: {
      ...renderPolicy.limits,
      continuationCount: continuationCountForPolicy(readMode, inquiryEpisode),
    },
    ordering: DEFAULT_INQUIRY_ORDERING,
    auditMetricOrders: auditMetricOrdersForPolicy(readMode, inquiryEpisode),
  };
}

function continuationCountForPolicy(
  readMode: PresentationReadMode,
  inquiryEpisode: InquiryEpisode,
): number {
  const base = readMode === 'summary-card'
    ? 5
    : readMode === 'supporting-evidence'
      ? 6
      : 6;

  return inquiryEpisode === 'bounded-closure-explanation'
    ? Math.max(base, 6)
    : base;
}

function auditMetricOrdersForPolicy(
  readMode: PresentationReadMode,
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

function resolvePresentationReadMode(
  readMode: ReadMode | undefined,
  fallback: PresentationReadMode,
): PresentationReadMode {
  // TODO: Structured answer surfaces now normalize payload/materialization
  // modes back onto presentation modes. Once payload-mode queries have a
  // first-class higher-order materialization surface, stop coercing here and
  // return an explicit no-claim or reroute instead.
  return readMode && isPresentationReadMode(readMode)
    ? readMode
    : fallback;
}
