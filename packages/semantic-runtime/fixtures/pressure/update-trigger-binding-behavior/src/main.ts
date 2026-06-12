import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { UpdateTriggerBindingBehaviorApp } from './update-trigger-binding-behavior-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: UpdateTriggerBindingBehaviorApp,
  })
  .start();
