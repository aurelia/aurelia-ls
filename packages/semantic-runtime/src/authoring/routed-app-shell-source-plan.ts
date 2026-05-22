import {
  AuthoringSourceEditPlan,
  domainNeutralSourcePattern,
  recipeSourceEditPolicy,
  recipeSourceFile,
  sourcePatternParameter,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import { configuredAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import { SourcePatternModules } from './source-pattern-modules.js';

export interface RoutedAppShellRouteSourceModel {
  readonly id: string;
  readonly path: string;
  readonly navigationPath: string;
  readonly title: string;
  readonly componentPath: string;
  readonly templatePath: string;
  readonly componentClassName: string;
  readonly elementName: string;
  readonly readsRouteParameters: boolean;
}

export interface RoutedAppShellSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly routeViewportName: string;
  readonly homeRouteId: string;
  readonly homeRoutePath: string;
  readonly homeRouteTitle: string;
  readonly homeRouteComponentPath: string;
  readonly homeRouteTemplatePath: string;
  readonly homeRouteComponentClassName: string;
  readonly homeRouteElementName: string;
  readonly detailRouteId: string;
  readonly detailRoutePath: string;
  readonly detailRouteNavigationPath: string;
  readonly detailRouteTitle: string;
  readonly detailRouteParameterName: string;
  readonly detailRouteParameterValue: string;
  readonly detailRouteQueryName: string;
  readonly detailRouteQueryValue: string;
  readonly detailRouteFragment: string;
  readonly detailRouteComponentPath: string;
  readonly detailRouteTemplatePath: string;
  readonly detailRouteComponentClassName: string;
  readonly detailRouteElementName: string;
  readonly sectionRoutes: string | null;
  readonly routeEntries: readonly RoutedAppShellRouteSourceModel[];
}

export function routedAppShellSourcePlan(model: RoutedAppShellSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    routedAppShellSourceFiles(model),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/router'],
    }),
    routedAppShellSourcePattern(model),
  );
}

function routedAppShellSourceFiles(model: RoutedAppShellSourcePlanModel) {
  return [
    routedAppShellEntrypointFile(model),
    routedAppShellRootComponentFile(model),
    routedAppShellRootTemplateFile(model),
    ...model.routeEntries.flatMap((route) => routedAppShellRouteFiles(model, route)),
  ];
}

function routedAppShellEntrypointFile(model: RoutedAppShellSourcePlanModel) {
  return configuredAureliaEntrypointFile({
    entrypointPath: model.entrypointPath,
    rootComponentPath: model.rootComponentPath,
    rootComponentClassName: model.rootComponentClassName,
    configurationImports: "import { RouterConfiguration } from '@aurelia/router';\n",
    registrationExpressions: [
      `RouterConfiguration.customize({
  useHref: false,
  activeClass: 'is-active',
})`,
    ],
  });
}

function routedAppShellRootComponentFile(model: RoutedAppShellSourcePlanModel) {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      APP_NAME: model.appName,
      ROUTE_COMPONENT_IMPORTS: model.routeEntries
        .map((route) => `import { ${route.componentClassName} } from '${moduleSpecifier(model.rootComponentPath, route.componentPath, false)}';`)
        .join('\n'),
      ROUTE_CONFIGS: model.routeEntries
        .map((route) => routedAppShellRouteConfig(model, route))
        .join(',\n'),
      ROUTE_DEPENDENCIES: model.routeEntries.map((route) => route.componentClassName).join(', '),
      HOME_ROUTE_PATH: model.homeRoutePath,
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
    }),
  );
}

function routedAppShellRootTemplateFile(model: RoutedAppShellSourcePlanModel) {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
      ROUTE_LINKS: model.routeEntries
        .map((route) => `    <a load="${route.navigationPath}">${route.title}</a>`)
        .join('\n'),
      ROUTE_VIEWPORT_NAME: model.routeViewportName,
    }),
  );
}

function routedAppShellRouteConfig(
  model: RoutedAppShellSourcePlanModel,
  route: RoutedAppShellRouteSourceModel,
): string {
  return `    {
      id: '${route.id}',
      path: '${route.path}',
      component: ${route.componentClassName},
      title: '${route.title}',
      viewport: '${model.routeViewportName}',
    }`;
}

function routedAppShellRouteFiles(
  model: RoutedAppShellSourcePlanModel,
  route: RoutedAppShellRouteSourceModel,
) {
  return [
    routedAppShellRouteComponentFile(model, route),
    routedAppShellRouteTemplateFile(model, route),
  ];
}

function routedAppShellRouteComponentFile(
  model: RoutedAppShellSourcePlanModel,
  route: RoutedAppShellRouteSourceModel,
) {
  return recipeSourceFile(
    route.componentPath,
    'component',
    'typescript',
    'create-component',
    route.readsRouteParameters
      ? fillSourceTemplate(DETAIL_ROUTE_COMPONENT_SOURCE, {
        DETAIL_ROUTE_COMPONENT_CLASS: route.componentClassName,
        DETAIL_ROUTE_ELEMENT_NAME: route.elementName,
        DETAIL_ROUTE_PARAMETER_NAME: model.detailRouteParameterName,
        DETAIL_ROUTE_QUERY_NAME: model.detailRouteQueryName,
        DETAIL_ROUTE_TEMPLATE_MODULE: moduleSpecifier(route.componentPath, route.templatePath, true),
      })
      : fillSourceTemplate(STATIC_ROUTE_COMPONENT_SOURCE, {
        ROUTE_COMPONENT_CLASS: route.componentClassName,
        ROUTE_ELEMENT_NAME: route.elementName,
        ROUTE_TEMPLATE_MODULE: moduleSpecifier(route.componentPath, route.templatePath, true),
      }),
  );
}

function routedAppShellRouteTemplateFile(
  model: RoutedAppShellSourcePlanModel,
  route: RoutedAppShellRouteSourceModel,
) {
  return recipeSourceFile(
    route.templatePath,
    'template',
    'html',
    'create-external-template',
    route.readsRouteParameters
      ? fillSourceTemplate(DETAIL_ROUTE_TEMPLATE_SOURCE, {
        DETAIL_ROUTE_PARAMETER_NAME: model.detailRouteParameterName,
        DETAIL_ROUTE_QUERY_NAME: model.detailRouteQueryName,
      })
      : fillSourceTemplate(STATIC_ROUTE_TEMPLATE_SOURCE, {
        ROUTE_TITLE: route.title,
      }),
  );
}

function routedAppShellSourcePattern(model: RoutedAppShellSourcePlanModel) {
  const readsRouteParameters = model.routeEntries.some((route) => route.readsRouteParameters);
  return domainNeutralSourcePattern(
    'routed-app-shell.domain-neutral',
    'Router shell pattern',
    readsRouteParameters
      ? 'A domain-neutral routed app shell with RouterConfiguration, route config, typed parameter/query/fragment reads, navigation links, and an au-viewport layout.'
      : 'A domain-neutral routed app shell with RouterConfiguration, static section routes, navigation links, and an au-viewport layout.',
    'none',
    [
      'Use this for routing architecture and viewport wiring before merging in a feature recipe such as a form, catalog, or data table.',
      readsRouteParameters
        ? 'Treat home/detail route names and literal parameter values as route-shape defaults, not as a domain model.'
        : 'Treat section route labels as navigation structure; merge feature recipes into the generated routeable components instead of inventing view-model forwarding layers.',
    ],
    [
      sourcePatternParameter(
        'section-routes',
        'route-identity',
        'Section routes',
        model.sectionRoutes,
        'Generate a static route, routeable component, navigation link, and viewport target for each section label.',
        'source-text-input',
        'route-section-list',
      ),
      ...(readsRouteParameters
        ? [
          sourcePatternParameter(
            'detail-route-parameter',
            'route-identity',
            'Detail route parameter',
            model.detailRouteParameterName,
            'Rename the detail route path parameter and matching route-context access together.',
            'source-text-input',
            'route-parameter-name',
          ),
          sourcePatternParameter(
            'home-route-path',
            'route-identity',
            'Home route path',
            model.homeRoutePath,
            'Rename the shell home route path together with the redirect and navigation link.',
            'source-text-input',
            'route-path',
          ),
          sourcePatternParameter(
            'home-route-title',
            'feature-copy',
            'Home route title',
            model.homeRouteTitle,
            'Rename the shell home route title and navigation label.',
            'source-text-input',
            'route-title',
          ),
          sourcePatternParameter(
            'detail-route-title',
            'feature-copy',
            'Detail route title',
            model.detailRouteTitle,
            'Rename the shell detail route title without changing the route shape.',
            'source-text-input',
            'route-title',
          ),
        ]
        : []),
    ],
    [
      SourcePatternModules.AppShell,
      SourcePatternModules.RouterShell,
      SourcePatternModules.RouteLinkNavigation,
      ...(readsRouteParameters
        ? [
          SourcePatternModules.RouteContextSelection,
          SourcePatternModules.RouteParameterSelection,
        ]
        : []),
    ],
  );
}

const ROOT_COMPONENT_SOURCE = sourceText(`
import { customElement } from 'aurelia';
import { route } from '@aurelia/router';
__ROUTE_COMPONENT_IMPORTS__
import template from '__ROOT_TEMPLATE_MODULE__';

@route({
  title: '__APP_NAME__',
  routes: [
    {
      path: '',
      redirectTo: '__HOME_ROUTE_PATH__',
    },
__ROUTE_CONFIGS__,
  ],
})
@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__ROUTE_DEPENDENCIES__],
})
export class __ROOT_COMPONENT_CLASS__ {}
`).trimStart();

const ROOT_TEMPLATE_SOURCE = sourceText(`
<main>
  <nav>
__ROUTE_LINKS__
  </nav>
  <au-viewport name="__ROUTE_VIEWPORT_NAME__"></au-viewport>
</main>
`).trimStart();

const STATIC_ROUTE_COMPONENT_SOURCE = sourceText(`
import { customElement } from 'aurelia';
import template from '__ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__ROUTE_ELEMENT_NAME__',
  template,
})
export class __ROUTE_COMPONENT_CLASS__ {}
`).trimStart();

const STATIC_ROUTE_TEMPLATE_SOURCE = sourceText(`
<section>
  <h2>__ROUTE_TITLE__</h2>
</section>
`).trimStart();

const DETAIL_ROUTE_COMPONENT_SOURCE = sourceText(`
import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import template from '__DETAIL_ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__DETAIL_ROUTE_ELEMENT_NAME__',
  template,
})
export class __DETAIL_ROUTE_COMPONENT_CLASS__ {
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    __DETAIL_ROUTE_PARAMETER_NAME__: string;
    __DETAIL_ROUTE_QUERY_NAME__?: string;
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });
}
`).trimStart();

const DETAIL_ROUTE_TEMPLATE_SOURCE = sourceText(`
<section>
  <a load="../">Back</a>
  <h2>Detail \${routeParams.__DETAIL_ROUTE_PARAMETER_NAME__}</h2>
  <p>Opened from \${routeParams.__DETAIL_ROUTE_QUERY_NAME__ ?? 'navigation'}</p>
</section>
`).trimStart();
