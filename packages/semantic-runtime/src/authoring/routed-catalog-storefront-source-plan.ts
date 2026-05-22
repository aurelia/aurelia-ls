import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import {
  catalogStorefrontSourcePlan,
  catalogStorefrontCardTemplateSource,
  type CatalogStorefrontSourcePlanModel,
} from './catalog-storefront-source-plan.js';
import {
  catalogStorefrontCustomDetailTemplateSource,
  catalogStorefrontUsesReferencePresentation,
} from './catalog-storefront-field-schema.js';
import { configuredAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import { ROUTED_CATALOG_STOREFRONT_ROOT_STYLE_SOURCE } from './catalog-storefront-reference-presentation.js';
import { routedCatalogStorefrontSourcePattern } from './catalog-storefront-source-pattern.js';

export interface RoutedCatalogStorefrontSourcePlanModel extends CatalogStorefrontSourcePlanModel {
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
  readonly detailRoutePathPrefix: string;
  readonly routeViewportName: string;
  readonly detailRouteComponentPath: string;
  readonly detailRouteTemplatePath: string;
  readonly detailRouteComponentClassName: string;
  readonly detailRouteElementName: string;
}

export function routedCatalogStorefrontSourcePlan(
  model: RoutedCatalogStorefrontSourcePlanModel,
): AuthoringSourceEditPlan {
  const base = catalogStorefrontSourcePlan(model);
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  const replacements = new Map([
    [model.entrypointPath, routedCatalogEntrypointFile(model)],
    [model.rootComponentPath, routedCatalogRootComponentFile(model)],
    [model.rootTemplatePath, routedCatalogRootTemplateFile(model)],
    [model.rootStylePath, routedCatalogRootStyleFile(model)],
    [model.cardTemplatePath, routedCatalogCardTemplateFile(model)],
  ]);
  const files = [
    ...base.files.map((file) => replacements.get(file.path) ?? file),
    routedCatalogDetailRouteComponentFile(model),
    routedCatalogDetailRouteTemplateFile(model),
  ];
  return new AuthoringSourceEditPlan(
    model.rootDir,
    base.policy,
    useReferencePresentation ? referenceInstantiationSourceFiles(files) : files,
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/router'],
    }),
    routedCatalogStorefrontSourcePattern(model),
  );
}

function routedCatalogEntrypointFile(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
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

function routedCatalogRootComponentFile(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(useReferencePresentation ? ROOT_COMPONENT_SOURCE : ROOT_COMPONENT_COMPACT_SOURCE, {
      APP_NAME: model.appName,
      DETAIL_ROUTE_COMPONENT_CLASS: model.detailRouteComponentClassName,
      DETAIL_ROUTE_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.detailRouteComponentPath, false),
      DETAIL_ROUTE_ID: model.detailRouteId,
      DETAIL_ROUTE_PATH: model.detailRoutePath,
      DETAIL_ROUTE_TITLE: `${model.catalogDomain.entityTitle} detail`,
      LIST_ROUTE_ID: model.listRouteId,
      LIST_ROUTE_PATH: model.listRoutePath,
      LIST_ROUTE_TITLE: model.listRouteTitle,
      LOAD_FEATURED_COLLECTION_METHOD: model.catalogDomain.loadFeaturedCollectionMethodName,
      CATALOG_LIST_CLASS: model.listClassName,
      CATALOG_LIST_MODULE: moduleSpecifier(model.rootComponentPath, model.listComponentPath, false),
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      ROUTE_VIEWPORT_NAME: model.routeViewportName,
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
      ...(useReferencePresentation
        ? {
          COLLECTION_LABEL_LOWER: model.catalogDomain.collectionLabelLower,
          ROOT_STYLE_IMPORT: `import '${moduleSpecifier(model.rootComponentPath, model.rootStylePath, true)}';\n`,
        }
        : {}),
    }),
  );
}

function routedCatalogRootTemplateFile(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(useReferencePresentation ? ROOT_TEMPLATE_SOURCE : ROOT_TEMPLATE_COMPACT_SOURCE, {
      COLLECTION_TITLE: model.catalogDomain.collectionTitle,
      DETAIL_ROUTE_NAVIGATION_PATH: model.detailRouteNavigationPath,
      LIST_ROUTE_PATH: model.listRoutePath,
      CATALOG_LIST_TITLE: model.listRouteTitle,
      ROUTE_VIEWPORT_NAME: model.routeViewportName,
      ...(useReferencePresentation
        ? {
          SELECTED_ENTITY_NAMES_GETTER: model.catalogDomain.selectedEntityNamesGetterName,
          COLLECTION_LABEL_LOWER: model.catalogDomain.collectionLabelLower,
          ENTITY_TITLE: model.catalogDomain.entityTitle,
        }
        : {}),
    }),
  );
}

function routedCatalogRootStyleFile(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    fillSourceTemplate(ROUTED_CATALOG_STOREFRONT_ROOT_STYLE_SOURCE, {
      ENTITY_KEBAB: model.catalogDomain.entityKebabName,
    }),
  );
}

function routedCatalogCardTemplateFile(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.cardTemplatePath,
    'template',
    'html',
    'create-external-template',
    catalogStorefrontCardTemplateSource({
      catalogDomain: model.catalogDomain,
      catalogFieldSchema: model.catalogFieldSchema,
      detailRoutePathPrefix: `/${model.listRoutePath}/`,
    }),
  );
}

function routedCatalogDetailRouteComponentFile(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.detailRouteComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(DETAIL_ROUTE_COMPONENT_SOURCE, {
      DETAIL_ROUTE_COMPONENT_CLASS: model.detailRouteComponentClassName,
      DETAIL_ROUTE_ELEMENT_NAME: model.detailRouteElementName,
      DETAIL_ROUTE_PARAMETER_NAME: model.detailRouteParameterName,
      DETAIL_ROUTE_QUERY_REF_NAME: model.detailRouteQueryRefName,
      DETAIL_ROUTE_TEMPLATE_MODULE: moduleSpecifier(model.detailRouteComponentPath, model.detailRouteTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.detailRouteComponentPath, model.statePath, false),
    }),
  );
}

function routedCatalogDetailRouteTemplateFile(model: RoutedCatalogStorefrontSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.detailRouteTemplatePath,
    'template',
    'html',
    'create-external-template',
    catalogStorefrontCustomDetailTemplateSource({
      domain: model.catalogDomain,
      fieldSchema: model.catalogFieldSchema,
      collectionLabelLower: model.catalogDomain.collectionLabelLower,
      collectionPropertyName: model.catalogDomain.collectionPropertyName,
      detailRouteParameterName: model.detailRouteParameterName,
      detailRouteQueryRefName: model.detailRouteQueryRefName,
      includeSelectionAction: catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema),
      listRoutePath: model.listRoutePath,
      readEntityMethodName: model.catalogDomain.readEntityMethodName,
      selectEntityMethodName: model.catalogDomain.selectEntityMethodName,
    }),
  );
}

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { route } from '@aurelia/router';
import { __DETAIL_ROUTE_COMPONENT_CLASS__ } from '__DETAIL_ROUTE_COMPONENT_MODULE__';
import { __CATALOG_LIST_CLASS__ } from '__CATALOG_LIST_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
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
      component: __CATALOG_LIST_CLASS__,
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
  dependencies: [__CATALOG_LIST_CLASS__, __DETAIL_ROUTE_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
  readonly catalogStatus = Promise.resolve('Featured __COLLECTION_LABEL_LOWER__ refreshes daily.');

  binding(): void {
    void this.state.__LOAD_FEATURED_COLLECTION_METHOD__();
  }
}
`);

const ROOT_COMPONENT_COMPACT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { route } from '@aurelia/router';
import { __DETAIL_ROUTE_COMPONENT_CLASS__ } from '__DETAIL_ROUTE_COMPONENT_MODULE__';
import { __CATALOG_LIST_CLASS__ } from '__CATALOG_LIST_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';

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
      component: __CATALOG_LIST_CLASS__,
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
  dependencies: [__CATALOG_LIST_CLASS__, __DETAIL_ROUTE_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);

  binding(): void {
    void this.state.__LOAD_FEATURED_COLLECTION_METHOD__();
  }
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="catalog-shell \${state.selection.itemCount > 0 ? 'has-selection' : 'empty-selection'}">
  <header>
    <h1>__COLLECTION_TITLE__</h1>
    <p>Selected items: \${state.selection.itemCount}</p>
    <div class="selection-progress" aria-hidden="true">
      <span style="width: \${state.selectionProgressPercent}%"></span>
    </div>
    <section promise.bind="catalogStatus" aria-label="Catalog status">
      <p pending>Checking catalog status...</p>
      <p then="notice">\${notice}</p>
      <p catch="reason">\${reason}</p>
    </section>
    <nav>
      <a load="__LIST_ROUTE_PATH__">__CATALOG_LIST_TITLE__</a>
      <a load="__DETAIL_ROUTE_NAVIGATION_PATH__">Featured detail</a>
    </nav>
  </header>

  <section class="routed-layout">
    <au-viewport name="__ROUTE_VIEWPORT_NAME__"></au-viewport>
  </section>

  <aside if.bind="state.selection.itemCount > 0" aria-label="Selected items">
    <h2>Selected __COLLECTION_LABEL_LOWER__</h2>
    <ul>
      <li repeat.for="name of state.__SELECTED_ENTITY_NAMES_GETTER__">\${name}</li>
    </ul>
  </aside>
  <p else>Select a featured __ENTITY_TITLE__.</p>
</main>
`);

const ROOT_TEMPLATE_COMPACT_SOURCE = sourceText(`<main>
  <header>
    <h1>__COLLECTION_TITLE__</h1>
    <nav>
      <a load="__LIST_ROUTE_PATH__">__CATALOG_LIST_TITLE__</a>
      <a load="__DETAIL_ROUTE_NAVIGATION_PATH__">Featured detail</a>
    </nav>
  </header>

  <au-viewport name="__ROUTE_VIEWPORT_NAME__"></au-viewport>
</main>
`);

const DETAIL_ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__DETAIL_ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__DETAIL_ROUTE_ELEMENT_NAME__',
  template,
})
export class __DETAIL_ROUTE_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    __DETAIL_ROUTE_PARAMETER_NAME__: string;
    __DETAIL_ROUTE_QUERY_REF_NAME__?: string;
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });
}
`);
