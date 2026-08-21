import Aurelia, { ShortHandBindingSyntax } from 'aurelia';
import { BindableLabApp } from './bindable-lab-app';

void Aurelia.register(...ShortHandBindingSyntax).app({
  host: document.querySelector('app-root')!,
  component: BindableLabApp,
}).start();
