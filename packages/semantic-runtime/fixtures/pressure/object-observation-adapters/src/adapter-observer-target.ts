import { bindable, customElement } from 'aurelia';

@customElement({
  name: 'adapter-observer-target',
  template: '<template>${value}</template>',
})
export class AdapterObserverTarget {
  private current = '';

  @bindable
  get value(): string {
    return this.current;
  }

  set value(next: string) {
    this.current = next;
  }
}
