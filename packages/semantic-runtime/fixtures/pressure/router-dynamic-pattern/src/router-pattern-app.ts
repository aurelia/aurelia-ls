import { route } from '@aurelia/router';
import { ProductDetailsRoute } from './routes/product-details-route';
import { ProductsRoute } from './routes/products-route';

class SenchaRouteInstruction {
  readonly component = ProductsRoute;
  readonly children = [
    {
      component: ProductDetailsRoute,
      params: { productId: 'sencha' },
      viewport: 'details',
    },
  ];
}

@route({
  title: 'Router Pattern Pressure',
  routes: [
    {
      id: 'products',
      path: 'products',
      component: ProductsRoute,
      title: 'Products',
    },
  ],
})
export class RouterPatternApp {
  readonly productsRoute = ProductsRoute;
  readonly productDetailsRoute = ProductDetailsRoute;
  readonly SenchaRouteInstruction = SenchaRouteInstruction;
  readonly featuredInstructionIndex = 0;
  readonly matchaInstructionIndex = 1;
  readonly chamomileInstructionIndex = 2;
  readonly jasmineInstructionIndex = 3;
  readonly oolongInstructionIndex = 4;
  readonly maybeRouteInstructionFactory: null | (() => unknown) = null;
  readonly taggedInstruction = (parts: readonly string[]) => ({
    component: ProductsRoute,
    children: [
      {
        component: ProductDetailsRoute,
        params: { productId: parts[0] },
        viewport: 'details',
      },
    ],
  });
  readonly routeInstructions = [
    {
      component: ProductsRoute,
      children: [
        {
          component: ProductDetailsRoute,
          params: { productId: 'tea' },
          viewport: 'details',
        },
      ],
    },
    {
      component: ProductsRoute,
      children: [
        {
          component: ProductDetailsRoute,
          params: { productId: 'matcha' },
          viewport: 'details',
        },
      ],
    },
    {
      component: ProductsRoute,
      children: [
        {
          component: ProductDetailsRoute,
          params: { productId: 'chamomile' },
          viewport: 'details',
        },
      ],
    },
    {
      component: ProductsRoute,
      children: [
        {
          component: ProductDetailsRoute,
          params: { productId: 'jasmine' },
          viewport: 'details',
        },
      ],
    },
    {
      component: ProductsRoute,
      children: [
        {
          component: ProductDetailsRoute,
          params: { productId: 'oolong' },
          viewport: 'details',
        },
      ],
    },
  ];
}
