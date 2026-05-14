import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterInstructionErrorsApp } from './router-instruction-errors-app';

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
    component: RouterInstructionErrorsApp,
  })
  .start();
