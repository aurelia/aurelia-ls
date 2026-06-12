import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { SyntheticWritebackConverterLocalApp } from './synthetic-writeback-converter-local-app';

void new Aurelia()
  .register(StandardConfiguration)
  .app({
    component: SyntheticWritebackConverterLocalApp,
    host: document.querySelector('synthetic-writeback-converter-local') ?? document.body,
  })
  .start();
