import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { TemplateControllerBuiltInsApp } from './template-controller-built-ins-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('template-controller-built-ins') ?? document.body,
    component: TemplateControllerBuiltInsApp,
  })
  .start();
