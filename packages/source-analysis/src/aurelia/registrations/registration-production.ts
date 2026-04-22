import type { ContainerWorldRef, KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';
import type { RegistrationPayload } from './registration-payload.js';

export const REGISTRATION_PRODUCTION_KINDS = [
  'instance',
  'instance-provider',
  'null-provider',
  'throwing-provider',
  'singleton',
  'transient',
  'callback',
  'cached-callback',
  'alias',
  'defer',
  'implementation-register',
  'resource-register',
  'configuration-register',
  'lifecycle-slot-task',
] as const;

export type RegistrationProductionKind =
  typeof REGISTRATION_PRODUCTION_KINDS[number];

export class RegistrationProduction {
  constructor(
    readonly id: string,
    readonly kind: RegistrationProductionKind,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly source: SourceNodeRef,
    readonly world: ContainerWorldRef | null,
    readonly targetKey: KeyRef | null,
    readonly payload: RegistrationPayload | null = null,
    readonly note: string | null = null,
  ) {}
}
