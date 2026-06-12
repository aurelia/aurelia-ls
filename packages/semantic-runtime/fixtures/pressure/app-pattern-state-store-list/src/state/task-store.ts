import type { IActionHandler } from '@aurelia/state';

export interface TaskItem {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export interface TaskState {
  readonly title: string;
  readonly draft: string;
  readonly tasks: readonly TaskItem[];
}

export interface TaskFilterState {
  readonly label: string;
  readonly showCompleted: boolean;
}

export type TaskAction =
  | { readonly type: 'setDraft'; readonly value: string }
  | { readonly type: 'addTask' }
  | { readonly type: 'clearCompleted' };

export const initialTaskState: TaskState = {
  title: 'State store tasks',
  draft: '',
  tasks: [
    { id: 1, title: 'Review task flow', done: false },
    { id: 2, title: 'Plan task checks', done: false },
  ],
};

export const initialFilterState: TaskFilterState = {
  label: 'Active tasks',
  showCompleted: false,
};

export const taskStateHandler: IActionHandler<TaskState> = (state, action) => {
  const storeAction = readTaskAction(action);
  if (storeAction == null) {
    return state;
  }

  switch (storeAction.type) {
    case 'setDraft':
      return updateDraft(state, storeAction.value);
    case 'addTask':
      return addTask(state);
    case 'clearCompleted':
      return clearCompleted(state);
  }
};

export const filterStateHandler: IActionHandler<TaskFilterState> = (state) => state;

function updateDraft(state: TaskState, draft: string): TaskState {
  return {
    title: state.title,
    draft,
    tasks: state.tasks,
  };
}

function addTask(state: TaskState): TaskState {
  const title = state.draft.trim();
  if (title === '') {
    return state;
  }
  return {
    title: state.title,
    draft: '',
    tasks: state.tasks.concat({
      id: nextTaskId(state),
      title,
      done: false,
    }),
  };
}

function clearCompleted(state: TaskState): TaskState {
  return {
    title: state.title,
    draft: state.draft,
    tasks: state.tasks.filter((task) => !task.done),
  };
}

function nextTaskId(state: TaskState): number {
  return state.tasks.reduce((next, task) => Math.max(next, task.id + 1), 1);
}

function readTaskAction(action: unknown): TaskAction | null {
  if (!isRecord(action) || typeof action.type !== 'string') {
    return null;
  }
  switch (action.type) {
    case 'setDraft':
      return { type: 'setDraft', value: typeof action.value === 'string' ? action.value : '' };
    case 'addTask':
      return { type: 'addTask' };
    case 'clearCompleted':
      return { type: 'clearCompleted' };
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}
