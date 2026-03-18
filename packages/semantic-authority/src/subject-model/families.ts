import type { SubjectModelRegistry } from "./types.js";
import { GOVERNED_FAMILY_DEFINITIONS } from "./governed-families.js";
import { POSITION_FAMILY_DEFINITIONS } from "./position-families.js";
import { RESOURCE_KIND_DEFINITIONS } from "./resource-kinds.js";
import { WITNESS_FAMILY_DEFINITIONS } from "./witness-families.js";

export const SUBJECT_MODEL_REGISTRY = {
  resourceKinds: RESOURCE_KIND_DEFINITIONS,
  governedFamilies: GOVERNED_FAMILY_DEFINITIONS,
  positionFamilies: POSITION_FAMILY_DEFINITIONS,
  witnessFamilies: WITNESS_FAMILY_DEFINITIONS,
  extensionFamilies: [],
} as const satisfies SubjectModelRegistry;
