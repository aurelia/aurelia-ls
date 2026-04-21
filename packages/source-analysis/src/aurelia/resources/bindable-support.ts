import type { SourceNodeRef } from '../refs.js';

export const BINDABLE_FIELD_KINDS = [
  'name',
  'attribute',
  'callback',
  'mode',
  'set',
  'type',
  'nullable',
] as const;

export type BindableFieldKind =
  typeof BINDABLE_FIELD_KINDS[number];

export const BINDABLE_CARRIER_KINDS = [
  'bindable-decorator',
  'static-au-property',
  'static-own-property',
  'default',
  'open',
] as const;

export type BindableCarrierKind =
  typeof BINDABLE_CARRIER_KINDS[number];

export const BINDABLE_INTERCEPTOR_KINDS = [
  'default-noop',
  'explicit-set',
  'type-coercer',
  'open',
] as const;

export type BindableInterceptorKind =
  typeof BINDABLE_INTERCEPTOR_KINDS[number];

export const BINDABLE_CALLBACK_TARGET_KINDS = [
  'resolved-instance-method',
  'name-only',
  'open',
] as const;

export type BindableCallbackTargetKind =
  typeof BINDABLE_CALLBACK_TARGET_KINDS[number];

export const BINDABLE_RESOLUTION_INPUT_KINDS = [
  'inherited-bindable-metadata',
  'local-bindable-decorator-metadata',
  'annotated-bindables',
  'static-own-bindables',
  'definition-bindables',
  'seed-bindables',
  'open',
] as const;

export type BindableResolutionInputKind =
  typeof BINDABLE_RESOLUTION_INPUT_KINDS[number];

export class BindableSurfaceWitness {
  constructor(
    readonly carrier: BindableCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {}
}

export class BindableSurfaceProvenance {
  constructor(
    readonly mode: 'selected' | 'merged' | 'presence-only',
    readonly selected: BindableSurfaceWitness | null,
    readonly contributors: readonly BindableSurfaceWitness[] = [],
    readonly note: string | null = null,
  ) {}
}

export class BindableFieldWitness {
  constructor(
    readonly field: BindableFieldKind,
    readonly carrier: BindableCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {}
}

export class BindableFieldProvenance {
  constructor(
    readonly field: BindableFieldKind,
    readonly mode: 'selected' | 'presence-only',
    readonly selected: BindableFieldWitness | null,
    readonly contributors: readonly BindableFieldWitness[] = [],
    readonly note: string | null = null,
  ) {}
}

export class BindableContributionEntry {
  constructor(
    readonly name: string | null,
    readonly attribute: string | null = null,
    readonly callback: string | null = null,
    readonly mode: string | number | null = null,
    readonly interceptorKind: BindableInterceptorKind = 'open',
    readonly typeReferenceName: string | null = null,
    readonly nullable: boolean | null = null,
    readonly provenance: readonly BindableFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  get witness(): BindableFieldWitness | null {
    return this.readProvenance('name')?.selected
      ?? this.provenance.find((current) => current.selected != null)?.selected
      ?? null;
  }

  readProvenance(
    field: BindableFieldKind,
  ): BindableFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

export class BindableResolutionInput {
  constructor(
    readonly kind: BindableResolutionInputKind,
    readonly entries: readonly BindableContributionEntry[] = [],
    readonly provenance: BindableSurfaceProvenance | null = null,
    readonly note: string | null = null,
  ) {}
}

export class BindableResolutionProvenance {
  constructor(
    readonly mode: 'selected-contribution' | 'default-filled',
    readonly selected: BindableContributionEntry | null,
    readonly shadowed: readonly BindableContributionEntry[] = [],
    readonly note: string | null = null,
  ) {}
}

export class BindableCallbackTarget {
  constructor(
    readonly kind: BindableCallbackTargetKind,
    readonly name: string | null = null,
    readonly source: SourceNodeRef | null = null,
    readonly note: string | null = null,
  ) {}
}

export class BindableEntry {
  constructor(
    readonly name: string | null,
    readonly attribute: string | null = null,
    readonly callback: string | null = null,
    readonly callbackTarget: BindableCallbackTarget = new BindableCallbackTarget(
      'open',
      null,
      null,
      'Bindable callback target has not been resolved yet.',
    ),
    readonly mode: string | number | null = null,
    readonly interceptorKind: BindableInterceptorKind = 'open',
    readonly typeReferenceName: string | null = null,
    readonly nullable: boolean | null = null,
    readonly resolution: BindableResolutionProvenance | null = null,
    readonly provenance: readonly BindableFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  get witness(): BindableFieldWitness | null {
    return this.readProvenance('name')?.selected
      ?? this.resolution?.selected?.witness
      ?? null;
  }

  readProvenance(
    field: BindableFieldKind,
  ): BindableFieldProvenance | null {
    return this.provenance.find((current) => current.field === field) ?? null;
  }
}

// NOTE: runtime bindables collapse contribution, defaulting, and callback
// resolution into BindableDefinition rows. The clean-room keeps a richer
// surface because authored bindable edits are one of the main TypeScript-side
// authoring surfaces that later affect template classification, lowering, and
// invalidation.
//
// NOTE: this surface is declaration-local in the current slice. Runtime
// `Bindable.getAll(Type)` walks the prototype chain, so later work still needs
// an inheritance-aware bindables-info layer above this authoring surface.
export class BindableSurface {
  constructor(
    readonly inputs: readonly BindableResolutionInput[] = [],
    readonly entries: readonly BindableEntry[] = [],
    readonly provenance: BindableSurfaceProvenance | null = null,
    readonly note: string | null = null,
  ) {}

  readProvenance(): BindableSurfaceProvenance | null {
    return this.provenance;
  }
}
