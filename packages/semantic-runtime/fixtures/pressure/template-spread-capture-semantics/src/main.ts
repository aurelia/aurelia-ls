import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { TemplateSpreadCaptureSemanticsApp } from './template-spread-capture-semantics-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: TemplateSpreadCaptureSemanticsApp,
  })
  .start();
