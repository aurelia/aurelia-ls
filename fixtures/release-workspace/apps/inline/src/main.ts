import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { InlineApp } from './app';

new Aurelia()
  .register(StandardConfiguration)
  .app({ host: document.body, component: InlineApp })
  .start();
