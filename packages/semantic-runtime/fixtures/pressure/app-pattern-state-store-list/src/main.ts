import Aurelia from 'aurelia';
import { StateDefaultConfiguration } from '@aurelia/state';
import { App } from './app';
import {
  filterStateHandler,
  initialFilterState,
  initialTaskState,
  taskStateHandler,
} from './state/task-store';

Aurelia
  .register(
    StateDefaultConfiguration
      .init(initialTaskState, taskStateHandler)
      .withStore('filters', initialFilterState, filterStateHandler),
  )
  .app(App)
  .start();
