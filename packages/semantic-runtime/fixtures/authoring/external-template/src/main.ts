import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { AuthoringApp } from './app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: AuthoringApp,
  })
  .start();
