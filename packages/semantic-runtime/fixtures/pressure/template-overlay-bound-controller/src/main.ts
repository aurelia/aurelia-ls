import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { CallbackPanel } from './callback-panel';
import { TemplateOverlayBoundControllerApp } from './template-overlay-bound-controller-app';

new Aurelia()
  .register(CallbackPanel, StandardConfiguration)
  .app({
    host: document.querySelector('template-overlay-bound-controller') ?? document.body,
    component: TemplateOverlayBoundControllerApp,
  })
  .start();
