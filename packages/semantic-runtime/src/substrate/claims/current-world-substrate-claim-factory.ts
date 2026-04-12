import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import {
  ClaimOutcomeKind,
  ClaimQualifierKind,
  ClaimTruthStatusKind
} from "../../model/claims/claim-model.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import {
  getQuestionRouteAuthoredOccurrenceTarget,
  type QuestionRoute
} from "../../query/framing/question-route.js";
import { createLineageRef, type LineageRef } from "../lineage/lineage-ref.js";
import {
  createCurrentWorldSummaryValueFromSnapshot as createSummaryValueFromSnapshot,
  AnchoredSupportAnchorKind,
  AnchoredSupportBasis,
  AnchoredSupportOpenReasonKind,
  AnchoredSupportSectionKind,
  createAnchoredSupportAnchorRef,
  type CurrentWorldSummaryValue,
  type PublishedSubstrateClaim,
  type SubstrateClaimRef
} from "./substrate-claim-ref.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import type { WorldSnapshotSummary } from "../../workspace/handoff/current-world-context.js";
import {
  createAuthoredOccurrenceBasisClaim,
  createAnchoredSupportClaim,
  createCurrentWorldSummaryClaim
} from "../storage/substrate-storage.js";
import { AuthoredOccurrenceBasisPublisher } from "../../syntax/occurrences/authored-occurrence-basis-publisher.js";
import { ResourceDefinitionKind } from "../../workspace/resources/resource-definition.js";
import { WorldParticipationFrontierKind } from "../../workspace/registration/consulted-world.js";

const CUSTOM_ELEMENT_OPEN_REASON_KINDS = [
  AnchoredSupportOpenReasonKind.SectionSupportOpen
] as const;

const CURRENT_WORLD_SENSITIVE_OPEN_REASON_KIND =
  AnchoredSupportOpenReasonKind.CurrentWorldSensitive;

const CUSTOM_ELEMENT_BLOCKED_SUPPORT_SECTIONS = [
  AnchoredSupportSectionKind.PolicyConfig,
  AnchoredSupportSectionKind.StructuredSupportBundle,
  AnchoredSupportSectionKind.OpaqueHooks
] as const;

class AnchoredSupportPublicationDecision {
  public constructor(
    public readonly truthStatus: ClaimTruthStatusKind | undefined,
    public readonly outcome: ClaimOutcomeKind,
    public readonly qualifier: ClaimQualifierKind,
    public readonly closureStatus: ClosureStatusKind,
    public readonly basis?: AnchoredSupportBasis
  ) {}
}

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
      case ClaimHomeKind.AnchoredSupport:
        return this.createAnchoredSupportClaim(
          claimRef,
          publication,
          currentWorldSummary,
          readContext.questionRoute
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
      case ClaimHomeKind.AnchoredSupport:
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

  private createAnchoredSupportClaim(
    claimRef: SubstrateClaimRef,
    publication: CurrentWorldPublication,
    currentWorldSummary: CurrentWorldSummaryValue,
    questionRoute: QuestionRoute
  ): PublishedSubstrateClaim {
    const decision = this.publishAnchoredSupport(
      claimRef,
      publication,
      questionRoute
    );

    return createAnchoredSupportClaim(
      claimRef.home,
      claimRef.worldVersion,
      claimRef.localIdentity,
      currentWorldSummary,
      publication,
      decision.truthStatus,
      decision.outcome,
      decision.qualifier,
      decision.closureStatus,
      decision.basis
    );
  }

  private publishAnchoredSupport(
    claimRef: SubstrateClaimRef,
    publication: CurrentWorldPublication,
    questionRoute: QuestionRoute
  ): AnchoredSupportPublicationDecision {
    const authoredOccurrenceTarget = getQuestionRouteAuthoredOccurrenceTarget(
      questionRoute
    );
    const matchedResource = authoredOccurrenceTarget === undefined
      ? undefined
      : publication.resources.find(
          (resource) =>
            resource.templateAssociation?.templateSourceRef ===
            authoredOccurrenceTarget.templateSourceRef
        );

    if (matchedResource === undefined) {
      return new AnchoredSupportPublicationDecision(
        ClaimTruthStatusKind.TerminalOpen,
        ClaimOutcomeKind.BlockedOpen,
        ClaimQualifierKind.WorldOpen,
        ClosureStatusKind.Open
      );
    }

    const openReasonCodes = [
      ...CUSTOM_ELEMENT_OPEN_REASON_KINDS,
      ...(
        publication.frontier === WorldParticipationFrontierKind.ClosedBaseline
          ? []
          : [CURRENT_WORLD_SENSITIVE_OPEN_REASON_KIND]
      )
    ];
    const blockedSupportSections = getBlockedSupportSections(
      matchedResource.kind
    );
    const anchorRef = claimRef.localIdentity ??
      createAnchoredSupportAnchorRef(
        publication.consultedWorld.worldRef,
        toAnchoredSupportAnchorKind(matchedResource.kind),
        matchedResource.resourceName
      );

    return new AnchoredSupportPublicationDecision(
      ClaimTruthStatusKind.OpenPlaceholder,
      ClaimOutcomeKind.DeferredOrPlaceholderOpen,
      publication.frontier === WorldParticipationFrontierKind.ClosedBaseline
        ? ClaimQualifierKind.None
        : ClaimQualifierKind.WorldOpen,
      ClosureStatusKind.Partial,
      new AnchoredSupportBasis(
        anchorRef,
        [matchedResource.resourceName],
        publication.declarationWitnessRef,
        openReasonCodes,
        blockedSupportSections
      )
    );
  }
}

function getBlockedSupportSections(
  kind: ResourceDefinitionKind
): readonly AnchoredSupportSectionKind[] {
  switch (kind) {
    case ResourceDefinitionKind.CustomElement:
      return CUSTOM_ELEMENT_BLOCKED_SUPPORT_SECTIONS;
  }

  throw new Error(`Unsupported resource definition kind: ${kind}`);
}

function toAnchoredSupportAnchorKind(
  kind: ResourceDefinitionKind
): AnchoredSupportAnchorKind {
  switch (kind) {
    case ResourceDefinitionKind.CustomElement:
      return AnchoredSupportAnchorKind.CustomElement;
  }

  throw new Error(`Unsupported resource definition kind: ${kind}`);
}
