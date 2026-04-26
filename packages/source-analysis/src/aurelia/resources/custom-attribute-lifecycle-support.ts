import { EvidenceSource, EvidenceWitness, ProvenanceSet } from '../provenance/index.js';
import type { SourceNodeRef } from '../refs.js';

export const CUSTOM_ATTRIBUTE_LIFECYCLE_HOOK_KINDS = [
  'created',
  'link',
  'binding',
  'bound',
  'attaching',
  'attached',
  'detaching',
  'unbinding',
  'dispose',
  'accept',
] as const;

export type CustomAttributeLifecycleHookKind =
  typeof CUSTOM_ATTRIBUTE_LIFECYCLE_HOOK_KINDS[number];

export const CUSTOM_ATTRIBUTE_LIFECYCLE_CARRIER_KINDS = [
  'instance-method',
  'default',
  'open',
] as const;

export type CustomAttributeLifecycleCarrierKind =
  typeof CUSTOM_ATTRIBUTE_LIFECYCLE_CARRIER_KINDS[number];

export type CustomAttributeLifecycleHookProvenanceMode =
  'selected' | 'presence-only';

export class CustomAttributeLifecycleHookWitness {
  readonly evidence: EvidenceWitness<CustomAttributeLifecycleHookKind, CustomAttributeLifecycleCarrierKind>;

  constructor(
    readonly hook: CustomAttributeLifecycleHookKind,
    readonly carrier: CustomAttributeLifecycleCarrierKind,
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

export class CustomAttributeLifecycleHookProvenance {
  readonly provenanceSet: ProvenanceSet<
    CustomAttributeLifecycleHookKind,
    CustomAttributeLifecycleHookProvenanceMode,
    CustomAttributeLifecycleHookWitness
  >;

  constructor(
    readonly hook: CustomAttributeLifecycleHookKind,
    readonly mode: CustomAttributeLifecycleHookProvenanceMode,
    readonly selected: CustomAttributeLifecycleHookWitness | null,
    readonly contributors: readonly CustomAttributeLifecycleHookWitness[] = [],
    readonly note: string | null = null,
  ) {
    this.provenanceSet = new ProvenanceSet(hook, mode, selected, contributors, note);
  }
}

// NOTE: runtime CA definitions also do not expose lifecycle/link hook
// witnesses. The clean-room keeps them because edits there affect hydration and
// later controller behavior, including TC linkage.
// NOTE: this is declaration-local, not yet inheritance-aware.
export class CustomAttributeLifecycleHooks {
  constructor(
    readonly createdSource: SourceNodeRef | null = null,
    readonly linkSource: SourceNodeRef | null = null,
    readonly bindingSource: SourceNodeRef | null = null,
    readonly boundSource: SourceNodeRef | null = null,
    readonly attachingSource: SourceNodeRef | null = null,
    readonly attachedSource: SourceNodeRef | null = null,
    readonly detachingSource: SourceNodeRef | null = null,
    readonly unbindingSource: SourceNodeRef | null = null,
    readonly disposeSource: SourceNodeRef | null = null,
    readonly acceptSource: SourceNodeRef | null = null,
    readonly provenance: readonly CustomAttributeLifecycleHookProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  has(
    hook: CustomAttributeLifecycleHookKind,
  ): boolean {
    return this.readSource(hook) != null;
  }

  readSource(
    hook: CustomAttributeLifecycleHookKind,
  ): SourceNodeRef | null {
    switch (hook) {
      case 'created': return this.createdSource;
      case 'link': return this.linkSource;
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
    hook: CustomAttributeLifecycleHookKind,
  ): CustomAttributeLifecycleHookProvenance | null {
    return this.provenance.find((current) => current.hook === hook) ?? null;
  }
}
