import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";

export interface WorldSnapshotSummary {
  readonly kind: WorldFrame["kind"];
  readonly version: number;
}

export interface WorldContextHandoff {
  readonly questionRoute: QuestionRoute;
  readonly worldFrame: WorldFrame;
  readonly snapshot: WorldSnapshotSummary;
}

export function createWorldContextHandoff(
  questionRoute: QuestionRoute,
  worldFrame: WorldFrame
): WorldContextHandoff {
  return Object.freeze({
    questionRoute,
    worldFrame,
    snapshot: Object.freeze({
      kind: worldFrame.kind,
      version: worldFrame.version
    })
  });
}
