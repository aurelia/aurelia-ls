import { Aurelia } from 'aurelia';
import { App } from './app';

void Aurelia
  .app({
    component: App,
    host: document.body,
  })
  .start();
