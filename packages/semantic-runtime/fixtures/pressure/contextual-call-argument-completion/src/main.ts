import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ContextualCallArgumentCompletionApp } from './contextual-call-argument-completion-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ContextualCallArgumentCompletionApp,
  })
  .start();
