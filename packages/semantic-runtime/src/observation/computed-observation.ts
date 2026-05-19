import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum ComputedObservationMemberKind {
  Getter = 'getter',
  Method = 'method',
}

export const enum ComputedObservationDependencyMode {
  /** Framework will collect reads by evaluating against ProxyObservable.wrap(...) inside an active connectable. */
  ProxyAutoTrack = 'proxy-auto-track',
  /** Framework will observe explicit property expressions such as `message` or `nested.value`. */
  ExplicitPropertyKeys = 'explicit-property-keys',
  /** Framework will call a dependency function with a wrapped instance. */
  DependencyFunction = 'dependency-function',
  /** Framework received an intentionally empty dependency list. */
  Disabled = 'disabled',
  /** The dependency declaration is present but not statically closed enough for this substrate yet. */
  Open = 'open',
}

export type ComputedObservationDefinitionField =
  | 'member'
  | 'dependencyMode'
  | 'dependencyKeys'
  | 'dependencyFunctionCount'
  | 'flush'
  | 'deep'
  | 'source';

/**
 * Source-backed framework `@computed` dependency declaration.
 *
 * Getter declarations contribute ComputedPropertyInfo that can tune ObserverLocator.getComputedObserver; they are not
 * required for baseline accessor getter observation. Method declarations feed astEvaluate trackable-method handling.
 * Both forms can use explicit property keys, direct or config-object dependency functions, or framework
 * ProxyObservable-based auto tracking, but they are source declarations rather than computed-observer execution rows or
 * binding-time dependency reads.
 */
@auLink('runtime:computed')
@auLink('runtime:ComputedPropertyInfo')
@auLink('runtime:ComputedMethodOptions')
export class ComputedObservationDefinition {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly memberKind: ComputedObservationMemberKind,
    readonly memberName: string | null,
    readonly dependencyMode: ComputedObservationDependencyMode,
    readonly dependencyKeys: readonly string[],
    readonly dependencyFunctionCount: number,
    readonly flush: 'sync' | 'async',
    readonly deep: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ComputedObservationDefinitionField>[] = [],
  ) {}
}

export class ComputedObservationProjectResult {
  constructor(
    readonly definitions: readonly ComputedObservationDefinition[],
  ) {}

  readDefinitions(): readonly ComputedObservationDefinition[] {
    return this.definitions;
  }
}
