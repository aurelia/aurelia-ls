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
import type { CompletenessKey, GraphEntityKey, NodeKey } from "./keys.js";
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

export type RealizedWorldState = "realized-positive" | "realized-negative" | "open";
export type SupportStatus = "supported" | "partial" | "unsupported";

export interface ResourceIdentityNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "resource-identity";
  readonly key: Extract<NodeKey, { readonly keyKind: "resource" }>;
  readonly resourceKind: Extract<NodeKey, { readonly keyKind: "resource" }>["resourceKind"];
  readonly canonicalName: string;
  readonly ownerResourceKey: Extract<NodeKey, { readonly keyKind: "resource" }>["ownerKey"];
  factKind: "identity" | "controllerhood";
  realizedState: RealizedWorldState;
  supportStatus: SupportStatus;
  readonly valueLevelProvenance: unknown | null;
  readonly decisionLevelProvenance: unknown | null;
}

export interface FieldFactNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "field-fact";
  readonly key: Extract<NodeKey, { readonly keyKind: "field-fact" }>;
  readonly resourceKind: Extract<NodeKey, { readonly keyKind: "field-fact" }>["resourceKey"]["resourceKind"];
  readonly canonicalName: Extract<NodeKey, { readonly keyKind: "field-fact" }>["resourceKey"]["canonicalName"];
  readonly ownerResourceKey: Extract<NodeKey, { readonly keyKind: "field-fact" }>["resourceKey"]["ownerKey"];
  readonly fieldPath: string;
  readonly factKind: "resource-field";
  realizedState: RealizedWorldState;
  supportStatus: SupportStatus;
  fieldValue: unknown | null;
  readonly identityCarried: boolean;
  readonly completenessSensitive: boolean;
  readonly valueLevelProvenance: unknown | null;
  readonly decisionLevelProvenance: unknown | null;
}

export interface BindableIdentityNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "bindable-identity";
  readonly key: Extract<NodeKey, { readonly keyKind: "bindable" }>;
  readonly ownerResourceKey: Extract<NodeKey, { readonly keyKind: "bindable" }>["ownerResourceKey"];
  readonly propertyName: string;
  readonly factKind: "bindable-interface";
  realizedState: RealizedWorldState;
  supportStatus: SupportStatus;
  readonly valueLevelProvenance: unknown | null;
  readonly decisionLevelProvenance: unknown | null;
}

export interface BindableTraitNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "bindable-trait";
  readonly key: Extract<NodeKey, { readonly keyKind: "bindable-trait" }>;
  readonly ownerResourceKey: Extract<NodeKey, { readonly keyKind: "bindable-trait" }>["bindableKey"]["ownerResourceKey"];
  readonly propertyName: string;
  readonly traitKind: Extract<NodeKey, { readonly keyKind: "bindable-trait" }>["traitKind"];
  readonly factKind: "bindable-trait";
  realizedState: RealizedWorldState;
  supportStatus: SupportStatus;
  traitValue: unknown | null;
  readonly valueLevelProvenance: unknown | null;
  readonly decisionLevelProvenance: unknown | null;
}

export interface GovernedSemanticNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "governed-semantic";
  readonly key: Extract<NodeKey, { readonly keyKind: "governed-semantic" }>;
  readonly resourceKey: Extract<NodeKey, { readonly keyKind: "governed-semantic" }>["resourceKey"];
  readonly governedFamily: Extract<NodeKey, { readonly keyKind: "governed-semantic" }>["governedFamily"];
  readonly factKind: Extract<NodeKey, { readonly keyKind: "governed-semantic" }>["governedFamily"];
  closureState: "closed" | "unassigned" | "open";
  governedSlots: Record<string, unknown> | null;
  readonly valueLevelProvenance: unknown | null;
  readonly decisionLevelProvenance: unknown | null;
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

export interface ReferenceEntryNode extends ClaimNodeBase, DegradableNode {
  readonly nodeKind: "reference-entry";
  readonly key: Extract<NodeKey, { readonly keyKind: "reference-entry" }>;
  readonly subjectEntityKey: Extract<NodeKey, { readonly keyKind: "reference-entry" }>["subjectEntityKey"];
  readonly referenceKind: Extract<NodeKey, { readonly keyKind: "reference-entry" }>["referenceKind"];
  readonly site: Extract<NodeKey, { readonly keyKind: "reference-entry" }>["site"];
  referent: GraphEntityKey | null;
  role: "declaration" | "usage";
  readonly valueLevelProvenance: unknown | null;
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
