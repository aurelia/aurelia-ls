import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { RouterConfiguration } from '@aurelia/router';
import { StateDefaultConfiguration } from '@aurelia/state';
import { DefaultVirtualizationConfiguration } from '@aurelia/ui-virtualization';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { RegisteredPluginCapabilitiesApp } from './registered-plugin-capabilities-app';

new Aurelia()
  .register(
    StandardConfiguration,
    I18nConfiguration,
    RouterConfiguration,
    StateDefaultConfiguration,
    DefaultVirtualizationConfiguration,
    ValidationHtmlConfiguration,
  )
  .app({
    host: document.body,
    component: RegisteredPluginCapabilitiesApp,
  })
  .start();
