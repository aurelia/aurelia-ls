import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { TemplateOverlayTypeErrorsApp } from './template-overlay-type-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('template-overlay-type-errors') ?? document.body,
    component: TemplateOverlayTypeErrorsApp,
  })
  .start();
