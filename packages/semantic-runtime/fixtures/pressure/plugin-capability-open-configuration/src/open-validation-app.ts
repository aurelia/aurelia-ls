import { customElement } from '@aurelia/runtime-html';
import template from './open-validation-app.html';

@customElement({
  name: 'open-validation-app',
  template,
})
export class OpenValidationApp {
  readonly displayName = 'Ada';
  readonly errors: readonly unknown[] = [];
}
