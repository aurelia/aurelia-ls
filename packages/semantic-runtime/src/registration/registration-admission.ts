import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  FrameworkRegistrationKind,
  RegistrationKeyReference,
  RegistrationValueReference,
} from './registration-reference.js';

export const enum RegistrationAdmissionKind {
  /** Admission produced by a `Registration.*` factory call. */
  RegistrationFactory = 'registration-factory',
  /** Admission produced by a direct `container.register(...)` argument. */
  ContainerRegisterArgument = 'container-register-argument',
  /** Admission produced by a direct `aurelia.register(...)` argument. */
  AureliaRegisterArgument = 'aurelia-register-argument',
  /** Admission produced by the browser `aurelia` facade's default container setup. */
  AureliaFacadeDefault = 'aurelia-facade-default',
  /** Admission produced by an `IRegistry.register(container)` method. */
  RegistryMethod = 'registry-method',
  /** Admission produced by a resource definition's register behavior. */
  ResourceDefinition = 'resource-definition',
  /** Admission produced by a static `$au` resource class. */
  StaticResource = 'static-resource',
  /** Admission produced by an ordinary class fallback self-registration. */
  PlainClassFallback = 'plain-class-fallback',
  /** Admission produced by one value inside an object-map registration. */
  ObjectMapEntry = 'object-map-entry',
}

export const enum RegistrationStrategy {
  /** Use when the registration strategy could not be classified. */
  Unknown = 'unknown',
  /** Store and return a concrete instance value. */
  Instance = 'instance',
  /** Lazily construct once, then return the same instance. */
  Singleton = 'singleton',
  /** Construct a new instance for each resolution. */
  Transient = 'transient',
  /** Invoke a callback for each resolution. */
  Callback = 'callback',
  /** Invoke a callback once and cache its result. */
  CachedCallback = 'cached-callback',
  /** Redirect one key to another key. */
  AliasTo = 'alias-to',
  /** Produce a deferred registry that depends on resolution parameters. */
  Defer = 'defer',
  /** Admit an IRegistry-compatible value that will register itself. */
  Registry = 'registry',
  /** Register a resource key and aliases for a resource definition or static `$au` type. */
  Resource = 'resource',
  /** Register a plain class as itself. */
  PlainClassSelf = 'plain-class-self',
  /** Recursively admit object/function values from an object map. */
  ObjectMap = 'object-map',
  /** Register an explicit resolver object. */
  Resolver = 'resolver',
  /** Runtime array resolver that preserves multiple resolver rows for the same key. */
  Array = 'array',
  /** Register a factory object for a constructable key. */
  Factory = 'factory',
  /** Source-level spread of a known framework registration group; runtime sees the expanded values. */
  FrameworkGroup = 'framework-group',
}

export const enum RegistrationKeyRole {
  /** Use when a key expression exists but its role in registration flow is not closed yet. */
  Unknown = 'unknown',
  /** The key is offered as a provider key to later DI world construction. */
  AdmittedKey = 'admitted-key',
  /** The key is consulted to locate a registry that may admit other values. */
  RegistryLookupKey = 'registry-lookup-key',
}

export type RegistrationAdmissionField =
  | 'admissionKind'
  | 'strategy'
  | 'keyRole'
  | 'registryParameters'
  | 'resourceLookupNameOverride'
  | 'targetKey'
  | 'registeredValue'
  | 'source';

export type RegistrationAdmissionProduct =
  | OpenRegistrationAdmission
  | ResolverRegistrationAdmission
  | ParameterizedRegistryAdmission
  | RegistryRegistrationAdmission
  | ResourceRegistrationAdmission
  | FrameworkRegistrationAdmission;

/** Read the known framework registration effect carried by admission products that expose one. */
export function frameworkRegistrationKindForAdmission(
  admission: RegistrationAdmissionProduct,
): FrameworkRegistrationKind | null {
  if (admission instanceof FrameworkRegistrationAdmission) {
    return admission.frameworkKind;
  }
  if (admission instanceof RegistryRegistrationAdmission) {
    return admission.registryValue?.frameworkKind ?? null;
  }
  return null;
}

/**
 * Admission whose source carrier was observed but whose runtime effect is not classified enough to spend.
 */
export class OpenRegistrationAdmission {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this admission. */
    readonly productHandle: ProductHandle,
    /** Registration identity for this admission event. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that admitted this registration. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Best-known strategy, including `unknown` when recognition could not classify it. */
    readonly strategy: RegistrationStrategy,
    /** Best-known key role, including `unknown` when recognition could not classify it. */
    readonly keyRole: RegistrationKeyRole,
    /** DI key expression observed for this admission, or null while key classification is open. */
    readonly targetKey: RegistrationKeyReference | null,
    /** Value observed for this admission, or null while value classification is open. */
    readonly registeredValue: RegistrationValueReference | null,
    /** Source address for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to rename, explanation, or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[] = [],
  ) {}
}

/**
 * Resolver-producing registration intent before it is spent into resolver rows or DI lookup answers.
 */
export class ResolverRegistrationAdmission {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this admission. */
    readonly productHandle: ProductHandle,
    /** Registration identity for this admission event. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that admitted this registration. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Runtime registration strategy represented by this admission. */
    readonly strategy: RegistrationStrategy,
    /** Role played by the observed key expression. */
    readonly keyRole: RegistrationKeyRole,
    /** DI key expression observed for this admission, or null while key classification is open. */
    readonly targetKey: RegistrationKeyReference | null,
    /** Value, resolver, registry, resource, or alias target admitted for the key. */
    readonly registeredValue: RegistrationValueReference | null,
    /** Source address for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to rename, explanation, or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[] = [],
  ) {}
}

export function isResolverRegistrationStrategy(strategy: RegistrationStrategy): boolean {
  switch (strategy) {
    case RegistrationStrategy.Instance:
    case RegistrationStrategy.Singleton:
    case RegistrationStrategy.Transient:
    case RegistrationStrategy.Callback:
    case RegistrationStrategy.CachedCallback:
    case RegistrationStrategy.AliasTo:
    case RegistrationStrategy.Resolver:
    case RegistrationStrategy.Array:
      return true;
    case RegistrationStrategy.Unknown:
    case RegistrationStrategy.Defer:
    case RegistrationStrategy.Registry:
    case RegistrationStrategy.Resource:
    case RegistrationStrategy.PlainClassSelf:
    case RegistrationStrategy.ObjectMap:
    case RegistrationStrategy.Factory:
    case RegistrationStrategy.FrameworkGroup:
      return false;
  }
}

/**
 * Admission that can materialize the runtime ParameterizedRegistry produced by `Registration.defer(key, ...params)`.
 */
export class ParameterizedRegistryAdmission {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this registry. */
    readonly productHandle: ProductHandle,
    /** Registration identity for this registry-producing admission event. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that admitted this registry. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Key used to look up an existing registry before falling back to parameter registration. */
    readonly registryLookupKey: RegistrationKeyReference | null,
    /** Parameters that the runtime registry may pass back into container registration. */
    readonly registryParameters: readonly RegistrationValueReference[],
    /** Source address for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to rename, explanation, or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[] = [],
  ) {}
}

/**
 * Admission for an IRegistry-shaped value before its `register(container, ...params)` body has been spent.
 */
export class RegistryRegistrationAdmission {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this registry value. */
    readonly productHandle: ProductHandle,
    /** Registration identity for this registry admission event. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that admitted this registry. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Registry value that will later be analyzed or invoked abstractly by DI world construction. */
    readonly registryValue: RegistrationValueReference | null,
    /** Source address for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to rename, explanation, or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[] = [],
  ) {}
}

/**
 * Admission for a converged Aurelia resource definition before it is spent into runtime resource-key rows.
 */
export class ResourceRegistrationAdmission {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this admission. */
    readonly productHandle: ProductHandle,
    /** Registration identity for this resource admission event. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that admitted this resource. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Source-level value that carried the resource class or definition. */
    readonly registeredValue: RegistrationValueReference,
    /** Source address for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[] = [],
    /** Resource lookup name override passed to `ResourceDefinition.register(container, alias)`. */
    readonly resourceLookupNameOverride: string | null = null,
  ) {}
}

/**
 * Admission for a known framework-owned registration group before its expanded values have been spent.
 */
export class FrameworkRegistrationAdmission {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this admission. */
    readonly productHandle: ProductHandle,
    /** Registration identity for this framework admission event. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that admitted this framework registration group. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Known framework registration group or effect package recognized from source. */
    readonly frameworkKind: FrameworkRegistrationKind,
    /** Source-level value that carried the framework registration group. */
    readonly registeredValue: RegistrationValueReference | null,
    /** Source address for the admission expression. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[] = [],
  ) {}
}
