/* global __AOT_ASSURANCE_LANE__, window */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- The repository ESLint program uses NodeNext while this Vite fixture intentionally uses Bundler resolution. */

import Aurelia from 'aurelia';

import { LocalAotApp } from './local-aot-app';

const aurelia = Aurelia.app(LocalAotApp);
let stopped = false;

await aurelia.start();
window.__localTemplatesAssurance = {
  lane: __AOT_ASSURANCE_LANE__,
  ready: true,
  stop: async () => {
    if (stopped) return;
    stopped = true;
    await aurelia.stop(true);
    aurelia.dispose();
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
