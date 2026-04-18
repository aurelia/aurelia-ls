import type {
  ClosureBasis,
  Outcome,
} from './outcome-algebra.js';
import type {
  ContinuationBasis,
  DeltaDescriptor,
  ExecutionPosture,
  Inquiry,
  InquiryProvenanceEntry,
  MaintenanceQuestionRouteSelection,
  PresentationReadMode,
  QuestionRoute,
  QuestionRouteSelection,
  WorldFrame,
  WorldTargeting,
  FocusRef,
} from './inquiry-model.js';
import {
  composeWorldFrame,
  questionRouteFromSelection,
} from './inquiry-model.js';

export interface WireContinuationBasisSource {
  readonly focusRef?: FocusRef;
  readonly questionRoute?: QuestionRouteSelection;
  readonly readMode?: PresentationReadMode;
  readonly worldTargeting?: WorldTargeting;
  readonly executionPosture?: ExecutionPosture;
  readonly governingAnchorRefs?: readonly string[];
}

export interface WireDeltaDescriptorSource {
  readonly kind: DeltaDescriptor['kind'];
  readonly count: number;
  readonly affectedRefs: readonly string[];
  readonly rereadFloorSelection?: MaintenanceQuestionRouteSelection;
}

export interface WireContinuationBasis {
  readonly focus_ref?: FocusRef;
  readonly question_route?: QuestionRoute;
  readonly read_mode?: PresentationReadMode;
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
  readonly read_mode?: PresentationReadMode;
  readonly world_frame?: WorldFrame;
  readonly outcome?: Outcome<TResult>;
  readonly closure_basis?: readonly ClosureBasis[];
  readonly provenance?: readonly InquiryProvenanceEntry[];
  readonly continuation_basis?: WireContinuationBasis;
  readonly delta?: WireDeltaDescriptor;
}

export function toWireContinuationBasis(
  value: WireContinuationBasisSource | ContinuationBasis,
): WireContinuationBasis {
  const questionRoute = resolveWireQuestionRoute(value);
  const worldFrame = resolveWireWorldFrame(value);
  return {
    ...(value.focusRef ? { focus_ref: value.focusRef } : {}),
    ...(questionRoute ? { question_route: questionRoute } : {}),
    ...(value.readMode ? { read_mode: value.readMode } : {}),
    ...(worldFrame ? { world_frame: worldFrame } : {}),
    ...(value.governingAnchorRefs ? { governing_anchor_refs: value.governingAnchorRefs } : {}),
  };
}

export function toWireDeltaDescriptor(
  value: WireDeltaDescriptorSource | {
    readonly kind: DeltaDescriptor['kind'];
    readonly count: number;
    readonly affectedRefs: readonly string[];
    readonly rereadFloor?: Inquiry['questionRoute'];
  },
): WireDeltaDescriptor {
  const rereadFloor = isWireDeltaDescriptorSource(value)
    ? questionRouteFromSelection(value.rereadFloorSelection)
    : value.rereadFloor;
  return {
    kind: value.kind,
    count: value.count,
    affected_refs: value.affectedRefs,
    ...(rereadFloor ? { reread_floor: rereadFloor } : {}),
  };
}

function resolveWireQuestionRoute(
  value: WireContinuationBasisSource | ContinuationBasis,
): QuestionRoute | undefined {
  if (typeof value.questionRoute === 'string') {
    return value.questionRoute;
  }

  return questionRouteFromSelection(value.questionRoute);
}

function resolveWireWorldFrame(
  value: WireContinuationBasisSource | ContinuationBasis,
): WorldFrame | undefined {
  if (!isWireContinuationBasisSource(value)) {
    return value.worldFrame;
  }

  if (!value.worldTargeting && !value.executionPosture) {
    return undefined;
  }

  return composeWorldFrame(value.worldTargeting, value.executionPosture);
}

function isWireContinuationBasisSource(
  value: WireContinuationBasisSource | ContinuationBasis,
): value is WireContinuationBasisSource {
  return 'worldTargeting' in value || 'executionPosture' in value || typeof value.questionRoute === 'object';
}

function isWireDeltaDescriptorSource(
  value: WireDeltaDescriptorSource | {
    readonly kind: DeltaDescriptor['kind'];
    readonly count: number;
    readonly affectedRefs: readonly string[];
    readonly rereadFloor?: Inquiry['questionRoute'];
  },
): value is WireDeltaDescriptorSource {
  return 'rereadFloorSelection' in value;
}
