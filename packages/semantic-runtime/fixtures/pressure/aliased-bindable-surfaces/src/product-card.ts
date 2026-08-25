import { bindable, customElement } from 'aurelia';
import template from './product-card.html';

@customElement({
  name: 'product-card',
  template,
})
export class ProductCard {
  @bindable title = '';
  @bindable({ attribute: 'display-label' }) labelText = '';
  @bindable({ attribute: 'accent-tone' }) tone = '';
}
