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
  /** String discriminator for embedded field-provenance entries. */
  readonly kind = 'field-provenance' as const;

  constructor(
    /** Field name on the owning semantic object. */
    readonly field: TField,
    /** Provenance handle explaining this specific field value. */
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** One normalized field-provenance entry plus any aggregate provenance record it requires. */
export interface FieldProvenanceAggregation<TField extends string> {
  readonly fieldProvenance: FieldProvenance<TField> | null;
  readonly records: readonly ProvenanceRecord[];
}

/** Require field provenance to remain a partial function from field name to one provenance handle. */
export function assertSingularFieldProvenance<TField extends string>(
  provenance: readonly FieldProvenance<TField>[],
): void {
  const seen = new Map<TField, ProvenanceHandle>();
  for (const entry of provenance) {
    const existing = seen.get(entry.field);
    if (existing != null) {
      throw new Error(
        `Field provenance for '${entry.field}' must contain exactly one entry; found both '${existing}' and '${entry.provenanceHandle}'.`,
      );
    }
    seen.set(entry.field, entry.provenanceHandle);
  }
}

/** Read provenance for one field without requiring every model to implement the lookup itself. */
export function readFieldProvenance<TField extends string>(
  /** Field provenance entries from the owning semantic object. */
  provenance: readonly FieldProvenance<TField>[],
  /** Field to look up. */
  field: TField,
): ProvenanceHandle | null {
  assertSingularFieldProvenance(provenance);
  return provenance.find((entry) => entry.field === field)?.provenanceHandle ?? null;
}

/** Drop absent field-provenance slots while preserving the exact field type. */
export function compactFieldProvenance<TField extends string>(
  /** Optional field provenance entries collected while materializing an object. */
  provenance: readonly (FieldProvenance<TField> | null | undefined)[],
): readonly FieldProvenance<TField>[] {
  const compact = provenance.filter((entry): entry is FieldProvenance<TField> => entry != null);
  assertSingularFieldProvenance(compact);
  return compact;
}

/**
 * Collapse zero, one, or many contributor provenance handles into one field-provenance entry.
 *
 * A single distinct contributor is reused directly. Multiple contributors publish one aggregate provenance record whose
 * direct evidence is deduplicated and sorted, so contributor traversal order cannot change the field witness.
 */
export function aggregateFieldProvenance<TField extends string>(
  field: TField,
  provenanceHandles: readonly ProvenanceHandle[],
  aggregateHandle: ProvenanceHandle,
  readProvenance: (handle: ProvenanceHandle) => ProvenanceRecord | null,
): FieldProvenanceAggregation<TField> {
  const contributors = [...new Set(provenanceHandles)].sort();
  if (contributors.length === 0) {
    return { fieldProvenance: null, records: [] };
  }
  if (contributors.length === 1) {
    return {
      fieldProvenance: new FieldProvenance(field, contributors[0]!),
      records: [],
    };
  }
  if (contributors.includes(aggregateHandle)) {
    throw new Error(
      `Aggregate field provenance '${aggregateHandle}' for '${field}' cannot also be one of its contributor handles.`,
    );
  }
  const evidenceHandles = [...new Set(contributors.flatMap((handle) => {
    const provenance = readProvenance(handle);
    if (provenance == null) {
      throw new Error(
        `Cannot aggregate field provenance for '${field}': contributor provenance '${handle}' is unavailable.`,
      );
    }
    return provenance.evidenceHandles;
  }))].sort();
  return {
    fieldProvenance: new FieldProvenance(field, aggregateHandle),
    records: [new ProvenanceRecord(aggregateHandle, evidenceHandles)],
  };
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
