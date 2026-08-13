import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { ValidationCoreOnlyApp } from './validation-core-only-app';
import { ValidationNullTemplateApp } from './validation-null-template-app';
import { ValidationUndefinedTemplateApp } from './validation-undefined-template-app';

const coreOnlyValidation = ValidationHtmlConfiguration.customize((options) => {
  options.UseSubscriberCustomAttribute = false;
  options.SubscriberCustomElementTemplate = '';
});

const nullTemplateValidation = ValidationHtmlConfiguration.customize((options) => {
  // The framework deliberately accepts null here even though the public option type remains string.
  options.SubscriberCustomElementTemplate = null as unknown as string;
});

const undefinedTemplateValidation = ValidationHtmlConfiguration.customize((options) => {
  // The framework deliberately accepts undefined here and treats it like an absent container template.
  options.SubscriberCustomElementTemplate = undefined as unknown as string;
});

new Aurelia()
  .register(
    StandardConfiguration,
    coreOnlyValidation,
    // The closed option still excludes validation-errors, while this unknown registry keeps effective canonical
    // availability open until registration ordering/key evidence can prove that it cannot provide the same key.
    UnknownRegistry,
  )
  .app({
    host: document.body,
    component: ValidationCoreOnlyApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    nullTemplateValidation,
  )
  .app({
    host: document.body,
    component: ValidationNullTemplateApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    undefinedTemplateValidation,
  )
  .app({
    host: document.body,
    component: ValidationUndefinedTemplateApp,
  })
  .start();
