import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { TemplateCollectionObservationApp } from './template-collection-observation-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('template-collection-observation-app') ?? document.body,
    component: TemplateCollectionObservationApp,
  })
  .start();
