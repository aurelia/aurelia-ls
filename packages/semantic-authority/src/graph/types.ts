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
import type {
  ObservationSourceSurface,
  ObservationWitnessSource,
} from "../shared/enums.js";
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

export interface ObservationNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "observation";
  readonly key: Extract<NodeKey, { readonly keyKind: "observation" }>;
  readonly documentUri: string;
  readonly position: Extract<NodeKey, { readonly keyKind: "observation" }>["position"];
  readonly sourceSurface: ObservationSourceSurface;
  rawDatum: unknown;
  readonly witnessSource: ObservationWitnessSource;
  readonly valueLevelProvenance: unknown | null;
}

export interface WitnessNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "witness";
  readonly key:
    | Extract<NodeKey, { readonly keyKind: "declaration-witness" }>
    | Extract<NodeKey, { readonly keyKind: "support-bundle" }>;
  readonly witnessKind: "declaration-surface" | "support-bundle";
  readonly subjectKey: Extract<NodeKey, { readonly keyKind: "declaration-witness" }>["subjectKey"];
  readonly declarationFormSet: readonly string[] | null;
  readonly targetFamilyId: FamilyTag | null;
  witnessState: WitnessState;
  readonly valueLevelProvenance: unknown | null;
  readonly decisionLevelProvenance: unknown | null;
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
