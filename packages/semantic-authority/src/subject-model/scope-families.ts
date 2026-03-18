import type { ScopeFamilyDefinition } from "./types.js";

export const SCOPE_FAMILY_DEFINITIONS = [
  {
    scopeId: "resource-scope",
    claimFamilyId: "claim.reachability.resource-scope",
    completenessFamily: "resource-scope",
    lookupLaw: "Two-level lookup: current registration world, then root registration world.",
    subjectKey: "ResourceKey(kind, stableIdentity)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "resource-admission-completeness",
    ],
  },
  {
    scopeId: "template-scope",
    claimFamilyId: "claim.reachability.template-scope",
    completenessFamily: "template-scope",
    lookupLaw: "Scope-frame walk to the active template boundary.",
    subjectKey: "occurrenceAnchor + identifierOrReferentKey",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "template-scope-completeness",
    ],
  },
] as const satisfies readonly ScopeFamilyDefinition[];
