import {
  bindable,
  computed,
  customElement,
  observable,
} from 'aurelia';

@customElement({
  name: 'plain-observer-target',
  template: '<template>${value}</template>',
})
export class PlainObserverTarget {
  @bindable value = '';
}

@customElement({
  name: 'getter-observer-target',
  template: '<template>${value}</template>',
})
export class GetterObserverTarget {
  private current = '';

  @bindable
  get value(): string {
    return this.current;
  }

  set value(next: string) {
    this.current = next;
  }
}

@customElement({
  name: 'observable-observer-target',
  template: '<template>${value}</template>',
})
export class ObservableObserverTarget {
  @bindable
  @observable
  value = '';
}

@observable('value')
@customElement({
  name: 'class-observable-observer-target',
  template: '<template>${value}</template>',
  bindables: ['value'],
})
export class ClassObservableObserverTarget {
  declare value: string;
}

@customElement({
  name: 'declared-callback-observer-target',
  template: '<template>${value}</template>',
})
export class DeclaredCallbackObserverTarget {
  @bindable
  @observable
  value = '';

  declare valueChanged: (value: string, oldValue: string) => void;
}

@customElement({
  name: 'null-property-changed-observer-target',
  template: '<template>${value}</template>',
})
export class NullPropertyChangedObserverTarget {
  @bindable
  @observable
  value = '';

  propertyChanged = undefined;
}

@customElement({
  name: 'computed-observer-target',
  template: '<template>${automatic}:${disabled}:${explicit}:${stacked}</template>',
})
export class ComputedObserverTarget {
  source = 'computed';
  top = 'top';
  bottom = 'bottom';

  @bindable
  get automatic(): string {
    return this.source;
  }

  set automatic(next: string) {
    this.source = next;
  }

  @bindable
  @computed({ deps: [] })
  get disabled(): string {
    return this.source;
  }

  set disabled(next: string) {
    this.source = next;
  }

  @bindable
  @computed({ deps: ['source'] })
  get explicit(): string {
    return this.source;
  }

  set explicit(next: string) {
    this.source = next;
  }

  @bindable
  @computed({ deps: ['top'] })
  @computed({ deps: ['bottom'] })
  get stacked(): string {
    return `${this.top}:${this.bottom}`;
  }

  set stacked(next: string) {
    this.top = next;
  }
}

@customElement({
  name: 'function-computed-observer-target',
  template: '<template>${functionDependency}</template>',
})
export class FunctionComputedObserverTarget {
  source = 'computed';

  @bindable({ attribute: 'function-dependency' })
  @computed({ deps: (target: FunctionComputedObserverTarget) => target.source })
  get functionDependency(): string {
    return this.source;
  }

  set functionDependency(next: string) {
    this.source = next;
  }
}

@customElement({
  name: 'fatal-observer-target',
  template: '<template>${length}:${after}</template>',
  bindables: [
    { name: 'length', set: Number },
    'after',
  ],
})
export class FatalObserverTarget extends Array<unknown> {
  after = '';

  lengthChanged(): void {}
}

@customElement({
  name: 'fatal-callback-observer-target',
  template: '<template>${value}</template>',
})
export class FatalCallbackObserverTarget {
  @bindable
  @observable
  value = '';

  valueChanged(): void {}
}
