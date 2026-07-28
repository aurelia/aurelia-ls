import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  ComputedObservationDependencyMode,
} from './computed-observation.js';
import type { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';
import type { RuntimeExpressionAccessUse } from '../runtime-expression/runtime-expression-access-use.js';

export const enum ComputedObserverRuntimeKind {
  ComputedObserver = 'computed-observer',
  ControlledComputedObserver = 'controlled-computed-observer',
}

export const enum ComputedObserverSourceTriggerKind {
  /** ObserverLocator.createObserver reached a configurable getter descriptor. */
  AccessorDescriptor = 'accessor-descriptor',
  /** A decorated getter supplied an ObservableGetter.getObserver hook. */
  GetterOwnedObserver = 'getter-owned-observer',
}

export class ComputedObserverSourceReference {
  constructor(
    readonly observerKind: ComputedObserverRuntimeKind,
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/**
 * Source-backed `ComputedObserver` / `ControlledComputedObserver` source for an authored getter.
 *
 * This is the source-observer availability/projection lane. It is intentionally separate from
 * `ComputedObservationDefinition`, which only describes `@computed` metadata, and it is also separate from a concrete
 * binding or watcher lookup that actually observes the getter at runtime. Plain configurable getters can still become
 * `ComputedObserver` products through ObserverLocator getter-descriptor semantics, and explicit getter dependencies
 * become `ControlledComputedObserver` products through the getter-owned observer hook.
 */
export class ComputedObserverSource {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly observerKind: ComputedObserverRuntimeKind,
    readonly triggerKind: ComputedObserverSourceTriggerKind,
    readonly className: string | null,
    readonly memberName: string | null,
    readonly dependencyMode: ComputedObservationDependencyMode,
    readonly dependencyKeys: readonly string[],
    readonly dependencyFunctionCount: number,
    readonly flush: 'sync' | 'async',
    readonly deep: boolean | null,
    readonly accessUses: readonly RuntimeExpressionAccessUse[],
    readonly observedDependencies: readonly ComputedObserverObservedDependency[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  toReference(): ComputedObserverSourceReference {
    return new ComputedObserverSourceReference(
      this.observerKind,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Dependency read projected by a source-backed computed observer getter path. */
export class ComputedObserverObservedDependency {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly computedObserver: ComputedObserverSourceReference,
    /** Exact authored or generated access occurrence that induced this observation effect. */
    readonly accessUseProductHandle: ProductHandle,
    readonly dependencyKind: RuntimeObservedDependencyKind,
    readonly expressionKind: string,
    readonly sourceName: string | null,
    readonly sourceRootName: string | null,
    readonly memberName: string | null,
    readonly keyExpression: string | null,
    readonly methodName: string | null,
    readonly spanStart: number | null,
    readonly spanEnd: number | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export class ComputedObserverSourceProjectResult {
  constructor(
    readonly computedObservers: readonly ComputedObserverSource[],
  ) {}

  readComputedObservers(): readonly ComputedObserverSource[] {
    return this.computedObservers;
  }

  readObservedDependencies(): readonly ComputedObserverObservedDependency[] {
    return this.computedObservers.flatMap((observer) => observer.observedDependencies);
  }

  readAccessUses(): readonly RuntimeExpressionAccessUse[] {
    return this.computedObservers.flatMap((observer) => observer.accessUses);
  }
}
