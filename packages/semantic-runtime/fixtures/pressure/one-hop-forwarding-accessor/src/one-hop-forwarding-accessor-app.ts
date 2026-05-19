import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { ForwardingState } from './state/forwarding-state';
import template from './one-hop-forwarding-accessor-app.html';

@customElement({
  name: 'one-hop-forwarding-accessor-app',
  template,
})
export class OneHopForwardingAccessorApp {
  readonly state = resolve(ForwardingState);

  get selectedName(): string {
    return this.state.selectedName;
  }

  get displayName(): string {
    return this.state.selectedName.toUpperCase();
  }

  get unusedDisplayName(): string {
    return this.state.selectedName.trim();
  }
}
