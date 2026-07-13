import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { TemplateLocalTemplateSemanticsApp } from './template-local-template-semantics-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: TemplateLocalTemplateSemanticsApp,
  })
  .start();
