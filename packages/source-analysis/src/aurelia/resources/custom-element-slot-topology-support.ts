import type { TemplateNodeRef } from '../refs.js';
import type { CustomElementFieldProvenance } from './custom-element-support.js';

export const CUSTOM_ELEMENT_SLOT_TARGET_KINDS = [
  'default-slot',
  'named-slot',
] as const;

export type CustomElementSlotTargetKind =
  typeof CUSTOM_ELEMENT_SLOT_TARGET_KINDS[number];

export class CustomElementDeclaredSlot {
  constructor(
    readonly name: string,
    readonly kind: CustomElementSlotTargetKind,
    readonly source: TemplateNodeRef | null,
    readonly hasFallbackContent: boolean,
    readonly note: string | null = null,
  ) {}
}

// NOTE: runtime CE definitions compress slot topology down to `hasSlots` plus
// later compiler/runtime projection structures. The clean-room keeps a richer
// declaration-side topology surface so edits to inline templates can be traced
// directly to slot names and fallback presence.
export class CustomElementSlotTopology {
  constructor(
    readonly hasSlots: boolean | null = null,
    readonly slots: readonly CustomElementDeclaredSlot[] = [],
    readonly provenance: readonly CustomElementFieldProvenance[] = [],
    readonly note: string | null = null,
  ) {}

  readProvenance(): CustomElementFieldProvenance | null {
    return this.provenance.find((current) => current.field === 'has-slots') ?? null;
  }

  findSlot(
    name: string,
  ): CustomElementDeclaredSlot | null {
    return this.slots.find((current) => current.name === name) ?? null;
  }

  readSlotNames(): readonly string[] {
    return this.slots.map((current) => current.name);
  }
}
