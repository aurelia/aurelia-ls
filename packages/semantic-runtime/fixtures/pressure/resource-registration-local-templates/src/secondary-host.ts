import { customElement } from 'aurelia';
import { GlobalLocalChip } from './global-resources';
import template from './secondary-host.html';

@customElement({ name: 'secondary-host', template, dependencies: [/*dependency*/ ] })
export class SecondaryHost {
  message = 'secondary';
}
