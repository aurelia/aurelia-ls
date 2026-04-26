import { auLink } from '../au-link.js';
import type { ContainerWorldRef, KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';
import type { RegistrationPayload } from './registration-payload.js';

export const REGISTRATION_FACTORY_METHOD_KINDS = [
  'instance',
  'singleton',
  'transient',
  'callback',
  'cached-callback',
  'alias-to',
  'defer',
] as const;

export type RegistrationFactoryMethodKind =
  typeof REGISTRATION_FACTORY_METHOD_KINDS[number];

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

@auLink('kernel:Registration')
export class RegistrationFactory {
  readonly kind = 'registration-factory' as const;

  constructor(
    readonly methods: readonly RegistrationFactoryMethodKind[] = REGISTRATION_FACTORY_METHOD_KINDS,
    readonly note: string | null = null,
  ) {}
}

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
