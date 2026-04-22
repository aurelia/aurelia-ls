import type { RegistrationIntake } from './registration-intake.js';
import type { RegistrationProduction } from './registration-production.js';

export const REGISTRATION_STAGE_KINDS = [
  'explicit-iregistry-register',
  'resource-definition-register',
  'registrable-metadata-register',
  'legacy-static-au-register',
] as const;

export type RegistrationStageKind =
  typeof REGISTRATION_STAGE_KINDS[number];

export const REGISTRATION_TRANSITION_CLASS_KINDS = [
  'key-space-addition',
  'key-space-overlay',
  'alias-linkage',
  'multi-registration-aggregation',
  'builder-history-accumulation',
  'lifecycle-slot-attachment',
  'child-container-publication',
  'child-world-fork',
  'generated-syntax-or-settings-emission',
] as const;

export type RegistrationTransitionClassKind =
  typeof REGISTRATION_TRANSITION_CLASS_KINDS[number];

// Transition/cascade lineage is only one section of the eventual DI/container-
// state envelope. Lookup qualification and closure basis live in separate
// clean-room homes so we do not compress them back into runtime-style rows.
export class RegistrationTransition {
  constructor(
    readonly id: string,
    readonly intake: RegistrationIntake,
    readonly production: RegistrationProduction | null,
    readonly stage: RegistrationStageKind | null,
    readonly transitionClass: RegistrationTransitionClassKind,
    readonly note: string | null = null,
  ) {}
}
