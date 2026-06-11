import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { RouterConfiguration } from '@aurelia/router';
import { StateDefaultConfiguration } from '@aurelia/state';
import { DefaultVirtualizationConfiguration } from '@aurelia/ui-virtualization';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { UnregisteredPluginResourcesApp } from './unregistered-plugin-resources-app';

void I18nConfiguration;
void RouterConfiguration;
void StateDefaultConfiguration;
void DefaultVirtualizationConfiguration;
void ValidationHtmlConfiguration;

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: UnregisteredPluginResourcesApp,
  })
  .start();
