import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ProxyObservableEscapesApp } from './proxy-observable-escapes-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('proxy-observable-escapes-app') ?? document.body,
    component: ProxyObservableEscapesApp,
  })
  .start();
