import { EventAggregator, firstDefined } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './kernel-api-errors-app.html';

const events = new EventAggregator();

events.publish('');
events.subscribe('', () => {});
firstDefined();
firstDefined(undefined, void 0);

@customElement({
  name: 'kernel-api-errors-app',
  template,
})
export class KernelApiErrorsApp {
  message = 'Kernel API pressure';
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: KernelApiErrorsApp,
  })
  .start();
