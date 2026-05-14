import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeHtmlSwitchErrorsApp } from './runtime-html-switch-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RuntimeHtmlSwitchErrorsApp,
  })
  .start();
