import {
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  AuthoringIntent,
  AuthoringPlan,
  AuthoringPlanStep,
  AuthoringPrecondition,
} from './plan.js';
import { ExpectedSemanticEffect } from './expected-effect.js';
import { AuthoringPreference } from './ontology.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  navigationOwnershipTasteEffects,
  routeConfigObjectLiteralEffect,
  routeConfigViewportEffect,
  routeEndpointParameterEffect,
  routeNodeChildFirstParameterValueEffect,
  routeNodeChildFirstQueryValueEffect,
  routeNodeParameterValueEffect,
  routeNodeViewportEffect,
  routePatternParameterEffect,
  routeProductDiscriminatorEffect,
  routeProductSignatureEffect,
  routeRecognizedParameterEffect,
  routeRecognizedParameterValueEffect,
  routerViewportNameEffect,
  viewportInstructionTreeFragmentEffect,
  viewportInstructionTreeQueryParamEffect,
} from './route-expected-effects.js';
import {
  componentPlanStep,
  configurePluginPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  routePlanStep,
  rootComponentPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import { routedAppShellSourcePlan } from './routed-app-shell-source-plan.js';
import type { RoutedAppShellRouteSourceModel } from './routed-app-shell-source-plan.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  pascalSourceName,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';

export interface RoutedAppShellRecipeRequest {
  /** Project root that the authored app should occupy. */
  readonly rootDir: string;
  /** User-facing app name for plan summaries. */
  readonly appName: string;
  readonly entrypointPath?: string;
  readonly rootComponentPath?: string;
  readonly rootTemplatePath?: string;
  readonly rootComponentClassName?: string;
  readonly rootElementName?: string;
  readonly routeViewportName?: string;
  readonly homeRouteId?: string;
  readonly homeRoutePath?: string;
  readonly homeRouteTitle?: string;
  readonly homeRouteComponentPath?: string;
  readonly homeRouteTemplatePath?: string;
  readonly homeRouteComponentClassName?: string;
  readonly homeRouteElementName?: string;
  readonly detailRouteId?: string;
  readonly detailRoutePath?: string;
  readonly detailRouteNavigationPath?: string;
  readonly detailRouteTitle?: string;
  readonly detailRouteParameterName?: string;
  readonly detailRouteParameterValue?: string;
  readonly detailRouteQueryName?: string;
  readonly detailRouteQueryValue?: string;
  readonly detailRouteFragment?: string;
  readonly detailRouteComponentPath?: string;
  readonly detailRouteTemplatePath?: string;
  readonly detailRouteComponentClassName?: string;
  readonly detailRouteElementName?: string;
  /** Comma-separated static section route labels for tabbed/settings/sectioned shells. */
  readonly sectionRoutes?: string;
}

interface RoutedAppShellRecipeModel extends Required<Omit<RoutedAppShellRecipeRequest, 'sectionRoutes'>> {
  readonly sectionRoutes: string | null;
  readonly routeEntries: readonly RoutedAppShellRouteSourceModel[];
  readonly usesDetailRouteParameters: boolean;
}

export function buildRoutedAppShellPlan(request: RoutedAppShellRecipeRequest): AuthoringPlan {
  const model = normalizeRoutedAppShellRecipe(request);
  const topology = routedAppShellTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      model.usesDetailRouteParameters
        ? `Create ${model.appName} as a routed Aurelia app shell with static route config, named viewport layout, and route parameter/query handoff.`
        : `Create ${model.appName} as a routed Aurelia app shell with static section routes, navigation links, and named viewport layout.`,
      topology,
      null,
      [
        new AuthoringPreference('resource-declaration-mode', 'decorator-resource-declaration'),
        new AuthoringPreference('template-source-ownership', 'external-template-file'),
        new AuthoringPreference('navigation-ownership', 'static-route-config'),
        new AuthoringPreference('navigation-ownership', 'decorator-route-config'),
        new AuthoringPreference('navigation-ownership', 'viewport-layout-navigation'),
        new AuthoringPreference('state-ownership', 'route-parameter-selected-state'),
        new AuthoringPreference('package-topology', 'single-app-package'),
        new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
      ],
    ),
    routedAppShellPreconditions(),
    routedAppShellPlanSteps(model, topology),
    topology,
    routedAppShellSourcePlan(model),
  );
}

function normalizeRoutedAppShellRecipe(request: RoutedAppShellRecipeRequest): RoutedAppShellRecipeModel {
  const sectionRouteEntries = routedAppShellSectionRoutes(request.sectionRoutes);
  const detailRouteParameterName = request.detailRouteParameterName ?? 'itemId';
  const detailRouteParameterValue = request.detailRouteParameterValue ?? '42';
  const detailRouteQueryName = request.detailRouteQueryName ?? 'ref';
  const detailRouteQueryValue = request.detailRouteQueryValue ?? 'nav';
  const detailRouteFragment = request.detailRouteFragment ?? 'details';
  const detailRoutePath = request.detailRoutePath ?? `items/:${detailRouteParameterName}`;
  const homeRoutePath = request.homeRoutePath ?? sectionRouteEntries[0]?.path ?? 'home';
  const homeRouteTitle = request.homeRouteTitle ?? sectionRouteEntries[0]?.title ?? 'Home';
  const homeRouteId = request.homeRouteId ?? sectionRouteEntries[0]?.id ?? 'home';
  const homeRouteComponentPath = request.homeRouteComponentPath ?? sectionRouteEntries[0]?.componentPath ?? 'src/routes/home-route.ts';
  const homeRouteTemplatePath = request.homeRouteTemplatePath ?? sectionRouteEntries[0]?.templatePath ?? 'src/routes/home-route.html';
  const homeRouteComponentClassName = request.homeRouteComponentClassName ?? sectionRouteEntries[0]?.componentClassName ?? 'HomeRoute';
  const homeRouteElementName = request.homeRouteElementName ?? sectionRouteEntries[0]?.elementName ?? 'home-route';
  const defaultRouteEntries: readonly RoutedAppShellRouteSourceModel[] = [
    {
      id: homeRouteId,
      path: homeRoutePath,
      navigationPath: homeRoutePath,
      title: homeRouteTitle,
      componentPath: homeRouteComponentPath,
      templatePath: homeRouteTemplatePath,
      componentClassName: homeRouteComponentClassName,
      elementName: homeRouteElementName,
      readsRouteParameters: false,
    },
    {
      id: request.detailRouteId ?? 'item-detail',
      path: detailRoutePath,
      navigationPath: request.detailRouteNavigationPath
        ?? `items/${detailRouteParameterValue}?${detailRouteQueryName}=${detailRouteQueryValue}#${detailRouteFragment}`,
      title: request.detailRouteTitle ?? 'Detail',
      componentPath: request.detailRouteComponentPath ?? 'src/routes/detail-route.ts',
      templatePath: request.detailRouteTemplatePath ?? 'src/routes/detail-route.html',
      componentClassName: request.detailRouteComponentClassName ?? 'DetailRoute',
      elementName: request.detailRouteElementName ?? 'detail-route',
      readsRouteParameters: true,
    },
  ];
  const routeEntries = sectionRouteEntries.length >= 2
    ? sectionRouteEntries
    : defaultRouteEntries;
  const usesDetailRouteParameters = routeEntries.some((route) => route.readsRouteParameters);
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootComponentClassName: request.rootComponentClassName ?? 'App',
    rootElementName: request.rootElementName ?? 'app-root',
    routeViewportName: request.routeViewportName ?? 'main',
    homeRouteId,
    homeRoutePath,
    homeRouteTitle,
    homeRouteComponentPath,
    homeRouteTemplatePath,
    homeRouteComponentClassName,
    homeRouteElementName,
    detailRouteId: defaultRouteEntries[1]!.id,
    detailRoutePath,
    detailRouteNavigationPath: defaultRouteEntries[1]!.navigationPath,
    detailRouteTitle: defaultRouteEntries[1]!.title,
    detailRouteParameterName,
    detailRouteParameterValue,
    detailRouteQueryName,
    detailRouteQueryValue,
    detailRouteFragment,
    detailRouteComponentPath: defaultRouteEntries[1]!.componentPath,
    detailRouteTemplatePath: defaultRouteEntries[1]!.templatePath,
    detailRouteComponentClassName: defaultRouteEntries[1]!.componentClassName,
    detailRouteElementName: defaultRouteEntries[1]!.elementName,
    sectionRoutes: sectionRouteEntries.length >= 2 ? request.sectionRoutes ?? null : null,
    routeEntries,
    usesDetailRouteParameters,
  };
}

function routedAppShellSectionRoutes(
  sectionRoutes: string | undefined,
): readonly RoutedAppShellRouteSourceModel[] {
  if (sectionRoutes == null) {
    return [];
  }
  return uniqueSectionRouteLabels(sectionRoutes)
    .map((label) => routedAppShellSectionRoute(label));
}

function uniqueSectionRouteLabels(sectionRoutes: string): readonly string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const item of sectionRoutes.split(/[,;]|\band\b/iu)) {
    const label = titleSourceName(sourceNameWords(
      item
        .replace(/\b(?:a|an|the|route|routes|screen|page|tab|tabs|section|sections)\b/giu, ' ')
        .trim(),
    ));
    const key = label.toLowerCase();
    if (label.length > 0 && !seen.has(key)) {
      seen.add(key);
      labels.push(label);
    }
  }
  return labels;
}

function routedAppShellSectionRoute(
  title: string,
): RoutedAppShellRouteSourceModel {
  const words = sourceNameWords(title);
  const routePath = kebabSourceName(words);
  return {
    id: routePath,
    path: routePath,
    navigationPath: routePath,
    title: titleSourceName(words),
    componentPath: `src/routes/${routePath}-route.ts`,
    templatePath: `src/routes/${routePath}-route.html`,
    componentClassName: `${pascalSourceName(words)}Route`,
    elementName: `${routePath}-route`,
    readsRouteParameters: false,
  };
}

function routedAppShellPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia runtime-html, router, and TypeScript module resolution are available.'),
  ];
}

function routedAppShellPlanSteps(
  model: RoutedAppShellRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      ...model.routeEntries.flatMap((route) => [route.componentPath, route.templatePath]),
    ]),
    configurePluginPlanStep(
      'RouterConfiguration',
      '@aurelia/router',
      [
        routeProductSignatureEffect('Routed app shell router options should be visible after RouterConfiguration is registered.', 'router-options'),
      ],
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(
      model.rootComponentPath,
      model.rootComponentClassName,
      model.rootElementName,
      [
        routeConfigObjectLiteralEffect('Routed app shell should use decorator route object literals.', 'route-decorator'),
        routeConfigViewportEffect('Routed app shell route config should target the main viewport.', model.routeViewportName),
        ...navigationOwnershipTasteEffects('Routed app shell root component'),
      ],
    ),
    externalTemplatePlanStep(
      model.rootTemplatePath,
      model.rootComponentClassName,
      'Routed app shell root',
      model.usesDetailRouteParameters ? [
        routerViewportNameEffect('Routed app shell template should declare the main au-viewport.', model.routeViewportName),
        viewportInstructionTreeQueryParamEffect('Routed app shell static detail link should carry query params.', model.detailRouteQueryName, model.detailRouteQueryValue),
        viewportInstructionTreeFragmentEffect('Routed app shell static detail link should carry a fragment.', model.detailRouteFragment),
      ] : [
        routerViewportNameEffect('Routed section shell template should declare the main au-viewport.', model.routeViewportName),
      ],
    ),
    ...model.routeEntries.flatMap((route) => routedAppShellRoutePlanSteps(model, route)),
    templateBindingPlanStep(
      model.rootTemplatePath,
      model.usesDetailRouteParameters
        ? 'static navigation links, active class router option, route query string, and named au-viewport.'
        : 'static section navigation links, active class router option, and named au-viewport.',
      model.usesDetailRouteParameters ? [
        routeRecognizedParameterValueEffect('Routed app shell static detail link should recognize the detail parameter value.', model.detailRouteParameterName, model.detailRouteParameterValue),
        viewportInstructionTreeQueryParamEffect('Routed app shell static detail link should expose query value.', model.detailRouteQueryName, model.detailRouteQueryValue),
        viewportInstructionTreeFragmentEffect('Routed app shell static detail link should expose the fragment value.', model.detailRouteFragment),
      ] : [
        routeProductSignatureEffect('Routed section shell static links should create typed navigation instructions.', 'typed-navigation-instruction'),
        routeProductSignatureEffect('Routed section shell static links should create viewport instructions.', 'viewport-instruction'),
      ],
    ),
    verifyAppPlanStep(topology, routedAppShellExpectedEffects(model)),
  ];
}

function routedAppShellRoutePlanSteps(
  model: RoutedAppShellRecipeModel,
  route: RoutedAppShellRouteSourceModel,
): readonly AuthoringPlanStep[] {
  return [
    routePlanStep(
      route.path,
      route.componentClassName,
      route.readsRouteParameters
        ? routedAppShellDetailRouteExpectedEffects(model)
        : [
          routeProductDiscriminatorEffect(`Routed app shell ${route.title} route config should be visible as a source-backed router product.`, 'route-config'),
        ],
    ),
    componentPlanStep(route.componentPath, route.componentClassName, route.elementName, `${route.title} route`, 'route'),
    externalTemplatePlanStep(route.templatePath, route.componentClassName, `${route.title} route`),
  ];
}

function routedAppShellTopology(model: RoutedAppShellRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const routes = model.routeEntries.map((route) => ({
    route,
    component: builder.component({
      className: route.componentClassName,
      referenceFromPath: model.rootComponentPath,
      sourcePath: route.componentPath,
      elementName: route.elementName,
      templatePath: route.templatePath,
    }),
  }));
  const root = builder.component({
    className: model.rootComponentClassName,
    referenceFromPath: model.entrypointPath,
    sourcePath: model.rootComponentPath,
    elementName: model.rootElementName,
    templatePath: model.rootTemplatePath,
    dependencies: routes.map((route) => route.component.reference),
  });
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'Aurelia.register(RouterConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
      new ApplicationImport('@aurelia/router', ['RouterConfiguration']),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
  for (const route of routes) {
    builder.route({ path: route.route.path, component: route.component.reference, title: route.route.title });
  }
  return builder.toTopology();
}

function routedAppShellDetailRouteExpectedEffects(
  model: RoutedAppShellRecipeModel,
): readonly ExpectedSemanticEffect[] {
  return [
    routeProductDiscriminatorEffect('Routed app shell detail route config should be visible as a source-backed router product.', 'route-config'),
    routePatternParameterEffect('Routed app shell detail route pattern should expose its parameter.', model.detailRouteParameterName),
    routeEndpointParameterEffect('Routed app shell detail route endpoint should expose its parameter.', model.detailRouteParameterName),
    routeRecognizedParameterEffect('Routed app shell should recognize the detail parameter name.', model.detailRouteParameterName),
    routeRecognizedParameterValueEffect('Routed app shell should recognize the static detail parameter value.', model.detailRouteParameterName, model.detailRouteParameterValue),
    routeNodeParameterValueEffect('Routed app shell route node should carry the detail parameter value.', model.detailRouteParameterName, model.detailRouteParameterValue),
    routeNodeChildFirstParameterValueEffect('Routed app shell route node should expose child-first detail parameters.', model.detailRouteParameterName, model.detailRouteParameterValue),
    routeNodeChildFirstQueryValueEffect('Routed app shell route node should expose child-first query values.', model.detailRouteQueryName, model.detailRouteQueryValue),
    routeNodeViewportEffect('Routed app shell route node should carry the main viewport.', model.routeViewportName),
  ];
}

function routedAppShellExpectedEffects(
  model: RoutedAppShellRecipeModel,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact('Routed app shell reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Routed app shell'),
    ExpectedSemanticEffect.fact('Routed app shell has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Routed app shell has root and route custom elements.', 'component', 'resource', model.routeEntries.length + 1, 'component'),
    ExpectedSemanticEffect.atLeast('Routed app shell has external templates.', 'external-template', 'template', model.routeEntries.length + 1, 'template'),
    ExpectedSemanticEffect.atLeast('Routed app shell has compiled template facts.', 'template-compilation', 'template', model.routeEntries.length + 1, 'template'),
    ExpectedSemanticEffect.fact('Routed app shell has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    ExpectedSemanticEffect.signatureFact('Routed app shell has routed-component roles.', 'component-role', 'route', 'route', 'present'),
    routeProductDiscriminatorEffect('Routed app shell has source-backed RouteConfig products.', 'route-config'),
    routeProductSignatureEffect('Routed app shell has router options.', 'router-options'),
    routeProductSignatureEffect('Routed app shell has RouteContext topology products.', 'route-context'),
    routeProductSignatureEffect('Routed app shell has au-viewport products.', 'router-viewport'),
    routeProductSignatureEffect('Routed app shell has ViewportAgent products.', 'viewport-agent'),
    routeProductSignatureEffect('Routed app shell has route-recognizer pattern products.', 'route-pattern'),
    ...(model.usesDetailRouteParameters ? [routePatternParameterEffect('Routed app shell has parameterized detail route patterns.', model.detailRouteParameterName)] : []),
    routeProductSignatureEffect('Routed app shell has route-recognizer endpoint products.', 'route-endpoint'),
    ...(model.usesDetailRouteParameters ? [routeEndpointParameterEffect('Routed app shell has parameterized detail route endpoints.', model.detailRouteParameterName)] : []),
    routeProductSignatureEffect('Routed app shell has route-recognizer state products.', 'route-recognizer-state'),
    routeProductSignatureEffect('Routed app shell has TypedNavigationInstruction products.', 'typed-navigation-instruction'),
    routeProductSignatureEffect('Routed app shell has ViewportInstruction products.', 'viewport-instruction'),
    routeProductSignatureEffect('Routed app shell has ViewportInstructionTree products.', 'viewport-instruction-tree'),
    routeProductSignatureEffect('Routed app shell has RecognizedRoute products.', 'recognized-route'),
    ...(model.usesDetailRouteParameters ? [routeRecognizedParameterValueEffect('Routed app shell has recognized static detail parameter values.', model.detailRouteParameterName, model.detailRouteParameterValue)] : []),
    routeProductSignatureEffect('Routed app shell has RouteTree products.', 'route-tree'),
    routeProductSignatureEffect('Routed app shell has RouteNode products.', 'route-node'),
    ...(model.usesDetailRouteParameters ? [
      routeNodeParameterValueEffect('Routed app shell route nodes carry the static detail parameter value.', model.detailRouteParameterName, model.detailRouteParameterValue),
      routeNodeChildFirstParameterValueEffect('Routed app shell route nodes expose child-first detail parameters.', model.detailRouteParameterName, model.detailRouteParameterValue),
      routeNodeChildFirstQueryValueEffect('Routed app shell route nodes expose include-query values.', model.detailRouteQueryName, model.detailRouteQueryValue),
    ] : []),
    routeNodeViewportEffect('Routed app shell route nodes carry the main viewport.', model.routeViewportName),
    routeProductSignatureEffect('Routed app shell has ComponentAgent handoff products.', 'component-agent'),
    routerViewportNameEffect('Routed app shell exposes the main router viewport.', model.routeViewportName),
    ...(model.usesDetailRouteParameters ? [
      viewportInstructionTreeQueryParamEffect('Routed app shell exposes query params on navigation instructions.', model.detailRouteQueryName, model.detailRouteQueryValue),
      viewportInstructionTreeFragmentEffect('Routed app shell exposes navigation fragments.', model.detailRouteFragment),
    ] : []),
    ExpectedSemanticEffect.absent('Routed app shell has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.capability('Routed app shell exposes verifiable router authoring.', 'router', 'verifiable'),
    ExpectedSemanticEffect.capability('Routed app shell exposes verifiable app-shell authoring.', 'app-shell', 'verifiable'),
    ...navigationOwnershipTasteEffects('Routed app shell'),
    ExpectedSemanticEffect.signatureTaste('Routed app shell reports external template ownership.', 'template-source-ownership', 'external-template-file', 'template'),
    ExpectedSemanticEffect.signatureTaste('Routed app shell reports single-package topology.', 'package-topology', 'single-app-package', 'workspace'),
  ];
}
