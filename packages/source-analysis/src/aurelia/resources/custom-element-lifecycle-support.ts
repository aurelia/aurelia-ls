import { EvidenceSource, EvidenceWitness, ProvenanceSet } from '../provenance/evidence.js';
import type { SourceNodeRef } from '../refs.js';

export const CUSTOM_ELEMENT_LIFECYCLE_HOOK_KINDS = [
  'define',
  'hydrating',
  'hydrated',
  'created',
  'binding',
  'bound',
  'attaching',
  'attached',
  'detaching',
  'unbinding',
  'dispose',
  'accept',
] as const;

export type CustomElementLifecycleHookKind =
  typeof CUSTOM_ELEMENT_LIFECYCLE_HOOK_KINDS[number];

export const CUSTOM_ELEMENT_LIFECYCLE_CARRIER_KINDS = [
  'instance-method',
  'default',
  'open',
] as const;

export type CustomElementLifecycleCarrierKind =
  typeof CUSTOM_ELEMENT_LIFECYCLE_CARRIER_KINDS[number];

export type CustomElementLifecycleHookProvenanceMode =
  'selected' | 'presence-only';

export class CustomElementLifecycleHookWitness {
  readonly evidence: EvidenceWitness<CustomElementLifecycleHookKind, CustomElementLifecycleCarrierKind>;

  constructor(
    readonly hook: CustomElementLifecycleHookKind,
    readonly carrier: CustomElementLifecycleCarrierKind,
    readonly source: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {
    this.evidence = new EvidenceWitness(
      hook,
      carrier,
      source == null ? EvidenceSource.open(note) : EvidenceSource.sourceNode(source, note),
      note,
    );
  }
}

export class CustomElementLifecycleHookProvenance {
  readonly provenanceSet: ProvenanceSet<
    CustomElementLifecycleHookKind,
    CustomElementLifecycleHookProvenanceMode,
    CustomElementLifecycleHookWitness
  >;

  constructor(
    readonly hook: CustomElementLifecycleHookKind,
    readonly mode: CustomElementLifecycleHookProvenanceMode,
    readonly selected: CustomElementLifecycleHookWitness | null,
    readonly contributors: readonly CustomElementLifecycleHookWitness[] = [],
    readonly note: string | null = null,
  ) {
    this.provenanceSet = new ProvenanceSet(hook, mode, selected, contributors, note);
  }
}

// NOTE: runtime CE definitions do not expose compile/activation hook witnesses.
// The clean-room keeps them because edits to these methods can affect template
// compilation, hydration posture, or later controller behavior.
// NOTE: this remains declaration-local. Missing hook witnesses do not yet prove
// runtime absence across inheritance or later dynamic mutation.
export class CustomElementLifecycleHooks {
  constructor(
    readonly defineSource: SourceNodeRef | null = null,
    readonly hydratingSource: SourceNodeRef | null = null,
    readonly hydratedSource: SourceNodeRef | null = null,
    readonly createdSource: SourceNodeRef | null = null,
    readonly bindingSource: SourceNodeRef | null = null,
    readonly boundSource: SourceNodeRef | null = null,
    readonly attachingSource: SourceNodeRef | null = null,
    readonly attachedSource: SourceNodeRef | null = null,
    readonly detachingSource: SourceNodeRef | null = null,
    readonly unbindingSource: SourceNodeRef | null = null,
    readonly disposeSource: SourceNodeRef | null = null,
    readonly acceptSource: SourceNodeRef | null = null,
    readonly provenance: readonly CustomElementLifecycleHookProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  has(
    hook: CustomElementLifecycleHookKind,
  ): boolean {
    return this.readSource(hook) != null;
  }

  readSource(
    hook: CustomElementLifecycleHookKind,
  ): SourceNodeRef | null {
    switch (hook) {
      case 'define': return this.defineSource;
      case 'hydrating': return this.hydratingSource;
      case 'hydrated': return this.hydratedSource;
      case 'created': return this.createdSource;
      case 'binding': return this.bindingSource;
      case 'bound': return this.boundSource;
      case 'attaching': return this.attachingSource;
      case 'attached': return this.attachedSource;
      case 'detaching': return this.detachingSource;
      case 'unbinding': return this.unbindingSource;
      case 'dispose': return this.disposeSource;
      case 'accept': return this.acceptSource;
    }
  }

  readProvenance(
    hook: CustomElementLifecycleHookKind,
  ): CustomElementLifecycleHookProvenance | null {
    return this.provenance.find((current) => current.hook === hook) ?? null;
  }
}
