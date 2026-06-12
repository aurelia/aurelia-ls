import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { SelectMultipleBindingOrderApp } from './select-multiple-binding-order-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: SelectMultipleBindingOrderApp,
  })
  .start();
