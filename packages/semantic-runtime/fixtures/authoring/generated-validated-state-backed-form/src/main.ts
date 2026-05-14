import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { App } from './app';

new Aurelia()
  .register(StandardConfiguration, ValidationHtmlConfiguration)
  .app({
    host: document.body,
    component: App,
  })
  .start();
