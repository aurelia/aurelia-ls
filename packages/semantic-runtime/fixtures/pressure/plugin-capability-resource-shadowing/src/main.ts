import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { PluginCapabilityResourceShadowingApp } from './plugin-capability-resource-shadowing-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: PluginCapabilityResourceShadowingApp,
  })
  .start();
