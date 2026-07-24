import { customElement } from 'aurelia';
import template from './slot-reachability-receiver.html';

@customElement({
  name: 'slot-reachability-receiver',
  template,
  shadowOptions: { mode: 'open' },
})
export class SlotReachabilityReceiver {
  readonly showConditional = true;
}
