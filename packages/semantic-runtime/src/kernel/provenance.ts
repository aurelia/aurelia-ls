import type { EvidenceHandle, ProvenanceHandle } from './handles.js';

/** Explanation record for a claim, field, product, or open seam. */
export class ProvenanceRecord {
  /** String discriminator for serialized provenance records. */
  readonly kind = 'provenance-record' as const;

  constructor(
    /** Store-local handle for this provenance record. */
    readonly handle: ProvenanceHandle,
    /** Direct witness handles supporting this provenance. */
    readonly evidenceHandles: readonly EvidenceHandle[] = [],
  ) {}
}

/** Field-level provenance for objects whose properties come from different evidence. */
export class FieldProvenance<TField extends string = string> {
  /** String discriminator for serialized field-provenance records. */
  readonly kind = 'field-provenance' as const;

  constructor(
    /** Field name on the owning semantic object. */
    readonly field: TField,
    /** Provenance handle explaining this specific field value. */
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Drop absent field-provenance slots while preserving the exact field type. */
export function compactFieldProvenance<TField extends string>(
  /** Optional field provenance entries collected while materializing an object. */
  provenance: readonly (FieldProvenance<TField> | null | undefined)[],
): readonly FieldProvenance<TField>[] {
  return provenance.filter((entry): entry is FieldProvenance<TField> => entry != null);
}
