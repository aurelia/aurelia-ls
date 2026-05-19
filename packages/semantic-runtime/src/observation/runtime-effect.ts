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
import type { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';

export type RuntimeEffectField =
  | 'effectKind'
  | 'dependencyEvaluationKind'
  | 'immediate'
  | 'observedDependencies'
  | 'stopped'
  | 'source';

export type RuntimeEffectObservedDependencyField =
  | 'effect'
  | 'dependencyKind'
  | 'expressionKind'
  | 'sourceName'
  | 'sourceRootName'
  | 'memberName'
  | 'keyExpression'
  | 'methodName'
  | 'observedMemberKind'
  | 'observedMemberSource'
  | 'span'
  | 'source';

export const enum RuntimeEffectKind {
  /** Direct IObservation.watch(...) effect. */
  Watch = 'watch',
  /** Direct IObservation.run(...) effect backed by the framework RunEffect connectable. */
  Run = 'run',
}

export const enum RuntimeEffectDependencyEvaluationKind {
  /** String watch expression evaluated through ObserverLocator.getExpressionObserver(...). */
  AstEvaluate = 'ast-evaluate',
  /** Function watch getter handed to ObserverLocator.getObserver(obj, getter). */
  ObserverLocatorFunctionKey = 'observer-locator-function-key',
  /** Effect closure executed inside RunEffect's active connectable window. */
  ConnectableRun = 'connectable-run',
  /** The call shape was recognized but the second argument could not be statically classified. */
  Open = 'open',
}

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

export class RuntimeEffectReference {
  constructor(
    /** Direct effect shape represented by this reference. */
    readonly effectKind: RuntimeEffectKind,
    /** Dependency-evaluation handoff selected by the framework call. */
    readonly dependencyEvaluationKind: RuntimeEffectDependencyEvaluationKind,
    /** Product handle for the materialized effect product, when publication owns one. */
    readonly productHandle: ProductHandle | null,
    /** Identity for this modeled effect. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the call that produced this effect. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Dependency read projected from a source-level Observation.watch(...) or Observation.run(...) effect. */
export class RuntimeEffectObservedDependency {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly effect: RuntimeEffectReference,
    readonly dependencyKind: RuntimeObservedDependencyKind,
    readonly expressionKind: string,
    readonly sourceName: string | null,
    readonly sourceRootName: string | null,
    readonly memberName: string | null,
    readonly keyExpression: string | null,
    readonly methodName: string | null,
    readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null,
    readonly observedMemberSourceAddressHandle: AddressHandle | null,
    readonly spanStart: number | null,
    readonly spanEnd: number | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeEffectObservedDependencyField>[] = [],
  ) {}
}

/**
 * Runtime-shaped `IEffect`. It models the lifecycle branch shared by Observation.watch effects and RunEffect:
 * `run()` after stop is a no-op, but a second `stop()` reaches `stopping_a_stopped_effect`.
 */
@auLink('runtime:IEffect')
export class RuntimeEffect {
  private stopped = false;

  constructor(
    /** Direct effect shape represented by this instance. */
    readonly effectKind: RuntimeEffectKind,
    /** Dependency-evaluation handoff selected by the framework call. */
    readonly dependencyEvaluationKind: RuntimeEffectDependencyEvaluationKind,
    /** Product handle for the materialized effect product, when publication owns one. */
    readonly productHandle: ProductHandle | null,
    /** Identity for this modeled effect. */
    readonly identityHandle: IdentityHandle | null,
    /** Whether the source call closed the immediate option statically; null means open. */
    readonly immediate: boolean | null,
    /** Dependency reads collected for this effect's observer path. */
    readonly observedDependencies: readonly RuntimeEffectObservedDependency[],
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

  toReference(): RuntimeEffectReference {
    return new RuntimeEffectReference(
      this.effectKind,
      this.dependencyEvaluationKind,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }

  stop(): RuntimeEffectStopResult {
    if (this.stopped) {
      return new RuntimeEffectStopResult(RuntimeEffectStopKind.StoppingStoppedEffect, this);
    }
    this.stopped = true;
    return new RuntimeEffectStopResult(RuntimeEffectStopKind.Stopped, this);
  }
}

export class RuntimeEffectProjectResult {
  constructor(
    readonly effects: readonly RuntimeEffect[],
  ) {}

  readEffects(): readonly RuntimeEffect[] {
    return this.effects;
  }

  readObservedDependencies(): readonly RuntimeEffectObservedDependency[] {
    return this.effects.flatMap((effect) => effect.observedDependencies);
  }
}
