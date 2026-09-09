import { customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'late-target',
  template: '<span class="late-target-value">original:${message}</span>',
  bindables: ['message'],
})
export class LateTarget {
  message = '';
}
