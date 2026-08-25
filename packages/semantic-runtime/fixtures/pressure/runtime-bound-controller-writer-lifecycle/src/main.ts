import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimeBoundControllerWriterLifecycleApp } from './runtime-bound-controller-writer-lifecycle-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('runtime-bound-controller-writer-lifecycle-app') ?? document.body,
    component: RuntimeBoundControllerWriterLifecycleApp,
  })
  .start();
