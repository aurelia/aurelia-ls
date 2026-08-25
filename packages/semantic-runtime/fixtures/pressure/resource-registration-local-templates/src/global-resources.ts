import { customElement } from 'aurelia';

@customElement({
  name: 'local-chip',
  bindables: ['globalValue'],
  template: '<template>global ${globalValue}</template>',
})
export class GlobalLocalChip {
  globalValue = '';
}

@customElement({
  name: 'global-helper',
  bindables: ['value'],
  template: '<template>helper ${value}</template>',
})
export class GlobalHelper {
  value = '';
}
