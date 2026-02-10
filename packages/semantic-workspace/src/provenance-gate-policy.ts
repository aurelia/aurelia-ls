export interface RenameMappedProvenanceDecision {
  readonly hasMappedProvenance: boolean;
  readonly evidenceLevel: "position" | "artifact";
  readonly reason:
    | "position-mapped"
    | "position-unmapped"
    | "mapping-missing";
}

export interface RenameMappedProvenanceInput {
  readonly mappingPresent: boolean;
  readonly positionMapped: boolean;
}

/**
 * Rename gating uses strict position evidence:
 * having a mapping artifact alone is not enough unless the active position
 * can actually be projected through provenance.
 */
export function decideRenameMappedProvenance(
  input: RenameMappedProvenanceInput,
): RenameMappedProvenanceDecision {
  if (input.positionMapped) {
    return {
      hasMappedProvenance: true,
      evidenceLevel: "position",
      reason: "position-mapped",
    };
  }
  if (input.mappingPresent) {
    return {
      hasMappedProvenance: false,
      evidenceLevel: "position",
      reason: "position-unmapped",
    };
  }
  return {
    hasMappedProvenance: false,
    evidenceLevel: "artifact",
    reason: "mapping-missing",
  };
}
