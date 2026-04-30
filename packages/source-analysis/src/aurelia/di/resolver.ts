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
import type {
  ContainerFactoryLookup,
  ContainerResolverLookup,
} from './container-lookup.js';
import type { ContainerResolverSlot } from './container-slot.js';

export type ResolverField =
  | '_key'
  | '_strategy'
  | '_state'
  | 'source';

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
}

/**
 * Runtime-shaped resolver value. Resolution records describe runtime pressure without executing constructors,
 * callbacks, or arbitrary factory code.
 */
@auLink('kernel:Resolver')
export class Resolver {
  _key: RegistrationKeyReference;
  _strategy: RegistrationStrategy;
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
    strategy: RegistrationStrategy,
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
      case RegistrationStrategy.Instance:
        return new ResolverResolution(
          ResolverResolutionKind.Instance,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      case RegistrationStrategy.Singleton:
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
      case RegistrationStrategy.Transient:
        return new ResolverResolution(
          ResolverResolutionKind.TransientFactory,
          this,
          handler,
          requestor,
          this._state,
          this.getFactory(handler),
          null,
        );
      case RegistrationStrategy.Callback:
        return new ResolverResolution(
          ResolverResolutionKind.Callback,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      case RegistrationStrategy.CachedCallback:
        return new ResolverResolution(
          ResolverResolutionKind.CachedCallback,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      case RegistrationStrategy.AliasTo:
        return new ResolverResolution(
          ResolverResolutionKind.Alias,
          this,
          handler,
          requestor,
          this._state,
          null,
          this._state?.identityHandle == null ? null : requestor.get(this._state.identityHandle),
        );
      case RegistrationStrategy.Array:
        return new ResolverResolution(
          ResolverResolutionKind.Array,
          this,
          handler,
          requestor,
          this._state,
          null,
          null,
        );
      default:
        return new ResolverResolution(
          ResolverResolutionKind.Open,
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
      case RegistrationStrategy.Singleton:
      case RegistrationStrategy.Transient:
        return this._state?.identityHandle == null ? null : container.getFactory(this._state.identityHandle);
      case RegistrationStrategy.Instance:
        return this._cachedFactory;
      default:
        return null;
    }
  }
}
