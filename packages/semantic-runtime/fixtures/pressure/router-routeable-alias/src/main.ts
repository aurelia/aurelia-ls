import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterRouteableAliasApp } from './router-routeable-alias-app';

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration.customize({
      useHref: false,
    }),
  )
  .app({
    host: document.body,
    component: RouterRouteableAliasApp,
  })
  .start();
