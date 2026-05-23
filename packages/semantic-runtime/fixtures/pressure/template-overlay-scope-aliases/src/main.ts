import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { TemplateOverlayScopeAliasesApp } from './template-overlay-scope-aliases-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('template-overlay-scope-aliases') ?? document.body,
    component: TemplateOverlayScopeAliasesApp,
  })
  .start();
