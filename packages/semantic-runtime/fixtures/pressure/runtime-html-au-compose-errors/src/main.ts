import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeHtmlAuComposeErrorsApp } from './runtime-html-au-compose-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeHtmlAuComposeErrorsApp,
  })
  .start();
