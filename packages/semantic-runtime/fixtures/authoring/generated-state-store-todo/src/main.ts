import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { StateDefaultConfiguration } from '@aurelia/state';
import { App } from './app';
import {
  filterStateHandler,
  initialFilterState,
  initialTodoState,
  todoStateHandler,
} from './state/todo-store';

new Aurelia()
  .register(
    StandardConfiguration,
    StateDefaultConfiguration
      .init(initialTodoState, todoStateHandler)
      .withStore('filters', initialFilterState, filterStateHandler),
  )
  .app({
    host: document.body,
    component: App,
  })
  .start();
