import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ListenerMethodReferenceApp } from './listener-method-reference-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('listener-method-reference-app') ?? document.body,
    component: ListenerMethodReferenceApp,
  })
  .start();
