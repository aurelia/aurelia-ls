import Aurelia from 'aurelia';
import { SyntheticIsolationApp } from './synthetic-isolation-app';

void Aurelia.app({
  host: document.querySelector('synthetic-isolation-app') ?? document.body,
  component: SyntheticIsolationApp,
}).start();
