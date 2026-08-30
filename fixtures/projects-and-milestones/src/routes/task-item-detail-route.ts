import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { TaskItemBrowseState } from '../task-item-browse-state';
import { TaskItem } from '../task-item';

export class TaskItemDetailRoute {
  readonly state = resolve(TaskItemBrowseState);
  readonly taskId = resolve(IRouteContext).getRouteParameters<{
    taskId: string;
  }>().taskId;

  get taskItem(): TaskItem | null {
    return this.state.findTaskItem(this.taskId);
  }
}
