import { customElement } from '@aurelia/runtime-html';
import template from './template-collection-observation-app.html';

interface Product {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
}

@customElement({
  name: 'template-collection-observation-app',
  template,
})
export class TemplateCollectionObservationApp {
  products: Product[] = [
    { id: 'p1', name: 'Desk lamp', tags: ['featured', 'lighting'] },
    { id: 'p2', name: 'Monitor arm', tags: ['workspace'] },
  ];

  label = 'featured';

  selectedProductIndex = 0;

  selectedProductId = 'p1';

  selectedProduct: Product = { id: 'p1', name: 'Desk lamp', tags: ['featured', 'lighting'] };

  formatters: Array<(value: string) => string> = [
    (value) => value.toUpperCase(),
  ];

  productLookup: Record<string, Product> = Object.fromEntries(
    this.products.map((product) => [product.id, product]),
  );

  lookup = {
    get(_key: string): boolean {
      return false;
    },
  };

  nonArrayMapper = {
    map(_callback: (product: Product) => string): string[] {
      return ['not-called'];
    },
  };
}
