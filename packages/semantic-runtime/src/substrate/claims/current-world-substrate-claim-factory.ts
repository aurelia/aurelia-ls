import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import {
  getQuestionRouteAuthoredOccurrenceTarget,
  type QuestionRoute
} from "../../query/framing/question-route.js";
import { createLineageRef, type LineageRef } from "../lineage/lineage-ref.js";
import {
  createCurrentWorldSummaryValueFromSnapshot as createSummaryValueFromSnapshot,
  type CurrentWorldSummaryValue,
  type PublishedSubstrateClaim,
  type SubstrateClaimRef
} from "./substrate-claim-ref.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import type { WorldSnapshotSummary } from "../../workspace/handoff/current-world-context.js";
import {
  createAuthoredOccurrenceBasisClaim,
  createCurrentWorldSummaryClaim
} from "../storage/substrate-storage.js";
import { AuthoredOccurrenceBasisPublisher } from "../../syntax/occurrences/authored-occurrence-basis-publisher.js";

export interface CurrentWorldSubstrateReadContext {
  readonly questionRoute: QuestionRoute;
  readonly snapshotSummary: WorldSnapshotSummary;
  readonly currentWorldPublication?: CurrentWorldPublication;
}

export class CurrentWorldSubstrateClaimFactory {
  readonly #authoredOccurrenceBasisPublisher: AuthoredOccurrenceBasisPublisher;

  public constructor(
    authoredOccurrenceBasisPublisher: AuthoredOccurrenceBasisPublisher = new AuthoredOccurrenceBasisPublisher()
  ) {
    this.#authoredOccurrenceBasisPublisher = authoredOccurrenceBasisPublisher;
  }

  public createPublishedClaim(
    claimRef: SubstrateClaimRef,
    readContext: CurrentWorldSubstrateReadContext
  ): PublishedSubstrateClaim | undefined {
    const publication = readContext.currentWorldPublication;
    if (publication === undefined) {
      return undefined;
    }

    const currentWorldSummary = createSummaryValueFromSnapshot(
      readContext.snapshotSummary
    );

    switch (claimRef.home) {
      case ClaimHomeKind.CurrentWorldSummary:
        return createCurrentWorldSummaryClaim(
          claimRef.home,
          claimRef.worldVersion,
          currentWorldSummary,
          publication
        );
      case ClaimHomeKind.AuthoredOccurrenceBasis:
        return this.createAuthoredOccurrenceBasisClaim(
          claimRef,
          publication,
          currentWorldSummary,
          readContext.questionRoute
        );
      default:
        return undefined;
    }
  }

  public createLineage(
    claimRef: SubstrateClaimRef,
    readContext: CurrentWorldSubstrateReadContext
  ): LineageRef | undefined {
    if (readContext.currentWorldPublication === undefined) {
      return undefined;
    }

    switch (claimRef.home) {
      case ClaimHomeKind.CurrentWorldSummary:
      case ClaimHomeKind.AuthoredOccurrenceBasis:
        return createLineageRef(
          claimRef.home,
          claimRef.worldVersion,
          claimRef.localIdentity
        );
      default:
        return undefined;
    }
  }

  private createAuthoredOccurrenceBasisClaim(
    claimRef: SubstrateClaimRef,
    publication: CurrentWorldPublication,
    currentWorldSummary: CurrentWorldSummaryValue,
    questionRoute: QuestionRoute
  ): PublishedSubstrateClaim | undefined {
    const authoredOccurrenceTarget = getQuestionRouteAuthoredOccurrenceTarget(
      questionRoute
    );
    if (authoredOccurrenceTarget === undefined) {
      return undefined;
    }

    const basisDecision = this.#authoredOccurrenceBasisPublisher.publish(
      questionRoute,
      publication
    );

    return createAuthoredOccurrenceBasisClaim(
      claimRef.home,
      claimRef.worldVersion,
      claimRef.localIdentity ??
        `${authoredOccurrenceTarget.templateSourceRef}:${authoredOccurrenceTarget.offset}`,
      currentWorldSummary,
      publication,
      basisDecision.truthStatus,
      basisDecision.outcome,
      basisDecision.qualifier,
      basisDecision.closureStatus,
      basisDecision.basis
    );
  }
}
