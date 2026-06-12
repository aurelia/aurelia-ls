import { computed, nowrap } from '@aurelia/runtime';
import { watch } from '@aurelia/runtime-html';

interface Product {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
}

interface ProductKey {
  readonly code: string;
}

@nowrap
class ExternalWidget {
  readonly name = 'External';
}

class ExternalWidgetChild extends ExternalWidget {
  readonly label = 'Child';
}

class ExternalHolder {
  @nowrap external = new ExternalWidget();
}

class DeferredCallbackHost {
  defer(_callback: (product: Product) => string): boolean {
    return false;
  }
}

export class WatcherProxyDependenciesApp {
  products: Product[] = [
    { id: 'p1', name: 'Desk lamp', tags: ['featured', 'lighting'] },
    { id: 'p2', name: 'Monitor arm', tags: ['workspace'] },
  ];

  productGroups: Product[][] = [
    this.products,
  ];

  productKeys: ProductKey[] = [
    { code: 'p1' },
    { code: 'p2' },
  ];

  primitiveTags = ['featured', 'lighting'];

  selectedProductIndex = 0;

  selectedProductId = 'p1';

  productLookup: Record<string, Product> = Object.fromEntries(
    this.products.map((product) => [product.id, product]),
  );

  productByKey = new Map<ProductKey, Product>(this.productKeys.map((key, index) =>
    [key, this.products[index]]
  ));

  productById = new Map<string, Product>(this.products.map((product) =>
    [product.id, product]
  ));

  selectedProductIds = new Set(['p1']);

  searchLabel = 'featured';

  externalWidget = new ExternalWidgetChild();

  externalHolder = new ExternalHolder();

  createdAt = new Date('2026-05-19T00:00:00Z');

  lastError = new Error('pending');

  endpoint = new URL('https://example.com/catalog');

  namePattern = /Desk/;

  lookup = {
    get(_key: string): boolean {
      return false;
    },
  };

  callbackHost = new DeferredCallbackHost();

  @computed
  featuredProductSummary(): string {
    return this.products
      .filter((product) => product.tags.includes(this.searchLabel))
      .map((product) => product.name)
      .join(', ');
  }

  @computed({ deps: ['searchLabel'] })
  explicitSearchLabelSummary(): string {
    return `${this.searchLabel}:${this.selectedProductIds.size}`;
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.some((product) => product.tags.includes('featured')),
  )
  featuredProductsChanged(): void {
    this.selectedProductIds.clear();
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.every((product) => product.tags.length > 0),
  )
  everyProductHasTagsChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.findIndex((product) => product.id === vm.selectedProductId),
  )
  selectedProductIndexChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.indexOf(vm.products[0]!) >= 0,
  )
  productIndexOfChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.lastIndexOf(vm.products[1]!) >= 0,
  )
  productLastIndexOfChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.productGroups.flat().some((product) => product.tags.includes('featured')),
  )
  productFlatChanged(): void {
    this.selectedProductIds.delete('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.reduceRight((count, product) => count + product.tags.length, 0),
  )
  productReduceRightChanged(): void {
    this.selectedProductIds.delete('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.sort((left, right) => left.id.localeCompare(right.id)).length,
  )
  productSortChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    const { products } = vm;
    return products.some((product) => product.name.startsWith('Desk'));
  })
  productNameMatchChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.searchLabel.includes('feature') || vm.lookup.get('feature'),
  )
  nonCollectionMethodChanged(): void {
    this.selectedProductIds.delete('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.callbackHost.defer((deferredProduct) => deferredProduct.name),
  )
  deferredCallbackChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.externalWidget.name.includes(vm.searchLabel),
  )
  externalWidgetChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.externalHolder.external.name.includes(vm.searchLabel),
  )
  externalHolderChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.createdAt.getFullYear()
      + vm.lastError.message.length
      + vm.endpoint.pathname.length
      + vm.namePattern.source.length,
  )
  defaultLibraryObjectChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.reduce((count, product) => count + product.tags.length + count.toString().length, 0),
  )
  productTagCountChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    vm.productByKey.forEach((product, key) => {
      matched = matched || product.name.includes(key.code);
    });
    return matched;
  })
  productMapChanged(): void {
    this.selectedProductIds.clear();
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.primitiveTags.map((tag) => tag.length).join(','),
  )
  primitiveTagMapChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    vm.productById.forEach((product, id) => {
      matched = matched || product.name.includes(id.toUpperCase());
    });
    return matched;
  })
  productStringMapChanged(): void {
    this.selectedProductIds.clear();
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.productById.has(vm.selectedProductId),
  )
  productStringMapHasChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const product of vm.products) {
      matched = matched || product.tags.includes('featured');
    }
    return matched;
  })
  productForOfChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const [key, product] of vm.productByKey) {
      matched = matched || product.name.includes(key.code);
    }
    return matched;
  })
  productMapForOfChanged(): void {
    this.selectedProductIds.delete('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const [id, product] of vm.productById) {
      matched = matched || product.name.includes(id.toUpperCase());
    }
    return matched;
  })
  productStringMapForOfChanged(): void {
    this.selectedProductIds.delete('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const product of vm.productById.values()) {
      matched = matched || product.tags.includes('workspace');
    }
    return matched;
  })
  productStringMapValuesChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const index of vm.products.keys()) {
      matched = matched || index === vm.selectedProductIndex;
    }
    return matched;
  })
  productArrayKeysChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const id of vm.selectedProductIds.values()) {
      matched = matched || id === vm.selectedProductId;
    }
    return matched;
  })
  selectedProductSetValuesChanged(): void {
    this.selectedProductIds.delete('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const product of vm.products.values()) {
      matched = matched || product.tags.includes('lighting');
    }
    return matched;
  })
  productArrayValuesChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const [index, product] of vm.products.entries()) {
      matched = matched || product.name.includes(String(index));
    }
    return matched;
  })
  productArrayEntriesChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const key of vm.productByKey.keys()) {
      matched = matched || key.code === vm.selectedProductId;
    }
    return matched;
  })
  productMapKeysChanged(): void {
    this.selectedProductIds.delete('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    let matched = false;
    for (const index in vm.products) {
      matched = matched || index === '0';
    }
    return matched;
  })
  productArrayForInChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    [...vm.productKeys].length,
  )
  productKeySpreadChanged(): void {
    this.selectedProductIds.delete('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    const [firstProduct] = vm.products;
    return firstProduct.name.includes('Desk');
  })
  productArrayDestructureChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    const [tag] = vm.primitiveTags;
    return tag.length > 0;
  })
  primitiveTagArrayDestructureChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    const productName = vm.products[0]!.name;
    return productName.length > 0;
  })
  primitivePropertyAliasChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => {
    const key = vm.productKeys[0]!;
    return vm.productByKey.get(key)?.name.includes('Desk') === true;
  })
  productMapGetResultChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.productByKey.set(vm.productKeys[0]!, vm.products[0]!).get(vm.productKeys[0]!)?.name.includes('Desk') === true,
  )
  productMapSetResultChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.selectedProductIds.add('p2').has(vm.selectedProductId),
  )
  selectedProductSetAddResultChanged(): void {
    this.selectedProductIds.delete('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products.find((product) => product.id === 'p1')?.name.includes('Desk') === true,
  )
  productFindResultChanged(): void {
    this.selectedProductIds.delete('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products
      .flatMap((product) => product.tags)
      .includes('featured'),
  )
  productFlatMapIncludesChanged(): void {
    this.selectedProductIds.add('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products
      .slice(0, 1)
      .map((product) => product.name)
      .join(', '),
  )
  productSliceMapJoinChanged(): void {
    this.selectedProductIds.delete('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products
      .filter((product) => product.tags.includes('featured'))
      .map((product) => product.name)
      .join(', '),
  )
  productFilterMapJoinChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.products[vm.selectedProductIndex]?.name.includes('Desk') === true,
  )
  productDynamicArrayKeyChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) =>
    vm.productLookup[vm.selectedProductId]?.tags.includes('featured') === true,
  )
  productDynamicObjectKeyChanged(): void {
    this.selectedProductIds.delete('p2');
  }

  @watch((vm: WatcherProxyDependenciesApp) => vm.featuredProductSummary())
  trackableMethodProxyChanged(): void {
    this.selectedProductIds.add('p1');
  }

  @watch((vm: WatcherProxyDependenciesApp) => vm.explicitSearchLabelSummary())
  explicitTrackableMethodProxyChanged(): void {
    this.selectedProductIds.delete('p2');
  }
}
