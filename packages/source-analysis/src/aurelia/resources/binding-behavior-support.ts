import type { KeyRef, SourceNodeRef } from '../refs.js';

export const BINDING_BEHAVIOR_SUPPORT_FIELD_KINDS = [
  'name',
  'aliases',
  'instance-kind',
  'bind',
  'unbind',
] as const;

export type BindingBehaviorSupportFieldKind =
  typeof BINDING_BEHAVIOR_SUPPORT_FIELD_KINDS[number];

export const BINDING_BEHAVIOR_SUPPORT_CARRIER_KINDS = [
  'annotation-decorator',
  'definition-object',
  'static-au-property',
  'static-own-property',
  'instance-property',
  'instance-method',
  'default',
  'open',
] as const;

export type BindingBehaviorSupportCarrierKind =
  typeof BINDING_BEHAVIOR_SUPPORT_CARRIER_KINDS[number];

export class BindingBehaviorFieldWitness {
  constructor(
    readonly field: BindingBehaviorSupportFieldKind,
    readonly carrier: BindingBehaviorSupportCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {}
}

export class BindingBehaviorFieldProvenance {
  constructor(
    readonly field: BindingBehaviorSupportFieldKind,
    readonly mode: 'selected' | 'merged' | 'presence-only',
    readonly selected: BindingBehaviorFieldWitness | null,
    readonly contributors: readonly BindingBehaviorFieldWitness[] = [],
    readonly note: string | null = null,
  ) {}
}

export class BindingBehaviorIdentity {
  constructor(
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly key: KeyRef | null = null,
    readonly provenance: readonly BindingBehaviorFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(
    field: BindingBehaviorSupportFieldKind,
  ): BindingBehaviorFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

// NOTE: runtime BindingBehaviorDefinition likewise keeps only name/aliases/key.
// The clean-room adds this member-level surface because edits to `type`,
// `bind`, or `unbind` affect binding semantics and should be traceable even
// though runtime spends them later through the binding lifecycle rather than
// definition creation.
// NOTE: this surface is declaration-local. Missing witnesses do not yet prove
// runtime absence across inheritance or later dynamic mutation.
export class BindingBehaviorExecutionSurface {
  constructor(
    readonly instanceKind: 'instance' | 'factory' | null = null,
    readonly bindSource: SourceNodeRef | null = null,
    readonly unbindSource: SourceNodeRef | null = null,
    readonly provenance: readonly BindingBehaviorFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  get declaresBind(): boolean {
    return this.bindSource != null;
  }

  get declaresUnbind(): boolean {
    return this.unbindSource != null;
  }

  readProvenance(
    field: BindingBehaviorSupportFieldKind,
  ): BindingBehaviorFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}
