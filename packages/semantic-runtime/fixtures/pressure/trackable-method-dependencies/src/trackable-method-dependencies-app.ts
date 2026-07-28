import {
  astTrack,
  computed,
} from '@aurelia/runtime';
import { customElement } from '@aurelia/runtime-html';
import template from './trackable-method-dependencies-app.html';

interface Product {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
}

@customElement({ name: 'trackable-method-dependencies-app', template })
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

  enabled = true;
  mode: 'primary' | 'fallback' = 'primary';
  control = {
    primary: 'primary',
    fallback: 'fallback',
    after: 'after',
    recovered: 'recovered',
    nullish: null as string | null,
  };

  comparisonTarget = 'p1';
  lastRecordedLabel = '';

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

  @computed
  switchLabel(): string {
    switch (this.mode) {
      case 'primary':
        return this.control.primary;
      default:
        return this.control.fallback;
    }
  }

  @computed
  exceptionLabel(): string {
    try {
      if (this.enabled) {
        return this.control.primary;
      }
      throw new Error('recover');
    } catch {
      return this.control.recovered;
    }
  }

  @computed
  continuationLabel(): string {
    if (this.enabled) {
      return this.control.primary;
    }
    return this.control.after;
  }

  @computed
  shortCircuitAssignmentLabel(): string {
    const state = {
      value: this.control.nullish,
    };
    state.value ??= this.control.fallback;
    return state.value;
  }

  @computed
  loopLabel(): string {
    let result = '';
    for (let index = 0; index < this.products.length; index += 1) {
      result = this.products[index]?.name ?? result;
    }
    return result;
  }

  @computed
  doWhileLabel(): string {
    let index = 0;
    let result = '';
    do {
      result += this.products[index]?.name ?? '';
      index += 1;
    } while (index < 1);
    return result;
  }

  ordinaryCounterLabel(): string {
    return this.ordinaryCounter.value.toString();
  }

  someCheck(value: string): boolean {
    return this.comparisonTarget === value;
  }

  recordSelection(): void {
    this.lastRecordedLabel = this.selected.label;
  }
}
