import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { GuidanceTruthCanaryApp } from './guidance-truth-canary-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: GuidanceTruthCanaryApp,
  })
  .start();
