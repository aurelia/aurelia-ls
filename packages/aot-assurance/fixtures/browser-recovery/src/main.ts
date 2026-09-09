/* global window */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- The repository ESLint program uses NodeNext while this Vite fixture intentionally uses Bundler resolution. */
import Aurelia from 'aurelia';
import { BrowserRecoveryApp } from './browser-recovery-app';

const aurelia = Aurelia.app(BrowserRecoveryApp);
await aurelia.start();
window.__browserRecoveryAssurance = {
  ready: true,
  readModel: () => {
    const model = aurelia.root.controller.viewModel as BrowserRecoveryApp;
    return { message: model.message, ignored: model.ignored, visible: model.visible };
  },
  stop: async () => { await aurelia.stop(true); aurelia.dispose(); },
};
