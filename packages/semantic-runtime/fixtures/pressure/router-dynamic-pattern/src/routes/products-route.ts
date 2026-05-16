import { productVendorUrl } from 'router-pressure-vendor-links';
import { ProductDetailsRoute } from './product-details-route';

interface ProductSummary {
  readonly id: string;
  readonly name: string;
  readonly externalUrl: string;
}

export class ProductsRoute {
  static routes = [
    {
      id: 'product-detail',
      path: ':productId',
      component: ProductDetailsRoute,
      title: 'Product Details',
    },
  ];

  readonly products: readonly ProductSummary[] = [
    { id: 'coffee', name: 'Coffee', externalUrl: 'https://example.invalid/products/coffee' },
    { id: 'tea', name: 'Tea', externalUrl: 'https://example.invalid/products/tea' },
  ];

  productHref(product: ProductSummary): string {
    return `/products/${product.id}`;
  }

  externalHref(product: ProductSummary): string {
    return product.externalUrl;
  }

  externalPackageHref(productId: string): string {
    return productVendorUrl(productId);
  }
}
