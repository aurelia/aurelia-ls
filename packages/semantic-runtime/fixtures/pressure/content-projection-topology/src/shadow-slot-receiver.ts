import { customElement } from 'aurelia';
import template from './shadow-slot-receiver.html';

@customElement({
  name: 'shadow-slot-receiver',
  template,
  shadowOptions: { mode: 'open' },
})
export class ShadowSlotReceiver {
  readonly dynamicSlotName = 'dynamic';
}
