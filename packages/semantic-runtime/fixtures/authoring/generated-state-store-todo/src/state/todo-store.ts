import type { IActionHandler } from '@aurelia/state';

export interface TodoItem {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export interface TodoState {
  readonly title: string;
  readonly draft: string;
  readonly todos: readonly TodoItem[];
}

export interface FilterState {
  readonly label: string;
  readonly showCompleted: boolean;
}

export type TodoAction =
  | { readonly type: 'setDraft'; readonly value: string }
  | { readonly type: 'addTodo' }
  | { readonly type: 'clearCompleted' };

export const initialTodoState: TodoState = {
  title: 'State store tasks',
  draft: '',
  todos: [
    { id: 1, title: 'Review app shell', done: false },
    { id: 2, title: 'Plan semantic checks', done: false },
  ],
};

export const initialFilterState: FilterState = {
  label: 'Active tasks',
  showCompleted: false,
};

export const todoStateHandler: IActionHandler<TodoState> = (state, action) => {
  const todoAction = readTodoAction(action);
  if (todoAction == null) {
    return state;
  }

  switch (todoAction.type) {
    case 'setDraft':
      return updateDraft(state, todoAction.value);
    case 'addTodo':
      return addTodo(state);
    case 'clearCompleted':
      return clearCompleted(state);
  }
};

export const filterStateHandler: IActionHandler<FilterState> = (state) => state;

function updateDraft(state: TodoState, draft: string): TodoState {
  return {
    title: state.title,
    draft,
    todos: state.todos,
  };
}

function addTodo(state: TodoState): TodoState {
  const title = state.draft.trim();
  if (title === '') {
    return state;
  }
  return {
    title: state.title,
    draft: '',
    todos: state.todos.concat({
      id: nextTodoId(state),
      title,
      done: false,
    }),
  };
}

function clearCompleted(state: TodoState): TodoState {
  return {
    title: state.title,
    draft: state.draft,
    todos: state.todos.filter((todo) => !todo.done),
  };
}

function nextTodoId(state: TodoState): number {
  return state.todos.reduce((next, todo) => Math.max(next, todo.id + 1), 1);
}

function readTodoAction(action: unknown): TodoAction | null {
  if (!isRecord(action) || typeof action.type !== 'string') {
    return null;
  }
  switch (action.type) {
    case 'setDraft':
      return { type: 'setDraft', value: typeof action.value === 'string' ? action.value : '' };
    case 'addTodo':
      return { type: 'addTodo' };
    case 'clearCompleted':
      return { type: 'clearCompleted' };
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}
