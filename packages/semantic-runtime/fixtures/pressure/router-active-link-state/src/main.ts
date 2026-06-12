import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterActiveLinkStateApp } from './router-active-link-state-app';

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration.customize({
      useHref: false,
      useUrlFragmentHash: true,
      activeClass: 'is-active',
    }),
  )
  .app({
    host: document.body,
    component: RouterActiveLinkStateApp,
  })
  .start();
