import type { SourceNodeRef } from '../refs.js';

export const SLOTTED_DECLARATION_ORIGIN_KINDS = [
  'field-decorator',
] as const;

export type SlottedDeclarationOriginKind =
  typeof SLOTTED_DECLARATION_ORIGIN_KINDS[number];

export const SLOTTED_QUERY_KINDS = [
  'default-elements',
  'selector-string',
  'all-nodes',
  'open',
] as const;

export type SlottedQueryKind =
  typeof SLOTTED_QUERY_KINDS[number];

export const SLOTTED_SLOT_TARGET_KINDS = [
  'default-slot',
  'named-slot',
  'all-slots',
  'open',
] as const;

export type SlottedSlotTargetKind =
  typeof SLOTTED_SLOT_TARGET_KINDS[number];

export const SLOTTED_CALLBACK_TARGET_KINDS = [
  'default-name',
  'named-method',
  'property-key-reference',
  'open',
] as const;

export type SlottedCallbackTargetKind =
  typeof SLOTTED_CALLBACK_TARGET_KINDS[number];

export class SlottedQueryPlan {
  constructor(
    readonly kind: SlottedQueryKind,
    readonly source: SourceNodeRef | null,
    readonly selectorText: string | null = null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class SlottedSlotTarget {
  constructor(
    readonly kind: SlottedSlotTargetKind,
    readonly source: SourceNodeRef | null,
    readonly name: string | null = null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class SlottedCallbackTarget {
  constructor(
    readonly kind: SlottedCallbackTargetKind,
    readonly source: SourceNodeRef | null,
    readonly name: string | null = null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class SlottedDeclaration {
  constructor(
    readonly origin: SlottedDeclarationOriginKind,
    readonly source: SourceNodeRef | null,
    readonly propertyName: string | null,
    readonly propertySource: SourceNodeRef | null,
    readonly query: SlottedQueryPlan,
    readonly slotTarget: SlottedSlotTarget,
    readonly callback: SlottedCallbackTarget,
    readonly note: string | null = null,
  ) {}
}

// NOTE: runtime @slotted does not contribute a declarative definition row. It
// pushes SlottedLifecycleHooks into metadata, and hydrating later installs an
// AuSlotWatcherBinding with readonly getter/getObserver plumbing on the view
// model. The clean-room keeps a declaration-local surface instead so edits to
// query / slotName / callback remain traceable without replaying metadata
// mutation or watcher realization.
//
// NOTE: this remains declaration-local. Missing @slotted declarations do not
// yet prove runtime absence across inheritance or later decorator indirection.
export class SlottedSurface {
  constructor(
    readonly declarations: readonly SlottedDeclaration[] = [],
    readonly note: string | null = null,
  ) {}

  readByPropertyName(
    propertyName: string,
  ): readonly SlottedDeclaration[] {
    return this.declarations.filter((current) => current.propertyName === propertyName);
  }
}
