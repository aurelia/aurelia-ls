import { AppTask, Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  IValidationRules,
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
    AppTask.activating(IValidationRules, (rules: any) => {
      rules
        .ensure('app-task-root')
        .withMessage('AppTask declared service-key callbacks should be framework-rooted.');
    }),
    AppTask.activating(LocalValidationRulesKey, (rules: any) => {
      rules
        .ensure('local-app-task-key')
        .withMessage('Arbitrary AppTask keys must not become validation roots.');
    }),
  )
  .app({
    host: document.querySelector('validation-rule-source-errors-app') ?? document.body,
    component: ValidationRuleSourceErrorsApp,
  })
  .start();

class LocalValidationRulesKey {}
