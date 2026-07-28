import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';
import type { RuntimeExpressionAccessUse } from '../runtime-expression/runtime-expression-access-use.js';

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
    /** Exact authored or generated access occurrence that induced this observation effect. */
    readonly accessUseProductHandle: ProductHandle,
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
  ) {}
}

/** Immutable construction-site plan for one direct `Observation.watch(...)` or `Observation.run(...)` call. */
export class RuntimeEffect {
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
    /** Authored accesses paired with the exact source effect operation that spends them. */
    readonly accessUses: readonly RuntimeExpressionAccessUse[],
    /** Dependency reads collected for this effect's observer path. */
    readonly observedDependencies: readonly RuntimeEffectObservedDependency[],
    /** Source address for the watch/effect declaration or runtime setup that produced this effect. */
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
