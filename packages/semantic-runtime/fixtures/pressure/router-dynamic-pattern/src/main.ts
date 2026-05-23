import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { Registration } from '@aurelia/kernel';
import { RouterConfiguration } from '@aurelia/router';
import { RouterPatternApp } from './router-pattern-app';
import { IProductsRouteState, ProductsRouteState } from './routes/products-route';

new Aurelia()
  .register(
    StandardConfiguration,
    Registration.singleton(IProductsRouteState, ProductsRouteState),
    RouterConfiguration.customize({
      useHref: false,
      useUrlFragmentHash: true,
    }),
  )
  .app({
    host: document.body,
    component: RouterPatternApp,
  })
  .start();
