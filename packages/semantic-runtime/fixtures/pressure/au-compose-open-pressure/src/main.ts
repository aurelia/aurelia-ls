import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { AuComposeOpenPressureApp } from './au-compose-open-pressure-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: AuComposeOpenPressureApp,
  })
  .start();
