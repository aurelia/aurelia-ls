import type {
  ClosabilityStatus,
  PositionFamily,
  PositionGatingTier,
  ResourceKind,
  WitnessFamily,
} from "../shared/enums.js";
import type { ExtensionIdentifier, GovernedClosureState, KnownGovernedFamilyId } from "../shared/families.js";

export interface ResourceKindDefinition {
  readonly kind: ResourceKind;
  readonly description: string;
  readonly localToOwner?: boolean;
}

export interface GovernedFamilyDefinition {
  readonly familyId: KnownGovernedFamilyId;
  readonly closureStates: readonly GovernedClosureState[];
  readonly slotNames: readonly string[];
}

export interface PositionFamilyDefinition {
  readonly family: PositionFamily;
  readonly gatingTier: PositionGatingTier;
  readonly description: string;
}

export interface WitnessFamilyDefinition {
  readonly family: WitnessFamily;
  readonly closability: ClosabilityStatus;
  readonly description: string;
}

export interface SubjectModelRegistry {
  readonly resourceKinds: readonly ResourceKindDefinition[];
  readonly governedFamilies: readonly GovernedFamilyDefinition[];
  readonly positionFamilies: readonly PositionFamilyDefinition[];
  readonly witnessFamilies: readonly WitnessFamilyDefinition[];
  readonly extensionFamilies: readonly ExtensionIdentifier[];
}
