import { EvidenceSource, EvidenceWitness, ProvenanceSet } from '../provenance/evidence.js';
import type { KeyRef, SourceNodeRef } from '../refs.js';

export const VALUE_CONVERTER_SUPPORT_FIELD_KINDS = [
  'name',
  'aliases',
  'signals',
  'with-context',
  'to-view',
  'from-view',
] as const;

export type ValueConverterSupportFieldKind =
  typeof VALUE_CONVERTER_SUPPORT_FIELD_KINDS[number];

export const VALUE_CONVERTER_SUPPORT_CARRIER_KINDS = [
  'annotation-decorator',
  'definition-object',
  'static-au-property',
  'static-own-property',
  'instance-property',
  'instance-method',
  'default',
  'open',
] as const;

export type ValueConverterSupportCarrierKind =
  typeof VALUE_CONVERTER_SUPPORT_CARRIER_KINDS[number];

export type ValueConverterFieldProvenanceMode =
  'selected' | 'merged' | 'presence-only';

export class ValueConverterFieldWitness {
  readonly evidence: EvidenceWitness<ValueConverterSupportFieldKind, ValueConverterSupportCarrierKind>;

  constructor(
    readonly field: ValueConverterSupportFieldKind,
    readonly carrier: ValueConverterSupportCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {
    this.evidence = new EvidenceWitness(
      field,
      carrier,
      source == null ? EvidenceSource.open(note) : EvidenceSource.sourceNode(source, note),
      note,
    );
  }
}

export class ValueConverterFieldProvenance {
  readonly provenanceSet: ProvenanceSet<
    ValueConverterSupportFieldKind,
    ValueConverterFieldProvenanceMode,
    ValueConverterFieldWitness
  >;

  constructor(
    readonly field: ValueConverterSupportFieldKind,
    readonly mode: ValueConverterFieldProvenanceMode,
    readonly selected: ValueConverterFieldWitness | null,
    readonly contributors: readonly ValueConverterFieldWitness[] = [],
    readonly note: string | null = null,
  ) {
    this.provenanceSet = new ProvenanceSet(field, mode, selected, contributors, note);
  }
}

export class ValueConverterIdentity {
  constructor(
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly key: KeyRef | null = null,
    readonly provenance: readonly ValueConverterFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: ValueConverterSupportFieldKind,
  ): ValueConverterFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

// NOTE: runtime ValueConverterDefinition does not carry signals/withContext or
// method witnesses as explicit definition fields. The clean-room keeps this
// extra layer because edits to those member surfaces change binding/runtime
// behavior and therefore need provenance-bearing invalidation/query hooks.
// NOTE: this is intentionally declaration-local. Absence of a member witness
// here is not yet proof of runtime absence across inheritance or later dynamic
// mutation; it only means the current carrier did not close one.
export class ValueConverterBehavior {
  constructor(
    readonly signals: readonly string[] = [],
    readonly withContext: boolean | null = null,
    readonly toViewSource: SourceNodeRef | null = null,
    readonly fromViewSource: SourceNodeRef | null = null,
    readonly provenance: readonly ValueConverterFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  get declaresToView(): boolean {
    return this.toViewSource != null;
  }

  get declaresFromView(): boolean {
    return this.fromViewSource != null;
  }

  readProvenance(
    field: ValueConverterSupportFieldKind,
  ): ValueConverterFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}
