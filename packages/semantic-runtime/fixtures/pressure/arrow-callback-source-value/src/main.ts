import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ArrowCallbackSourceValueApp } from './arrow-callback-source-value-app';

void new Aurelia()
  .register(StandardConfiguration)
  .app({
    component: ArrowCallbackSourceValueApp,
    host: document.querySelector('arrow-callback-source-value') ?? document.body,
  })
  .start();
