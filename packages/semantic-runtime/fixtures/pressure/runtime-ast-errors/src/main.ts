import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeAstErrorsApp } from './runtime-ast-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeAstErrorsApp,
  })
  .start();
