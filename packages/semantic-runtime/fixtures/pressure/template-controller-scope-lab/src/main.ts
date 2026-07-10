import Aurelia, { ArrayLikeHandler } from 'aurelia';
import { ContextScope, ScopeLabApp, SurfaceGate, TaskWindowHandler } from './scope-lab-app';

Aurelia
  .register(SurfaceGate, ContextScope, ArrayLikeHandler, TaskWindowHandler)
  .app(ScopeLabApp)
  .start();
