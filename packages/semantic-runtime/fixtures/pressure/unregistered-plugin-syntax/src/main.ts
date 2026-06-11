import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { StateDefaultConfiguration } from '@aurelia/state';
import { UnregisteredPluginSyntaxApp } from './unregistered-plugin-syntax-app';

void I18nConfiguration;
void StateDefaultConfiguration;

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: UnregisteredPluginSyntaxApp,
  })
  .start();
