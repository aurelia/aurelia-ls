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

/**
 * Field-level provenance for objects whose properties come from different evidence.
 *
 * Use this for authored/source-derived facts where individual fields may map to distinct spans, symbols, or
 * contributions. Framework-fixed concept products should usually rely on product/source provenance instead of
 * mechanically assigning the same provenance handle to every field.
 */
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

/**
 * Create field provenance only when the field has a more specific witness than the owning product.
 *
 * Field provenance is useful when a property comes from a different authored span or symbol. When it repeats the owner
 * provenance handle, it is usually representation noise; the product/source provenance already explains that field.
 */
export function fieldProvenanceWhenDistinct<TField extends string>(
  /** Field name on the owning semantic object. */
  field: TField,
  /** Field-specific provenance handle, if one was observed. */
  provenanceHandle: ProvenanceHandle | null | undefined,
  /** Provenance handle already carried by the owning product or source record. */
  ownerProvenanceHandle: ProvenanceHandle | null | undefined,
): FieldProvenance<TField> | null {
  return provenanceHandle == null || provenanceHandle === ownerProvenanceHandle
    ? null
    : new FieldProvenance(field, provenanceHandle);
}

/** Create same-provenance field entries while preserving optional field slots at the call site. */
export function fieldProvenanceEntries<TField extends string>(
  /** Field names materialized from the same provenance handle. */
  fields: readonly (TField | null | undefined)[],
  /** Provenance handle explaining each provided field value. */
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<TField>[] {
  return compactFieldProvenance(fields.map((field) =>
    field == null ? null : new FieldProvenance(field, provenanceHandle)
  ));
}
