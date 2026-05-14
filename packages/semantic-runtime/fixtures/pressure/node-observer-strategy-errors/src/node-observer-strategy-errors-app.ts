import { customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'node-observer-strategy-errors-app',
  template: '<div id.two-way="elementId"></div>',
})
export class NodeObserverStrategyErrorsApp {
  elementId = 'checkout-shell';
}
