import { resolve } from 'aurelia';
import { TaskListState } from './task-list-state';

export class MyApp {
  readonly state = resolve(TaskListState);
}
