import {
  AppTask,
  Aurelia,
  DefaultBindingSyntax,
  StyleConfiguration,
  customElement,
} from '@aurelia/runtime-html';
import { IContainer, LoggerConfiguration, Registration } from '@aurelia/kernel';
import { StateDefaultConfiguration } from '@aurelia/state';
import { ValidationI18nConfiguration } from '@aurelia/validation-i18n';
import * as RegistryModule from './registry-barrel';

const NestedMethodRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('nested-method', { marker: 'nested-method' }));
  },
};

const NestedArrowRegistry = {
  register: (container: IContainer): void => {
    container.register(Registration.instance('nested-arrow', { marker: 'nested-arrow' }));
  },
};

class NestedSingleton {}

const BeforeUnknownSpreadRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('before-unknown-spread', { marker: 'before' }));
  },
};

const AfterUnknownSpreadRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('after-unknown-spread', { marker: 'after' }));
  },
};

declare const runtimeRegistries: Record<string, unknown>;

const nestedCarriers = [
  [
    NestedMethodRegistry,
    Registration.instance('nested-instance', { marker: 'nested-instance' }),
  ],
  {
    nestedArrow: NestedArrowRegistry,
    nestedSingleton: Registration.singleton('nested-singleton', NestedSingleton),
  },
  {
    before: BeforeUnknownSpreadRegistry,
    ...runtimeRegistries,
    after: AfterUnknownSpreadRegistry,
  },
];

@customElement({
  name: 'di-registration-carriers-app',
  template: '<template><p>${message}</p></template>',
})
export class DiRegistrationCarriersApp {
  message = 'Registration carriers';
}

new Aurelia()
  .register(
    nestedCarriers,
    RegistryModule,
    DefaultBindingSyntax,
    StateDefaultConfiguration,
    AppTask,
    LoggerConfiguration.create({ sinks: [] }),
    StyleConfiguration.shadowDOM({ sharedStyles: [] }),
    ValidationI18nConfiguration,
  )
  .app({
    host: document.body,
    component: DiRegistrationCarriersApp,
  })
  .start();
