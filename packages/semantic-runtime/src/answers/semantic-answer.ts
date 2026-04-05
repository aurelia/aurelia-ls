import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import type { ClosureStatusKind } from "../model/semantic-runtime-handles.js";
import type { QuestionRoute } from "../query/framing/question-route.js";
import type { WorldFrame } from "../query/framing/world-frame.js";

export interface SemanticAnswer {
  readonly questionRoute: QuestionRoute;
  readonly worldFrame: WorldFrame;
  readonly boundaryOutcome: BoundaryOutcome;
  readonly closureStatus: ClosureStatusKind;
  readonly mayReuse: boolean;
}
