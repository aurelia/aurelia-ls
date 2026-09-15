import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ContentAttributesApp } from './content-attributes-app.js';

// The browser harness registers native custom elements before modules load.
window.dispatchEvent(new Event('content-attributes:before-app'));
const aurelia = new Aurelia().register(StandardConfiguration)
  .app({ host: document.querySelector('content-attributes-app')!, component: ContentAttributesApp });
void Promise.resolve(aurelia.start()).then(() => {
  Object.assign(window, {
    contentAttributesFixture: {
      async stop() { await aurelia.stop(true); aurelia.dispose(); },
    },
  });
});
