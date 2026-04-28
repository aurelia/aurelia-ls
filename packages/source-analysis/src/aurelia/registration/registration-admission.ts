import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import type {
  RegistrationContainerReference,
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
  /** Register a factory object for a constructable key. */
  Factory = 'factory',
}

export type RegistrationAdmissionField =
  | 'admissionKind'
  | 'strategy'
  | 'targetKey'
  | 'registeredValue'
  | 'container'
  | 'source';

/**
 * Normalized registration intent before it is spent into resolver rows, resource tables, or DI lookup answers.
 */
export class RegistrationAdmission {
  constructor(
    /** Registration identity for this admission event. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that admitted this registration. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Runtime registration strategy represented by this admission. */
    readonly strategy: RegistrationStrategy,
    /** DI key offered by this admission, or null while key classification is open. */
    readonly targetKey: RegistrationKeyReference | null,
    /** Value, resolver, registry, resource, or alias target admitted for the key. */
    readonly registeredValue: RegistrationValueReference | null,
    /** Container or app boundary receiving the admission when known. */
    readonly container: RegistrationContainerReference | null,
    /** Source address for the admission expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to rename, explanation, or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[] = [],
  ) {}
}
