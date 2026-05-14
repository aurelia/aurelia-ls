import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterPatternApp } from './router-pattern-app';

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
    component: RouterPatternApp,
  })
  .start();
