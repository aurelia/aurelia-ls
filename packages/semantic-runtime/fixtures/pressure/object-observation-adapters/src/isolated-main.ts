import Aurelia from 'aurelia';
import { IsolatedApp } from './isolated-app';

void Aurelia.app({
  host: document.querySelector('isolated-app') ?? document.body,
  component: IsolatedApp,
}).start();
