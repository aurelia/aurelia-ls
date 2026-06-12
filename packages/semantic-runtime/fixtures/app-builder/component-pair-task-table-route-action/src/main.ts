import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { TaskTableRouteAction } from './task-table-route-action';

Aurelia
  .register(RouterConfiguration)
  .app(TaskTableRouteAction)
  .start();
