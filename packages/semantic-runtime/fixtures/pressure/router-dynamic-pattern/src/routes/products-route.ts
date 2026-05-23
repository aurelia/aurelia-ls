import { DI, resolve } from '@aurelia/kernel';
import { productVendorUrl } from 'router-pressure-vendor-links';
import { ProductDetailsRoute } from './product-details-route';

interface ProductSummary {
  readonly id: string;
  readonly name: string;
  readonly externalUrl: string;
}

export class ProductsRouteState {
  readonly products: readonly ProductSummary[] = [
    { id: 'state-coffee', name: 'State Coffee', externalUrl: 'https://example.invalid/products/state-coffee' },
    { id: 'coffee', name: 'Coffee', externalUrl: 'https://example.invalid/products/coffee' },
    { id: 'tea', name: 'Tea', externalUrl: 'https://example.invalid/products/tea' },
  ];
}

export interface IProductsRouteState extends ProductsRouteState {}
export const IProductsRouteState = DI.createInterface<IProductsRouteState>('IProductsRouteState');

export class ProductsRoute {
  static routes = [
    {
      id: 'product-detail',
      path: ':productId',
      component: ProductDetailsRoute,
      title: 'Product Details',
    },
  ];

  readonly state = resolve(IProductsRouteState);
  readonly products: readonly ProductSummary[] = [
    { id: 'coffee', name: 'Coffee', externalUrl: 'https://example.invalid/products/coffee' },
    { id: 'tea', name: 'Tea', externalUrl: 'https://example.invalid/products/tea' },
  ];
  readonly routerLinks = {
    prefix: '/products',
    detail(product: ProductSummary): string {
      return `${this.prefix}/${product.id}`;
    },
  };

  productHref(product: ProductSummary): string {
    return `/products/${product.id}`;
  }

  externalHref(product: ProductSummary): string {
    return product.externalUrl;
  }

  stateBackedHref(productId: string): string {
    const product = this.state.products.find((candidate) => candidate.id === productId);
    return product == null ? `/products/${productId}` : `/products/${product.id}`;
  }

  externalPackageHref(productId: string): string {
    return productVendorUrl(productId);
  }
}
