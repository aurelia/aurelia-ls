import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { SelectModelPrimitivesApp } from './select-model-primitives-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: SelectModelPrimitivesApp,
  })
  .start();
