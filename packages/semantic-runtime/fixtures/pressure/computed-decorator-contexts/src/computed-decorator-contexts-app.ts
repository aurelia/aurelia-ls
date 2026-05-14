import { computed } from '@aurelia/runtime';

export class ComputedDecoratorContextsApp {
  value = 1;

  @computed({ deps: ['value'] })
  get doubled(): number {
    return this.value * 2;
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
