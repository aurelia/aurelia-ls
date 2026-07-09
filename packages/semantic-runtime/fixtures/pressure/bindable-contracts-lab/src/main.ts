import Aurelia from 'aurelia';
import { BindableLabApp } from './bindable-lab-app';

void Aurelia.app({
  host: document.querySelector('app-root')!,
  component: BindableLabApp,
}).start();
