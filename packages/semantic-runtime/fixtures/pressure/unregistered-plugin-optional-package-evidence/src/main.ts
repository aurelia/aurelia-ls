import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { UnregisteredPluginOptionalPackageEvidenceApp } from './unregistered-plugin-optional-package-evidence-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: UnregisteredPluginOptionalPackageEvidenceApp,
  })
  .start();
