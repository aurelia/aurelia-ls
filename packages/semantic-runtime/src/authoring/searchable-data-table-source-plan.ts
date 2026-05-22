import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
  sourceTemplateValuesUsedBy,
} from './source-template.js';
import { standardAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  pluralizeLastSourceNameWord,
  sourceNameWords,
  titleSourceName,
  upperSnakeSourceName,
} from './source-name.js';
import {
  searchableDataTableCustomDomainModelSource,
  searchableDataTableCustomServiceSource,
  searchableDataTableCustomStateSource,
  searchableDataTableCustomTemplateSource,
  searchableDataTableUsesReferencePresentation,
  type SearchableDataTableFeatureProfile,
  type SearchableDataTableFieldSchema,
} from './searchable-data-table-field-schema.js';
import { SEARCHABLE_DATA_TABLE_ROOT_STYLE_SOURCE } from './searchable-data-table-reference-presentation.js';
import { searchableDataTableSourcePattern } from './searchable-data-table-source-pattern.js';

export interface SearchableDataTableSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly modelPath: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly filterStateClassName: string;
  readonly sortStateClassName: string;
  readonly paginationStateClassName: string;
  readonly selectionStateClassName: string;
  readonly servicePath: string;
  readonly serviceClassName: string;
  readonly tableComponentPath: string;
  readonly tableTemplatePath: string;
  readonly tableClassName: string;
  readonly tableElementName: string;
  readonly tableDomain: SearchableDataTableDomainNames;
  readonly tableFieldSchema: SearchableDataTableFieldSchema;
  readonly tableFeatureProfile: SearchableDataTableFeatureProfile;
}

export interface SearchableDataTableDomainNames {
  readonly entityClassName: string;
  readonly entityKebabName: string;
  readonly entityTitle: string;
  readonly entityVariableName: string;
  readonly collectionPropertyName: string;
  readonly collectionKebabName: string;
  readonly collectionTitle: string;
  readonly collectionLabelLower: string;
  readonly collectionConstantName: string;
  readonly recordInterfaceName: string;
  readonly roleTypeName: string;
  readonly statusTypeName: string;
  readonly serviceFieldName: string;
  readonly listMethodName: string;
  readonly loadMethodName: string;
  readonly readMethodName: string;
  readonly filteredCollectionGetterName: string;
  readonly sortedCollectionGetterName: string;
  readonly pageCollectionGetterName: string;
  readonly selectedIdsPropertyName: string;
  readonly compareMethodName: string;
}

export function defaultSearchableDataTableDomainNames(): SearchableDataTableDomainNames {
  return searchableDataTableDomainNamesFromParameters('Item', 'items', {
    entityVariableName: 'item',
    serviceFieldName: 'itemService',
  });
}

export function searchableDataTableDomainNamesFromParameters(
  entityName: string,
  collectionName: string | null | undefined,
  defaults: Partial<Pick<SearchableDataTableDomainNames, 'entityTitle' | 'entityVariableName' | 'serviceFieldName'>> = {},
): SearchableDataTableDomainNames {
  const entityWords = sourceNameWords(entityName);
  const collectionWords = collectionName == null || collectionName.trim().length === 0
    ? pluralizeLastSourceNameWord(entityWords)
    : sourceNameWords(collectionName);
  const entityClassName = pascalSourceName(entityWords);
  const entityVariableName = defaults.entityVariableName ?? lowerCamelSourceName(entityWords);
  const collectionPropertyName = lowerCamelSourceName(collectionWords);
  const collectionPascalName = pascalSourceName(collectionWords);
  return {
    entityClassName,
    entityKebabName: kebabSourceName(entityWords),
    entityTitle: defaults.entityTitle ?? titleSourceName(entityWords),
    entityVariableName,
    collectionPropertyName,
    collectionKebabName: kebabSourceName(collectionWords),
    collectionTitle: titleSourceName(collectionWords),
    collectionLabelLower: lowerTitleSourceName(collectionWords),
    collectionConstantName: upperSnakeSourceName(collectionWords),
    recordInterfaceName: `${entityClassName}Record`,
    roleTypeName: `${entityClassName}Role`,
    statusTypeName: `${entityClassName}Status`,
    serviceFieldName: defaults.serviceFieldName ?? `${entityVariableName}Service`,
    listMethodName: `list${collectionPascalName}`,
    loadMethodName: `load${collectionPascalName}`,
    readMethodName: `read${entityClassName}`,
    filteredCollectionGetterName: `filtered${collectionPascalName}`,
    sortedCollectionGetterName: `sorted${collectionPascalName}`,
    pageCollectionGetterName: `page${collectionPascalName}`,
    selectedIdsPropertyName: `selected${entityClassName}Ids`,
    compareMethodName: `compare${collectionPascalName}`,
  };
}

export function searchableDataTableSourcePlan(
  model: SearchableDataTableSourcePlanModel,
): AuthoringSourceEditPlan {
  const files = searchableDataTableSourceFiles(model);
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
      ? referenceInstantiationSourceFiles(files)
      : files,
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
    }),
    searchableDataTableSourcePattern(model),
  );
}

function searchableDataTableSourceFiles(
  model: SearchableDataTableSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    searchableDataTableEntrypointFile(model),
    searchableDataTableRootComponentFile(model),
    searchableDataTableRootTemplateFile(model),
    ...(searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
      ? [searchableDataTableRootStyleFile(model)]
      : []),
    searchableDataTableUserModelFile(model),
    searchableDataTableServiceFile(model),
    searchableDataTableStateFile(model),
    searchableDataTableComponentFile(model),
    searchableDataTableTemplateFile(model),
  ];
}

export function fillSearchableDataTableSourceTemplate(
  template: string,
  model: SearchableDataTableSourcePlanModel,
  values: Readonly<Record<string, string>> = {},
): string {
  const allValues = {
    ...searchableDataTableDomainSourceValues(model.tableDomain),
    ...values,
  };
  return fillSourceTemplate(template, sourceTemplateValuesUsedBy(template, allValues));
}

function searchableDataTableDomainSourceValues(
  domain: SearchableDataTableDomainNames,
): Readonly<Record<string, string>> {
  return {
    COLLECTION_CONSTANT: domain.collectionConstantName,
    COLLECTION_LABEL_LOWER: domain.collectionLabelLower,
    COLLECTION_PROPERTY: domain.collectionPropertyName,
    COLLECTION_TITLE: domain.collectionTitle,
    COMPARE_METHOD: domain.compareMethodName,
    ENTITY_CLASS: domain.entityClassName,
    ENTITY_RECORD_INTERFACE: domain.recordInterfaceName,
    ENTITY_ROLE_TYPE: domain.roleTypeName,
    ENTITY_STATUS_TYPE: domain.statusTypeName,
    ENTITY_TITLE: domain.entityTitle,
    ENTITY_VAR: domain.entityVariableName,
    FILTERED_COLLECTION_GETTER: domain.filteredCollectionGetterName,
    LIST_METHOD: domain.listMethodName,
    LOAD_METHOD: domain.loadMethodName,
    PAGE_COLLECTION_GETTER: domain.pageCollectionGetterName,
    READ_METHOD: domain.readMethodName,
    SELECTED_IDS_PROPERTY: domain.selectedIdsPropertyName,
    SERVICE_FIELD: domain.serviceFieldName,
    SORTED_COLLECTION_GETTER: domain.sortedCollectionGetterName,
  };
}

function searchableDataTableEntrypointFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return standardAureliaEntrypointFile(model);
}

function searchableDataTableRootComponentFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSearchableDataTableSourceTemplate(ROOT_COMPONENT_SOURCE, model, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
      ROOT_STYLE_IMPORT: searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
        ? `import '${moduleSpecifier(model.rootComponentPath, model.rootStylePath, true)}';\n\n`
        : '\n',
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      TABLE_CLASS: model.tableClassName,
      TABLE_MODULE: moduleSpecifier(model.rootComponentPath, model.tableComponentPath, false),
    }),
  );
}

function searchableDataTableRootTemplateFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSearchableDataTableSourceTemplate(
      searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
        ? ROOT_TEMPLATE_SOURCE
        : COMPACT_ROOT_TEMPLATE_SOURCE,
      model,
      {
        TABLE_ELEMENT_NAME: model.tableElementName,
      },
    ),
  );
}

function searchableDataTableRootStyleFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    SEARCHABLE_DATA_TABLE_ROOT_STYLE_SOURCE,
  );
}

function searchableDataTableUserModelFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.modelPath,
    'domain-model',
    'typescript',
    'create-domain-model',
    searchableDataTableCustomDomainModelSource(model.tableDomain, model.tableFieldSchema),
  );
}

function searchableDataTableServiceFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.servicePath,
    'service',
    'typescript',
    'create-service',
    searchableDataTableCustomServiceSource(
      model.serviceClassName,
      moduleSpecifier(model.servicePath, model.modelPath, false),
      model.tableDomain,
      model.tableFieldSchema,
    ),
  );
}

function searchableDataTableStateFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    searchableDataTableCustomStateSource(
      model.stateClassName,
      model.filterStateClassName,
      model.sortStateClassName,
      model.paginationStateClassName,
      model.selectionStateClassName,
      model.serviceClassName,
      moduleSpecifier(model.statePath, model.servicePath, false),
      moduleSpecifier(model.statePath, model.modelPath, false),
      model.tableDomain,
      model.tableFieldSchema,
      model.tableFeatureProfile,
    ),
  );
}

function searchableDataTableComponentFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.tableComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSearchableDataTableSourceTemplate(TABLE_COMPONENT_SOURCE, model, {
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.tableComponentPath, model.statePath, false),
      TABLE_CLASS: model.tableClassName,
      TABLE_ELEMENT_NAME: model.tableElementName,
      TABLE_TEMPLATE_MODULE: moduleSpecifier(model.tableComponentPath, model.tableTemplatePath, true),
    }),
  );
}

function searchableDataTableTemplateFile(model: SearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.tableTemplatePath,
    'template',
    'html',
    'create-external-template',
    searchableDataTableCustomTemplateSource({
      domain: model.tableDomain,
      featureProfile: model.tableFeatureProfile,
      fieldSchema: model.tableFieldSchema,
    }),
  );
}

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from 'aurelia';
import { __TABLE_CLASS__ } from '__TABLE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
__ROOT_STYLE_IMPORT__@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__TABLE_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="table-shell">
  <header>
    <p>__COLLECTION_TITLE__</p>
    <h1>__ENTITY_TITLE__ workspace</h1>
  </header>

  <__TABLE_ELEMENT_NAME__></__TABLE_ELEMENT_NAME__>
</main>
`);

const COMPACT_ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  <h1>__COLLECTION_TITLE__</h1>
  <__TABLE_ELEMENT_NAME__></__TABLE_ELEMENT_NAME__>
</main>
`);

const TABLE_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__TABLE_TEMPLATE_MODULE__';

@customElement({
  name: '__TABLE_ELEMENT_NAME__',
  template,
})
export class __TABLE_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);

  binding(): void {
    void this.state.__LOAD_METHOD__();
  }
}
`);
