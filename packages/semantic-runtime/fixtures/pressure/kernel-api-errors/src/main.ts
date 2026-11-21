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

// These calls are valid controls for the same diagnostics, including a lexical
// binding called undefined and an unrelated parameter named like the imported API.
const validChannel = ['ready'] as const;
const validSubscription = ['ready', () => {}] as const;
events.publish(...validChannel);
events.subscribe(...validSubscription);
export function validLocals(firstDefined: () => unknown) { return firstDefined(); }
export function validArgument(undefined: string) { return firstDefined(undefined); }
