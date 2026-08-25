import {
  bindable,
  customElement,
} from '@aurelia/runtime-html';

@customElement({
  name: 'owner-badge',
  template: '<strong>${value}</strong>',
})
export class OwnerBadge {
  @bindable value = '';
}
