import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import {
  RegistrationStrategy,
} from '../registration/registration-admission.js';
import type {
  RegistrationKeyReference,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import type { Container } from './container.js';
import {
  containerLookupKeyForRegistrationValue,
} from './container-key.js';
import type {
  ContainerFactoryLookup,
  ContainerResolverLookup,
} from './container-lookup.js';
import type { ContainerResolverSlot } from './container-slot.js';
import {
  DiFrameworkErrorCode,
  type DiFrameworkErrorCode as DiFrameworkErrorCodeValue,
} from './framework-error-code.js';

export type ResolverField =
  | '_key'
  | '_strategy'
  | '_state'
  | 'source';

export const enum ResolverStrategy {
  /** Return the resolver state directly. */
  instance = 0,
  /** Lazily construct once, then replace the resolver state with the instance. */
  singleton = 1,
  /** Construct a new instance from the resolver state on each resolution. */
  transient = 2,
  /** Invoke the resolver state as a callback. Cached callbacks are still this runtime strategy. */
  callback = 3,
  /** Delegate to the first resolver in an array resolver. */
  array = 4,
  /** Redirect resolution through the requestor container. */
  alias = 5,
}

export const enum ResolverResolutionKind {
  /** Resolver returns a modeled value directly. */
  Instance = 'instance',
  /** Resolver would construct or retrieve a singleton through the handler factory map. */
  SingletonFactory = 'singleton-factory',
  /** Resolver would construct a transient through the handler factory map. */
  TransientFactory = 'transient-factory',
  /** Resolver would call a callback. Callback bodies are not executed by the DI model. */
  Callback = 'callback',
  /** Resolver would call a cached callback. Callback bodies are not executed by the DI model. */
  CachedCallback = 'cached-callback',
  /** Resolver would redirect resolution through the requestor. */
  Alias = 'alias',
  /** Resolver would delegate to the first resolver in an array resolver. */
  Array = 'array',
  /** Resolver state is not yet precise enough to model the runtime branch. */
  Open = 'open',
  /** Singleton resolution re-entered while already resolving. */
  Cyclic = 'cyclic',
  /** Resolver carried a strategy value outside Aurelia's ResolverStrategy enum. */
  InvalidStrategy = 'invalid-strategy',
}

export class ResolverResolution {
  readonly kind = 'resolver-resolution' as const;

  constructor(
    /** Runtime resolver branch selected by the abstract evaluator. */
    readonly resolutionKind: ResolverResolutionKind,
    /** Resolver that produced the answer. */
    readonly resolver: Resolver,
    /** Handler container that owns the matching resolver row. */
    readonly handler: Container,
    /** Requesting container that initiated resolution. */
    readonly requestor: Container,
    /** Value lane returned directly by instance/callback-like strategies, when modeled. */
    readonly value: RegistrationValueReference | null,
    /** Factory lookup that would be used by singleton/transient activation. */
    readonly factoryLookup: ContainerFactoryLookup | null,
    /** Alias lookup that would be used by alias resolution. */
    readonly aliasLookup: ContainerResolverLookup | null,
  ) {}

  get frameworkErrorCode(): DiFrameworkErrorCodeValue | null {
    switch (this.resolutionKind) {
      case ResolverResolutionKind.Cyclic:
        return DiFrameworkErrorCode.CyclicDependency;
      case ResolverResolutionKind.InvalidStrategy:
        return DiFrameworkErrorCode.InvalidResolverStrategy;
      case ResolverResolutionKind.Instance:
      case ResolverResolutionKind.SingletonFactory:
      case ResolverResolutionKind.TransientFactory:
      case ResolverResolutionKind.Callback:
      case ResolverResolutionKind.CachedCallback:
      case ResolverResolutionKind.Alias:
      case ResolverResolutionKind.Array:
      case ResolverResolutionKind.Open:
        return null;
    }
  }
}

/**
 * Runtime-shaped resolver value. Resolution records describe runtime pressure without executing constructors,
 * callbacks, or arbitrary factory code.
 */
@auLink('kernel:Resolver')
export class Resolver {
  _key: RegistrationKeyReference;
  _strategy: ResolverStrategy | number | null;
  _state: RegistrationValueReference | null;

  private _resolving = false;
  private _cachedFactory: ContainerFactoryLookup | null = null;

  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this resolver. */
    readonly productHandle: ProductHandle,
    /** Resolver identity for this runtime-shaped resolver value. */
    readonly identityHandle: IdentityHandle,
    /** DI key carried by the resolver. */
    key: RegistrationKeyReference,
    /** Runtime resolver strategy. */
    strategy: ResolverStrategy | number | null,
    /** Runtime resolver state, when it has a modeled source-level carrier. */
    state: RegistrationValueReference | null,
    /** Source address for the resolver-producing expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for resolver fields that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ResolverField>[] = [],
  ) {
    this._key = key;
    this._strategy = strategy;
    this._state = state;
  }

  get $isResolver(): true {
    return true;
  }

  /**
   * Runtime `register(container, key?)` shape. The caller supplies the slot because handle/provenance minting belongs
   * to the DI constructor that spends this resolver.
   */
  register(container: Container, slot: ContainerResolverSlot): ContainerResolverSlot {
    return container.registerResolver(slot);
  }

  /** Runtime `resolve(handler, requestor)` shape represented as an answer record. */
  resolve(handler: Container, requestor: Container): ResolverResolution {
    switch (this._strategy) {
      case ResolverStrategy.instance:
        return new ResolverResolution(
          ResolverResolutionKind.Instance,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      case ResolverStrategy.singleton:
        if (this._resolving) {
          return new ResolverResolution(
            ResolverResolutionKind.Cyclic,
            this,
            handler,
            requestor,
            this._state,
            null,
            null,
          );
        }
        this._resolving = true;
        this._cachedFactory = this.getFactory(handler);
        this._resolving = false;
        return new ResolverResolution(
          ResolverResolutionKind.SingletonFactory,
          this,
          handler,
          requestor,
          this._state,
          this._cachedFactory,
          null,
        );
      case ResolverStrategy.transient:
        return new ResolverResolution(
          ResolverResolutionKind.TransientFactory,
          this,
          handler,
          requestor,
          this._state,
          this.getFactory(handler),
          null,
        );
      case ResolverStrategy.callback:
        return new ResolverResolution(
          ResolverResolutionKind.Callback,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      case ResolverStrategy.alias:
        return new ResolverResolution(
          ResolverResolutionKind.Alias,
          this,
          handler,
          requestor,
          this._state,
          null,
          requestorLookupForRegistrationValue(requestor, this._state),
        );
      case ResolverStrategy.array:
        return new ResolverResolution(
          ResolverResolutionKind.Array,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      case null:
        return new ResolverResolution(
          ResolverResolutionKind.Open,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      default:
        return new ResolverResolution(
          ResolverResolutionKind.InvalidStrategy,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
    }
  }

  /** Runtime `getFactory(container)` shape over the product container's factory map. */
  getFactory(container: Container): ContainerFactoryLookup | null {
    switch (this._strategy) {
      case ResolverStrategy.singleton:
      case ResolverStrategy.transient:
        return factoryLookupForRegistrationValue(container, this._state);
      case ResolverStrategy.instance:
        return this._cachedFactory;
      default:
        return null;
    }
  }
}

export function resolverStrategyForRegistrationStrategy(
  strategy: RegistrationStrategy,
): ResolverStrategy | null {
  switch (strategy) {
    case RegistrationStrategy.Instance:
      return ResolverStrategy.instance;
    case RegistrationStrategy.Singleton:
      return ResolverStrategy.singleton;
    case RegistrationStrategy.Transient:
      return ResolverStrategy.transient;
    case RegistrationStrategy.Callback:
    case RegistrationStrategy.CachedCallback:
      return ResolverStrategy.callback;
    case RegistrationStrategy.AliasTo:
      return ResolverStrategy.alias;
    case RegistrationStrategy.Array:
      return ResolverStrategy.array;
    case RegistrationStrategy.Unknown:
    case RegistrationStrategy.Defer:
    case RegistrationStrategy.Registry:
    case RegistrationStrategy.Resource:
    case RegistrationStrategy.PlainClassSelf:
    case RegistrationStrategy.ObjectMap:
    case RegistrationStrategy.Resolver:
    case RegistrationStrategy.Factory:
    case RegistrationStrategy.FrameworkGroup:
      return null;
  }
}

function requestorLookupForRegistrationValue(
  requestor: Container,
  value: RegistrationValueReference | null,
): ContainerResolverLookup | null {
  const key = containerLookupKeyForRegistrationValue(value);
  return key == null ? null : requestor.get(key);
}

function factoryLookupForRegistrationValue(
  container: Container,
  value: RegistrationValueReference | null,
): ContainerFactoryLookup | null {
  const key = containerLookupKeyForRegistrationValue(value);
  return key == null ? null : container.getFactory(key);
}
