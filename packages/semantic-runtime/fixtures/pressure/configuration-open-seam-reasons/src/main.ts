import { Aurelia } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { App } from './app';

new Aurelia()
  .register(RouterConfiguration.customize({ useUrlFragmentHash: missingRouterFlag }))
  .app({
    host: document.querySelector('app')!,
    component: App,
  })
  .start();
