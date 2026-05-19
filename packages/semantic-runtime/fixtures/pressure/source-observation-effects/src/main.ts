import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { SourceObservationEffectsApp } from './source-observation-effects-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('source-observation-effects-app') ?? document.body,
    component: SourceObservationEffectsApp,
  })
  .start();
