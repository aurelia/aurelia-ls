import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { SelectSingleArrayValueApp } from './select-single-array-value-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: SelectSingleArrayValueApp,
  })
  .start();
