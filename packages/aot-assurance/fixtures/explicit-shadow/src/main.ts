/* global document, window */
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ExplicitShadowApp } from './explicit-shadow-app.js';

const aurelia = new Aurelia().register(StandardConfiguration).app({
  host: document.querySelector('explicit-shadow-app')!,
  component: ExplicitShadowApp,
});
await aurelia.start();
window.__explicitShadowAssurance = {
  ready: true,
  async stop() { await aurelia.stop(true); aurelia.dispose(); },
};
