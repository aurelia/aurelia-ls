import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { KeyedFormSourceBindingsApp } from './keyed-form-source-bindings-app';
import {
  ContextualNumberTextValueConverter,
  NumberTextReadonlyValueConverter,
  NumberTextValueConverter,
} from './number-text-value-converter';

new Aurelia()
  .register(
    StandardConfiguration,
    NumberTextValueConverter,
    NumberTextReadonlyValueConverter,
    ContextualNumberTextValueConverter,
  )
  .app({
    host: document.querySelector('keyed-form-source-bindings-app') ?? document.body,
    component: KeyedFormSourceBindingsApp,
  })
  .start();
