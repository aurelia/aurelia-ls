/* global __AOT_ASSURANCE_LANE__, window */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- The repository-wide ESLint program uses NodeNext while this Vite fixture intentionally uses Bundler resolution. */

import Aurelia from 'aurelia';

import { G0App } from './g0-app';
import { readInstalledRuntimeProbe } from './runtime-probe';

const lane = __AOT_ASSURANCE_LANE__;
const aurelia = Aurelia.app(G0App);
const probe = readInstalledRuntimeProbe();
let stopped = false;

await aurelia.start();
const app = aurelia.root.controller.viewModel as G0App;

window.__aotAssurance = {
  lane,
  ready: true,
  events: app.events,
  readModel: () => app.snapshot(),
  readProbes: () => probe.read(),
  stop: async () => {
    if (stopped) return;
    stopped = true;
    await aurelia.stop(true);
    aurelia.dispose();
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
