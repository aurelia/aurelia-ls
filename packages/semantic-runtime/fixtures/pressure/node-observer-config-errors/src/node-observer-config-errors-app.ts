import { customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'node-observer-config-errors-app',
  template: '<template><input value.bind="message"></template>',
})
export class NodeObserverConfigErrorsApp {
  message = '';
}
