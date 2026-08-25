import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterRouteContextInheritedOwnershipApp } from './router-route-context-inherited-ownership-app';

new Aurelia()
  .register(StandardConfiguration, RouterConfiguration)
  .app({
    host: document.body,
    component: RouterRouteContextInheritedOwnershipApp,
  })
  .start();
