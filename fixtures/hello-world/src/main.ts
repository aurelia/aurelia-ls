import Aurelia from 'aurelia';
import { MyApp } from './my-app';

void Aurelia
  .app({
    host: document.querySelector('my-app')!,
    component: MyApp,
  })
  .start();
