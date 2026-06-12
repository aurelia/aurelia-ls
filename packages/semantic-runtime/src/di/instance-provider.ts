import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { RegistrationValueReference } from '../registration/registration-reference.js';
import type { Container } from './container.js';
import type {
  ContainerFactoryLookup,
} from './container-lookup.js';
import type { ContainerLookupKey } from './container-key.js';
import {
  DiFrameworkErrorCode,
  type DiFrameworkErrorCode as DiFrameworkErrorCodeValue,
} from './framework-error-code.js';

export type InstanceProviderField =
  | '_instance'
  | '_name'
  | '_Type'
  | 'source';

export const enum InstanceProviderResolutionKind {
  /** Provider has a prepared instance value. */
  Instance = 'instance',
  /** Provider was resolved before prepare or after dispose. */
  NoInstanceProvided = 'no-instance-provided',
}

export class InstanceProviderResolution {
  readonly kind = 'instance-provider-resolution' as const;

  constructor(
    /** Runtime provider branch selected by the abstract resolver. */
    readonly resolutionKind: InstanceProviderResolutionKind,
    /** Provider that produced the answer. */
    readonly provider: InstanceProvider,
    /** Value returned by the provider, when prepared. */
    readonly value: RegistrationValueReference | null,
  ) {}

  get frameworkErrorCode(): DiFrameworkErrorCodeValue | null {
    return this.resolutionKind === InstanceProviderResolutionKind.NoInstanceProvided
      ? DiFrameworkErrorCode.NoInstanceProvided
      : null;
  }
}

/**
 * Runtime-shaped `InstanceProvider`. It is common in runtime-html contextual DI slots, where the framework installs
 * already-created controller, host, hydration, or app-root instances and rejects reads before prepare/after dispose.
 */
@auLink('kernel:InstanceProvider')
export class InstanceProvider {
  private _instance: RegistrationValueReference | null;
  private readonly _name: string | null;
  private readonly _Type: ContainerLookupKey | null;

  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this provider. */
    readonly productHandle: ProductHandle,
    /** Provider identity for this runtime-shaped resolver value. */
    readonly identityHandle: IdentityHandle,
    /** Human-oriented provider name used by Aurelia error details. */
    name: string | null,
    /** Prepared instance value. Null means unresolved or disposed. */
    instance: RegistrationValueReference | null,
    /** Constructable type used by `getFactory(...)`, when the provider owns one. */
    type: ContainerLookupKey | null,
    /** Source address for the provider-producing renderer/controller operation. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for provider fields that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<InstanceProviderField>[] = [],
  ) {
    this._name = name;
    this._instance = instance;
    this._Type = type;
  }

  get $isResolver(): true {
    return true;
  }

  get friendlyName(): string | null {
    return this._name;
  }

  prepare(instance: RegistrationValueReference): void {
    this._instance = instance;
  }

  resolve(): InstanceProviderResolution {
    return new InstanceProviderResolution(
      this._instance == null
        ? InstanceProviderResolutionKind.NoInstanceProvided
        : InstanceProviderResolutionKind.Instance,
      this,
      this._instance,
    );
  }

  getFactory(container: Container): ContainerFactoryLookup | null {
    return this._Type == null ? null : container.getFactory(this._Type);
  }

  dispose(): void {
    this._instance = null;
  }
}
