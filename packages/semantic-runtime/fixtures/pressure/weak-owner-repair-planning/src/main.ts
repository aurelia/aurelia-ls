import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { WeakOwnerRepairApp } from './weak-owner-repair-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: WeakOwnerRepairApp,
  })
  .start();
