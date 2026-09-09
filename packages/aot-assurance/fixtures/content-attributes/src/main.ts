import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ContentAttributesApp } from './content-attributes-app.js';

const aurelia = new Aurelia().register(StandardConfiguration)
  .app({ host: document.querySelector('content-attributes-app')!, component: ContentAttributesApp });
void Promise.resolve(aurelia.start()).then(() => {
  Object.assign(window, {
    contentAttributesFixture: {
      async stop() { await aurelia.stop(true); aurelia.dispose(); },
    },
  });
});
