import type { KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';

export const REGISTRATION_PAYLOAD_KINDS = [
  'instance-value',
  'constructable-type',
  'callback',
  'alias-target',
  'deferred-parameters',
] as const;

export type RegistrationPayloadKind =
  typeof REGISTRATION_PAYLOAD_KINDS[number];

export class RegistrationPayload {
  constructor(
    readonly kind: RegistrationPayloadKind,
    readonly source: SourceNodeRef,
    readonly type: SymbolRef | SourceNodeRef | null = null,
    readonly targetKey: KeyRef | null = null,
    readonly note: string | null = null,
  ) {}
}
