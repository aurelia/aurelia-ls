import type {
  RescanBasis,
  RuntimeWorldContextHandoff,
  WorldFrameHandle
} from "../handoff/world-context-handoff.js";
import {
  createCurrentWorldSummaryValueFromSnapshot,
  type CurrentWorldSummaryValue
} from "../../substrate/claims/substrate-claim-ref.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import type { WorldParticipationFrontierKind } from "../../workspace/registration/consulted-world.js";

export class CurrentWorldTracePublication {
  public constructor(
    public readonly frontier: WorldParticipationFrontierKind,
    public readonly consultedPackageRef: string,
    public readonly declarationWitnessRef: string,
    public readonly closureRef: string
  ) {}

  public static fromPublication(
    publication: CurrentWorldPublication | undefined
  ): CurrentWorldTracePublication | undefined {
    if (publication === undefined) {
      return undefined;
    }

    return new CurrentWorldTracePublication(
      publication.frontier,
      publication.consultedPackage.packageName ?? publication.consultedPackage.rootPath,
      publication.declarationWitnessRef,
      publication.closureRef
    );
  }
}

export class CurrentWorldTraceDetails {
  public constructor(
    public readonly summary: CurrentWorldSummaryValue,
    public readonly publication?: CurrentWorldTracePublication,
    public readonly worldFrameHandle?: WorldFrameHandle,
    public readonly rescanBasis?: RescanBasis
  ) {}

  public static fromWorldContext(
    worldContext: RuntimeWorldContextHandoff
  ): CurrentWorldTraceDetails {
    return new CurrentWorldTraceDetails(
      createCurrentWorldSummaryValueFromSnapshot(worldContext.snapshotSummary),
      CurrentWorldTracePublication.fromPublication(worldContext.currentWorldPublication),
      worldContext.worldFrameHandle,
      worldContext.rescanBasis
    );
  }

  public static fromSummary(
    summary: CurrentWorldSummaryValue | undefined,
    publication?: CurrentWorldPublication,
    worldFrameHandle?: WorldFrameHandle,
    rescanBasis?: RescanBasis
  ): CurrentWorldTraceDetails | undefined {
    if (summary === undefined) {
      return undefined;
    }

    return new CurrentWorldTraceDetails(
      summary,
      CurrentWorldTracePublication.fromPublication(publication),
      worldFrameHandle,
      rescanBasis
    );
  }
}
