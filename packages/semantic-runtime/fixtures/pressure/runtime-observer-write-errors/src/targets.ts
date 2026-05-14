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
  name: 'map-size-target',
  template: '<template>${size}</template>',
  bindables: ['size'],
})
export class MapSizeTarget extends Map<string, string> {}
