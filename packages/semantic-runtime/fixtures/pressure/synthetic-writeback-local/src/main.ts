import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { SyntheticWritebackLocalApp } from './synthetic-writeback-local-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('synthetic-writeback-local') ?? document.body,
    component: SyntheticWritebackLocalApp,
  })
  .start();
