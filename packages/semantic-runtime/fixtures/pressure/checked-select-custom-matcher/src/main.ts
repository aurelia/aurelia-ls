import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { CheckedSelectCustomMatcherApp } from './checked-select-custom-matcher-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('checked-select-custom-matcher-app') ?? document.body,
    component: CheckedSelectCustomMatcherApp,
  })
  .start();
