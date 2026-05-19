import { computed } from '@aurelia/runtime';

const dynamicDependencyKey = 'nested.detail.count';

export class ComputedDecoratorContextsApp {
  value = 1;
  nested = {
    detail: {
      count: 2,
    },
    tags: ['featured'],
  };

  @computed({ deps: ['value'] })
  get doubled(): number {
    return this.value * 2;
  }

  @computed((vm: ComputedDecoratorContextsApp) => vm.value)
  get tripled(): number {
    return this.value * 3;
  }

  @computed({ deps: (vm: ComputedDecoratorContextsApp) => vm.value })
  get quadrupled(): number {
    return this.value * 4;
  }

  @computed({ deps: ['nested'], deep: true })
  get nestedSummary(): string {
    return `${this.nested.detail.count}:${this.nested.tags.join(',')}`;
  }

  @computed('value', dynamicDependencyKey)
  get partiallyOpenDependency(): number {
    return this.value + this.nested.detail.count;
  }

  @computed('value', (vm: ComputedDecoratorContextsApp) => vm.nested.detail.count)
  get mixedDependency(): number {
    return this.value + this.nested.detail.count;
  }

  @computed({ deps: undefined })
  get nullishConfigDependency(): number {
    return this.value + this.nested.detail.count;
  }

  get plainTotal(): number {
    return this.value + this.doubled;
  }

  @computed('value')
  calculate(): number {
    return this.value + 1;
  }

  @computed('value')
  invalidField = 1;

  @computed({ deps: ['value'] })
  set invalidSetter(value: number) {
    this.value = value;
  }

  @computed({ deps: ['value'] })
  accessor invalidAccessor = 1;
}
