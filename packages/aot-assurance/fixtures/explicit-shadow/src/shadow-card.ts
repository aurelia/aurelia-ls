import { bindable, customElement } from 'aurelia';
import template from './shadow-card.html';
import { NativeOutlets } from './native-outlets.js';

@customElement({ name: 'shadow-card', template, shadowOptions: { mode: 'open' }, dependencies: [NativeOutlets] })
export class ShadowCard {
  @bindable label = '';
  count = 0;
}
