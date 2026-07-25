import { customElement } from '@aurelia/runtime-html';
import type { ValidationResultTarget } from '@aurelia/validation-html';
import template from './validation-null-template-app.html';

@customElement({
  name: 'validation-null-template-app',
  template,
})
export class ValidationNullTemplateApp {
  errors: ValidationResultTarget[] = [];
  displayName = 'Ada';
}
