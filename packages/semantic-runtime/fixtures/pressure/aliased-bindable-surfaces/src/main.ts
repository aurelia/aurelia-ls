import Aurelia from 'aurelia';
import { App } from './app';

void Aurelia.app({
  host: document.querySelector('app-root')!,
  component: App,
}).start();
