import type { GovernedFamilyDefinition } from "./types.js";

export const GOVERNED_FAMILY_DEFINITIONS = [
  {
    familyId: "controller-semantics",
    closureStates: ["closed", "unassigned", "open"],
    slotNames: [
      "scopeEffect",
      "linkageKind",
      "cardinality",
      "contextualData",
      "viewManagement",
    ],
  },
  {
    familyId: "binding-command-semantics",
    closureStates: ["closed", "unassigned", "open"],
    slotNames: ["commandKind", "expressionRequired", "targetProperty"],
  },
  {
    familyId: "attribute-pattern-semantics",
    closureStates: ["closed", "unassigned", "open"],
    slotNames: ["interpret", "symbols"],
  },
] as const satisfies readonly GovernedFamilyDefinition[];
