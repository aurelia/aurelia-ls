import type { AnswerCard } from './answer-card.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
  Outcome,
  TrustProfile,
} from './outcome-algebra.js';
import { OUTCOME_SCHEMA_VERSION } from './outcome-algebra.js';
import type {
  InquiryAnswer,
  InquiryProvenanceEntry,
  ContinuationBasis,
  FocusRef,
  InquiryEpisode,
  Inquiry,
  PresentationReadMode,
  WorldFrame,
} from './inquiry-model.js';
import { INQUIRY_MODEL_SCHEMA_VERSION } from './inquiry-model.js';
import {
  toWireContinuationBasis,
  toWireDeltaDescriptor,
} from './inquiry-wire.js';

export interface CreateAnswerEnvelopeOptions<
  TResult extends AnswerCard,
> {
  readonly query: Inquiry;
  readonly focusRef: FocusRef;
  readonly inquiryEpisode: InquiryEpisode;
  readonly readMode: PresentationReadMode;
  readonly worldFrame: WorldFrame;
  readonly tag: Outcome<TResult>['tag'];
  readonly value: TResult;
  readonly trust: TrustProfile;
  readonly closureBasis: readonly ClosureBasis[];
  readonly issues: readonly Issue[];
  readonly continuations: readonly Continuation[];
  readonly provenance: readonly InquiryProvenanceEntry[];
}

export function createAnswerEnvelope<
  TResult extends AnswerCard,
>(
  options: CreateAnswerEnvelopeOptions<TResult>,
): InquiryAnswer<TResult> {
  const continuationBasis: ContinuationBasis = {
    focusRef: options.focusRef,
    questionRoute: options.query.questionRoute,
    readMode: options.readMode,
    worldFrame: options.worldFrame,
    governingAnchorRefs: options.value.relatedRefs.map((ref) => ref.value).slice(0, 4),
  };

  const outcome: Outcome<TResult> = {
    schemaVersion: OUTCOME_SCHEMA_VERSION,
    tag: options.tag,
    summary: options.value.summaryLines[0] ?? options.value.title,
    trust: options.trust,
    value: options.value,
    closureBasis: options.closureBasis,
    issues: options.issues,
    continuations: options.continuations,
  };

  return {
    schemaVersion: INQUIRY_MODEL_SCHEMA_VERSION,
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
      continuation_basis: toWireContinuationBasis(continuationBasis),
      delta: toWireDeltaDescriptor({
        kind: 'none',
        count: 0,
        affectedRefs: [],
      }),
    },
    outcome,
  };
}
