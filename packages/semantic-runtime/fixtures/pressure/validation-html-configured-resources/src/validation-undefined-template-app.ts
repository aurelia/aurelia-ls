import { customElement } from '@aurelia/runtime-html';
import type { ValidationResultTarget } from '@aurelia/validation-html';
import template from './validation-undefined-template-app.html';

@customElement({
  name: 'validation-undefined-template-app',
  template,
})
export class ValidationUndefinedTemplateApp {
  errors: ValidationResultTarget[] = [];
  displayName = 'Ada';
}
