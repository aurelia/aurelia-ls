import { customElement } from '@aurelia/runtime-html';
import { BoundControllerState } from './bound-controller-state';
import template from './template-overlay-bound-controller-app.html';

@customElement({
  name: 'template-overlay-bound-controller-app',
  template,
})
export class TemplateOverlayBoundControllerApp {
  readonly state = new BoundControllerState();
}
