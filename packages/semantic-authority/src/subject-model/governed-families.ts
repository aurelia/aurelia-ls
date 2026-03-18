import type { GovernedFamilyDefinition } from "./types.js";

export const GOVERNED_FAMILY_DEFINITIONS = [
  {
    familyId: "controller-semantics",
    closureStates: ["closed", "unassigned", "open"],
    slotNames: [
      "trigger",
      "scope",
      "cardinality",
      "placement",
      "branches",
      "linksTo",
      "injects",
      "tailProps",
    ],
  },
  {
    familyId: "binding-command-semantics",
    closureStates: ["closed", "unassigned", "open"],
    slotNames: ["commandKind", "mode", "capture", "forceAttribute"],
  },
  {
    familyId: "attribute-pattern-semantics",
    closureStates: ["closed", "unassigned", "open"],
    slotNames: ["interpret"],
  },
] as const satisfies readonly GovernedFamilyDefinition[];
