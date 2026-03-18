import type {
  ClosabilityStatus,
  CompletenessFamily,
} from "../shared/enums.js";
import type {
  BoundaryKey,
  ConsultedWorld,
} from "../shared/keys.js";
import type { NodeKindTag } from "../shared/node-kinds.js";
import type {
  ClaimState,
  DegradationTarget,
  FamilyTag,
  RetentionTier,
  RevisionToken,
  ValidityState,
  WitnessState,
} from "../shared/types.js";
import type { CompletenessKey, NodeKey } from "./keys.js";
export { NODE_KIND_TAGS } from "../shared/node-kinds.js";
export type { NodeKindTag } from "../shared/node-kinds.js";

export interface ClaimNodeBase {
  readonly key: NodeKey;
  readonly nodeKind: NodeKindTag;
  readonly familyTag: FamilyTag;
  claimState: ClaimState;
  validityState: ValidityState;
  revisionToken: RevisionToken;
  retentionTier: RetentionTier;
}

export interface GraphNodeIdentity {
  readonly key: NodeKey;
  readonly nodeKind: NodeKindTag;
}

export interface ConsultedWorldScope {
  readonly consultedWorld: ConsultedWorld;
}

export interface DegradableNode {
  readonly degradationTarget: DegradationTarget | null;
}

export interface CompletenessWitnessNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "completeness-witness";
  readonly key: CompletenessKey;
  readonly completenessFamily: CompletenessFamily;
  readonly boundaryKey: BoundaryKey;
  witnessState: WitnessState;
  closability: ClosabilityStatus;
  readonly valueLevelProvenance: unknown | null;
  readonly decisionLevelProvenance: unknown | null;
}
