import { bindable, customElement } from 'aurelia';

@customElement({
  name: 'isolated-observer-target',
  template: '<template>${value}</template>',
})
export class IsolatedObserverTarget {
  private current = '';

  @bindable
  get value(): string {
    return this.current;
  }

  set value(next: string) {
    this.current = next;
  }
}
