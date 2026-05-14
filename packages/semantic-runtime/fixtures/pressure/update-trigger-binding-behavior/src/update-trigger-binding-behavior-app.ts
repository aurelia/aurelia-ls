import { customElement } from '@aurelia/runtime-html';
import template from './update-trigger-binding-behavior-app.html';

@customElement({
  name: 'update-trigger-binding-behavior-app',
  template,
})
export class UpdateTriggerBindingBehaviorApp {
  message = '';
  elementId = 'checkout-shell';

  save(): void {}
}
