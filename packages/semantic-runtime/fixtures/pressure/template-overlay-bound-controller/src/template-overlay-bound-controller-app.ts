import { customElement, valueConverter } from '@aurelia/runtime-html';
import { BoundControllerState } from './bound-controller-state';
import { CallbackPanel } from './callback-panel';
import type { OverlayAction } from './model';
import template from './template-overlay-bound-controller-app.html';

@valueConverter('stableActionHandler')
export class StableActionHandlerValueConverter {
  toView(handler: (action: OverlayAction) => boolean): (action: OverlayAction) => boolean {
    return handler;
  }
}

@customElement({
  name: 'template-overlay-bound-controller-app',
  template,
  dependencies: [CallbackPanel, StableActionHandlerValueConverter],
})
export class TemplateOverlayBoundControllerApp {
  readonly state = new BoundControllerState();
}
