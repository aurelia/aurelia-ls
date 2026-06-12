import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  RegistrationKeyReference,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import type { Container } from './container.js';
import {
  containerLookupKeyForRegistrationKey,
} from './container-key.js';
import type { ContainerReference } from './container-reference.js';
import type { ContainerResolverLookup } from './container-lookup.js';

export type RegistryField =
  | 'key'
  | 'params'
  | 'registryValue'
  | 'source';

export const enum RegistryRegistrationState {
  /** Runtime would delegate registration to the registry resolved by the parameterized key. */
  Delegated = 'delegated',
  /** Runtime would register object-like parameter values directly against the container. */
  ParameterAdmission = 'parameter-admission',
  /** Registry behavior exists but cannot be interpreted by this layer yet. */
  Open = 'open',
}

export class RegistryRegistrationResult {
  readonly kind = 'registry-registration-result' as const;

  constructor(
    /** Runtime branch selected by abstract registry registration. */
    readonly state: RegistryRegistrationState,
    /** Registry value that produced this result. */
    readonly registry: RegistryValue | ParameterizedRegistry,
    /** Container against which the registry was applied. */
    readonly container: ContainerReference,
    /** Registry lookup used by delegated parameterized registration, when applicable. */
    readonly registryLookup: ContainerResolverLookup | null,
    /** Parameters offered to the registry. */
    readonly params: readonly RegistrationValueReference[],
  ) {}
}

/**
 * IRegistry-shaped value. The body remains an open registration boundary until the evaluator can interpret it.
 */
@auLink('kernel:IRegistry')
export class RegistryValue {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this registry value. */
    readonly productHandle: ProductHandle,
    /** Registry identity when the source value has been classified. */
    readonly identityHandle: IdentityHandle,
    /** Source-level registry carrier. */
    readonly registryValue: RegistrationValueReference | null,
    /** Source address for the registry-producing expression or declaration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for registry fields that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistryField>[] = [],
  ) {}

  /** Runtime `register(container, ...params)` shape. Arbitrary registry bodies are not executed here. */
  register(container: Container, ...params: RegistrationValueReference[]): RegistryRegistrationResult {
    return new RegistryRegistrationResult(
      RegistryRegistrationState.Open,
      this,
      container.toReference(),
      null,
      params,
    );
  }
}

/**
 * Runtime-shaped ParameterizedRegistry produced by deferred registration.
 */
@auLink('kernel:ParameterizedRegistry')
export class ParameterizedRegistry {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this registry. */
    readonly productHandle: ProductHandle,
    /** Registry identity for this parameterized registry value. */
    readonly identityHandle: IdentityHandle,
    /** Key used to look up the registry to delegate to. */
    readonly key: RegistrationKeyReference,
    /** Parameters passed to the delegated registry or admitted directly. */
    readonly params: readonly RegistrationValueReference[],
    /** Source address for the `Registration.defer(...)` expression. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for registry fields that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RegistryField>[] = [],
  ) {}

  /** Runtime `register(container)` shape represented as a branch result. */
  register(container: Container): RegistryRegistrationResult {
    const lookupKey = containerLookupKeyForRegistrationKey(this.key);
    if (lookupKey == null) {
      return new RegistryRegistrationResult(
        RegistryRegistrationState.Open,
        this,
        container.toReference(),
        null,
        this.params,
      );
    }

    if (container.has(lookupKey, true)) {
      return new RegistryRegistrationResult(
        RegistryRegistrationState.Delegated,
        this,
        container.toReference(),
        container.getResolver(lookupKey, false),
        this.params,
      );
    }

    return new RegistryRegistrationResult(
      RegistryRegistrationState.ParameterAdmission,
      this,
      container.toReference(),
      null,
      this.params,
    );
  }
}
