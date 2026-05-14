import { aliasedResourcesRegistry } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ModuleLoaderInvalidTransformInputApp } from './app';

new Aurelia()
  .register(
    StandardConfiguration,
    aliasedResourcesRegistry(42 as never, 'invalid-module-input'),
  )
  .app({
    host: document.body,
    component: ModuleLoaderInvalidTransformInputApp,
  })
  .start();
