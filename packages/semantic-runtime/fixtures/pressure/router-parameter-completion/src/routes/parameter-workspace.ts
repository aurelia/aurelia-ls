import { customElement } from '@aurelia/runtime-html';
import { ParameterTarget } from './parameter-target';
import template from './parameter-workspace.html';

@customElement({ name: 'parameter-workspace', template })
export class ParameterWorkspace {
  static routes = [
    {
      id: 'product-detail',
      path: [
        'products/:productId',
        'catalog/:category/:productId',
      ],
      component: ParameterTarget,
    },
    {
      id: 'localized-detail',
      path: ':locale?/products/:productId',
      component: ParameterTarget,
    },
    {
      id: 'files',
      path: 'files/*path',
      component: ParameterTarget,
    },
  ];

  readonly productRoute = 'product-detail';
  readonly routeParams = { productId: 'coffee' };
  alternateContext!: unknown;
  selectedRoute!: string;
}
