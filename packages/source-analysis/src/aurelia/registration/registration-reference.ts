import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';

export const enum RegistrationValueKind {
  /** Use when a registration value expression was observed but not classified. */
  Unknown = 'unknown',
  /** Concrete instance value registered for a key. */
  Instance = 'instance',
  /** Constructable class value registered for singleton or transient activation. */
  Constructable = 'constructable',
  /** Callback function used to produce a value at resolution time. */
  Callback = 'callback',
  /** Callback function whose produced value is cached by the resolver. */
  CachedCallback = 'cached-callback',
  /** Original key or provider targeted by an alias registration. */
  AliasTarget = 'alias-target',
  /** Deferred registry value created by `Registration.defer`. */
  DeferredRegistry = 'deferred-registry',
  /** Explicit resolver object supplied to the container. */
  Resolver = 'resolver',
  /** Factory value registered through container factory APIs. */
  Factory = 'factory',
  /** Aurelia resource definition value admitted through container registration. */
  ResourceDefinition = 'resource-definition',
  /** Static `$au` resource class admitted through container registration. */
  StaticResourceType = 'static-resource-type',
  /** IRegistry-compatible object or class with a register method. */
  Registry = 'registry',
  /** Object-map value whose own object/function properties are recursively admitted. */
  ObjectMap = 'object-map',
  /** Plain class admitted by the container's fallback self-registration branch. */
  PlainClass = 'plain-class',
}

/** Source-level reference to the container or app boundary receiving a registration. */
export class RegistrationContainerReference {
  constructor(
    /** Container/app identity when the receiver has been modeled. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the receiver expression or boundary. */
    readonly addressHandle: AddressHandle | null,
    /** Local receiver name for traces when no identity exists yet. */
    readonly localName: string | null,
  ) {}
}

/** Source-level reference to the DI key offered by a registration admission. */
export class RegistrationKeyReference {
  constructor(
    /** DI key identity when the key expression has been classified. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the key expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local name or literal preview for traces when the identity is still open. */
    readonly localName: string | null,
  ) {}
}

/** Source-level reference to the value, resolver, registry, or resource admitted by registration. */
export class RegistrationValueReference {
  constructor(
    /** Classified registration value lane. */
    readonly valueKind: RegistrationValueKind,
    /** Identity for declaration-like values such as classes, callbacks, resolvers, or registries. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for values already materialized by another producer, such as resources. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the value expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local value name for traces when no identity exists yet. */
    readonly localName: string | null,
  ) {}
}
