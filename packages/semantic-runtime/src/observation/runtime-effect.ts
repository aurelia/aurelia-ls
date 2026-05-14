import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import {
  RuntimeObservationFrameworkErrorCode,
  type RuntimeObservationFrameworkErrorCode as RuntimeObservationFrameworkErrorCodeValue,
} from './framework-error-code.js';

export type RuntimeEffectField =
  | 'stopped'
  | 'source';

export const enum RuntimeEffectStopKind {
  /** First stop transitions the effect into the stopped state. */
  Stopped = 'stopped',
  /** Runtime rejects stopping an already stopped effect. */
  StoppingStoppedEffect = 'stopping-stopped-effect',
}

export class RuntimeEffectStopResult {
  readonly kind = 'runtime-effect-stop-result' as const;

  constructor(
    /** Runtime branch selected by `IEffect.stop()`. */
    readonly stopKind: RuntimeEffectStopKind,
    /** Effect that received the stop call. */
    readonly effect: RuntimeEffect,
  ) {}

  get frameworkErrorCode(): RuntimeObservationFrameworkErrorCodeValue | null {
    return this.stopKind === RuntimeEffectStopKind.StoppingStoppedEffect
      ? RuntimeObservationFrameworkErrorCode.StoppingStoppedEffect
      : null;
  }
}

/**
 * Runtime-shaped `IEffect`. It models the lifecycle branch shared by Observation.watch effects and RunEffect:
 * `run()` after stop is a no-op, but a second `stop()` reaches `stopping_a_stopped_effect`.
 */
@auLink('runtime:IEffect')
export class RuntimeEffect {
  private stopped = false;

  constructor(
    /** Product handle for the materialized effect product, when publication owns one. */
    readonly productHandle: ProductHandle | null,
    /** Identity for this modeled effect. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the watch/effect declaration or runtime setup that produced this effect. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for effect lifecycle state. */
    readonly fieldProvenance: readonly FieldProvenance<RuntimeEffectField>[] = [],
  ) {}

  get isStopped(): boolean {
    return this.stopped;
  }

  run(): void {
    return;
  }

  stop(): RuntimeEffectStopResult {
    if (this.stopped) {
      return new RuntimeEffectStopResult(RuntimeEffectStopKind.StoppingStoppedEffect, this);
    }
    this.stopped = true;
    return new RuntimeEffectStopResult(RuntimeEffectStopKind.Stopped, this);
  }
}
