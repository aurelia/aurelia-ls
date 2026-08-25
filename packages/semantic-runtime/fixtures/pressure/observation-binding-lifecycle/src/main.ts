import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  LifecycleValueTarget,
  ObservationBindingLifecycleApp,
} from './observation-binding-lifecycle-app';

new Aurelia()
  .register(StandardConfiguration, LifecycleValueTarget)
  .app({
    host: document.body,
    component: ObservationBindingLifecycleApp,
  })
  .start();
