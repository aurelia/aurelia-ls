import type { ContainerWorldRef, SourceNodeRef, SymbolRef } from '../refs.js';
import type { RegistrationProduction } from './registration-production.js';

export const REGISTRATION_INTAKE_KINDS = [
  'direct-register-call',
  'iregistry-register',
  'container-boundary-publication',
  'resource-definition-register',
  'registrable-metadata-register',
  'static-au-register',
  'configuration-emission',
  'object-bag-register',
  'deferred-parameterized-register',
] as const;

export type RegistrationIntakeKind =
  typeof REGISTRATION_INTAKE_KINDS[number];
export class RegistrationIntake {
  constructor(
    readonly id: string,
    readonly kind: RegistrationIntakeKind,
    readonly source: SourceNodeRef,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly world: ContainerWorldRef | null,
    readonly productions: readonly RegistrationProduction[] = [],
    readonly note: string | null = null,
  ) {}
}
