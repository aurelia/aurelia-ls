import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { App } from './app';

new Aurelia()
  .register(StandardConfiguration, UnknownRegistry)
  .app({
    host: document.querySelector('app')!,
    component: App,
  })
  .start();
