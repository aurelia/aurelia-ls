import type { QuestionRoute } from "../../query/framing/question-route.js";
import type {
  CurrentWorldContext,
  RescanBasis,
  WorldFrameHandle,
  WorldSnapshotSummary
} from "../../workspace/handoff/current-world-context.js";

export type {
  RescanBasis,
  WorldFrameHandle,
  WorldSnapshotSummary
} from "../../workspace/handoff/current-world-context.js";

export interface RuntimeWorldContextHandoff {
  readonly questionRoute: QuestionRoute;
  readonly worldFrameHandle: WorldFrameHandle;
  readonly snapshotSummary: WorldSnapshotSummary;
  readonly rescanBasis: RescanBasis;
}

export function createRuntimeWorldContextHandoff(
  questionRoute: QuestionRoute,
  currentWorldContext: CurrentWorldContext
): RuntimeWorldContextHandoff {
  return {
    questionRoute,
    worldFrameHandle: currentWorldContext.worldFrameHandle,
    snapshotSummary: currentWorldContext.snapshotSummary,
    rescanBasis: currentWorldContext.rescanBasis
  };
}
