import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  StableActionHandlerValueConverter,
  TemplateOverlayBoundControllerApp,
} from './template-overlay-bound-controller-app';

new Aurelia()
  .register(StableActionHandlerValueConverter, StandardConfiguration)
  .app({
    host: document.querySelector('template-overlay-bound-controller') ?? document.body,
    component: TemplateOverlayBoundControllerApp,
  })
  .start();
