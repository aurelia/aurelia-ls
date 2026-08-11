import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { CapabilityExplanationApp } from './capability-explanation-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: CapabilityExplanationApp,
  })
  .start();
