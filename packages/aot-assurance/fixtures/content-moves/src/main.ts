/* global document, window */
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ContentMovesApp } from './content-moves-app.js';

const aurelia = new Aurelia().register(StandardConfiguration)
  .app({ host: document.querySelector('content-moves-app')!, component: ContentMovesApp });
void Promise.resolve(aurelia.start()).then(() => {
  Object.assign(window, {
    contentMovesFixture: {
      async stop() { await aurelia.stop(true); aurelia.dispose(); },
    },
  });
});
