import { route } from '@aurelia/router';
import { ProductDetailsRoute } from './routes/product-details-route';
import { ProductsRoute } from './routes/products-route';

@route({
  title: 'Router Pattern Pressure',
  routes: [
    {
      id: 'products',
      path: ['', 'products'],
      component: ProductsRoute,
      title: 'Products',
    },
    {
      id: 'product-detail',
      path: 'products/:productId',
      component: ProductDetailsRoute,
      title: 'Product Details',
    },
  ],
})
export class RouterPatternApp {}
