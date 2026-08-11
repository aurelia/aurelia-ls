import { customElement } from '@aurelia/runtime-html';
import template from './shared-app.html';

@customElement({
  name: 'binding-explanation-shared-app',
  template,
})
export class BindingExplanationSharedApp {
  sharedName = 'shared';
}
