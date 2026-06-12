import { bindable, customElement, valueConverter } from '@aurelia/runtime-html';
import type { OverlayAction } from './model';
import template from './callback-panel.html';

@valueConverter('stableActionHandler')
export class CallbackPanelStableActionHandlerValueConverter {
  toView(handler: (action: OverlayAction) => boolean): (action: OverlayAction) => string {
    return (action) => handler(action) ? action.id : '';
  }
}

@customElement({
  name: 'callback-panel',
  template,
  dependencies: [CallbackPanelStableActionHandlerValueConverter],
})
export class CallbackPanel {
  @bindable actions: readonly OverlayAction[] = [];
  @bindable onAction = () => false;
}
