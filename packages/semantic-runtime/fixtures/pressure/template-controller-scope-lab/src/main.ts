import Aurelia from 'aurelia';
import { ScopeLabApp, SurfaceGate } from './scope-lab-app';

Aurelia
  .register(SurfaceGate)
  .app(ScopeLabApp)
  .start();
