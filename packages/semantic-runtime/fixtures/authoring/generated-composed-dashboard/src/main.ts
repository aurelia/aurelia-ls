import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { DashboardApp } from './app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: DashboardApp,
  })
  .start();
