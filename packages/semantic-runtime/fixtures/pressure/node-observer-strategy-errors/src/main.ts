import {
  AppTask,
  Aurelia,
  NodeObserverLocator,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { NodeObserverStrategyErrorsApp } from './node-observer-strategy-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    AppTask.creating(NodeObserverLocator, (locator) => {
      locator.allowDirtyCheck = false;
    }),
  )
  .app({
    component: NodeObserverStrategyErrorsApp,
    host: document.createElement('node-observer-strategy-errors-app'),
  })
  .start();
