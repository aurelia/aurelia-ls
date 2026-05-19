import { customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'readonly-target',
  template: '<template>${value}</template>',
  bindables: ['value'],
})
export class ReadonlyTarget {
  get value(): string {
    return 'locked';
  }
}

@customElement({
  name: 'setter-only-target',
  template: '<template></template>',
  bindables: ['value'],
})
export class SetterOnlyTarget {
  private currentValue = '';

  set value(value: string) {
    this.currentValue = value;
  }
}

@customElement({
  name: 'readonly-field-target',
  template: '<template>${value}</template>',
  bindables: ['value'],
})
export class ReadonlyFieldTarget {
  readonly value = 'field';
}

@customElement({
  name: 'map-size-target',
  template: '<template>${size}</template>',
  bindables: ['size'],
})
export class MapSizeTarget extends Map<string, string> {}
