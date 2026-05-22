import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { KeyedFormSourceBindingsApp } from './keyed-form-source-bindings-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('keyed-form-source-bindings-app') ?? document.body,
    component: KeyedFormSourceBindingsApp,
  })
  .start();
