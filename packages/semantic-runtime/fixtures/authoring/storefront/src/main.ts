import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { StorefrontApp } from './app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: StorefrontApp,
  })
  .start();
