import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeHtmlPortalErrorsApp } from './runtime-html-portal-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeHtmlPortalErrorsApp,
  })
  .start();
