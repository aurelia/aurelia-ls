import { bindable, customElement } from '@aurelia/runtime-html';
import template from './cart-summary.html';

@customElement({
  name: 'cart-summary',
  template,
})
export class CartSummary {
  @bindable count = 0;
}
