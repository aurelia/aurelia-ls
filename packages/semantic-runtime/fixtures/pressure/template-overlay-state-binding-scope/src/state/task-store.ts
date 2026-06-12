import type { IActionHandler } from '@aurelia/state';

export interface TaskItem {
  readonly title: string;
}

export interface TaskState {
  readonly title: string;
  readonly draft: string;
  readonly tasks: readonly TaskItem[];
}

export interface TaskFilterState {
  readonly label: string;
}

export const initialTaskState: TaskState = {
  title: 'Tasks',
  draft: '',
  tasks: [
    { title: 'Trace source scope' },
  ],
};

export const initialFilterState: TaskFilterState = {
  label: 'Open',
};

export const taskStateHandler: IActionHandler<TaskState> = (state) => state;
export const filterStateHandler: IActionHandler<TaskFilterState> = (state) => state;
