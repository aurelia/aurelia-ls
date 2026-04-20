import type { ContainerWorldRef, KeyRef } from '../refs.js';
import type { RegistrationIntake } from './registration-intake.js';

export const REGISTRATION_STRATEGY_KINDS = [
  'instance',
  'singleton',
  'transient',
  'callback',
  'alias',
  'array-aggregation',
] as const;

export type RegistrationStrategyKind =
  typeof REGISTRATION_STRATEGY_KINDS[number];

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
  'child-world-fork',
  'generated-syntax-or-settings-emission',
] as const;

export type RegistrationTransitionClassKind =
  typeof REGISTRATION_TRANSITION_CLASS_KINDS[number];

export const MATERIALIZATION_TIMING_KINDS = [
  'eager',
  'deferred-to-slot',
  'runtime-gated',
] as const;

export type MaterializationTimingKind =
  typeof MATERIALIZATION_TIMING_KINDS[number];

export const LOOKUP_REGIME_KINDS = [
  'direct',
  'ancestor',
  'own',
  'resource',
  'all',
  'factory',
  'new-instance',
] as const;

export type LookupRegimeKind =
  typeof LOOKUP_REGIME_KINDS[number];

export const ANALYZABILITY_BAND_KINDS = [
  'closed',
  'open',
  'runtime-only',
] as const;

export type AnalyzabilityBandKind =
  typeof ANALYZABILITY_BAND_KINDS[number];

export const OPEN_RESIDUAL_KINDS = [
  'callback-body-opaque',
  'dynamic-key-emission',
  'lifecycle-gated-activity',
  'child-world-visibility-qualified',
  'configuration-history-open',
] as const;

export type OpenResidualKind =
  typeof OPEN_RESIDUAL_KINDS[number];

// This is the first stable consequence layer above production/intake. It is
// intentionally not a runtime resolver and not a final answer packet.
export class RegistrationTransition {
  constructor(
    readonly id: string,
    readonly intake: RegistrationIntake,
    readonly world: ContainerWorldRef | null,
    readonly key: KeyRef | null,
    readonly strategy: RegistrationStrategyKind | null,
    readonly stage: RegistrationStageKind | null,
    readonly transitionClass: RegistrationTransitionClassKind,
    readonly materializationTiming: MaterializationTimingKind,
    readonly lookupRegime: LookupRegimeKind,
    readonly analyzabilityBand: AnalyzabilityBandKind,
    readonly openResiduals: readonly OpenResidualKind[] = [],
    readonly note: string | null = null,
  ) {}
}
