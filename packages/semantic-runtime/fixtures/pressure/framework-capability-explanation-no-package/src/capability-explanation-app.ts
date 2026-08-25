import { customElement } from '@aurelia/runtime-html';
import template from './capability-explanation-app.html';

@customElement({
  name: 'capability-explanation-app',
  template,
})
export class CapabilityExplanationApp {
  readonly items = ['one', 'two'];
}
