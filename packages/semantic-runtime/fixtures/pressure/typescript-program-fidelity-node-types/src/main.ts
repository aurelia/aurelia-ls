import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { NodeTypesApp } from './node-types-app.js';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: NodeTypesApp,
  })
  .start();
