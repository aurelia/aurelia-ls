import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { TemplateRefListenerSemanticsApp } from './template-ref-listener-semantics-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: TemplateRefListenerSemanticsApp,
  })
  .start();
