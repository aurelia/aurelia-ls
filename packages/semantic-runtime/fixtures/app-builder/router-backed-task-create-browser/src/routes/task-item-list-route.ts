import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  title: string = '';
  done: boolean = false;

  create() {
    this.state.createTaskItem(this.title, this.done);
  }
}