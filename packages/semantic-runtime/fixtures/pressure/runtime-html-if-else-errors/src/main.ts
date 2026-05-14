import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeHtmlIfElseErrorsApp } from './runtime-html-if-else-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeHtmlIfElseErrorsApp,
  })
  .start();
