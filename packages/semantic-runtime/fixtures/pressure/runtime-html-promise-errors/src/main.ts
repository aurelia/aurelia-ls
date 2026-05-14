import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeHtmlPromiseErrorsApp } from './runtime-html-promise-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeHtmlPromiseErrorsApp,
  })
  .start();
