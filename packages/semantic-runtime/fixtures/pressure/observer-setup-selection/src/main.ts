import Aurelia from 'aurelia';
import { ObserverSetupApp } from './observer-setup-app';

void Aurelia.app({
  host: document.querySelector('observer-setup-app') ?? document.body,
  component: ObserverSetupApp,
}).start();
