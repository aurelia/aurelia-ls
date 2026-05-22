import { bindable, customElement } from 'aurelia';
import template from './cart-summary.html';

@customElement({
  name: 'cart-summary',
  template,
})
export class CartSummary {
  @bindable count = 0;
}
