import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ComposeDashboardApp } from './compose-dashboard-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ComposeDashboardApp,
  })
  .start();
