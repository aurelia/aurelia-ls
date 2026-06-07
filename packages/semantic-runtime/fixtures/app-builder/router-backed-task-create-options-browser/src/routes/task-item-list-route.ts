import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';
import type { TaskItemPriority, TaskItemLabel } from '../task-item';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  title: string = '';
  priority: TaskItemPriority = 'normal';
  labels: TaskItemLabel[] = [];

  create() {
    this.state.createTaskItem(this.title, this.priority, this.labels);
  }
}