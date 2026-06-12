import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { TaskItemBrowseState } from '../task-item-browse-state';
import { TaskItem } from '../task-item';

export class TaskItemDetailRoute {
  readonly state = resolve(TaskItemBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    taskId: string;
  }>();

  get taskItem(): TaskItem | null {
    return this.state.findTaskItem(this.routeParams.taskId);
  }
}