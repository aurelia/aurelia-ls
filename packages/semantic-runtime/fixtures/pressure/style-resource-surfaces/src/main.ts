import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { StyleResourceSurfacesApp } from './style-resource-surfaces-app';
import './global.css';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: StyleResourceSurfacesApp,
  })
  .start();
