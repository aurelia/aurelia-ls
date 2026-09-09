import { customElement } from 'aurelia';
import template from './browser-recovery-app.html';
import { SelectedCarrier, WrappedCarrier } from './carriers';

@customElement({ name: 'browser-recovery-app', template, dependencies: [SelectedCarrier, WrappedCarrier] })
export class BrowserRecoveryApp {
  message = 'alpha';
  ignored = 'discarded';
  visible = true;
  items = ['one', 'two'];
  add(): void { this.items.push('three'); }
}
