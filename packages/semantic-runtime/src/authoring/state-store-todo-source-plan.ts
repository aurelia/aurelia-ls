import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';

export interface StateStoreTodoSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly statePath: string;
}

export function stateStoreTodoSourcePlan(model: StateStoreTodoSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    stateStoreTodoSourceFiles(model),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/state'],
    }),
  );
}

function stateStoreTodoSourceFiles(
  model: StateStoreTodoSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    stateStoreTodoEntrypointFile(model),
    stateStoreTodoRootComponentFile(model),
    stateStoreTodoRootTemplateFile(model),
    stateStoreTodoRootStyleFile(model),
    stateStoreTodoStateFile(model),
  ];
}

function stateStoreTodoEntrypointFile(model: StateStoreTodoSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.entrypointPath,
    'entrypoint',
    'typescript',
    'create-entrypoint',
    fillSourceTemplate(ENTRYPOINT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
      STATE_MODULE: moduleSpecifier(model.entrypointPath, model.statePath, false),
    }),
  );
}

function stateStoreTodoRootComponentFile(model: StateStoreTodoSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
    }),
  );
}

function stateStoreTodoRootTemplateFile(model: StateStoreTodoSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    ROOT_TEMPLATE_SOURCE,
  );
}

function stateStoreTodoRootStyleFile(model: StateStoreTodoSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    ROOT_STYLE_SOURCE,
  );
}

function stateStoreTodoStateFile(model: StateStoreTodoSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'configure-state-store',
    STATE_SOURCE,
  );
}

const ENTRYPOINT_SOURCE = sourceText(`import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { StateDefaultConfiguration } from '@aurelia/state';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';
import {
  filterStateHandler,
  initialFilterState,
  initialTodoState,
  todoStateHandler,
} from '__STATE_MODULE__';

new Aurelia()
  .register(
    StandardConfiguration,
    StateDefaultConfiguration
      .init(initialTodoState, todoStateHandler)
      .withStore('filters', initialFilterState, filterStateHandler),
  )
  .app({
    host: document.body,
    component: __ROOT_COMPONENT_CLASS__,
  })
  .start();
`);

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
})
export class __ROOT_COMPONENT_CLASS__ {}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="task-shell">
  <header>
    <h1>\${title & state}</h1>
    <p textcontent.bind="label & state:'filters'"></p>
  </header>

  <section class="task-entry" aria-labelledby="new-task">
    <label id="new-task" for="draft">New task</label>
    <input id="draft" value.state="draft" input.dispatch="{ type: 'setDraft', value: $event.target.value }">
    <button type="button" disabled.bind="draft === '' & state" click.dispatch="{ type: 'addTodo' }">Add task</button>
  </section>

  <ul>
    <li repeat.for="todo of todos & state">
      <span>\${todo.title}</span>
    </li>
  </ul>
</main>
`);

const ROOT_STYLE_SOURCE = sourceText(`.task-shell {
  display: grid;
  gap: 1rem;
  max-width: 44rem;
  margin: 0 auto;
  padding: 2rem;
}

.task-entry {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: end;
}

.task-entry label {
  grid-column: 1 / -1;
}

.task-entry input {
  min-width: 0;
}

.task-shell ul {
  display: grid;
  gap: 0.5rem;
  padding-inline-start: 1.25rem;
}
`);

const STATE_SOURCE = sourceText(`import type { IActionHandler } from '@aurelia/state';

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
`);
