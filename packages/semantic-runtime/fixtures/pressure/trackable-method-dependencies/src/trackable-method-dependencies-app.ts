import {
  astTrack,
  computed,
} from '@aurelia/runtime';

interface Product {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
}

export class TrackableMethodDependenciesApp {
  products: Product[] = [
    { id: 'p1', name: 'Desk lamp', tags: ['featured', 'lighting'] },
    { id: 'p2', name: 'Monitor arm', tags: ['workspace'] },
  ];

  filter = 'featured';

  selected = {
    id: 'p1',
    label: 'Desk lamp',
  };

  nullishCounter = {
    value: 1,
  };

  nullishAstTrackCounter = {
    value: 2,
  };

  ordinaryCounter = {
    value: 3,
  };

  @computed
  featuredProductNames(): string {
    return this.products
      .filter((product) => product.tags.includes(this.filter))
      .map((product) => product.name)
      .join(', ');
  }

  @computed
  featuredProductNamesForOf(): string {
    const names: string[] = [];
    for (const product of this.products) {
      if (product.tags.includes(this.filter)) {
        names.push(product.name);
      }
    }
    return names.join(', ');
  }

  @computed({ deps: ['filter'] })
  explicitFilterLabel(): string {
    return `${this.filter}:${this.selected.label}`;
  }

  @astTrack((vm: TrackableMethodDependenciesApp) => vm.selected.label)
  selectedLabel(): string {
    return this.selected.label;
  }

  @computed(undefined)
  nullishComputedLabel(): string {
    return this.nullishCounter.value.toString();
  }

  @astTrack({ deps: undefined })
  nullishAstTrackLabel(): string {
    return this.nullishAstTrackCounter.value.toString();
  }

  ordinaryCounterLabel(): string {
    return this.ordinaryCounter.value.toString();
  }
}
