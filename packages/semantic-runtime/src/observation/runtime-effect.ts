import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { RuntimeExpressionAccessUse } from '../runtime-expression/runtime-expression-access-use.js';
import type { RuntimeObservedDependencyOccurrence } from './runtime-observed-dependency.js';

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

export class RuntimeEffectReference {
  constructor(
    /** Direct effect shape represented by this construction plan. */
    readonly effectKind: RuntimeEffectKind,
    /** Dependency-evaluation handoff selected by the framework call. */
    readonly dependencyEvaluationKind: RuntimeEffectDependencyEvaluationKind,
    /** Product handle for the materialized effect product, when publication owns one. */
    readonly productHandle: ProductHandle | null,
    /** Identity for this modeled construction plan. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the call represented by this plan. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Dependency read projected from a source-level Observation.watch(...) or Observation.run(...) construction plan. */
export class RuntimeEffectObservedDependency {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly effect: RuntimeEffectReference,
    readonly occurrence: RuntimeObservedDependencyOccurrence,
  ) {}
}

/** Immutable construction-site plan for one direct `Observation.watch(...)` or `Observation.run(...)` call. */
export class RuntimeEffect {
  constructor(
    /** Direct effect shape represented by this construction plan. */
    readonly effectKind: RuntimeEffectKind,
    /** Dependency-evaluation handoff selected by the framework call. */
    readonly dependencyEvaluationKind: RuntimeEffectDependencyEvaluationKind,
    /** Product handle for the materialized effect product, when publication owns one. */
    readonly productHandle: ProductHandle | null,
    /** Identity for this modeled construction plan. */
    readonly identityHandle: IdentityHandle | null,
    /** Whether the source call closed the immediate option statically; null means open. */
    readonly immediate: boolean | null,
    /** Authored accesses paired with the exact source effect operation that spends them. */
    readonly accessUses: readonly RuntimeExpressionAccessUse[],
    /** Dependency reads collected for this effect's observer path. */
    readonly observedDependencies: readonly RuntimeEffectObservedDependency[],
    /** Source address for the watch/run call represented by this plan. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  toReference(): RuntimeEffectReference {
    return new RuntimeEffectReference(
      this.effectKind,
      this.dependencyEvaluationKind,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
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

  readAccessUses(): readonly RuntimeExpressionAccessUse[] {
    return this.effects.flatMap((effect) => effect.accessUses);
  }
}
