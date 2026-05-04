import { auLink } from '../kernel/au-link.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum ContainerDefaultResolverPolicy {
  /** Runtime `DefaultResolver.none`: missing keys stay unresolved. */
  None = 'none',
  /** Runtime `DefaultResolver.singleton`: missing constructable keys register as singletons. */
  Singleton = 'singleton',
  /** Runtime `DefaultResolver.transient`: missing constructable keys register as transients. */
  Transient = 'transient',
  /** A custom default resolver function exists and must be interpreted by a later pass. */
  Custom = 'custom',
}

export type ContainerConfigurationField =
  | 'inheritParentResources'
  | 'defaultResolverPolicy'
  | 'source';

export class ContainerConfigurationInput {
  constructor(
    /** Whether child containers copy parent resource resolver rows at construction. */
    readonly inheritParentResources: boolean | null = null,
    /** Modeled default resolver policy, when statically known. */
    readonly defaultResolverPolicy: ContainerDefaultResolverPolicy | null = null,
    /** Source address for the configuration object or factory expression. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Field-level provenance for configuration properties. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerConfigurationField>[] = [],
  ) {}
}

/** Runtime-shaped container configuration value. */
@auLink('kernel:ContainerConfiguration')
export class ContainerConfiguration {
  static readonly DEFAULT = new ContainerConfiguration(
    false,
    ContainerDefaultResolverPolicy.Singleton,
    null,
    [],
  );

  constructor(
    /** Whether child containers copy parent resource resolver rows at construction. */
    readonly inheritParentResources: boolean,
    /** Modeled default resolver policy used for missing keys. */
    readonly defaultResolverPolicy: ContainerDefaultResolverPolicy,
    /** Source address for the configuration object or factory expression. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Field-level provenance for configuration properties. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerConfigurationField>[] = [],
  ) {}

  static from(input: ContainerConfiguration | ContainerConfigurationInput | null | undefined): ContainerConfiguration {
    if (input == null || input === ContainerConfiguration.DEFAULT) {
      return ContainerConfiguration.DEFAULT;
    }
    return new ContainerConfiguration(
      input.inheritParentResources ?? false,
      input.defaultResolverPolicy ?? ContainerDefaultResolverPolicy.Singleton,
      input.sourceAddressHandle,
      input.fieldProvenance,
    );
  }
}
