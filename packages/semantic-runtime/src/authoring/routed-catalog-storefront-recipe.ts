import {
  type ApplicationComponentTopologyResult,
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
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';
import { AuthoringPreference } from './ontology.js';
import {
  catalogAppExpectedEffects,
  catalogAvailabilityTemplateExpectedEffects,
  catalogListTemplateExpectedEffects,
  catalogServicePlanStepExpectedEffects,
  catalogStatePlanStepExpectedEffects,
} from './catalog-storefront-expected-effects.js';
import {
  componentPlanStep,
  componentStyleAssetPlanStep,
  configurePluginPlanStep,
  domainModelPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  routePlanStep,
  rootComponentPlanStep,
  servicePlanStep,
  stateModelPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import {
  navigationOwnershipTasteEffects,
  routeConfigObjectLiteralEffect,
  routeConfigViewportEffect,
  routeContextParameterReadEffect,
  routeEndpointParameterEffect,
  routePatternParameterEffect,
  routeProductDiscriminatorEffect,
  routeProductSignatureEffect,
  routeRecognizedDynamicParameterEffect,
  routeRecognizedParameterValueEffect,
  routerViewportNameEffect,
  viewportInstructionTreeFragmentEffect,
  viewportInstructionTreeQueryParamEffect,
} from './route-expected-effects.js';
import { routedCatalogStorefrontSourcePlan } from './routed-catalog-storefront-source-plan.js';
import {
  catalogStorefrontDomainNamesFromParameters,
  defaultCatalogStorefrontDomainNames,
  type CatalogStorefrontDomainNames,
} from './catalog-storefront-source-plan.js';
import { catalogStorefrontPreferences } from './catalog-storefront-recipe.js';
import {
  defaultCatalogStorefrontFieldSchema,
  minimalCatalogStorefrontFieldSchema,
  catalogStorefrontFieldFeatureProfile,
  catalogStorefrontFieldSchemaFromParameter,
  catalogStorefrontUsesReferencePresentation,
  type CatalogStorefrontFieldSchema,
} from './catalog-storefront-field-schema.js';

export interface RoutedCatalogStorefrontRecipeRequest {
  /** Project root that the authored app should occupy. */
  readonly rootDir: string;
  /** User-facing app name for plan summaries. */
  readonly appName: string;
  readonly entrypointPath?: string;
  readonly rootComponentPath?: string;
  readonly rootTemplatePath?: string;
  readonly rootStylePath?: string;
  readonly rootComponentClassName?: string;
  readonly rootElementName?: string;
  readonly modelPath?: string;
  readonly statePath?: string;
  readonly stateClassName?: string;
  readonly collectionStateClassName?: string;
  readonly selectionStateClassName?: string;
  readonly servicePath?: string;
  readonly serviceClassName?: string;
  readonly listComponentPath?: string;
  readonly listTemplatePath?: string;
  readonly listClassName?: string;
  readonly listElementName?: string;
  readonly cardComponentPath?: string;
  readonly cardTemplatePath?: string;
  readonly cardClassName?: string;
  readonly cardElementName?: string;
  readonly listRouteId?: string;
  readonly listRoutePath?: string;
  readonly listRouteTitle?: string;
  readonly detailRouteId?: string;
  readonly detailRoutePath?: string;
  readonly detailRouteNavigationPath?: string;
  readonly detailRouteParameterName?: string;
  readonly detailRouteParameterValue?: string;
  readonly detailRouteQueryRefName?: string;
  readonly detailRouteQueryRefValue?: string;
  readonly detailRouteFragment?: string;
  readonly routeViewportName?: string;
  readonly detailRouteComponentPath?: string;
  readonly detailRouteTemplatePath?: string;
  readonly detailRouteComponentClassName?: string;
  readonly detailRouteElementName?: string;
  readonly catalogEntityName?: string;
  readonly catalogCollectionName?: string;
  readonly catalogFields?: string;
  readonly catalogOptions?: string;
}

interface RoutedCatalogStorefrontRecipeModel extends Required<Omit<RoutedCatalogStorefrontRecipeRequest, 'catalogFields' | 'catalogOptions'>> {
  readonly catalogDomain: CatalogStorefrontDomainNames;
  readonly catalogFieldSchema: CatalogStorefrontFieldSchema;
  readonly detailRoutePathPrefix: string;
}

export function buildRoutedCatalogStorefrontPlan(request: RoutedCatalogStorefrontRecipeRequest): AuthoringPlan {
  const model = normalizeRoutedCatalogStorefrontRecipe(request);
  const topology = routedCatalogStorefrontTopology(model);
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);

  return new AuthoringPlan(
    new AuthoringIntent(
      useReferencePresentation
        ? `Create ${model.appName} as a routed Aurelia catalog app with DI-owned composed state, a service boundary, local object cards, and detail route parameters.`
        : `Create ${model.appName} as a routed Aurelia catalog app with DI-owned composed state, a service boundary, direct list/detail templates, and detail route parameters.`,
      topology,
      null,
      routedCatalogStorefrontPreferences(useReferencePresentation),
    ),
    routedCatalogStorefrontPreconditions(),
    routedCatalogStorefrontPlanSteps(model, topology),
    topology,
    routedCatalogStorefrontSourcePlan(model),
  );
}

function normalizeRoutedCatalogStorefrontRecipe(
  request: RoutedCatalogStorefrontRecipeRequest,
): RoutedCatalogStorefrontRecipeModel {
  const hasCatalogDomainOverride = request.catalogEntityName != null || request.catalogCollectionName != null;
  const catalogDomain = hasCatalogDomainOverride
    ? catalogStorefrontDomainNamesFromParameters(request.catalogEntityName ?? 'Item', request.catalogCollectionName)
    : defaultCatalogStorefrontDomainNames();
  const catalogFieldSchema = catalogStorefrontFieldSchemaFromParameter(request.catalogFields, request.catalogOptions)
    ?? (hasCatalogDomainOverride ? minimalCatalogStorefrontFieldSchema() : defaultCatalogStorefrontFieldSchema());
  const entityStem = catalogDomain.entityKebabName;
  const entityClassStem = catalogDomain.entityClassName;
  const detailRouteParameterName = request.detailRouteParameterName ?? `${catalogDomain.entityVariableName}Id`;
  const detailRouteParameterValue = request.detailRouteParameterValue ?? `${catalogDomain.entityKebabName}-1`;
  const detailRouteQueryRefName = request.detailRouteQueryRefName ?? 'ref';
  const detailRouteQueryRefValue = request.detailRouteQueryRefValue ?? 'featured';
  const detailRouteFragment = request.detailRouteFragment ?? 'details';
  const listRoutePath = request.listRoutePath ?? catalogDomain.collectionKebabName;
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    catalogDomain,
    catalogEntityName: request.catalogEntityName ?? catalogDomain.entityTitle,
    catalogCollectionName: request.catalogCollectionName ?? catalogDomain.collectionPropertyName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootStylePath: request.rootStylePath ?? 'src/app.css',
    rootComponentClassName: request.rootComponentClassName ?? 'App',
    rootElementName: request.rootElementName ?? 'app-root',
    modelPath: request.modelPath ?? `src/models/${entityStem}.ts`,
    statePath: request.statePath ?? 'src/state/catalog-state.ts',
    stateClassName: request.stateClassName ?? 'CatalogState',
    collectionStateClassName: request.collectionStateClassName ?? `${entityClassStem}CollectionState`,
    selectionStateClassName: request.selectionStateClassName ?? 'SelectionState',
    servicePath: request.servicePath ?? `src/services/${entityStem}-catalog-service.ts`,
    serviceClassName: request.serviceClassName ?? `${entityClassStem}CatalogService`,
    listComponentPath: request.listComponentPath ?? `src/routes/${entityStem}-list-route.ts`,
    listTemplatePath: request.listTemplatePath ?? `src/routes/${entityStem}-list-route.html`,
    listClassName: request.listClassName ?? `${entityClassStem}ListRoute`,
    listElementName: request.listElementName ?? `${entityStem}-list-route`,
    cardComponentPath: request.cardComponentPath ?? `src/components/${entityStem}-card.ts`,
    cardTemplatePath: request.cardTemplatePath ?? `src/components/${entityStem}-card.html`,
    cardClassName: request.cardClassName ?? `${entityClassStem}Card`,
    cardElementName: request.cardElementName ?? `${entityStem}-card`,
    listRouteId: request.listRouteId ?? listRoutePath,
    listRoutePath,
    listRouteTitle: request.listRouteTitle ?? catalogDomain.collectionTitle,
    detailRouteId: request.detailRouteId ?? `${entityStem}-detail`,
    detailRoutePath: request.detailRoutePath ?? `${listRoutePath}/:${detailRouteParameterName}`,
    detailRouteNavigationPath: request.detailRouteNavigationPath
      ?? `${listRoutePath}/${detailRouteParameterValue}?${detailRouteQueryRefName}=${detailRouteQueryRefValue}#${detailRouteFragment}`,
    detailRouteParameterName,
    detailRouteParameterValue,
    detailRouteQueryRefName,
    detailRouteQueryRefValue,
    detailRouteFragment,
    routeViewportName: request.routeViewportName ?? 'main',
    detailRouteComponentPath: request.detailRouteComponentPath ?? `src/routes/${entityStem}-detail-route.ts`,
    detailRouteTemplatePath: request.detailRouteTemplatePath ?? `src/routes/${entityStem}-detail-route.html`,
    detailRouteComponentClassName: request.detailRouteComponentClassName ?? `${entityClassStem}DetailRoute`,
    detailRouteElementName: request.detailRouteElementName ?? `${entityStem}-detail-route`,
    detailRoutePathPrefix: `/${listRoutePath}/`,
    catalogFieldSchema,
  };
}

function routedCatalogStorefrontPreferences(useReferencePresentation: boolean): readonly AuthoringPreference[] {
  return [
    ...catalogStorefrontPreferences(useReferencePresentation),
    new AuthoringPreference('navigation-ownership', 'static-route-config'),
    new AuthoringPreference('navigation-ownership', 'decorator-route-config'),
    new AuthoringPreference('navigation-ownership', 'child-routes-property-route-config'),
    new AuthoringPreference('navigation-ownership', 'viewport-layout-navigation'),
    new AuthoringPreference('state-ownership', 'route-parameter-selected-state'),
  ];
}

function routedCatalogStorefrontPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia runtime-html, router, and TypeScript module resolution are available.'),
  ];
}

function routedCatalogStorefrontPlanSteps(
  model: RoutedCatalogStorefrontRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  const featureProfile = catalogStorefrontFieldFeatureProfile(model.catalogFieldSchema);
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      ...(useReferencePresentation ? [model.rootStylePath] : []),
      model.modelPath,
      model.statePath,
      model.servicePath,
      model.listComponentPath,
      model.listTemplatePath,
      model.detailRouteComponentPath,
      model.detailRouteTemplatePath,
      ...(useReferencePresentation ? [model.cardComponentPath, model.cardTemplatePath] : []),
    ]),
    domainModelPlanStep(model.modelPath, model.catalogDomain.entityClassName),
    configurePluginPlanStep(
      'RouterConfiguration',
      '@aurelia/router',
      [
        ExpectedSemanticEffect.discriminatorFact('Router should expose routed catalog facts after reopen.', 'route', 'route', 'router'),
        routeProductSignatureEffect('Routed catalog router options should be visible after RouterConfiguration is registered.', 'router-options'),
        ExpectedSemanticEffect.signatureFact('Routed catalog router options should configure low-boilerplate active link styling.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'router-options'),
          new ExpectedSemanticEffectFilter('activeClass', 'active-route'),
        ]),
      ],
    ),
    stateModelPlanStep(
      model.statePath,
      model.stateClassName,
      catalogStatePlanStepExpectedEffects({
        summaryPrefix: 'Routed catalog',
        stateClassName: model.stateClassName,
        includeCollectionKeyDependency: false,
        composedStateCount: useReferencePresentation ? 2 : 1,
        domain: model.catalogDomain,
      }),
    ),
    servicePlanStep(
      model.servicePath,
      model.serviceClassName,
      catalogServicePlanStepExpectedEffects({
        summaryPrefix: 'Routed catalog',
        serviceClassName: model.serviceClassName,
      }),
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    ...(useReferencePresentation ? [componentStyleAssetPlanStep(model.rootStylePath)] : []),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    routePlanStep(
      model.listRoutePath,
      model.listClassName,
      [
        ExpectedSemanticEffect.discriminatorFact('Routed catalog list route config should be visible.', 'route', 'route', 'route'),
        routeProductDiscriminatorEffect('Routed catalog route config should be visible as a source-backed router product.', 'route-config'),
        routeConfigViewportEffect('Routed catalog list route should target the main viewport.', model.routeViewportName),
      ],
    ),
    componentPlanStep(model.listComponentPath, model.listClassName, model.listElementName, `Routed catalog ${model.catalogDomain.entityTitle} list route`, 'route'),
    externalTemplatePlanStep(model.listTemplatePath, model.listClassName, `${model.catalogDomain.entityTitle} list route`),
    routePlanStep(
      model.detailRoutePath,
      model.detailRouteComponentClassName,
      routedCatalogRouteExpectedEffects(model),
    ),
    componentPlanStep(model.detailRouteComponentPath, model.detailRouteComponentClassName, model.detailRouteElementName, `Routed catalog ${model.catalogDomain.entityTitle} detail route`, 'route'),
    externalTemplatePlanStep(model.detailRouteTemplatePath, model.detailRouteComponentClassName, `${model.catalogDomain.entityTitle} detail route`),
    ...(useReferencePresentation
      ? [
        componentPlanStep(
          model.cardComponentPath,
          model.cardClassName,
          model.cardElementName,
          `Routed catalog ${model.catalogDomain.entityTitle} card`,
          'component',
          [
            ExpectedSemanticEffect.signatureTaste(`Routed catalog ${model.catalogDomain.entityTitle} card should expose object-shaped input for local typed handoff.`, 'component-interface', 'object-inputs', 'component'),
          ],
        ),
        externalTemplatePlanStep(model.cardTemplatePath, model.cardClassName, `${model.catalogDomain.entityTitle} card component`),
      ]
      : []),
    templateBindingPlanStep(
      model.listTemplatePath,
      useReferencePresentation
        ? `repeat.for list rendering and local ${model.catalogDomain.entityClassName} object handoff into ${model.cardElementName}`
        : `repeat.for routed list rendering over direct ${model.catalogDomain.entityClassName} template locals`,
      routedCatalogListTemplateExpectedEffects(model),
    ),
    ...(useReferencePresentation && featureProfile.hasAvailabilitySwitch
      ? [templateBindingPlanStep(
        model.cardTemplatePath,
        'switch controller for stock availability states',
        routedCatalogCardTemplateExpectedEffects(model),
      )]
      : []),
    verifyAppPlanStep(topology, routedCatalogStorefrontExpectedEffects(model)),
  ];
}

function routedCatalogStorefrontTopology(model: RoutedCatalogStorefrontRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  const card = useReferencePresentation ? addRoutedCatalogCard(builder, model) : null;
  const list = addRoutedCatalogList(builder, model, card);
  const detail = addRoutedCatalogDetailRoute(builder, model);
  const root = addRoutedCatalogRoot(builder, model, list, detail);
  addRoutedCatalogState(builder, model);
  addRoutedCatalogService(builder, model);
  addRoutedCatalogListRoute(builder, model, list);
  addRoutedCatalogDetailRouteConfig(builder, model, detail);
  addRoutedCatalogEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addRoutedCatalogRoot(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
  list: ApplicationComponentTopologyResult,
  detail: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return builder.component({
    className: model.rootComponentClassName,
    referenceFromPath: model.entrypointPath,
    sourcePath: model.rootComponentPath,
    elementName: model.rootElementName,
    templatePath: model.rootTemplatePath,
    styles: useReferencePresentation ? [{
      path: model.rootStylePath,
      assetKind: 'component-stylesheet',
      sourceKind: 'css-import',
    }] : [],
    dependencies: [list.reference, detail.reference],
  });
}

function addRoutedCatalogList(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
  card: ApplicationComponentTopologyResult | null,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.listClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.listComponentPath,
    elementName: model.listElementName,
    templatePath: model.listTemplatePath,
    dependencies: card == null ? [] : [card.reference],
  });
}

function addRoutedCatalogDetailRoute(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.detailRouteComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.detailRouteComponentPath,
    elementName: model.detailRouteElementName,
    templatePath: model.detailRouteTemplatePath,
  });
}

function addRoutedCatalogCard(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.cardClassName,
    referenceFromPath: model.listComponentPath,
    sourcePath: model.cardComponentPath,
    elementName: model.cardElementName,
    templatePath: model.cardTemplatePath,
  });
}

function addRoutedCatalogState(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addRoutedCatalogService(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
): void {
  builder.service({
    className: model.serviceClassName,
    sourcePath: model.servicePath,
    role: 'service-source',
  });
}

function addRoutedCatalogListRoute(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
  route: ApplicationComponentTopologyResult,
): void {
  builder.route({
    path: model.listRoutePath,
    component: route.reference,
    title: model.listRouteTitle,
  });
}

function addRoutedCatalogDetailRouteConfig(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
  route: ApplicationComponentTopologyResult,
): void {
  builder.route({
    path: model.detailRoutePath,
    component: route.reference,
    title: `${model.catalogDomain.entityTitle} detail`,
  });
}

function addRoutedCatalogEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: RoutedCatalogStorefrontRecipeModel,
  root: ApplicationComponentTopologyResult,
): void {
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
}

function routedCatalogRouteExpectedEffects(model: RoutedCatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  return [
    routeConfigObjectLiteralEffect('Routed catalog route config should close as an authored decorator object.', 'route-decorator'),
    routeConfigObjectLiteralEffect('Routed catalog nested route config should close as child route objects.', 'child-routes-property'),
    routePatternParameterEffect(`Routed catalog detail route pattern should expose ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeEndpointParameterEffect(`Routed catalog detail endpoint should carry ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeContextParameterReadEffect(`Routed catalog detail route-context read should align to ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeRecognizedParameterValueEffect(`Routed catalog static detail link should recognize the concrete ${model.detailRouteParameterName}.`, model.detailRouteParameterName, model.detailRouteParameterValue),
    routeRecognizedDynamicParameterEffect('Routed catalog cards should recognize data-driven detail links.', model.detailRouteParameterName),
    viewportInstructionTreeQueryParamEffect('Routed catalog viewport instruction tree should carry the source query value.', model.detailRouteQueryRefName, model.detailRouteQueryRefValue),
    viewportInstructionTreeFragmentEffect('Routed catalog viewport instruction tree should carry the route fragment.', model.detailRouteFragment),
    routeConfigViewportEffect('Routed catalog detail route should target the main viewport.', model.routeViewportName),
    routerViewportNameEffect('Routed catalog root template should expose the main viewport.', model.routeViewportName),
    ...navigationOwnershipTasteEffects('Authoring orientation'),
  ];
}

function routedCatalogListTemplateExpectedEffects(model: RoutedCatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return catalogListTemplateExpectedEffects({
    summaryPrefix: 'Routed catalog list',
    includeEntityTargetCheck: useReferencePresentation,
    includeLocalObjectBinding: useReferencePresentation,
    includeReferencePresentation: useReferencePresentation,
    routeParameterName: model.detailRouteParameterName,
    domain: model.catalogDomain,
    fieldSchema: model.catalogFieldSchema,
  });
}

function routedCatalogCardTemplateExpectedEffects(model: RoutedCatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  return catalogAvailabilityTemplateExpectedEffects('Routed catalog', model.catalogFieldSchema);
}

function routedCatalogStorefrontExpectedEffects(model: RoutedCatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return catalogAppExpectedEffects({
    summaryPrefix: 'Routed catalog storefront',
    componentCount: useReferencePresentation ? 4 : 3,
    componentCountSummary: useReferencePresentation
      ? 'root, list route, detail route, and card custom elements'
      : 'root, list route, and detail route custom elements',
    externalTemplateCount: useReferencePresentation ? 4 : 3,
    compiledTemplateCount: useReferencePresentation ? 4 : 3,
    stateClassName: model.stateClassName,
    serviceClassName: model.serviceClassName,
    cardClassName: model.cardClassName,
    cardElementName: model.cardElementName,
    domain: model.catalogDomain,
    fieldSchema: model.catalogFieldSchema,
    includeListRendererRole: true,
    includeEventSurfaceRole: true,
    includeCollectionKeyDependency: useReferencePresentation,
    includeSelectionCountGetter: useReferencePresentation,
    includeComponentStylesheet: useReferencePresentation,
    includeLocalObjectBinding: useReferencePresentation,
    includeReferencePresentation: useReferencePresentation,
    includeStatusPromise: useReferencePresentation,
    composedStateCount: useReferencePresentation ? 2 : 1,
    route: {
      detailRouteClassName: model.detailRouteComponentClassName,
      detailRouteElementName: model.detailRouteElementName,
      routeParameterName: model.detailRouteParameterName,
      routeParameterValue: model.detailRouteParameterValue,
      routeQueryRefName: model.detailRouteQueryRefName,
      routeQueryRefValue: model.detailRouteQueryRefValue,
      routeViewportName: model.routeViewportName,
    },
  });
}
