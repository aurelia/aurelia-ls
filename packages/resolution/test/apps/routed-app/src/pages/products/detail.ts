/**
 * Product detail component with parameterized route.
 *
 * Tests: Parameterized route (:id), getStaticPaths for SSG
 */
import { customElement } from 'aurelia';
import { route } from '@aurelia/router';

@route(':id')
@customElement({ name: 'product-detail', template: '<h2>Product ${id}</h2>' })
export class ProductDetailComponent {
  id: string = '';

  /**
   * SSG: Enumerate all product IDs at build time.
   */
  static async getStaticPaths(): Promise<string[]> {
    // In real app, would fetch from API/database
    return [
      '/products/1',
      '/products/2',
      '/products/3',
    ];
  }
}
