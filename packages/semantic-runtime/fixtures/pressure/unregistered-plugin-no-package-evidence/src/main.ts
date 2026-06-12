import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { UnregisteredPluginNoPackageEvidenceApp } from './unregistered-plugin-no-package-evidence-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: UnregisteredPluginNoPackageEvidenceApp,
  })
  .start();
