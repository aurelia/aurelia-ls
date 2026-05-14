import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { FetchClientConfigErrorsApp } from './fetch-client-config-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('fetch-client-config-errors-app') ?? document.body,
    component: FetchClientConfigErrorsApp,
  })
  .start();
