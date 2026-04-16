import type { SourceAnalysisAnswerCard } from './answer-card.js';
import type {
  SourceAnalysisClosureBasis,
  SourceAnalysisContinuation,
  SourceAnalysisIssue,
  SourceAnalysisOutcome,
  SourceAnalysisTrustProfile,
} from './outcome-algebra.js';
import { SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION } from './outcome-algebra.js';
import type {
  SourceAnalysisAnswer,
  SourceAnalysisAnswerProvenanceEntry,
  SourceAnalysisContinuationBasis,
  SourceAnalysisFocusRef,
  SourceAnalysisInquiryEpisode,
  SourceAnalysisQuery,
  SourceAnalysisReadMode,
  SourceAnalysisWorldFrame,
} from './query-model.js';
import { SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION } from './query-model.js';

export interface CreateSourceAnalysisAnswerEnvelopeOptions<
  TResult extends SourceAnalysisAnswerCard,
> {
  readonly query: SourceAnalysisQuery;
  readonly focusRef: SourceAnalysisFocusRef;
  readonly inquiryEpisode: SourceAnalysisInquiryEpisode;
  readonly readMode: SourceAnalysisReadMode;
  readonly worldFrame: SourceAnalysisWorldFrame;
  readonly tag: SourceAnalysisOutcome<TResult>['tag'];
  readonly value: TResult;
  readonly trust: SourceAnalysisTrustProfile;
  readonly closureBasis: readonly SourceAnalysisClosureBasis[];
  readonly issues: readonly SourceAnalysisIssue[];
  readonly continuations: readonly SourceAnalysisContinuation[];
  readonly provenance: readonly SourceAnalysisAnswerProvenanceEntry[];
}

export function createSourceAnalysisAnswerEnvelope<
  TResult extends SourceAnalysisAnswerCard,
>(
  options: CreateSourceAnalysisAnswerEnvelopeOptions<TResult>,
): SourceAnalysisAnswer<TResult> {
  const continuationBasis: SourceAnalysisContinuationBasis = {
    focusRef: options.focusRef,
    questionRoute: options.query.questionRoute,
    readMode: options.readMode,
    worldFrame: options.worldFrame,
    governingAnchorRefs: options.value.relatedRefs.map((ref) => ref.value).slice(0, 4),
  };

  const outcome: SourceAnalysisOutcome<TResult> = {
    schemaVersion: SOURCE_ANALYSIS_OUTCOME_SCHEMA_VERSION,
    tag: options.tag,
    summary: options.value.summaryLines[0] ?? options.value.title,
    trust: options.trust,
    value: options.value,
    closureBasis: options.closureBasis,
    issues: options.issues,
    continuations: options.continuations,
  };

  return {
    schemaVersion: SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION,
    query: {
      inquiryEpisode: options.query.inquiryEpisode ?? options.inquiryEpisode,
      focusRef: options.focusRef,
      questionRoute: options.query.questionRoute,
      readMode: options.readMode,
      worldFrame: options.worldFrame,
      requestedSlotIds: options.query.requestedSlotIds,
      continuationBasis: options.query.continuationBasis ?? continuationBasis,
    },
    slots: {
      focus_ref: options.focusRef,
      question_route: options.query.questionRoute,
      read_mode: options.readMode,
      world_frame: options.worldFrame,
      outcome,
      closure_basis: options.closureBasis,
      provenance: options.provenance,
      continuation_basis: continuationBasis,
      delta: {
        kind: 'none',
        count: 0,
        affectedRefs: [],
      },
    },
    outcome,
  };
}
