import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import type { ClosureStatusKind } from "../model/semantic-runtime-handles.js";
import type {
  ClaimBoundary,
  ClaimOutcomeKind,
  ClaimTruthStatus,
  ClaimQualifier
} from "../model/claims/claim-model.js";
import type { AnswerCommitment } from "../model/semantic-api/semantic-api-model.js";
import type { SemanticRuntimeSurfaceKind } from "../model/semantic-runtime-handles.js";
import type { QuestionRoute } from "../query/framing/question-route.js";
import type { WorldFrame } from "../query/framing/world-frame.js";
import type { RuntimeInvalidationPlan } from "../runtime/invalidation/invalidation-coordinator.js";
import type {
  CurrentWorldPublication,
  WorldFrameHandle
} from "../runtime/handoff/world-context-handoff.js";
import type {
  SemanticClaimPayload,
  SubstrateClaimRef
} from "../substrate/claims/substrate-claim-ref.js";
import type { LineageRef } from "../substrate/lineage/lineage-ref.js";
import { isSyntheticWorldOwnerOrConstructorBasis } from "../workspace/handoff/current-world-context.js";

const EMPTY_GOVERNING_ANCHOR_REFS: readonly string[] = [];

export const enum SemanticClosureReferenceKind {
  Recorded = 1,
  Unavailable = 2
}

export const enum SemanticClosureFrontierKind {
  Unknown = 0,
  ClosedBaseline = 1,
  CurrentWorldSensitive = 2,
  WorldQualified = 3,
  TerminalOpen = 4,
  OpenPlaceholder = 5
}

export const enum SemanticClosureRetreatKind {
  None = 0,
  BlockedDependencyBoundary = 1,
  PlaceholderCarryForward = 2,
  WithdrawnSupportRetreat = 3
}

export const enum SemanticDependencyKind {
  BasisPublicationIngress = 1,
  QualificationPublicationIngress = 2,
  LineagePublicationIngress = 3,
  KernelReadoutIngress = 4,
  AffectedSurfaceReference = 5
}

export const enum SemanticGoverningAnchorKind {
  GoverningOrigin = 1
}

export interface SemanticProvenance {
  readonly surface: SemanticRuntimeSurfaceKind;
  readonly claimRef: SubstrateClaimRef;
  readonly worldFrameHandle: WorldFrameHandle;
  readonly lineageRef?: LineageRef;
}

export class SemanticClosureReference {
  public constructor(
    public readonly kind: SemanticClosureReferenceKind,
    public readonly ref?: string
  ) {}
}

export class SemanticClosureBasis {
  public constructor(
    public readonly witness: SemanticClosureReference,
    public readonly completeness: SemanticClosureReference,
    public readonly frontier: SemanticClosureFrontierKind,
    public readonly retreat: SemanticClosureRetreatKind,
    public readonly dependencyKind: SemanticDependencyKind
  ) {}
}

export class SemanticGoverningAnchorRef {
  public constructor(
    public readonly kind: SemanticGoverningAnchorKind,
    public readonly ref: string
  ) {}
}

export interface SemanticDeltaBasis {
  readonly worldVersion: number;
  readonly mayReuse: boolean;
  readonly triggerMask: RuntimeInvalidationPlan["triggerMask"];
}

export interface SemanticAnswer {
  readonly questionRoute: QuestionRoute;
  readonly worldFrame: WorldFrame;
  readonly answerCommitment: AnswerCommitment;
  readonly truthStatus?: ClaimTruthStatus;
  readonly outcome: ClaimOutcomeKind;
  readonly qualificationRefs: readonly ClaimQualifier[];
  readonly boundaryRefs: readonly ClaimBoundary[];
  readonly closureBasis: SemanticClosureBasis;
  readonly governingAnchorRefs: readonly SemanticGoverningAnchorRef[];
  readonly closureStatus: ClosureStatusKind;
  readonly provenance: SemanticProvenance;
  readonly deltaBasis: SemanticDeltaBasis;
  readonly boundaryOutcome?: BoundaryOutcome;
  readonly payload?: SemanticClaimPayload;
}

const UNAVAILABLE_CLOSURE_REFERENCE = new SemanticClosureReference(
  SemanticClosureReferenceKind.Unavailable
);

export function createRecordedSemanticClosureReference(
  ref: string
): SemanticClosureReference {
  return new SemanticClosureReference(
    SemanticClosureReferenceKind.Recorded,
    ref
  );
}

export function createUnavailableSemanticClosureReference(): SemanticClosureReference {
  return UNAVAILABLE_CLOSURE_REFERENCE;
}

export function collectSemanticGoverningAnchorRefStrings(
  currentWorldPublication: CurrentWorldPublication | undefined,
  worldFrameHandle: WorldFrameHandle
): readonly string[] {
  const governingOrigin = currentWorldPublication?.consultedWorld.worldOwnerOrConstructorBasis ??
    (
      isSyntheticWorldOwnerOrConstructorBasis(worldFrameHandle.worldOwnerOrConstructorBasis)
        ? undefined
        : worldFrameHandle.worldOwnerOrConstructorBasis
    );

  return governingOrigin === undefined
    ? EMPTY_GOVERNING_ANCHOR_REFS
    : [governingOrigin];
}
