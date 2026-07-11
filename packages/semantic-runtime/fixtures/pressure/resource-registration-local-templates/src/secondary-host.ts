import { customElement } from 'aurelia';
import template from './secondary-host.html';

@customElement({ name: 'secondary-host', template })
export class SecondaryHost {
  message = 'secondary';
}
