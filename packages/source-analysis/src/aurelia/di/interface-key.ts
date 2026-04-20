import type { KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';

export const INTERFACE_KEY_DEFAULT_REGISTRATION_KINDS = [
  'instance',
  'singleton',
  'transient',
  'callback',
  'cached-callback',
  'alias',
] as const;

export type InterfaceKeyDefaultRegistrationKind =
  typeof INTERFACE_KEY_DEFAULT_REGISTRATION_KINDS[number];

export class InterfaceKeyDefaultRegistration {
  constructor(
    readonly kind: InterfaceKeyDefaultRegistrationKind,
    readonly source: SourceNodeRef,
    readonly targetKey: KeyRef | null,
    readonly note: string | null = null,
  ) {}
}

// Clean-room model for DI.createInterface-style key production. This sits
// above raw export identity and below later registration production.
export class InterfaceKey {
  constructor(
    readonly id: string,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly key: KeyRef,
    readonly friendlyName: string | null,
    readonly defaultRegistration: InterfaceKeyDefaultRegistration | null = null,
  ) {}
}
