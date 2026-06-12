import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { ProductSummaryCard } from './components/product-summary-card';
import { ProductState } from './state/product-state';
import template from './object-boundary-app.html';

@customElement({
  name: 'object-boundary-app',
  template,
  dependencies: [ProductSummaryCard],
})
export class ObjectBoundaryApp {
  readonly state = resolve(ProductState);
}
