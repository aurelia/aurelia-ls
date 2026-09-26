/* global document, window */
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { CeCompositionApp } from './ce-composition-app.js';

const aurelia = new Aurelia().register(StandardConfiguration).app({
  host: document.querySelector('ce-composition-app')!,
  component: CeCompositionApp,
});
await aurelia.start();
window.__ceCompositionAssurance = {
  ready: true,
  async stop() { await aurelia.stop(true); aurelia.dispose(); },
};
