import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { SupportDeskApp } from './app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('support-desk') ?? document.body,
    component: SupportDeskApp,
  })
  .start();
