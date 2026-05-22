import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  referenceInstantiationSourcePattern,
  recipeSourceEditPolicy,
  recipeSourceFile,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
  sourceTemplateValuesUsedBy,
} from './source-template.js';
import { SourcePatternModules } from './source-pattern-modules.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  pluralizeLastSourceNameWord,
  singularizeSourceNameWord,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';

export interface StateStoreListSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly statePath: string;
  readonly storeDomain: StateStoreListDomainNames;
}

export interface StateStoreListDomainNames {
  readonly entityTitle: string;
  readonly entityLowerTitle: string;
  readonly entityClassName: string;
  readonly entityVariableName: string;
  readonly entityKebabName: string;
  readonly itemInterfaceName: string;
  readonly stateInterfaceName: string;
  readonly filterStateInterfaceName: string;
  readonly actionTypeName: string;
  readonly collectionPropertyName: string;
  readonly collectionTitle: string;
  readonly collectionLowerTitle: string;
  readonly initialStateExportName: string;
  readonly stateHandlerExportName: string;
  readonly setDraftActionType: string;
  readonly addActionType: string;
  readonly clearCompletedActionType: string;
  readonly addFunctionName: string;
  readonly nextIdFunctionName: string;
  readonly readActionFunctionName: string;
}

export function defaultStateStoreListDomainNames(): StateStoreListDomainNames {
  return stateStoreListDomainNamesFromParameters('Task');
}

export function stateStoreListDomainNamesFromParameters(
  entityName: string,
  collectionName?: string | null,
): StateStoreListDomainNames {
  const entityWords = sourceNameWords(entityName).map(singularizeSourceNameWord);
  const collectionWords = sourceNameWords(collectionName ?? '').join('') === 'item'
    ? pluralizeLastSourceNameWord(entityWords)
    : sourceNameWords(collectionName ?? '').map((word, index, words) =>
      index === words.length - 1 ? pluralizeSourceDomainWord(word) : word
    );
  const entityClassName = pascalSourceName(entityWords);
  const collectionPropertyName = lowerCamelSourceName(collectionWords);
  return {
    entityTitle: titleSourceName(entityWords),
    entityLowerTitle: lowerTitleSourceName(entityWords),
    entityClassName,
    entityVariableName: lowerCamelSourceName(entityWords),
    entityKebabName: kebabSourceName(entityWords),
    itemInterfaceName: `${entityClassName}Item`,
    stateInterfaceName: `${entityClassName}State`,
    filterStateInterfaceName: `${entityClassName}FilterState`,
    actionTypeName: `${entityClassName}Action`,
    collectionPropertyName,
    collectionTitle: titleSourceName(collectionWords),
    collectionLowerTitle: lowerTitleSourceName(collectionWords),
    initialStateExportName: `initial${entityClassName}State`,
    stateHandlerExportName: `${lowerCamelSourceName(entityWords)}StateHandler`,
    setDraftActionType: 'setDraft',
    addActionType: `add${entityClassName}`,
    clearCompletedActionType: 'clearCompleted',
    addFunctionName: `add${entityClassName}`,
    nextIdFunctionName: `next${entityClassName}Id`,
    readActionFunctionName: `read${entityClassName}Action`,
  };
}

function pluralizeSourceDomainWord(word: string): string {
  return singularizeSourceNameWord(word) === word
    ? pluralizeLastSourceNameWord([word])[0]!
    : word;
}

export function stateStoreListSourcePlan(model: StateStoreListSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    referenceInstantiationSourceFiles(stateStoreListSourceFiles(model)),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/state'],
    }),
    stateStoreListSourcePattern(model),
  );
}

function stateStoreListSourcePattern(model: StateStoreListSourcePlanModel) {
  const domain = model.storeDomain;
  return referenceInstantiationSourcePattern(
    'state-store-list.reference-instantiation',
    '@aurelia/state store pattern',
    'A complete reference instantiation of @aurelia/state configuration, store-scoped template reads, state binding commands, and action dispatch.',
    [
      'Treat the default TaskState, task actions, labels, and sample records as replaceable defaults for a caller-specific store-list domain.',
      'Use this pattern only when the caller deliberately wants plugin-backed store semantics; DI-owned state/domain classes remain the default authoring direction.',
    ],
    'reference-presentation',
    [
      sourcePatternParameter(
        'store-item',
        'domain-entity',
        'Store item entity',
        domain.entityTitle,
        'Rename the task-like store item, state interface, action type, sample labels, and reducer helpers while preserving @aurelia/state dispatch and store-scoped template reads.',
        'source-text-input',
        'domain-title',
      ),
      sourcePatternParameter(
        'store-collection',
        'domain-collection',
        'Store collection property',
        domain.collectionPropertyName,
        'Rename the store collection property and repeat source while preserving the recipe-owned task-list reducer shape.',
        'source-text-input',
        'source-member-name',
      ),
      sourcePatternParameter(
        'store-actions',
        'domain-collection',
        'Store actions',
        `${domain.setDraftActionType}, ${domain.addActionType}, ${domain.clearCompletedActionType}`,
        'Adapt action names and payloads while preserving @aurelia/state dispatch and store-scoped template reads.',
      ),
      sourcePatternParameter(
        'store-sample-data',
        'sample-data',
        'Reference list records',
        'sample tasks',
        'Replace task labels and sample records before emitting caller-specific code.',
      ),
      sourcePatternParameter(
        'store-presentation',
        'presentation',
        'Reference store presentation',
        'task-list CSS',
        'Treat generated CSS and copy as fixture presentation unless the caller wants the reference look.',
      ),
    ],
    [
      SourcePatternModules.AppShell,
      SourcePatternModules.StateStorePlugin,
      SourcePatternModules.PluginIntegration,
      SourcePatternModules.NativeFormValueChannels,
      SourcePatternModules.NativeTextValueChannel,
      SourcePatternModules.CheckedBooleanChannel,
      SourcePatternModules.ListRendering,
      SourcePatternModules.ClassStyleChannels,
    ],
    [
      sourcePatternAdaptationGroup(
        'store-domain-model',
        'Store domain model',
        'State shape, actions, sample records, and presentation move together because @aurelia/state recipes couple reducer shape, dispatch payloads, and store-scoped template reads.',
        ['store-item', 'store-collection', 'store-actions', 'store-sample-data', 'store-presentation'],
      ),
    ],
  );
}

function stateStoreListSourceFiles(
  model: StateStoreListSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    stateStoreListEntrypointFile(model),
    stateStoreListRootComponentFile(model),
    stateStoreListRootTemplateFile(model),
    stateStoreListRootStyleFile(model),
    stateStoreListStateFile(model),
  ];
}

function stateStoreListEntrypointFile(model: StateStoreListSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.entrypointPath,
    'entrypoint',
    'typescript',
    'create-entrypoint',
    fillSourceTemplate(ENTRYPOINT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
      STATE_MODULE: moduleSpecifier(model.entrypointPath, model.statePath, false),
      INITIAL_STATE_EXPORT: model.storeDomain.initialStateExportName,
      STATE_HANDLER_EXPORT: model.storeDomain.stateHandlerExportName,
    }),
  );
}

function stateStoreListRootComponentFile(model: StateStoreListSourcePlanModel): AuthoringSourceFileEdit {
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

function stateStoreListRootTemplateFile(model: StateStoreListSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillStateStoreListSourceTemplate(ROOT_TEMPLATE_SOURCE, model),
  );
}

function stateStoreListRootStyleFile(model: StateStoreListSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    fillStateStoreListSourceTemplate(ROOT_STYLE_SOURCE, model),
  );
}

function stateStoreListStateFile(model: StateStoreListSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'configure-state-store',
    fillStateStoreListSourceTemplate(STATE_SOURCE, model),
  );
}

const ENTRYPOINT_SOURCE = sourceText(`import Aurelia from 'aurelia';
import { StateDefaultConfiguration } from '@aurelia/state';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';
import {
  filterStateHandler,
  initialFilterState,
  __INITIAL_STATE_EXPORT__,
  __STATE_HANDLER_EXPORT__,
} from '__STATE_MODULE__';

Aurelia
  .register(
    StateDefaultConfiguration
      .init(__INITIAL_STATE_EXPORT__, __STATE_HANDLER_EXPORT__)
      .withStore('filters', initialFilterState, filterStateHandler),
  )
  .app(__ROOT_COMPONENT_CLASS__)
  .start();
`);

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from 'aurelia';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
})
export class __ROOT_COMPONENT_CLASS__ {}
`);

function stateStoreListTemplateValues(model: StateStoreListSourcePlanModel): Record<string, string> {
  const domain = model.storeDomain;
  return {
    ACTION_TYPE: domain.actionTypeName,
    ADD_ACTION_TYPE: domain.addActionType,
    ADD_FUNCTION: domain.addFunctionName,
    CLEAR_COMPLETED_ACTION_TYPE: domain.clearCompletedActionType,
    COLLECTION_LOWER_TITLE: domain.collectionLowerTitle,
    COLLECTION_PROPERTY: domain.collectionPropertyName,
    COLLECTION_TITLE: domain.collectionTitle,
    ENTITY_KEBAB: domain.entityKebabName,
    ENTITY_LOWER_TITLE: domain.entityLowerTitle,
    ENTITY_TITLE: domain.entityTitle,
    ENTITY_VARIABLE: domain.entityVariableName,
    FILTER_STATE_INTERFACE: domain.filterStateInterfaceName,
    INITIAL_STATE_EXPORT: domain.initialStateExportName,
    ITEM_INTERFACE: domain.itemInterfaceName,
    NEXT_ID_FUNCTION: domain.nextIdFunctionName,
    READ_ACTION_FUNCTION: domain.readActionFunctionName,
    SET_DRAFT_ACTION_TYPE: domain.setDraftActionType,
    STATE_HANDLER_EXPORT: domain.stateHandlerExportName,
    STATE_INTERFACE: domain.stateInterfaceName,
  };
}

function fillStateStoreListSourceTemplate(
  template: string,
  model: StateStoreListSourcePlanModel,
): string {
  const values = stateStoreListTemplateValues(model);
  return fillSourceTemplate(template, sourceTemplateValuesUsedBy(template, values));
}

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="__ENTITY_KEBAB__-shell">
  <header>
    <h1>\${title & state}</h1>
    <p>\${label & state:'filters'}</p>
  </header>

  <section class="__ENTITY_KEBAB__-entry" aria-labelledby="new-__ENTITY_KEBAB__">
    <label id="new-__ENTITY_KEBAB__" for="draft-__ENTITY_KEBAB__">New __ENTITY_LOWER_TITLE__</label>
    <input id="draft-__ENTITY_KEBAB__" value.state="draft" input.dispatch="{ type: '__SET_DRAFT_ACTION_TYPE__', value: $event.target.value }">
    <button type="button" disabled.bind="draft === '' & state" click.dispatch="{ type: '__ADD_ACTION_TYPE__' }">Add __ENTITY_LOWER_TITLE__</button>
  </section>

  <ul>
    <li repeat.for="__ENTITY_VARIABLE__ of __COLLECTION_PROPERTY__ & state">
      <span>\${__ENTITY_VARIABLE__.title}</span>
    </li>
  </ul>
</main>
`);

const ROOT_STYLE_SOURCE = sourceText(`.__ENTITY_KEBAB__-shell {
  display: grid;
  gap: 1rem;
  max-width: 44rem;
  margin: 0 auto;
  padding: 2rem;
}

.__ENTITY_KEBAB__-entry {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: end;
}

.__ENTITY_KEBAB__-entry label {
  grid-column: 1 / -1;
}

.__ENTITY_KEBAB__-entry input {
  min-width: 0;
}

.__ENTITY_KEBAB__-shell ul {
  display: grid;
  gap: 0.5rem;
  padding-inline-start: 1.25rem;
}
`);

const STATE_SOURCE = sourceText(`import type { IActionHandler } from '@aurelia/state';

export interface __ITEM_INTERFACE__ {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export interface __STATE_INTERFACE__ {
  readonly title: string;
  readonly draft: string;
  readonly __COLLECTION_PROPERTY__: readonly __ITEM_INTERFACE__[];
}

export interface __FILTER_STATE_INTERFACE__ {
  readonly label: string;
  readonly showCompleted: boolean;
}

export type __ACTION_TYPE__ =
  | { readonly type: '__SET_DRAFT_ACTION_TYPE__'; readonly value: string }
  | { readonly type: '__ADD_ACTION_TYPE__' }
  | { readonly type: '__CLEAR_COMPLETED_ACTION_TYPE__' };

export const __INITIAL_STATE_EXPORT__: __STATE_INTERFACE__ = {
  title: 'State store __COLLECTION_LOWER_TITLE__',
  draft: '',
  __COLLECTION_PROPERTY__: [
    { id: 1, title: 'Review __ENTITY_LOWER_TITLE__ flow', done: false },
    { id: 2, title: 'Plan __ENTITY_LOWER_TITLE__ checks', done: false },
  ],
};

export const initialFilterState: __FILTER_STATE_INTERFACE__ = {
  label: 'Active __COLLECTION_LOWER_TITLE__',
  showCompleted: false,
};

export const __STATE_HANDLER_EXPORT__: IActionHandler<__STATE_INTERFACE__> = (state, action) => {
  const storeAction = __READ_ACTION_FUNCTION__(action);
  if (storeAction == null) {
    return state;
  }

  switch (storeAction.type) {
    case '__SET_DRAFT_ACTION_TYPE__':
      return updateDraft(state, storeAction.value);
    case '__ADD_ACTION_TYPE__':
      return __ADD_FUNCTION__(state);
    case '__CLEAR_COMPLETED_ACTION_TYPE__':
      return clearCompleted(state);
  }
};

export const filterStateHandler: IActionHandler<__FILTER_STATE_INTERFACE__> = (state) => state;

function updateDraft(state: __STATE_INTERFACE__, draft: string): __STATE_INTERFACE__ {
  return {
    title: state.title,
    draft,
    __COLLECTION_PROPERTY__: state.__COLLECTION_PROPERTY__,
  };
}

function __ADD_FUNCTION__(state: __STATE_INTERFACE__): __STATE_INTERFACE__ {
  const title = state.draft.trim();
  if (title === '') {
    return state;
  }
  return {
    title: state.title,
    draft: '',
    __COLLECTION_PROPERTY__: state.__COLLECTION_PROPERTY__.concat({
      id: __NEXT_ID_FUNCTION__(state),
      title,
      done: false,
    }),
  };
}

function clearCompleted(state: __STATE_INTERFACE__): __STATE_INTERFACE__ {
  return {
    title: state.title,
    draft: state.draft,
    __COLLECTION_PROPERTY__: state.__COLLECTION_PROPERTY__.filter((__ENTITY_VARIABLE__) => !__ENTITY_VARIABLE__.done),
  };
}

function __NEXT_ID_FUNCTION__(state: __STATE_INTERFACE__): number {
  return state.__COLLECTION_PROPERTY__.reduce((next, __ENTITY_VARIABLE__) => Math.max(next, __ENTITY_VARIABLE__.id + 1), 1);
}

function __READ_ACTION_FUNCTION__(action: unknown): __ACTION_TYPE__ | null {
  if (!isRecord(action) || typeof action.type !== 'string') {
    return null;
  }
  switch (action.type) {
    case '__SET_DRAFT_ACTION_TYPE__':
      return { type: '__SET_DRAFT_ACTION_TYPE__', value: typeof action.value === 'string' ? action.value : '' };
    case '__ADD_ACTION_TYPE__':
      return { type: '__ADD_ACTION_TYPE__' };
    case '__CLEAR_COMPLETED_ACTION_TYPE__':
      return { type: '__CLEAR_COMPLETED_ACTION_TYPE__' };
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}
`);
