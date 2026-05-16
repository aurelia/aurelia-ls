import { Aurelia } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterContextualStringRouteableApp } from './router-contextual-string-routeable-app';

new Aurelia()
  .register(RouterConfiguration.customize({ useUrlFragmentHash: true }))
  .app({
    host: document.querySelector('app')!,
    component: RouterContextualStringRouteableApp,
  })
  .start();
