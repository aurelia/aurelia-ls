import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  ValidationConfiguration,
} from '@aurelia/validation';
import {
  ValidationHtmlConfiguration,
} from '@aurelia/validation-html';
import { ValidationRuleSourceErrorsApp } from './validation-rule-source-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    ValidationConfiguration,
    ValidationHtmlConfiguration,
  )
  .app({
    host: document.querySelector('validation-rule-source-errors-app') ?? document.body,
    component: ValidationRuleSourceErrorsApp,
  })
  .start();
