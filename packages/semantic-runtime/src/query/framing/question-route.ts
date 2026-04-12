import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import {
  SemanticInquiryEpisode,
  SemanticReadMode
} from "../../model/semantic-api/semantic-api-model.js";
import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";
import type { AuthoredOccurrenceTarget } from "./authored-occurrence-target.js";
import {
  createQuestionFocusRef,
  type QuestionFocusRef
} from "./focus-ref.js";

export { AuthoredOccurrenceTarget } from "./authored-occurrence-target.js";

export const enum QuestionRouteKind {
  OrientAndLocalize = 1,
  BoundedClosureExplanation = 2,
  GoverningAnchorJump = 3,
  InventoryAndAuditSweep = 4,
  TransformOrRemediateHandoff = 5
}

export interface QuestionRoute {
  readonly kind: QuestionRouteKind;
  readonly inquiryEpisode: SemanticInquiryEpisode;
  readonly readMode: SemanticReadMode;
  readonly focusRef: QuestionFocusRef;
  readonly boundaryRoute?: BoundaryRouteKind;
}

export function createQuestionRoute(
  claimRoute: ClaimRouteRef,
  options?: {
    readonly kind?: QuestionRouteKind;
    readonly inquiryEpisode?: SemanticInquiryEpisode;
    readonly readMode?: SemanticReadMode;
    readonly boundaryRoute?: BoundaryRouteKind;
    readonly authoredOccurrenceTarget?: AuthoredOccurrenceTarget;
  }
): QuestionRoute {
  const readMode = options?.readMode ?? inferReadMode(options);
  const inquiryEpisode = options?.inquiryEpisode ??
    inferInquiryEpisode(readMode, options);
  const kind = options?.kind ?? getQuestionRouteKind(inquiryEpisode);

  return {
    kind,
    inquiryEpisode,
    readMode,
    focusRef: createQuestionFocusRef(
      claimRoute,
      options?.authoredOccurrenceTarget
    ),
    boundaryRoute: options?.boundaryRoute
  };
}

export function getQuestionRouteKind(
  inquiryEpisode: SemanticInquiryEpisode
): QuestionRouteKind {
  switch (inquiryEpisode) {
    case SemanticInquiryEpisode.OrientAndLocalize:
      return QuestionRouteKind.OrientAndLocalize;
    case SemanticInquiryEpisode.BoundedClosureExplanation:
      return QuestionRouteKind.BoundedClosureExplanation;
    case SemanticInquiryEpisode.GoverningAnchorJump:
      return QuestionRouteKind.GoverningAnchorJump;
    case SemanticInquiryEpisode.InventoryAndAuditSweep:
      return QuestionRouteKind.InventoryAndAuditSweep;
    case SemanticInquiryEpisode.TransformOrRemediateHandoff:
      return QuestionRouteKind.TransformOrRemediateHandoff;
  }
}

export function getQuestionRouteClaimRoute(
  questionRoute: QuestionRoute
): ClaimRouteRef {
  return questionRoute.focusRef.claimRoute;
}

export function getQuestionRouteAuthoredOccurrenceTarget(
  questionRoute: QuestionRoute
): AuthoredOccurrenceTarget | undefined {
  return questionRoute.focusRef.authoredOccurrenceTarget;
}

function inferReadMode(
  options:
    | {
        readonly boundaryRoute?: BoundaryRouteKind;
        readonly authoredOccurrenceTarget?: AuthoredOccurrenceTarget;
      }
    | undefined
): SemanticReadMode {
  if (options?.boundaryRoute !== undefined) {
    return SemanticReadMode.Complete;
  }

  return SemanticReadMode.Explain;
}

function inferInquiryEpisode(
  readMode: SemanticReadMode,
  options:
    | {
        readonly boundaryRoute?: BoundaryRouteKind;
        readonly authoredOccurrenceTarget?: AuthoredOccurrenceTarget;
      }
    | undefined
): SemanticInquiryEpisode {
  if (options?.boundaryRoute !== undefined) {
    return SemanticInquiryEpisode.TransformOrRemediateHandoff;
  }

  if (options?.authoredOccurrenceTarget !== undefined) {
    return SemanticInquiryEpisode.GoverningAnchorJump;
  }

  switch (readMode) {
    case SemanticReadMode.Observe:
      return SemanticInquiryEpisode.OrientAndLocalize;
    case SemanticReadMode.Explain:
      return SemanticInquiryEpisode.BoundedClosureExplanation;
    case SemanticReadMode.Locate:
      return SemanticInquiryEpisode.GoverningAnchorJump;
    case SemanticReadMode.Audit:
      return SemanticInquiryEpisode.InventoryAndAuditSweep;
    case SemanticReadMode.Complete:
      return SemanticInquiryEpisode.TransformOrRemediateHandoff;
  }
}
