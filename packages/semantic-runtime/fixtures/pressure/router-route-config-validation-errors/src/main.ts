import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterRouteConfigValidationErrorsApp } from './router-route-config-validation-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration.customize({
      useHref: false,
      useUrlFragmentHash: true,
    }),
  )
  .app({
    host: document.body,
    component: RouterRouteConfigValidationErrorsApp,
  })
  .start();
