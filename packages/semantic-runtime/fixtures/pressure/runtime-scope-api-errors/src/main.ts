import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeScopeApiErrorsApp } from './runtime-scope-api-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeScopeApiErrorsApp,
  })
  .start();
