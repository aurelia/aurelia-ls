import type {
  SemanticRuntimeInquiryProfile,
} from '../telemetry/inquiry-profile.js';

export type SemanticQueryMaterializationPolicy =
  | 'projection-only'
  | 'query-type-projection'
  | 'static-catalog';

export const enum QueryClaimRetentionKind {
  /** Record only enough to explain the current answer; disposal may happen immediately after transport serialization. */
  DiscardAfterAnswer = 'discard-after-answer',
  /** Retain lightweight claims for interactive follow-up in the current app/query session. */
  RetainForSession = 'retain-for-session',
  /** Retain query claims until the app-world/type-system epoch is discarded. */
  RetainForAppEpoch = 'retain-for-app-epoch',
}

export const enum QueryClaimAnswerLocalKernelPolicy {
  /** Dispose records plus product-detail and hot-detail sidecars created inside the answer boundary. */
  DisposeAfterAnswer = 'dispose-after-answer',
  /** Leave answer-local kernel records and sidecars in the owning app/runtime epoch. */
  RetainInOwnerEpoch = 'retain-in-owner-epoch',
}

export const enum QueryClaimDisposalReason {
  AnswerDiscarded = 'answer-discarded',
  RetentionBudgetExceeded = 'retention-budget-exceeded',
  Manual = 'manual',
  SessionEnded = 'session-ended',
  AppEpochDisposed = 'app-epoch-disposed',
  ProjectEpochChanged = 'project-epoch-changed',
  SourceEpochChanged = 'source-epoch-changed',
}

export interface QueryClaimRetentionPolicy {
  readonly retentionKind: QueryClaimRetentionKind;
  readonly retainAnswerSummary: boolean;
  readonly retainPayloadShape: boolean;
  readonly answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy;
  /**
   * Retain the public answer object itself when it is small enough and policy-approved.
   *
   * This is deliberately off for most profiles. Query claims should normally retain answer shape, not duplicate public
   * DTO payloads in memory. Static catalog answers can opt in later without changing the API boundary.
   */
  readonly retainAnswerValue: boolean;
  /** Materialization policies whose small public answer values can be reused from the claim graph. */
  readonly retainedAnswerMaterializationPolicies: readonly SemanticQueryMaterializationPolicy[];
  /** Per-answer byte ceiling for retained public DTO values. */
  readonly retainedAnswerByteLimit: number;
  /** Total retained public DTO value budget for this graph; claim records survive even when values are pruned. */
  readonly retainedAnswerTotalByteLimit: number | null;
  /**
   * Maximum retained claim records for bounded session profiles.
   *
   * `null` means the graph is intentionally app-epoch/session unbounded. The graph prunes only answered/failed nodes,
   * never pending lazy claims that a caller may still materialize.
   */
  readonly retainedRecordLimit: number | null;
}

export interface QueryClaimDisposalPolicy {
  readonly reason: QueryClaimDisposalReason;
  readonly retentionKinds?: readonly QueryClaimRetentionKind[];
  readonly materializationPolicies?: readonly SemanticQueryMaterializationPolicy[];
  readonly queryKinds?: readonly string[];
  readonly locusKeys?: readonly string[];
  readonly epochKeys?: readonly string[];
}

export interface QueryClaimDisposalFilters {
  /** Limit disposal to graphs whose active profile has one of these retention lifetimes. */
  readonly retentionKinds?: readonly QueryClaimRetentionKind[];
  /** Limit disposal to answer families with the selected materialization/storage posture. */
  readonly materializationPolicies?: readonly SemanticQueryMaterializationPolicy[];
  /** Limit disposal to exact public query kinds such as `template-diagnostics` or `app-query-batch`. */
  readonly queryKinds?: readonly string[];
  /** Limit disposal to exact answer loci, usually project/source/cursor keys. */
  readonly locusKeys?: readonly string[];
  /** Limit disposal to source, project, workspace, or app epoch dependency keys. */
  readonly epochKeys?: readonly string[];
}

export function queryClaimDisposalPolicy(
  reason: QueryClaimDisposalReason,
  filters: QueryClaimDisposalFilters = {},
): QueryClaimDisposalPolicy {
  return {
    reason,
    ...nonEmptyQueryClaimList('retentionKinds', filters.retentionKinds),
    ...nonEmptyQueryClaimList('materializationPolicies', filters.materializationPolicies),
    ...nonEmptyQueryClaimList('queryKinds', filters.queryKinds),
    ...nonEmptyQueryClaimList('locusKeys', filters.locusKeys),
    ...nonEmptyQueryClaimList('epochKeys', filters.epochKeys),
  };
}

export function queryClaimSessionEndDisposalPolicy(): QueryClaimDisposalPolicy {
  return queryClaimDisposalPolicy(QueryClaimDisposalReason.SessionEnded, {
    retentionKinds: [QueryClaimRetentionKind.RetainForSession],
  });
}

export function queryClaimAppEpochDisposalPolicy(): QueryClaimDisposalPolicy {
  return queryClaimDisposalPolicy(QueryClaimDisposalReason.AppEpochDisposed, {
    retentionKinds: [QueryClaimRetentionKind.RetainForAppEpoch],
  });
}

export function queryClaimProjectEpochDisposalPolicy(
  epochKeys?: readonly string[],
): QueryClaimDisposalPolicy {
  return queryClaimDisposalPolicy(QueryClaimDisposalReason.ProjectEpochChanged, {
    epochKeys,
  });
}

export function queryClaimSourceEpochDisposalPolicy(
  epochKeys?: readonly string[],
): QueryClaimDisposalPolicy {
  return queryClaimDisposalPolicy(QueryClaimDisposalReason.SourceEpochChanged, {
    epochKeys,
  });
}

export function queryClaimQueryTypeProjectionDisposalPolicy(
  reason: QueryClaimDisposalReason = QueryClaimDisposalReason.Manual,
): QueryClaimDisposalPolicy {
  return queryClaimDisposalPolicy(reason, {
    materializationPolicies: ['query-type-projection'],
  });
}

export function queryClaimRetentionPolicyForProfile(
  profile: SemanticRuntimeInquiryProfile,
): QueryClaimRetentionPolicy {
  switch (profile) {
    case 'lsp-cursor':
      return {
        retentionKind: QueryClaimRetentionKind.RetainForSession,
        retainAnswerSummary: false,
        retainPayloadShape: true,
        answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy.DisposeAfterAnswer,
        retainAnswerValue: false,
        retainedAnswerMaterializationPolicies: [],
        retainedAnswerByteLimit: 0,
        retainedAnswerTotalByteLimit: 0,
        retainedRecordLimit: 512,
      };
    case 'lsp-diagnostics':
      return {
        retentionKind: QueryClaimRetentionKind.RetainForSession,
        retainAnswerSummary: true,
        retainPayloadShape: true,
        answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy.DisposeAfterAnswer,
        retainAnswerValue: false,
        retainedAnswerMaterializationPolicies: [],
        retainedAnswerByteLimit: 0,
        retainedAnswerTotalByteLimit: 0,
        retainedRecordLimit: 256,
      };
    case 'mcp-authoring':
    case 'fixture':
      return {
        retentionKind: QueryClaimRetentionKind.RetainForAppEpoch,
        retainAnswerSummary: true,
        retainPayloadShape: true,
        answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy.RetainInOwnerEpoch,
        retainAnswerValue: false,
        retainedAnswerMaterializationPolicies: [],
        retainedAnswerByteLimit: 0,
        retainedAnswerTotalByteLimit: 0,
        retainedRecordLimit: null,
      };
    case 'mcp-orientation':
      return {
        retentionKind: QueryClaimRetentionKind.RetainForSession,
        retainAnswerSummary: true,
        retainPayloadShape: true,
        answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy.DisposeAfterAnswer,
        retainAnswerValue: true,
        retainedAnswerMaterializationPolicies: ['static-catalog', 'projection-only'],
        retainedAnswerByteLimit: 64 * 1024,
        retainedAnswerTotalByteLimit: 512 * 1024,
        retainedRecordLimit: 512,
      };
    case 'aot':
    case 'ssr':
      return {
        retentionKind: QueryClaimRetentionKind.DiscardAfterAnswer,
        retainAnswerSummary: false,
        retainPayloadShape: true,
        answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy.DisposeAfterAnswer,
        retainAnswerValue: false,
        retainedAnswerMaterializationPolicies: [],
        retainedAnswerByteLimit: 0,
        retainedAnswerTotalByteLimit: 0,
        retainedRecordLimit: 0,
      };
    case 'exploration':
    default:
      return {
        retentionKind: QueryClaimRetentionKind.RetainForSession,
        retainAnswerSummary: true,
        retainPayloadShape: true,
        answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy.DisposeAfterAnswer,
        retainAnswerValue: false,
        retainedAnswerMaterializationPolicies: [],
        retainedAnswerByteLimit: 0,
        retainedAnswerTotalByteLimit: 0,
        retainedRecordLimit: 512,
      };
  }
}

function nonEmptyQueryClaimList<TKey extends keyof QueryClaimDisposalFilters>(
  key: TKey,
  values: QueryClaimDisposalFilters[TKey],
): Pick<QueryClaimDisposalPolicy, TKey> | {} {
  if (values == null || values.length === 0) {
    return {};
  }
  return { [key]: values } as Pick<QueryClaimDisposalPolicy, TKey>;
}
