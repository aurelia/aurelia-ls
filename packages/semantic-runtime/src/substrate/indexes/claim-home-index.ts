import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import {
  getQuestionRouteAuthoredOccurrenceTarget,
  getQuestionRouteClaimRoute,
  type QuestionRoute
} from "../../query/framing/question-route.js";
import type { WorldFrameHandle } from "../../workspace/handoff/current-world-context.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import { ResourceDefinitionKind } from "../../workspace/resources/resource-definition.js";
import {
  AnchoredSupportAnchorKind,
  createAnchoredSupportAnchorRef,
  createSubstrateClaimRef,
  type SubstrateClaimRef
} from "../claims/substrate-claim-ref.js";

export interface SubstrateLookupTarget {
  readonly claimRoute: ClaimRouteRef;
  readonly localIdentity?: string;
}

export function createSubstrateLookupTarget(
  questionRoute: QuestionRoute,
  currentWorldPublication?: CurrentWorldPublication
): SubstrateLookupTarget {
  const claimRoute = getQuestionRouteClaimRoute(questionRoute);
  const authoredOccurrenceTarget = getQuestionRouteAuthoredOccurrenceTarget(
    questionRoute
  );

  return {
    claimRoute,
    localIdentity: resolveLocalIdentity(
      claimRoute.home,
      authoredOccurrenceTarget,
      currentWorldPublication
    )
  };
}

export class ClaimHomeIndex {
  public resolveClaimRef(
    target: SubstrateLookupTarget,
    worldFrameHandle: WorldFrameHandle
  ): SubstrateClaimRef {
    return createSubstrateClaimRef(
      target.claimRoute.home,
      worldFrameHandle.version,
      target.localIdentity
    );
  }
}

function resolveLocalIdentity(
  home: ClaimHomeKind,
  authoredOccurrenceTarget: ReturnType<typeof getQuestionRouteAuthoredOccurrenceTarget>,
  currentWorldPublication: CurrentWorldPublication | undefined
): string | undefined {
  if (authoredOccurrenceTarget === undefined) {
    return undefined;
  }

  switch (home) {
    case ClaimHomeKind.AuthoredOccurrenceBasis:
      return `${authoredOccurrenceTarget.templateSourceRef}:${authoredOccurrenceTarget.offset}`;
    case ClaimHomeKind.AnchoredSupport:
      return createAnchoredSupportLocalIdentity(
        currentWorldPublication,
        authoredOccurrenceTarget.templateSourceRef
      );
    default:
      return undefined;
  }
}

function createAnchoredSupportLocalIdentity(
  currentWorldPublication: CurrentWorldPublication | undefined,
  templateSourceRef: string
): string | undefined {
  if (currentWorldPublication === undefined) {
    return undefined;
  }

  const matchedResource = currentWorldPublication.resources.find(
    (resource) => resource.templateAssociation?.templateSourceRef === templateSourceRef
  );
  if (matchedResource === undefined) {
    return undefined;
  }

  return createAnchoredSupportAnchorRef(
    currentWorldPublication.consultedWorld.worldRef,
    toAnchoredSupportAnchorKind(matchedResource.kind),
    matchedResource.resourceName
  );
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
