import { customElement } from '@aurelia/runtime-html';
import template from './product-details-route.html';

@customElement({ name: 'product-details-route', template })
export class ProductDetailsRoute {
  productId = '';
}
