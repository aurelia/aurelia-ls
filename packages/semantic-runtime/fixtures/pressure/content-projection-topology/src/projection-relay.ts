import { customElement } from 'aurelia';
import template from './projection-relay.html';

@customElement({
  name: 'projection-relay',
  template,
})
export class ProjectionRelay {
  readonly relayLabel = 'projection relay';
}
