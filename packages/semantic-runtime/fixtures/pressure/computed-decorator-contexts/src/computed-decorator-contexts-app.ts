import { computed } from '@aurelia/runtime';
import { customElement } from '@aurelia/runtime-html';
import template from './computed-decorator-contexts-app.html';

const dynamicDependencyKey = 'nested.detail.count';

interface MutationRoleState {
  direct: string;
  count: number;
  current: string;
  key: string;
  readonly values: readonly string[];
  readonly entries: Readonly<Record<string, number>>;
  optional?: string;
}

@customElement({ name: 'computed-decorator-contexts-app', template })
export class ComputedDecoratorContextsApp {
  value = 1;
  nested = {
    detail: {
      count: 2,
    },
    tags: ['featured'],
  };
  mutationState: MutationRoleState = {
    direct: '',
    count: 0,
    current: '',
    key: '',
    values: ['one'],
    entries: { one: 1 },
    optional: 'present',
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

  @computed('nested.detail.count')
  get nestedCountFromPath(): number {
    return this.nested.detail.count;
  }

  @computed("selectNested('tags').tags.length")
  get selectedTagCount(): number {
    return this.nested.tags.length;
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

  get mutationRoleProbe(): string {
    this.mutationState.direct = 'written';
    this.mutationState.count += 1;
    this.mutationState.count++;
    delete this.mutationState.optional;
    for (this.mutationState.current of this.mutationState.values) {
      break;
    }
    for (this.mutationState.key in this.mutationState.entries) {
      break;
    }
    return `${this.mutationState.current}:${this.mutationState.key}:${this.mutationState.count}`;
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

  selectNested(kind: 'detail'): { readonly count: number };
  selectNested(kind: 'tags'): { readonly tags: readonly string[] };
  selectNested(kind: 'detail' | 'tags'): { readonly count: number } | { readonly tags: readonly string[] } {
    return kind === 'detail'
      ? this.nested.detail
      : { tags: this.nested.tags };
  }
}
