/* global HTMLElement */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- The repository-wide ESLint program uses NodeNext while this Vite fixture intentionally uses Bundler resolution. */

import Aurelia from 'aurelia';

import { KeyedTableApp } from './keyed-table-app';

export function startKeyedTableApplication(host: HTMLElement): Aurelia {
  const aurelia = new Aurelia();
  aurelia.app({ host, component: KeyedTableApp });
  if (typeof aurelia.start()?.then === 'function') {
    throw new Error('The keyed-table benchmark application must start synchronously.');
  }
  return aurelia;
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
