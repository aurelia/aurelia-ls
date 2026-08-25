import Aurelia from 'aurelia';
import { OpenComputedApp } from './open-computed-app';

void Aurelia.app({
  host: document.querySelector('open-computed-app') ?? document.body,
  component: OpenComputedApp,
}).start();
