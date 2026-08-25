import { customElement, valueConverter } from '@aurelia/runtime-html';
import { ProductDetailsRoute } from './routes/product-details-route';
import { ProductsRoute } from './routes/products-route';
import template from './route-link.html';

@valueConverter('routeInstruction')
class RouteInstructionValueConverter {
  toView(productId: string) {
    return {
      component: ProductsRoute,
      children: [
        {
          component: ProductDetailsRoute,
          params: { productId },
          viewport: 'details',
        },
      ],
    };
  }
}

@customElement({
  name: 'route-link',
  template,
  dependencies: [RouteInstructionValueConverter],
})
export class RouteLink {
  readonly productId = 'darjeeling';
  readonly blockedProductId = 'blocked-by-missing-behavior';
}
