import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { BindingResultObservationApp } from './binding-result-observation-app';

new Aurelia().register(StandardConfiguration).app({
  host: document.body,
  component: BindingResultObservationApp,
}).start();
