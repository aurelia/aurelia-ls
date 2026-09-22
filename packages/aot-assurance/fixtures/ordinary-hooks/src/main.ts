/* global document, window */
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { OrdinaryHooksApp } from './ordinary-hooks-app.js';

const aurelia = new Aurelia().register(StandardConfiguration).app({
  host: document.querySelector('ordinary-hooks-app')!,
  component: OrdinaryHooksApp,
});
await aurelia.start();
window.__ordinaryHooksAssurance = {
  ready: true,
  async stop() { await aurelia.stop(true); aurelia.dispose(); },
};
