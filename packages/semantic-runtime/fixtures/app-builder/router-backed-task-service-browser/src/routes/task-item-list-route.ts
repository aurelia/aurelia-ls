import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  taskItemsPromise: ReturnType<TaskItemBrowseState['listTaskItems']> = this.state.listTaskItems();
  title: string = '';
  done: boolean = false;

  create() {
    this.taskItemsPromise = this.state.createTaskItem(this.title, this.done);
  }
}