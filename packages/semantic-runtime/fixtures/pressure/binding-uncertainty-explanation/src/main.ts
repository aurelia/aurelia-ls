import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { BindingExplanationExactApp } from './exact-app';
import { BindingExplanationSharedApp } from './shared-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: BindingExplanationExactApp,
  })
  .start();

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: BindingExplanationSharedApp,
  })
  .start();

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: BindingExplanationSharedApp,
  })
  .start();
