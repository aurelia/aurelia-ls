import type { IActionHandler } from '@aurelia/state';

export interface TaskItem {
  readonly title: string;
}

export interface TaskState {
  readonly selectedTask: TaskItem;
}

export const initialTaskState: TaskState = {
  selectedTask: { title: 'Trace child scope' },
};

export const taskStateHandler: IActionHandler<TaskState> = (state) => state;
