import { bindable, customElement } from '@aurelia/runtime-html';
import template from './exact-app.html';

@customElement({
  name: 'strict-card',
  template: '<template>${title}</template>',
})
export class StrictCard {
  @bindable title = '';
}

@customElement({
  name: 'binding-explanation-exact-app',
  template,
  dependencies: [StrictCard],
})
export class BindingExplanationExactApp {
  name = 'Ada';
  maybeTitle: string | undefined = undefined;
  readonly readonlyName = 'Ada';
  selectedNullable: string[] | null = null;

  save(): void {}
}
