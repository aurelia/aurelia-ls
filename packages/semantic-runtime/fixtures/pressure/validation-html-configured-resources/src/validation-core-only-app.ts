import { customElement } from '@aurelia/runtime-html';
import type { ValidationResultTarget } from '@aurelia/validation-html';
import template from './validation-core-only-app.html';

@customElement({
  name: 'validation-core-only-app',
  template,
})
export class ValidationCoreOnlyApp {
  errors: ValidationResultTarget[] = [];
  displayName = 'Ada';
}
