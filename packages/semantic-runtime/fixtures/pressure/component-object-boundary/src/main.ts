import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ObjectBoundaryApp } from './object-boundary-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ObjectBoundaryApp,
  })
  .start();
