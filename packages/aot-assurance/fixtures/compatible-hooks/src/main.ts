import { Aurelia, CustomElement, customElement, StandardConfiguration } from '@aurelia/runtime-html';
import { RuntimePage } from './runtime-page.js';
import { DynamicGate } from './dynamic-gate.js';
import { LateTarget } from './late-target.js';
import standaloneNote from './standalone-note.html';

@customElement({
  name: 'compatible-app',
  template: '<p class="root-value">${message}</p><output class="standalone-note" textcontent.bind="standaloneNote"></output><runtime-page if.bind="show" message.bind="message"></runtime-page>',
  dependencies: [RuntimePage],
})
export class CompatibleApp {
  message = 'before';
  show = false;
  standaloneNote = standaloneNote.trim();
}

const aurelia = new Aurelia().register(StandardConfiguration)
  .app({ host: document.querySelector('compatible-app')!, component: CompatibleApp });
void Promise.resolve(aurelia.start()).then(() => {
  const app = aurelia.root.controller.viewModel as CompatibleApp;
  Object.assign(window, {
    hybridFixture: {
      activate() { app.show = true; },
      hide() { app.show = false; },
      update() { app.message = 'after'; },
      hookState() {
        const template = CustomElement.getDefinition(LateTarget).template;
        return { calls: DynamicGate.calls, lateTemplate: typeof template === 'string' ? template : '<compiled>' };
      },
      async stop() { await aurelia.stop(true); aurelia.dispose(); },
    },
  });
});
