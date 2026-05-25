import { bindable, customElement } from 'aurelia';
import type { TaskItem } from './state/task-store';
import template from './task-list.html';

@customElement({
  name: 'task-list',
  template,
})
export class TaskList {
  @bindable tasks: readonly TaskItem[] = [];
}
