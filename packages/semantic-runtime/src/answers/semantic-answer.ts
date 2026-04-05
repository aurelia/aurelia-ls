import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import type { ClosureStatusKind } from "../model/semantic-runtime-handles.js";
import type { ClaimOutcomeKind, ClaimQualifierKind } from "../model/claims/claim-model.js";
import type { AnswerCommitment } from "../model/semantic-api/semantic-api-model.js";
import type { SemanticRuntimeSurfaceKind } from "../model/semantic-runtime-handles.js";
import type { QuestionRoute } from "../query/framing/question-route.js";
import type { WorldFrame } from "../query/framing/world-frame.js";
import type { RuntimeInvalidationPlan } from "../runtime/invalidation/invalidation-coordinator.js";
import type { WorldFrameHandle } from "../runtime/handoff/world-context-handoff.js";
import type { CurrentWorldSummaryValue, SubstrateClaimRef } from "../substrate/claims/substrate-claim-ref.js";
import type { LineageRef } from "../substrate/lineage/lineage-ref.js";
import type { CurrentWorldPublication } from "../workspace/snapshots/current-world-publication.js";

export interface SemanticProvenance {
  readonly surface: SemanticRuntimeSurfaceKind;
  readonly claimRef: SubstrateClaimRef;
  readonly worldFrameHandle: WorldFrameHandle;
  readonly lineageRef?: LineageRef;
}

export interface SemanticDelta {
  readonly worldVersion: number;
  readonly mayReuse: boolean;
  readonly triggerMask: RuntimeInvalidationPlan["triggerMask"];
}

export interface SemanticAnswer {
  readonly questionRoute: QuestionRoute;
  readonly worldFrame: WorldFrame;
  readonly answerCommitment: AnswerCommitment;
  readonly outcome: ClaimOutcomeKind;
  readonly qualification: ClaimQualifierKind;
  readonly closureStatus: ClosureStatusKind;
  readonly provenance: SemanticProvenance;
  readonly deltaBasis: SemanticDelta;
  readonly boundaryOutcome?: BoundaryOutcome;
  readonly currentWorldSummary?: CurrentWorldSummaryValue;
  readonly currentWorldPublication?: CurrentWorldPublication;
}
