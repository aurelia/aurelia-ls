import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  ContainerIdentity,
  DiProductIdentity,
} from '../kernel/identity.js';
import type { KernelStore } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';

/** Read-only projection of existing DI container and slot facts. */
export class DiContainerChainFacts {
  constructor(
    private readonly containersByIdentity: ReadonlyMap<IdentityHandle, ContainerIdentity>,
    private readonly containerIdentitiesByProduct: ReadonlyMap<ProductHandle, IdentityHandle>,
    private readonly owningContainerIdentitiesByProduct: ReadonlyMap<ProductHandle, IdentityHandle>,
    private readonly providerContainerIdentitiesByKey: ReadonlyMap<IdentityHandle, readonly IdentityHandle[]>,
  ) {}

  containerIdentity(handle: IdentityHandle): ContainerIdentity | null {
    return this.containersByIdentity.get(handle) ?? null;
  }

  containerIdentityHandleForProduct(productHandle: ProductHandle | null): IdentityHandle | null {
    return productHandle == null
      ? null
      : this.containerIdentitiesByProduct.get(productHandle) ?? null;
  }

  owningContainerIdentityHandleForProduct(productHandle: ProductHandle | null): IdentityHandle | null {
    return productHandle == null
      ? null
      : this.owningContainerIdentitiesByProduct.get(productHandle) ?? null;
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

  containerChainIdentityHandles(containerIdentityHandle: IdentityHandle): readonly IdentityHandle[] {
    const chain: IdentityHandle[] = [];
    const seen = new Set<IdentityHandle>();
    let currentHandle: IdentityHandle | null = containerIdentityHandle;
    while (currentHandle != null && !seen.has(currentHandle)) {
      seen.add(currentHandle);
      chain.push(currentHandle);
      const current: ContainerIdentity | null = this.containersByIdentity.get(currentHandle) ?? null;
      if (current == null) {
        break;
      }
      currentHandle = current.parentHandle;
      if (
        currentHandle == null
        && current.rootHandle != null
        && !seen.has(current.rootHandle)
      ) {
        currentHandle = current.rootHandle;
      }
    }
    return chain;
  }
}

export function readDiContainerChainFacts(store: KernelStore): DiContainerChainFacts {
  const containersByIdentity = new Map<IdentityHandle, ContainerIdentity>();
  const containerIdentitiesByProduct = new Map<ProductHandle, IdentityHandle>();
  const diProductIdentitiesByIdentity = new Map<IdentityHandle, DiProductIdentity>();
  const diProductIdentitiesByProduct = new Map<ProductHandle, DiProductIdentity>();
  const providerContainerIdentitiesByKey = new Map<IdentityHandle, Set<IdentityHandle>>();

  for (const identity of store.readIdentities()) {
    if (identity.kind === 'container-identity') {
      containersByIdentity.set(identity.handle, identity);
    } else if (identity.kind === 'di-product-identity') {
      diProductIdentitiesByIdentity.set(identity.handle, identity);
    }
  }

  for (const product of store.readProducts()) {
    if (product.identityHandle == null) {
      continue;
    }
    if (
      product.productKindKey === KernelVocabulary.Di.Container.key
      && containersByIdentity.has(product.identityHandle)
    ) {
      containerIdentitiesByProduct.set(product.handle, product.identityHandle);
    }
    const productIdentity = diProductIdentitiesByIdentity.get(product.identityHandle) ?? null;
    if (productIdentity != null) {
      diProductIdentitiesByProduct.set(product.handle, productIdentity);
    }
  }

  for (const claim of store.readClaims()) {
    if (claim.predicateKey !== KernelVocabulary.Di.ProvidesKey.key) {
      continue;
    }
    const productIdentity = diProductIdentitiesByProduct.get(claim.subjectHandle as ProductHandle) ?? null;
    if (productIdentity?.containerHandle == null) {
      continue;
    }
    addToSet(
      providerContainerIdentitiesByKey,
      claim.objectHandle as IdentityHandle,
      productIdentity.containerHandle,
    );
  }

  return new DiContainerChainFacts(
    containersByIdentity,
    containerIdentitiesByProduct,
    new Map([...diProductIdentitiesByProduct].flatMap(([productHandle, identity]) =>
      identity.containerHandle == null ? [] : [[productHandle, identity.containerHandle]]
    )),
    freezeSetMap(providerContainerIdentitiesByKey),
  );
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
