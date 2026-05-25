import Aurelia from 'aurelia';
import { StateDefaultConfiguration } from '@aurelia/state';
import { App } from './app';
import {
  initialTaskState,
  taskStateHandler,
} from './state/task-store';

Aurelia
  .register(StateDefaultConfiguration.init(initialTaskState, taskStateHandler))
  .app(App)
  .start();
