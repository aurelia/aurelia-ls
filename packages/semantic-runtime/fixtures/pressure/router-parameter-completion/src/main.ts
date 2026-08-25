import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { RouterParameterCompletionApp } from './router-parameter-completion-app';

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration,
  )
  .app({
    host: document.body,
    component: RouterParameterCompletionApp,
  })
  .start();
