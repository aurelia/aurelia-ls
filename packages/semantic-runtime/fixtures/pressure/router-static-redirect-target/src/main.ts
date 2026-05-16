import { RouterConfiguration } from '@aurelia/router';
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterStaticRedirectTargetApp } from './router-static-redirect-target-app';

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
    component: RouterStaticRedirectTargetApp,
  })
  .start();
