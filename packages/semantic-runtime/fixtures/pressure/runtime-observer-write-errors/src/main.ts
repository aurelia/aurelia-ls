import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeObserverWriteErrorsApp } from './runtime-observer-write-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeObserverWriteErrorsApp,
  })
  .start();
