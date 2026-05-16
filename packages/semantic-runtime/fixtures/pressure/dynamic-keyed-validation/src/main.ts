import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  ValidationConfiguration,
} from '@aurelia/validation';
import {
  ValidationHtmlConfiguration,
} from '@aurelia/validation-html';
import { DynamicKeyedValidationApp } from './dynamic-keyed-validation-app';

new Aurelia()
  .register(
    StandardConfiguration,
    ValidationConfiguration,
    ValidationHtmlConfiguration,
  )
  .app({
    host: document.querySelector('dynamic-keyed-validation-app') ?? document.body,
    component: DynamicKeyedValidationApp,
  })
  .start();
