import {
  bindingBehavior,
  customAttribute,
  customElement,
  valueConverter,
} from 'aurelia';
import template from './plugin-capability-resource-shadowing-app.html';

@customElement({
  name: 'validation-container',
  template: '<template><slot></slot></template>',
})
export class LocalValidationContainer {}

@customAttribute('validation-errors')
export class LocalValidationErrors {}

@valueConverter('t')
export class LocalTranslationValueConverter {
  toView(value: string): string {
    return value;
  }
}

@bindingBehavior('state')
export class LocalStateBindingBehavior {
  bind(): void {}
  unbind(): void {}
}

@customElement({
  name: 'plugin-capability-resource-shadowing-app',
  template,
  dependencies: [
    LocalValidationContainer,
    LocalValidationErrors,
    LocalTranslationValueConverter,
    LocalStateBindingBehavior,
  ],
})
export class PluginCapabilityResourceShadowingApp {
  readonly label = 'local translation';
  readonly value = 'local state';
}
