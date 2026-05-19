import { customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'node-observer-config-errors-app',
  template: '<template><input value.bind="message"><my-element value.two-way="message"></my-element><container-element value.two-way="message"></container-element></template>',
})
export class NodeObserverConfigErrorsApp {
  message = '';
}
