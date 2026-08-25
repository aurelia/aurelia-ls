import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { StateDefaultConfiguration } from '@aurelia/state';
import { DefaultVirtualizationConfiguration } from '@aurelia/ui-virtualization';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { AdmittedPluginApp } from './admitted-plugin-app';
import {
  initialActivityState,
  initialDashboardState,
} from './state';
import { SharedPluginApp } from './shared-plugin-app';
import { UnadmittedPluginApp } from './unadmitted-plugin-app';

const admittedPlugins = [
  I18nConfiguration,
  StateDefaultConfiguration
    .init(initialDashboardState)
    .withStore('activity', initialActivityState),
  DefaultVirtualizationConfiguration,
  ValidationHtmlConfiguration,
];

new Aurelia()
  .register(
    StandardConfiguration,
    admittedPlugins,
  )
  .app({
    host: document.body,
    component: AdmittedPluginApp,
  })
  .start();

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: UnadmittedPluginApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    I18nConfiguration,
  )
  .app({
    host: document.body,
    component: SharedPluginApp,
  })
  .start();

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: SharedPluginApp,
  })
  .start();
