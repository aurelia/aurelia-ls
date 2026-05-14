import {
  AppTask,
  Aurelia,
  NodeObserverLocator,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { NodeObserverConfigErrorsApp } from './node-observer-config-errors-app';

const appNodeObserverConfig = {
  events: ['change'],
  readonly: false,
  default: '',
};

new Aurelia()
  .register(
    StandardConfiguration,
    AppTask.creating(NodeObserverLocator, (locator) => {
      locator.useConfig('INPUT', 'value', appNodeObserverConfig);
      locator.useConfigGlobal('textContent', appNodeObserverConfig);
      locator.useConfig('MY-ELEMENT', 'value', appNodeObserverConfig);
      locator.useConfig('MY-ELEMENT', 'value', appNodeObserverConfig);
    }),
  )
  .app({
    host: document.body,
    component: NodeObserverConfigErrorsApp,
  })
  .start();
