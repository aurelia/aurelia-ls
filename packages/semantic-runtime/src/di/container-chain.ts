import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { KernelStoreReadView } from '../kernel/store.js';
import type { Container } from './container.js';
import type { DiWorldConstructionEmission } from './world-construction.js';

/** Read-only projection of existing DI container and slot facts. */
export class DiContainerChainFacts {
  constructor(
    private readonly containersByIdentity: ReadonlyMap<IdentityHandle, Container>,
    private readonly containerIdentitiesByProduct: ReadonlyMap<ProductHandle, IdentityHandle>,
    private readonly providerContainerIdentitiesByKey: ReadonlyMap<IdentityHandle, readonly IdentityHandle[]>,
    private readonly containerProductHandlesBySourceSpan: ReadonlyMap<string, ProductHandle | null>,
  ) {}

  /** Extend this immutable projection with runtime child containers created after app-world DI spending. */
  withContainers(
    store: KernelStoreReadView,
    containers: readonly Container[],
  ): DiContainerChainFacts {
    const containersByIdentity = new Map(this.containersByIdentity);
    const containerIdentitiesByProduct = new Map(this.containerIdentitiesByProduct);
    const providerContainerIdentitiesByKey = new Map<IdentityHandle, Set<IdentityHandle>>(
      [...this.providerContainerIdentitiesByKey].map(([key, providers]) => [key, new Set(providers)]),
    );
    const containerProductHandlesBySourceSpan = new Map(this.containerProductHandlesBySourceSpan);
    for (const container of containers) {
      containersByIdentity.set(container.identityHandle, container);
      containerIdentitiesByProduct.set(container.productHandle, container.identityHandle);
      for (const slot of container.readResolverSlots()) {
        recordProviderContainer(providerContainerIdentitiesByKey, slot.keyIdentityHandle, slot.container.identityHandle);
      }
      for (const slot of container.readResourceSlots()) {
        recordProviderContainer(providerContainerIdentitiesByKey, slot.keyIdentityHandle, slot.container.identityHandle);
      }
      recordContainerSourceSpan(store, containerProductHandlesBySourceSpan, container);
    }
    return new DiContainerChainFacts(
      containersByIdentity,
      containerIdentitiesByProduct,
      freezeSetMap(providerContainerIdentitiesByKey),
      containerProductHandlesBySourceSpan,
    );
  }

  containerIdentityHandleForProduct(productHandle: ProductHandle | null): IdentityHandle | null {
    return productHandle == null
      ? null
      : this.containerIdentitiesByProduct.get(productHandle) ?? null;
  }

  providerContainerIdentityHandlesForKey(keyIdentityHandle: IdentityHandle): readonly IdentityHandle[] {
    return this.providerContainerIdentitiesByKey.get(keyIdentityHandle) ?? [];
  }

  hasProviderForKey(keyIdentityHandle: IdentityHandle): boolean {
    return this.providerContainerIdentityHandlesForKey(keyIdentityHandle).length > 0;
  }

  providerIsOnConsultingChain(
    keyIdentityHandle: IdentityHandle,
    consultingContainerIdentityHandle: IdentityHandle,
  ): boolean {
    const chain = new Set(this.containerChainIdentityHandles(consultingContainerIdentityHandle));
    return this.providerContainerIdentityHandlesForKey(keyIdentityHandle).some((providerContainer) =>
      chain.has(providerContainer)
    );
  }

  containerProductHandleForSourceSpan(
    sourceFileAddressHandle: AddressHandle,
    start: number,
    end: number,
  ): ProductHandle | null {
    return this.containerProductHandlesBySourceSpan.get(
      containerSourceSpanKey(sourceFileAddressHandle, start, end),
    ) ?? null;
  }

  containerChainIdentityHandles(containerIdentityHandle: IdentityHandle): readonly IdentityHandle[] {
    const chain: IdentityHandle[] = [];
    const seen = new Set<IdentityHandle>();
    let currentHandle: IdentityHandle | null = containerIdentityHandle;
    while (currentHandle != null && !seen.has(currentHandle)) {
      seen.add(currentHandle);
      chain.push(currentHandle);
      const current: Container | null = this.containersByIdentity.get(currentHandle) ?? null;
      if (current == null) {
        break;
      }
      currentHandle = current.readParentReference()?.identityHandle ?? null;
      const rootIdentityHandle: IdentityHandle | null = current.readRootReference().identityHandle;
      if (currentHandle == null && rootIdentityHandle != null && !seen.has(rootIdentityHandle)) {
        currentHandle = rootIdentityHandle;
      }
    }
    return chain;
  }
}

export function readDiContainerChainFacts(
  store: KernelStoreReadView,
  world: DiWorldConstructionEmission,
): DiContainerChainFacts {
  return new DiContainerChainFacts(new Map(), new Map(), new Map(), new Map())
    .withContainers(store, world.containers);
}

function recordContainerSourceSpan(
  store: KernelStoreReadView,
  productsBySourceSpan: Map<string, ProductHandle | null>,
  container: Container,
): void {
  const source = container.sourceAddressHandle == null
    ? null
    : store.read(container.sourceAddressHandle);
  if (source?.kind !== 'source-span-address') {
    return;
  }
  const key = containerSourceSpanKey(source.fileHandle, source.start, source.end);
  const existing = productsBySourceSpan.get(key);
  productsBySourceSpan.set(
    key,
    existing === undefined || existing === container.productHandle ? container.productHandle : null,
  );
}

function recordProviderContainer(
  providers: Map<IdentityHandle, Set<IdentityHandle>>,
  keyIdentityHandle: IdentityHandle,
  containerIdentityHandle: IdentityHandle | null,
): void {
  if (containerIdentityHandle != null) {
    addToSet(providers, keyIdentityHandle, containerIdentityHandle);
  }
}

function containerSourceSpanKey(
  sourceFileAddressHandle: AddressHandle,
  start: number,
  end: number,
): string {
  return `${sourceFileAddressHandle}\0${start}\0${end}`;
}

function addToSet<TKey, TValue>(
  map: Map<TKey, Set<TValue>>,
  key: TKey,
  value: TValue,
): void {
  const existing = map.get(key);
  if (existing == null) {
    map.set(key, new Set([value]));
  } else {
    existing.add(value);
  }
}

function freezeSetMap<TKey, TValue>(
  map: ReadonlyMap<TKey, ReadonlySet<TValue>>,
): ReadonlyMap<TKey, readonly TValue[]> {
  return new Map([...map].map(([key, values]) => [key, [...values]]));
}
