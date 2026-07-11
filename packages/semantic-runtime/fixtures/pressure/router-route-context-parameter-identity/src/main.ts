import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterRouteContextParameterIdentityApp } from './router-route-context-parameter-identity-app';

new Aurelia()
  .register(StandardConfiguration, RouterConfiguration)
  .app({
    host: document.body,
    component: RouterRouteContextParameterIdentityApp,
  })
  .start();
