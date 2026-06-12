import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { TrackableMethodDependenciesApp } from './trackable-method-dependencies-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('trackable-method-dependencies-app') ?? document.body,
    component: TrackableMethodDependenciesApp,
  })
  .start();
