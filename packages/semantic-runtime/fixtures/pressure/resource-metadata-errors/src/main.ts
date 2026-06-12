import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ResourceMetadataErrorsApp } from './resource-metadata-errors-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ResourceMetadataErrorsApp,
  })
  .start();
