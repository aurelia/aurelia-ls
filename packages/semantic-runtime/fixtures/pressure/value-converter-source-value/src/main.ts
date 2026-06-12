import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { ValueConverterSourceValueApp } from './value-converter-source-value-app';

void new Aurelia()
  .register(StandardConfiguration)
  .app({
    component: ValueConverterSourceValueApp,
    host: document.querySelector('value-converter-source-value') ?? document.body,
  })
  .start();

