import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { ClassStyleInterpolationBoundariesApp } from './class-style-interpolation-boundaries-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('class-style-interpolation-boundaries-app') ?? document.body,
    component: ClassStyleInterpolationBoundariesApp,
  })
  .start();
