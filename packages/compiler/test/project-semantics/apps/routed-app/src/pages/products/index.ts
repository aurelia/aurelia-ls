/**
 * Products container with nested routes.
 *
 * Tests: @route with nested routes array, string component references
 */
import { customElement } from 'aurelia';
import { route } from '@aurelia/router';
import { ProductListComponent } from './list';
import { ProductDetailComponent } from './detail';

@route({
  path: 'products',
  routes: [
    { path: '', component: ProductListComponent },
    { path: ':id', component: ProductDetailComponent },
  ]
})
@customElement({ name: 'products-component', template: '<au-viewport></au-viewport>' })
export class ProductsComponent {}

// Re-export for convenience
export { ProductListComponent, ProductDetailComponent };
