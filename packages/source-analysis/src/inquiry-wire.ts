import type {
  ClosureBasis,
  Outcome,
} from './outcome-algebra.js';
import type {
  ContinuationBasis,
  DeltaDescriptor,
  Inquiry,
  InquiryProvenanceEntry,
  QuestionRoute,
  ReadMode,
  WorldFrame,
  FocusRef,
} from './inquiry-model.js';

export interface WireContinuationBasis {
  readonly focus_ref?: FocusRef;
  readonly question_route?: QuestionRoute;
  readonly read_mode?: ReadMode;
  readonly world_frame?: WorldFrame;
  readonly governing_anchor_refs?: readonly string[];
}

export interface WireDeltaDescriptor {
  readonly kind: DeltaDescriptor['kind'];
  readonly count: number;
  readonly affected_refs: readonly string[];
  readonly reread_floor?: Inquiry['questionRoute'];
}

export interface InquiryAnswerSlots<TResult = unknown> {
  readonly focus_ref?: FocusRef;
  readonly question_route?: QuestionRoute;
  readonly read_mode?: ReadMode;
  readonly world_frame?: WorldFrame;
  readonly outcome?: Outcome<TResult>;
  readonly closure_basis?: readonly ClosureBasis[];
  readonly provenance?: readonly InquiryProvenanceEntry[];
  readonly continuation_basis?: WireContinuationBasis;
  readonly delta?: WireDeltaDescriptor;
}

export function toWireContinuationBasis(
  value: ContinuationBasis,
): WireContinuationBasis {
  return {
    ...(value.focusRef ? { focus_ref: value.focusRef } : {}),
    ...(value.questionRoute ? { question_route: value.questionRoute } : {}),
    ...(value.readMode ? { read_mode: value.readMode } : {}),
    ...(value.worldFrame ? { world_frame: value.worldFrame } : {}),
    ...(value.governingAnchorRefs ? { governing_anchor_refs: value.governingAnchorRefs } : {}),
  };
}

export function toWireDeltaDescriptor(
  value: {
    readonly kind: DeltaDescriptor['kind'];
    readonly count: number;
    readonly affectedRefs: readonly string[];
    readonly rereadFloor?: Inquiry['questionRoute'];
  },
): WireDeltaDescriptor {
  return {
    kind: value.kind,
    count: value.count,
    affected_refs: value.affectedRefs,
    ...(value.rereadFloor ? { reread_floor: value.rereadFloor } : {}),
  };
}
