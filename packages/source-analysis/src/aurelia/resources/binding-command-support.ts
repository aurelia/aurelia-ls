import { EvidenceSource, EvidenceWitness, ProvenanceSet } from '../provenance/evidence.js';
import type { KeyRef, SourceNodeRef } from '../refs.js';

export const BINDING_COMMAND_SUPPORT_FIELD_KINDS = [
  'name',
  'aliases',
  'ignore-attr',
  'build-method',
  'instruction-emission',
  'value-handling',
] as const;

export type BindingCommandSupportFieldKind =
  typeof BINDING_COMMAND_SUPPORT_FIELD_KINDS[number];

export const BINDING_COMMAND_SUPPORT_CARRIER_KINDS = [
  'annotation-decorator',
  'definition-object',
  'static-au-property',
  'ignore-attr-getter',
  'build-method',
  'return-expression',
  'default',
  'open',
] as const;

export type BindingCommandSupportCarrierKind =
  typeof BINDING_COMMAND_SUPPORT_CARRIER_KINDS[number];

export const BINDING_COMMAND_EMISSION_SHAPE_KINDS = [
  'object-literal-return',
  'constructor-call-return',
  'open',
] as const;

export type BindingCommandEmissionShapeKind =
  typeof BINDING_COMMAND_EMISSION_SHAPE_KINDS[number];

export const BINDING_COMMAND_VALUE_HANDLING_KINDS = [
  'compile-parse',
  'raw-value-carry',
  'custom-expression-wrap',
  'not-applicable',
  'open',
] as const;

export type BindingCommandValueHandlingKind =
  typeof BINDING_COMMAND_VALUE_HANDLING_KINDS[number];

export type BindingCommandFieldProvenanceMode =
  'selected' | 'merged' | 'presence-only';

export class BindingCommandFieldWitness {
  readonly evidence: EvidenceWitness<BindingCommandSupportFieldKind, BindingCommandSupportCarrierKind>;

  constructor(
    readonly field: BindingCommandSupportFieldKind,
    readonly carrier: BindingCommandSupportCarrierKind,
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

export class BindingCommandFieldProvenance {
  readonly provenanceSet: ProvenanceSet<
    BindingCommandSupportFieldKind,
    BindingCommandFieldProvenanceMode,
    BindingCommandFieldWitness
  >;

  constructor(
    readonly field: BindingCommandSupportFieldKind,
    readonly mode: BindingCommandFieldProvenanceMode,
    readonly selected: BindingCommandFieldWitness | null,
    readonly contributors: readonly BindingCommandFieldWitness[] = [],
    readonly note: string | null = null,
  ) {
    this.provenanceSet = new ProvenanceSet(field, mode, selected, contributors, note);
  }
}

export class BindingCommandIdentity {
  constructor(
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly key: KeyRef | null = null,
    readonly provenance: readonly BindingCommandFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: BindingCommandSupportFieldKind,
  ): BindingCommandFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

// This is the dynamic side of binding-command truth: what build(...) emits.
// It deliberately keeps the emitted instruction identity as source-grounded
// text instead of forcing everything into one closed builtin-family enum.
export class BindingCommandInstructionEmission {
  constructor(
    readonly shape: BindingCommandEmissionShapeKind = 'open',
    readonly instructionIdentitySeed: string | null = null,
    readonly source: SourceNodeRef | null = null,
    readonly note: string | null = null,
  ) {}
}

// This is the dynamic side of value handling. It records whether the command
// parses during build, carries raw text through, or wraps the value into a
// custom compile-time carrier. Later runtime/deferred parsing should be a join
// above this layer, not guessed here from command code alone.
export class BindingCommandValueHandling {
  constructor(
    readonly kind: BindingCommandValueHandlingKind = 'open',
    readonly parserEntrySeed: string | null = null,
    readonly valueSeed: string | null = null,
    readonly wrapperSeed: string | null = null,
    readonly source: SourceNodeRef | null = null,
    readonly note: string | null = null,
  ) {}
}

// Binding commands are lowering operators. In the clean room, the honest first
// carrier is the build basis, not a collapsed builtin family label. Any
// builtin-style summary should be derived from this later, not the other way
// around.
export class BindingCommandBuildBasis {
  constructor(
    readonly ignoreAttr: boolean | null = null,
    readonly buildMethodSource: SourceNodeRef | null = null,
    readonly emission: BindingCommandInstructionEmission = new BindingCommandInstructionEmission(),
    readonly valueHandling: BindingCommandValueHandling = new BindingCommandValueHandling(),
    readonly provenance: readonly BindingCommandFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: BindingCommandSupportFieldKind,
  ): BindingCommandFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}
