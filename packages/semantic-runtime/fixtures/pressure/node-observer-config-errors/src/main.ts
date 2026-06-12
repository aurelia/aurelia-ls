import {
  AppTask,
  Aurelia,
  NodeObserverLocator,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { IContainer } from '@aurelia/kernel';
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
    AppTask.creating(IContainer, (container) => {
      const locator = container.get(NodeObserverLocator);
      locator.useConfig('CONTAINER-ELEMENT', 'value', appNodeObserverConfig);
    }),
  )
  .app({
    host: document.body,
    component: NodeObserverConfigErrorsApp,
  })
  .start();
