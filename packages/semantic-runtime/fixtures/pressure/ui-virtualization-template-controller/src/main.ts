import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { DefaultVirtualizationConfiguration } from '@aurelia/ui-virtualization';
import { UiVirtualizationApp } from './ui-virtualization-app';

new Aurelia()
  .register(StandardConfiguration, DefaultVirtualizationConfiguration)
  .app({
    host: document.querySelector('ui-virtualization-app') ?? document.body,
    component: UiVirtualizationApp,
  })
  .start();
