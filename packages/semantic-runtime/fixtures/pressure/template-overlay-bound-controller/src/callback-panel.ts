import { bindable, customElement } from '@aurelia/runtime-html';
import type { OverlayAction } from './model';
import template from './callback-panel.html';

@customElement({
  name: 'callback-panel',
  template,
})
export class CallbackPanel {
  @bindable actions: readonly OverlayAction[] = [];
  @bindable onAction = () => false;
}
