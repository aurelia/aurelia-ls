import type { Container } from '../di/container.js';
import {
  containerLookupKeyForRegistrationKey,
  type ContainerLookupKey,
} from '../di/container-key.js';
import { ContainerLookupState } from '../di/container-lookup.js';
import type { ContainerReference } from '../di/container-reference.js';
import { ContainerResolverSlot } from '../di/container-slot.js';
import { Resolver } from '../di/resolver.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import type { StateStoreConfiguration } from './model.js';

const STATE_STORE_REGISTRY_KEY_NAME = 'IStoreRegistry';

export const enum StateStoreRegistryVisibilityKind {
  /** The selected IStoreRegistry is framework-owned and its configured store membership is closed. */
  Closed = 'closed',
  /** A custom or otherwise unresolved IStoreRegistry owns the lookup, so known stores are only a lower bound. */
  Open = 'open',
  /** No IStoreRegistry provider is visible on the consulting container chain. */
  Absent = 'absent',
}

/** Container-local view of the stores that one runtime IStoreRegistry can expose. */
export class StateStoreVisibilitySelection {
  constructor(
    readonly visibilityKind: StateStoreRegistryVisibilityKind,
    readonly stores: readonly StateStoreConfiguration[],
    readonly registryOwner: ContainerReference | null,
    readonly openReason: string | null,
  ) {}
}

/**
 * Selects applied state-store definitions through the same nearest-provider rule used by Aurelia DI.
 *
 * Store definitions remain source products. This projection spends their registration-container ownership without
 * constructing Store, executing AppTasks, or interpreting custom IStoreRegistry implementations.
 */
export class StateStoreVisibility {
  private readonly containersByIdentity = new Map<IdentityHandle, Container>();
  private readonly containersByProduct = new Map<ProductHandle, Container>();
  private readonly storesByContainerIdentity = new Map<IdentityHandle, StateStoreConfiguration[]>();

  private constructor(
    readonly stores: readonly StateStoreConfiguration[],
    containers: readonly Container[],
    private readonly registryKey: ContainerLookupKey | null,
    private readonly registryKeyOpenReason: string | null,
  ) {
    for (const container of containers) {
      this.containersByIdentity.set(container.identityHandle, container);
      this.containersByProduct.set(container.productHandle, container);
    }
    for (const store of stores) {
      const containerIdentityHandle = store.container.identityHandle;
      if (containerIdentityHandle == null) {
        continue;
      }
      const owned = this.storesByContainerIdentity.get(containerIdentityHandle);
      if (owned == null) {
        this.storesByContainerIdentity.set(containerIdentityHandle, [store]);
      } else {
        owned.push(store);
      }
    }
  }

  static empty(): StateStoreVisibility {
    return new StateStoreVisibility([], [], null, null);
  }

  static fromDiWorld(
    stores: readonly StateStoreConfiguration[],
    world: DiWorldConstructionEmission,
  ): StateStoreVisibility {
    const keySelection = stateStoreRegistryKey(world);
    return new StateStoreVisibility(
      stores,
      world.containers,
      keySelection.key,
      keySelection.openReason,
    );
  }

  withContainers(containers: readonly Container[]): StateStoreVisibility {
    return new StateStoreVisibility(
      this.stores,
      [
        ...this.containersByIdentity.values(),
        ...containers,
      ],
      this.registryKey,
      this.registryKeyOpenReason,
    );
  }

  selectionForResourceScope(
    resourceScope: TemplateResourceScope | null,
  ): StateStoreVisibilitySelection {
    return resourceScope == null
      ? this.defaultSelection()
      : this.selectionForContainerReference(resourceScope.container);
  }

  selectionForContainerReference(
    reference: ContainerReference | null,
  ): StateStoreVisibilitySelection {
    const container = reference?.identityHandle == null
      ? reference?.productHandle == null
        ? null
        : this.containersByProduct.get(reference.productHandle) ?? null
      : this.containersByIdentity.get(reference.identityHandle) ?? null;
    if (container == null) {
      return this.openSelection(
        'The active DI container was not retained, so semantic-runtime cannot choose its effective IStoreRegistry.',
      );
    }
    return this.selectionForContainer(container);
  }

  selectionForContainer(
    container: Container | null,
  ): StateStoreVisibilitySelection {
    if (container == null) {
      return this.defaultSelection();
    }
    if (this.registryKey == null) {
      return this.registryKeyOpenReason == null
        ? new StateStoreVisibilitySelection(
            StateStoreRegistryVisibilityKind.Absent,
            [],
            null,
            null,
          )
        : this.openSelection(this.registryKeyOpenReason);
    }

    const lookup = container.getResolver(this.registryKey, false);
    if (lookup.state !== ContainerLookupState.Hit || lookup.owner?.identityHandle == null) {
      return new StateStoreVisibilitySelection(
        StateStoreRegistryVisibilityKind.Absent,
        [],
        null,
        null,
      );
    }

    const stores = this.storesByContainerIdentity.get(lookup.owner.identityHandle) ?? [];
    const firstSlot = lookup.resolverSlots[0] ?? null;
    if (stateDefaultConfigurationOwnsRegistrySlot(firstSlot)) {
      return new StateStoreVisibilitySelection(
        StateStoreRegistryVisibilityKind.Closed,
        stores,
        lookup.owner,
        null,
      );
    }
    return new StateStoreVisibilitySelection(
      StateStoreRegistryVisibilityKind.Open,
      stores,
      lookup.owner,
      'The effective IStoreRegistry is supplied by application code; its runtime store membership is not statically closed.',
    );
  }

  defaultSelection(): StateStoreVisibilitySelection {
    if (this.registryKey == null) {
      return this.registryKeyOpenReason == null
        ? new StateStoreVisibilitySelection(
            StateStoreRegistryVisibilityKind.Absent,
            [],
            null,
            null,
          )
        : this.openSelection(this.registryKeyOpenReason);
    }
    const registryKey = this.registryKey;
    const providers = [...this.containersByIdentity.values()].filter((container) =>
      container.readResolverSlots(registryKey.identityHandle).length > 0
    );
    if (providers.length === 1) {
      return this.selectionForContainer(providers[0]!);
    }
    if (providers.length === 0) {
      return new StateStoreVisibilitySelection(
        StateStoreRegistryVisibilityKind.Absent,
        [],
        null,
        null,
      );
    }
    return this.openSelection(
      'Multiple DI container trees provide IStoreRegistry; an active runtime container is required to choose one.',
    );
  }

  private openSelection(reason: string): StateStoreVisibilitySelection {
    return new StateStoreVisibilitySelection(
      StateStoreRegistryVisibilityKind.Open,
      [],
      null,
      reason,
    );
  }
}

function stateStoreRegistryKey(
  world: DiWorldConstructionEmission,
): { readonly key: ContainerLookupKey | null; readonly openReason: string | null } {
  const keys = world.resolvers.flatMap((resolver) => {
    if (!(resolver instanceof Resolver) || resolver._key.localName !== STATE_STORE_REGISTRY_KEY_NAME) {
      return [];
    }
    const key = containerLookupKeyForRegistrationKey(resolver._key);
    return key == null ? [] : [key];
  });
  const keysByIdentity = new Map(keys.map((key) => [key.identityHandle, key]));
  if (keysByIdentity.size === 1) {
    return { key: [...keysByIdentity.values()][0]!, openReason: null };
  }
  if (keysByIdentity.size === 0) {
    return { key: null, openReason: null };
  }
  return {
    key: null,
    openReason: 'IStoreRegistry resolved to multiple DI key identities, so container-local store visibility is ambiguous.',
  };
}

function stateDefaultConfigurationOwnsRegistrySlot(
  slot: unknown,
): boolean {
  return slot instanceof ContainerResolverSlot
    && slot.resolver instanceof Resolver
    && slot.resolver._state?.frameworkKind === FrameworkRegistrationKind.StateDefaultConfiguration;
}
