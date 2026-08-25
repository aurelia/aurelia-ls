import type { IdentityHandle } from '../kernel/handles.js';
import {
  ContainerLookupKeyKind,
  type ContainerLookupKey,
} from './container-key.js';
import type { ContainerReference } from './container-reference.js';
import type {
  ContainerFactorySlot,
  ContainerResourceSlot,
  ContainerResolverLikeSlot,
} from './container-slot.js';
import {
  DiFrameworkErrorCode,
  type DiFrameworkErrorCode as DiFrameworkErrorCodeValue,
} from './framework-error-code.js';

export const enum ContainerLookupState {
  /** The requested row was found in the current container tree. */
  Hit = 'hit',
  /** The requested row was not found. */
  Miss = 'miss',
  /** The resolver was not found, but runtime lookup would enter JIT/default registration. */
  JitRegistration = 'jit-registration',
  /** The factory was not cached, but runtime lookup would create a factory for a constructable key. */
  FactoryConstruction = 'factory-construction',
  /** Runtime invoke would enter constructor activation. */
  ConstructorInvocation = 'constructor-invocation',
  /** The runtime container would throw before producing a resolver, value, or factory. */
  Failed = 'failed',
  /** The container is disposed, so no lookup should be trusted. */
  Disposed = 'disposed',
}

/** Exact framework failure selected while resolving a key through container, factory, registry, or resolver semantics. */
export const enum ContainerResolutionFailureKind {
  /** `kernel ErrorNames.none_resolver_found`; DefaultResolver.none rejected a missing DI key. */
  NoneResolverFound = 'none-resolver-found',
  /** `kernel ErrorNames.unable_jit_non_constructor`; JIT/factory lookup did not receive a constructable value. */
  UnableJitNonConstructor = 'unable-jit-non-constructor',
  /** `kernel ErrorNames.no_jit_intrinsic_type`; JIT registration was asked to auto-register an intrinsic type. */
  NoJitIntrinsicType = 'no-jit-intrinsic-type',
  /** `kernel ErrorNames.no_jit_interface`; JIT registration was asked to auto-register an interface key. */
  NoJitInterface = 'no-jit-interface',
  /** `kernel ErrorNames.no_construct_native_fn`; factory/invoke was asked to construct a native function. */
  NoConstructNativeFunction = 'no-construct-native-function',
  /** `kernel ErrorNames.null_undefined_key`; a validating container API received null or undefined. */
  NullUndefinedKey = 'null-undefined-key',
  /** `kernel ErrorNames.null_resolver_from_register`; registry JIT produced neither a resolver nor a registration. */
  NullResolverFromRegister = 'null-resolver-from-register',
  /** `kernel ErrorNames.invalid_new_instance_on_interface`; fresh interface activation has no constructable factory. */
  InvalidNewInstanceOnInterface = 'invalid-new-instance-on-interface',
}

export class ContainerResolverLookup {
  readonly kind = 'container-resolver-lookup' as const;

  constructor(
    /** Lookup state after searching the modeled container tree. */
    readonly state: ContainerLookupState,
    /** Runtime-facing DI key requested by the lookup. */
    readonly key: ContainerLookupKey,
    /** Container where the request began. */
    readonly requestor: ContainerReference,
    /** Container that owned the matching resolver slots, when there was a hit. */
    readonly owner: ContainerReference | null,
    /** Resolver slots found for the key. Multiple slots represent runtime array-resolver behavior. */
    readonly resolverSlots: readonly ContainerResolverLikeSlot[],
    /** Containers searched in order. */
    readonly searchPath: readonly ContainerReference[],
    /** Whether runtime auto-registration would be considered after a miss. */
    readonly autoRegister: boolean,
    /** Exact runtime failure branch when the lookup could model one. */
    readonly failureKind: ContainerResolutionFailureKind | null = null,
  ) {}

  get keyIdentityHandle(): IdentityHandle {
    return this.key.identityHandle;
  }

  get frameworkErrorCode(): DiFrameworkErrorCodeValue | null {
    return frameworkErrorCodeForContainerResolutionFailureKind(this.failureKind);
  }
}

export class ContainerFactoryLookup {
  readonly kind = 'container-factory-lookup' as const;

  constructor(
    /** Lookup state for the root-shared factory map. */
    readonly state: ContainerLookupState,
    /** Runtime-facing constructable key requested by the lookup. */
    readonly key: ContainerLookupKey,
    /** Container where the request began. */
    readonly requestor: ContainerReference,
    /** Factory slot found for the key. */
    readonly factorySlot: ContainerFactorySlot | null,
    /** Exact runtime failure branch when the lookup could model one. */
    readonly failureKind: ContainerResolutionFailureKind | null = null,
  ) {}

  get keyIdentityHandle(): IdentityHandle {
    return this.key.identityHandle;
  }

  get frameworkErrorCode(): DiFrameworkErrorCodeValue | null {
    return frameworkErrorCodeForContainerResolutionFailureKind(this.failureKind);
  }
}

export class ContainerInvocation {
  readonly kind = 'container-invocation' as const;

  constructor(
    /** Invoke state after applying the framework's method-local guards. */
    readonly state: ContainerLookupState,
    /** Runtime-facing constructable supplied to `container.invoke(...)`. */
    readonly key: ContainerLookupKey,
    /** Container where the invocation began. */
    readonly requestor: ContainerReference,
    /** Exact runtime failure branch when the invoke guard can model one. */
    readonly failureKind: ContainerResolutionFailureKind | null = null,
  ) {}

  get keyIdentityHandle(): IdentityHandle {
    return this.key.identityHandle;
  }

  get frameworkErrorCode(): DiFrameworkErrorCodeValue | null {
    return frameworkErrorCodeForContainerResolutionFailureKind(this.failureKind);
  }
}

export class ContainerResourceLookup {
  readonly kind = 'container-resource-lookup' as const;

  constructor(
    /** Lookup state for resource-key search. */
    readonly state: ContainerLookupState,
    /** Runtime resource key string such as `au:ce:my-element`. */
    readonly resourceKey: string,
    /** Container where the request began. */
    readonly requestor: ContainerReference,
    /** Container that owned the matching resource slot, when there was a hit. */
    readonly owner: ContainerReference | null,
    /** Resource slot found for the key. */
    readonly resourceSlot: ContainerResourceSlot | null,
  ) {}
}

export function frameworkErrorCodeForContainerResolutionFailureKind(
  failureKind: ContainerResolutionFailureKind | null,
): DiFrameworkErrorCodeValue | null {
  switch (failureKind) {
    case ContainerResolutionFailureKind.NoneResolverFound:
      return DiFrameworkErrorCode.NoneResolverFound;
    case ContainerResolutionFailureKind.UnableJitNonConstructor:
      return DiFrameworkErrorCode.UnableJitNonConstructor;
    case ContainerResolutionFailureKind.NoJitIntrinsicType:
      return DiFrameworkErrorCode.NoJitIntrinsicType;
    case ContainerResolutionFailureKind.NoJitInterface:
      return DiFrameworkErrorCode.NoJitInterface;
    case ContainerResolutionFailureKind.NoConstructNativeFunction:
      return DiFrameworkErrorCode.NoConstructNativeFunction;
    case ContainerResolutionFailureKind.NullUndefinedKey:
      return DiFrameworkErrorCode.NullUndefinedKey;
    case ContainerResolutionFailureKind.NullResolverFromRegister:
      return DiFrameworkErrorCode.NullResolverFromRegister;
    case ContainerResolutionFailureKind.InvalidNewInstanceOnInterface:
      return DiFrameworkErrorCode.InvalidNewInstanceOnInterface;
    case null:
      return null;
  }
}

/** Runtime `_jitRegister` failures that depend only on the resolved key shape. */
export function containerJitRegistrationFailureKind(
  key: ContainerLookupKey,
): ContainerResolutionFailureKind | null {
  switch (key.keyKind) {
    case ContainerLookupKeyKind.IntrinsicConstructable:
      return ContainerResolutionFailureKind.NoJitIntrinsicType;
    case ContainerLookupKeyKind.String:
    case ContainerLookupKeyKind.Symbol:
    case ContainerLookupKeyKind.Resource:
    case ContainerLookupKeyKind.Object:
    case ContainerLookupKeyKind.Primitive:
    case ContainerLookupKeyKind.Nullish:
      return ContainerResolutionFailureKind.UnableJitNonConstructor;
    case ContainerLookupKeyKind.Interface:
      return ContainerResolutionFailureKind.NoJitInterface;
    case ContainerLookupKeyKind.Unknown:
    case ContainerLookupKeyKind.Constructable:
    case ContainerLookupKeyKind.NativeFunction:
    case ContainerLookupKeyKind.Registry:
    case ContainerLookupKeyKind.Resolver:
      return null;
  }
}

/** Runtime `getFactory` failures that depend only on the resolved key shape. */
export function containerFactoryFailureKind(
  key: ContainerLookupKey,
): ContainerResolutionFailureKind | null {
  switch (key.keyKind) {
    case ContainerLookupKeyKind.NativeFunction:
    case ContainerLookupKeyKind.IntrinsicConstructable:
      return ContainerResolutionFailureKind.NoConstructNativeFunction;
    case ContainerLookupKeyKind.String:
    case ContainerLookupKeyKind.Symbol:
    case ContainerLookupKeyKind.Resource:
    case ContainerLookupKeyKind.Object:
    case ContainerLookupKeyKind.Primitive:
    case ContainerLookupKeyKind.Nullish:
    case ContainerLookupKeyKind.Interface:
    case ContainerLookupKeyKind.Registry:
    case ContainerLookupKeyKind.Resolver:
      return ContainerResolutionFailureKind.UnableJitNonConstructor;
    case ContainerLookupKeyKind.Unknown:
    case ContainerLookupKeyKind.Constructable:
      return null;
  }
}

/** Runtime `invoke` failures that depend only on the resolved key shape. */
export function containerInvocationFailureKind(
  key: ContainerLookupKey,
): ContainerResolutionFailureKind | null {
  switch (key.keyKind) {
    case ContainerLookupKeyKind.NativeFunction:
    case ContainerLookupKeyKind.IntrinsicConstructable:
      return ContainerResolutionFailureKind.NoConstructNativeFunction;
    case ContainerLookupKeyKind.String:
    case ContainerLookupKeyKind.Symbol:
    case ContainerLookupKeyKind.Resource:
    case ContainerLookupKeyKind.Object:
    case ContainerLookupKeyKind.Primitive:
    case ContainerLookupKeyKind.Nullish:
    case ContainerLookupKeyKind.Unknown:
    case ContainerLookupKeyKind.Constructable:
    case ContainerLookupKeyKind.Registry:
    case ContainerLookupKeyKind.Resolver:
    case ContainerLookupKeyKind.Interface:
      return null;
  }
}
