import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import {
  fillSearchableDataTableSourceTemplate,
  searchableDataTableSourcePlan,
  type SearchableDataTableSourcePlanModel,
} from './searchable-data-table-source-plan.js';
import {
  searchableDataTableCustomDetailTemplateSource,
  searchableDataTableCustomTemplateSource,
  searchableDataTableUsesReferencePresentation,
} from './searchable-data-table-field-schema.js';
import { ROUTED_SEARCHABLE_DATA_TABLE_ROOT_STYLE_SOURCE } from './searchable-data-table-reference-presentation.js';
import { routedSearchableDataTableSourcePattern } from './searchable-data-table-source-pattern.js';
import { configuredAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';

export interface RoutedSearchableDataTableSourcePlanModel extends SearchableDataTableSourcePlanModel {
  readonly listRouteId: string;
  readonly listRoutePath: string;
  readonly listRouteTitle: string;
  readonly detailRouteId: string;
  readonly detailRoutePath: string;
  readonly detailRouteNavigationPath: string;
  readonly detailRouteParameterName: string;
  readonly detailRouteParameterValue: string;
  readonly detailRouteQueryRefName: string;
  readonly detailRouteQueryRefValue: string;
  readonly detailRouteFragment: string;
  readonly routeViewportName: string;
  readonly tableRouteComponentPath: string;
  readonly tableRouteTemplatePath: string;
  readonly tableRouteComponentClassName: string;
  readonly tableRouteElementName: string;
  readonly detailRouteComponentPath: string;
  readonly detailRouteTemplatePath: string;
  readonly detailRouteComponentClassName: string;
  readonly detailRouteElementName: string;
}

export function routedSearchableDataTableSourcePlan(
  model: RoutedSearchableDataTableSourcePlanModel,
): AuthoringSourceEditPlan {
  const base = searchableDataTableSourcePlan(model);
  const usesReferencePresentation = searchableDataTableUsesReferencePresentation(model.tableFeatureProfile);
  const replacements = new Map([
    [model.entrypointPath, routedDataTableEntrypointFile(model)],
    [model.rootComponentPath, routedDataTableRootComponentFile(model)],
    [model.rootTemplatePath, routedDataTableRootTemplateFile(model)],
    [model.rootStylePath, routedDataTableRootStyleFile(model)],
    [model.tableTemplatePath, routedDataTableTemplateFile(model)],
  ]);
  const files = [
    ...base.files.map((file) => replacements.get(file.path) ?? file),
    routedDataTableListRouteComponentFile(model),
    routedDataTableListRouteTemplateFile(model),
    routedDataTableDetailRouteComponentFile(model),
    routedDataTableDetailRouteTemplateFile(model),
  ];
  return new AuthoringSourceEditPlan(
    model.rootDir,
    base.policy,
    usesReferencePresentation ? referenceInstantiationSourceFiles(files) : files,
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/router'],
    }),
    routedSearchableDataTableSourcePattern(model),
  );
}

function routedDataTableEntrypointFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return configuredAureliaEntrypointFile({
    entrypointPath: model.entrypointPath,
    rootComponentPath: model.rootComponentPath,
    rootComponentClassName: model.rootComponentClassName,
    configurationImports: "import { RouterConfiguration } from '@aurelia/router';\n",
    registrationExpressions: [
      `RouterConfiguration.customize({
  useHref: false,
  useUrlFragmentHash: true,
  activeClass: 'active-route',
})`,
    ],
  });
}

function routedDataTableRootComponentFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      APP_NAME: model.appName,
      DETAIL_ROUTE_COMPONENT_CLASS: model.detailRouteComponentClassName,
      DETAIL_ROUTE_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.detailRouteComponentPath, false),
      DETAIL_ROUTE_ID: model.detailRouteId,
      DETAIL_ROUTE_PATH: model.detailRoutePath,
      DETAIL_ROUTE_TITLE: `${model.tableDomain.entityTitle} detail`,
      LIST_ROUTE_ID: model.listRouteId,
      LIST_ROUTE_PATH: model.listRoutePath,
      LIST_ROUTE_TITLE: model.listRouteTitle,
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_IMPORT: searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
        ? `import '${moduleSpecifier(model.rootComponentPath, model.rootStylePath, true)}';\n`
        : '\n',
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      ROUTE_VIEWPORT_NAME: model.routeViewportName,
      TABLE_ROUTE_COMPONENT_CLASS: model.tableRouteComponentClassName,
      TABLE_ROUTE_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.tableRouteComponentPath, false),
    }),
  );
}

function routedDataTableRootTemplateFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSearchableDataTableSourceTemplate(ROOT_TEMPLATE_SOURCE, model, {
      DETAIL_ROUTE_NAVIGATION_PATH: model.detailRouteNavigationPath,
      LIST_ROUTE_PATH: model.listRoutePath,
      LIST_ROUTE_TITLE: model.listRouteTitle,
      ROUTE_VIEWPORT_NAME: model.routeViewportName,
    }),
  );
}

function routedDataTableRootStyleFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    ROUTED_SEARCHABLE_DATA_TABLE_ROOT_STYLE_SOURCE,
  );
}

function routedDataTableListRouteComponentFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.tableRouteComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(LIST_ROUTE_COMPONENT_SOURCE, {
      TABLE_CLASS: model.tableClassName,
      TABLE_MODULE: moduleSpecifier(model.tableRouteComponentPath, model.tableComponentPath, false),
      TABLE_ROUTE_CLASS: model.tableRouteComponentClassName,
      TABLE_ROUTE_ELEMENT_NAME: model.tableRouteElementName,
      TABLE_ROUTE_TEMPLATE_MODULE: moduleSpecifier(model.tableRouteComponentPath, model.tableRouteTemplatePath, true),
    }),
  );
}

function routedDataTableListRouteTemplateFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.tableRouteTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(LIST_ROUTE_TEMPLATE_SOURCE, {
      TABLE_ELEMENT_NAME: model.tableElementName,
    }),
  );
}

function routedDataTableDetailRouteComponentFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.detailRouteComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSearchableDataTableSourceTemplate(DETAIL_ROUTE_COMPONENT_SOURCE, model, {
      DETAIL_ROUTE_CLASS: model.detailRouteComponentClassName,
      DETAIL_ROUTE_ELEMENT_NAME: model.detailRouteElementName,
      DETAIL_ROUTE_PARAMETER_NAME: model.detailRouteParameterName,
      DETAIL_ROUTE_QUERY_REF_NAME: model.detailRouteQueryRefName,
      DETAIL_ROUTE_TEMPLATE_MODULE: moduleSpecifier(model.detailRouteComponentPath, model.detailRouteTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.detailRouteComponentPath, model.statePath, false),
    }),
  );
}

function routedDataTableDetailRouteTemplateFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.detailRouteTemplatePath,
    'template',
    'html',
    'create-external-template',
    searchableDataTableCustomDetailTemplateSource({
      detailRouteParameterName: model.detailRouteParameterName,
      detailRouteQueryRefName: model.detailRouteQueryRefName,
      domain: model.tableDomain,
      fieldSchema: model.tableFieldSchema,
      listRoutePath: model.listRoutePath,
    }),
  );
}

function routedDataTableTemplateFile(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.tableTemplatePath,
    'template',
    'html',
    'create-external-template',
    searchableDataTableCustomTemplateSource({
      detailRoutePathPrefix: `/${model.listRoutePath}/`,
      domain: model.tableDomain,
      featureProfile: model.tableFeatureProfile,
      fieldSchema: model.tableFieldSchema,
    }),
  );
}

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from 'aurelia';
import { route } from '@aurelia/router';
import { __DETAIL_ROUTE_COMPONENT_CLASS__ } from '__DETAIL_ROUTE_COMPONENT_MODULE__';
import { __TABLE_ROUTE_COMPONENT_CLASS__ } from '__TABLE_ROUTE_COMPONENT_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
__ROOT_STYLE_IMPORT__

@route({
  title: '__APP_NAME__',
  routes: [
    {
      path: '',
      redirectTo: '__LIST_ROUTE_PATH__',
    },
    {
      id: '__LIST_ROUTE_ID__',
      path: '__LIST_ROUTE_PATH__',
      component: __TABLE_ROUTE_COMPONENT_CLASS__,
      title: '__LIST_ROUTE_TITLE__',
      viewport: '__ROUTE_VIEWPORT_NAME__',
    },
    {
      id: '__DETAIL_ROUTE_ID__',
      path: '__DETAIL_ROUTE_PATH__',
      component: __DETAIL_ROUTE_COMPONENT_CLASS__,
      title: '__DETAIL_ROUTE_TITLE__',
      viewport: '__ROUTE_VIEWPORT_NAME__',
    },
  ],
})
@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__TABLE_ROUTE_COMPONENT_CLASS__, __DETAIL_ROUTE_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="table-shell">
  <header>
    <p>__COLLECTION_TITLE__</p>
    <h1>__ENTITY_TITLE__ workspace</h1>
    <nav>
      <a load="__LIST_ROUTE_PATH__">__LIST_ROUTE_TITLE__</a>
      <a load="__DETAIL_ROUTE_NAVIGATION_PATH__">Featured __ENTITY_TITLE__</a>
    </nav>
  </header>

  <au-viewport name="__ROUTE_VIEWPORT_NAME__"></au-viewport>
</main>
`);

const LIST_ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement } from 'aurelia';
import { __TABLE_CLASS__ } from '__TABLE_MODULE__';
import template from '__TABLE_ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__TABLE_ROUTE_ELEMENT_NAME__',
  template,
  dependencies: [__TABLE_CLASS__],
})
export class __TABLE_ROUTE_CLASS__ {}
`);

const LIST_ROUTE_TEMPLATE_SOURCE = sourceText(`<section>
  <__TABLE_ELEMENT_NAME__></__TABLE_ELEMENT_NAME__>
</section>
`);

const DETAIL_ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__DETAIL_ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__DETAIL_ROUTE_ELEMENT_NAME__',
  template,
})
export class __DETAIL_ROUTE_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    __DETAIL_ROUTE_PARAMETER_NAME__: string;
    __DETAIL_ROUTE_QUERY_REF_NAME__?: string;
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });

  binding(): void {
    void this.state.__LOAD_METHOD__();
  }
}
`);
