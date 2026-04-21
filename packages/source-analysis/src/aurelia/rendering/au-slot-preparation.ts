import type { CompilerChildWorldFormation } from '../compiler/child-world-formation.js';
import {
  CompilerAnonymousElementDefinition,
  type CompilerProjectionSlot,
  type CompiledElementNode,
} from '../compiler/compiled-template.js';
import type { ViewFactory } from '../compiler/view-factory.js';

export const AU_SLOT_PREPARATION_OPEN_SEAM_KINDS = [
  'parent-projection-source-open',
  'slot-watcher-runtime-open',
  'host-scope-bridge-open',
] as const;

export type AuSlotPreparationOpenSeamKind =
  typeof AU_SLOT_PREPARATION_OPEN_SEAM_KINDS[number];

export const AU_SLOT_CONTENT_SELECTION_KINDS = [
  'fallback',
  'projected',
  'empty',
] as const;

export type AuSlotContentSelectionKind =
  typeof AU_SLOT_CONTENT_SELECTION_KINDS[number];

export class AuSlotPreparationOpenSeam {
  constructor(
    readonly kind: AuSlotPreparationOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class AuSlotContentSelection {
  constructor(
    readonly kind: AuSlotContentSelectionKind,
    readonly selectedProjection: CompilerProjectionSlot | null = null,
    readonly fallbackProjection: CompilerProjectionSlot | null = null,
    readonly parentProjection: CompilerProjectionSlot | null = null,
    readonly note: string | null = null,
  ) {}
}

export class AuSlotPreparation {
  constructor(
    readonly hostElement: CompiledElementNode,
    readonly slotName: string,
    readonly selection: AuSlotContentSelection,
    readonly definition: CompilerAnonymousElementDefinition,
    readonly viewFactory: ViewFactory,
    readonly worldFormation: CompilerChildWorldFormation,
    readonly openSeams: readonly AuSlotPreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}
