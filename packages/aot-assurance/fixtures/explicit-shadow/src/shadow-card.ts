import { bindable, customElement } from 'aurelia';
import template from './shadow-card.html';

@customElement({ name: 'shadow-card', template, shadowOptions: { mode: 'open' } })
export class ShadowCard {
  @bindable label = '';
  count = 0;
}
