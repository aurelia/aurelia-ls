import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { OneHopForwardingAccessorApp } from './one-hop-forwarding-accessor-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('one-hop-forwarding-accessor-app') ?? document.body,
    component: OneHopForwardingAccessorApp,
  })
  .start();
