import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemDetailRoute {
  readonly state = resolve(TaskItemBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    taskId: string;
  }>();
  readonly taskItemPromise: ReturnType<TaskItemBrowseState['loadAssignedTask']> = this.state.loadAssignedTask(this.routeParams.taskId);
}