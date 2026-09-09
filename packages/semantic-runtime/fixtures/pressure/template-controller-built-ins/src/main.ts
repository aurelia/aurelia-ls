/* global document */

import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { attachControllerAssurance } from './assurance-bridge.js';
import { TemplateControllerBuiltInsApp } from './template-controller-built-ins-app.js';

const aurelia = new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('template-controller-built-ins') ?? document.body,
    component: TemplateControllerBuiltInsApp,
  });

await aurelia.start();
attachControllerAssurance(aurelia);
