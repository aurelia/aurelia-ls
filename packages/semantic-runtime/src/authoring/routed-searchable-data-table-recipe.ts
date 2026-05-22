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
  dataTableAppExpectedEffects,
  dataTableControlsPlanStepSummary,
  dataTableControlsExpectedEffects,
  dataTableDomainExpectedEffectOptions,
  dataTableListExpectedEffects,
  dataTableServicePlanStepExpectedEffects,
  dataTableStatePlanStepExpectedEffects,
} from './searchable-data-table-expected-effects.js';
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
import { routedSearchableDataTableSourcePlan } from './routed-searchable-data-table-source-plan.js';
import {
  defaultSearchableDataTableDomainNames,
  searchableDataTableDomainNamesFromParameters,
  type SearchableDataTableDomainNames,
} from './searchable-data-table-source-plan.js';
import { searchableDataTablePreferences } from './searchable-data-table-recipe.js';
import {
  defaultSearchableDataTableFieldSchema,
  minimalSearchableDataTableFieldSchema,
  referenceSearchableDataTableFeatureProfile,
  searchableDataTableFieldSchemaFromParameter,
  searchableDataTableUsesReferencePresentation,
  starterSearchableDataTableFeatureProfile,
  type SearchableDataTableFeatureProfile,
  type SearchableDataTableFieldSchema,
} from './searchable-data-table-field-schema.js';

export interface RoutedSearchableDataTableRecipeRequest {
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
  readonly filterStateClassName?: string;
  readonly sortStateClassName?: string;
  readonly paginationStateClassName?: string;
  readonly selectionStateClassName?: string;
  readonly servicePath?: string;
  readonly serviceClassName?: string;
  readonly tableComponentPath?: string;
  readonly tableTemplatePath?: string;
  readonly tableClassName?: string;
  readonly tableElementName?: string;
  readonly tableEntityName?: string;
  readonly tableCollectionName?: string;
  readonly tableFields?: string;
  readonly tableOptions?: string;
  readonly tableRouteComponentPath?: string;
  readonly tableRouteTemplatePath?: string;
  readonly tableRouteComponentClassName?: string;
  readonly tableRouteElementName?: string;
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
}

interface RoutedSearchableDataTableRecipeModel extends Required<Omit<RoutedSearchableDataTableRecipeRequest, 'tableEntityName' | 'tableCollectionName' | 'tableFields' | 'tableOptions'>> {
  readonly tableDomain: SearchableDataTableDomainNames;
  readonly tableFieldSchema: SearchableDataTableFieldSchema;
  readonly tableFeatureProfile: SearchableDataTableFeatureProfile;
}

export function buildRoutedSearchableDataTablePlan(request: RoutedSearchableDataTableRecipeRequest): AuthoringPlan {
  const model = normalizeRoutedSearchableDataTableRecipe(request);
  const topology = routedSearchableDataTableTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as a routed Aurelia data table with DI-owned list state, service-backed loading, and route-owned detail selection.`,
      topology,
      null,
      routedSearchableDataTablePreferences(model.tableFeatureProfile),
    ),
    routedSearchableDataTablePreconditions(),
    routedSearchableDataTablePlanSteps(model, topology),
    topology,
    routedSearchableDataTableSourcePlan(model),
  );
}

function routedSearchableDataTablePreferences(
  featureProfile: SearchableDataTableFeatureProfile,
): readonly AuthoringPreference[] {
  return [
    ...searchableDataTablePreferences(featureProfile),
    new AuthoringPreference('component-interface', 'scalar-id-inputs'),
    new AuthoringPreference('template-model-access', 'meaningful-viewmodel-adaptation'),
    new AuthoringPreference('navigation-ownership', 'static-route-config'),
    new AuthoringPreference('navigation-ownership', 'decorator-route-config'),
    new AuthoringPreference('navigation-ownership', 'child-routes-property-route-config'),
    new AuthoringPreference('navigation-ownership', 'viewport-layout-navigation'),
    new AuthoringPreference('state-ownership', 'route-parameter-selected-state'),
  ];
}

function normalizeRoutedSearchableDataTableRecipe(
  request: RoutedSearchableDataTableRecipeRequest,
): RoutedSearchableDataTableRecipeModel {
  const hasTableDomainOverride = request.tableEntityName != null || request.tableCollectionName != null;
  const tableDomain = hasTableDomainOverride
    ? searchableDataTableDomainNamesFromParameters(request.tableEntityName ?? 'Item', request.tableCollectionName)
    : defaultSearchableDataTableDomainNames();
  const tableFieldSchema = searchableDataTableFieldSchemaFromParameter(request.tableFields, request.tableOptions)
    ?? (hasTableDomainOverride ? minimalSearchableDataTableFieldSchema() : defaultSearchableDataTableFieldSchema());
  const domainModelStem = tableDomain.entityKebabName;
  const tableEntityStem = tableDomain.entityKebabName;
  const tableClassStem = tableDomain.entityClassName;
  const detailRouteParameterName = request.detailRouteParameterName ?? `${tableDomain.entityVariableName}Id`;
  const detailRouteParameterValue = request.detailRouteParameterValue ?? '1';
  const detailRouteQueryRefName = request.detailRouteQueryRefName ?? 'ref';
  const detailRouteQueryRefValue = request.detailRouteQueryRefValue ?? 'toolbar';
  const detailRouteFragment = request.detailRouteFragment ?? 'detail';
  const listRoutePath = request.listRoutePath ?? tableDomain.collectionKebabName;
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootStylePath: request.rootStylePath ?? 'src/app.css',
    rootComponentClassName: request.rootComponentClassName ?? 'App',
    rootElementName: request.rootElementName ?? 'app-root',
    modelPath: request.modelPath ?? `src/models/${domainModelStem}.ts`,
    statePath: request.statePath ?? `src/state/${tableEntityStem}-table-state.ts`,
    stateClassName: request.stateClassName ?? `${tableClassStem}TableState`,
    filterStateClassName: request.filterStateClassName ?? 'TableFilterState',
    sortStateClassName: request.sortStateClassName ?? 'TableSortState',
    paginationStateClassName: request.paginationStateClassName ?? 'TablePaginationState',
    selectionStateClassName: request.selectionStateClassName ?? 'TableSelectionState',
    servicePath: request.servicePath ?? `src/services/${tableEntityStem}-service.ts`,
    serviceClassName: request.serviceClassName ?? `${tableClassStem}Service`,
    tableComponentPath: request.tableComponentPath ?? `src/components/${tableEntityStem}-table.ts`,
    tableTemplatePath: request.tableTemplatePath ?? `src/components/${tableEntityStem}-table.html`,
    tableClassName: request.tableClassName ?? `${tableClassStem}Table`,
    tableElementName: request.tableElementName ?? `${tableEntityStem}-table`,
    tableDomain,
    tableFieldSchema,
    tableFeatureProfile: hasTableDomainOverride
      ? starterSearchableDataTableFeatureProfile(tableFieldSchema)
      : referenceSearchableDataTableFeatureProfile(tableFieldSchema),
    tableRouteComponentPath: request.tableRouteComponentPath ?? `src/routes/${tableEntityStem}-list-route.ts`,
    tableRouteTemplatePath: request.tableRouteTemplatePath ?? `src/routes/${tableEntityStem}-list-route.html`,
    tableRouteComponentClassName: request.tableRouteComponentClassName ?? `${tableClassStem}ListRoute`,
    tableRouteElementName: request.tableRouteElementName ?? `${tableEntityStem}-list-route`,
    listRouteId: request.listRouteId ?? listRoutePath,
    listRoutePath,
    listRouteTitle: request.listRouteTitle ?? tableDomain.collectionTitle,
    detailRouteId: request.detailRouteId ?? `${tableEntityStem}-detail`,
    detailRoutePath: request.detailRoutePath ?? `${listRoutePath}/:${detailRouteParameterName}`,
    detailRouteNavigationPath: request.detailRouteNavigationPath
      ?? `${listRoutePath}/${detailRouteParameterValue}?${detailRouteQueryRefName}=${detailRouteQueryRefValue}#${detailRouteFragment}`,
    detailRouteParameterName,
    detailRouteParameterValue,
    detailRouteQueryRefName,
    detailRouteQueryRefValue,
    detailRouteFragment,
    routeViewportName: request.routeViewportName ?? 'main',
    detailRouteComponentPath: request.detailRouteComponentPath ?? `src/routes/${tableEntityStem}-detail-route.ts`,
    detailRouteTemplatePath: request.detailRouteTemplatePath ?? `src/routes/${tableEntityStem}-detail-route.html`,
    detailRouteComponentClassName: request.detailRouteComponentClassName ?? `${tableClassStem}DetailRoute`,
    detailRouteElementName: request.detailRouteElementName ?? `${tableEntityStem}-detail-route`,
  };
}

function routedSearchableDataTablePreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia runtime-html, router, and TypeScript module resolution are available.'),
  ];
}

function routedSearchableDataTablePlanSteps(
  model: RoutedSearchableDataTableRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      ...(searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
        ? [model.rootStylePath]
        : []),
      model.modelPath,
      model.statePath,
      model.servicePath,
      model.tableRouteComponentPath,
      model.tableRouteTemplatePath,
      model.detailRouteComponentPath,
      model.detailRouteTemplatePath,
      model.tableComponentPath,
      model.tableTemplatePath,
    ]),
    domainModelPlanStep(model.modelPath, model.tableDomain.entityClassName),
    configurePluginPlanStep(
      'RouterConfiguration',
      '@aurelia/router',
      [
        ExpectedSemanticEffect.discriminatorFact('Router should expose routed data-table facts after reopen.', 'route', 'route', 'router'),
        routeProductSignatureEffect('Routed data-table router options should be visible after RouterConfiguration is registered.', 'router-options'),
        ExpectedSemanticEffect.signatureFact('Routed data-table router options should configure low-boilerplate active link styling.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'router-options'),
          new ExpectedSemanticEffectFilter('activeClass', 'active-route'),
        ]),
      ],
    ),
    stateModelPlanStep(
      model.statePath,
      model.stateClassName,
      dataTableStatePlanStepExpectedEffects(dataTableDomainExpectedEffectOptions(model)),
    ),
    servicePlanStep(
      model.servicePath,
      model.serviceClassName,
      dataTableServicePlanStepExpectedEffects(model),
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    ...(searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
      ? [componentStyleAssetPlanStep(model.rootStylePath)]
      : []),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    routePlanStep(
      model.listRoutePath,
      model.tableRouteComponentClassName,
      [
        ExpectedSemanticEffect.discriminatorFact('Routed data-table list route config should be visible.', 'route', 'route', 'route'),
        routeProductDiscriminatorEffect('Routed data-table route config should be visible as a source-backed router product.', 'route-config'),
        routeConfigViewportEffect('Routed data-table list route should target the main viewport.', model.routeViewportName),
      ],
    ),
    componentPlanStep(model.tableRouteComponentPath, model.tableRouteComponentClassName, model.tableRouteElementName, 'Routed data-table list route', 'route'),
    externalTemplatePlanStep(model.tableRouteTemplatePath, model.tableRouteComponentClassName, 'Data-table list route'),
    routePlanStep(
      model.detailRoutePath,
      model.detailRouteComponentClassName,
      routedDataTableRouteExpectedEffects(model),
    ),
    componentPlanStep(model.detailRouteComponentPath, model.detailRouteComponentClassName, model.detailRouteElementName, 'Routed data-table detail route', 'route'),
    externalTemplatePlanStep(model.detailRouteTemplatePath, model.detailRouteComponentClassName, 'Data-table detail route'),
    componentPlanStep(
      model.tableComponentPath,
      model.tableClassName,
      model.tableElementName,
      'Routed searchable data table',
      'component',
    ),
    externalTemplatePlanStep(model.tableTemplatePath, model.tableClassName, 'Routed searchable data table component'),
    templateBindingPlanStep(
      model.tableTemplatePath,
      dataTableControlsPlanStepSummary(model.tableFeatureProfile, 'data-driven detail links'),
      dataTableControlsExpectedEffects('Routed data table controls', model.tableFeatureProfile),
    ),
    templateBindingPlanStep(
      model.tableTemplatePath,
      routedSearchableDataTableListPlanStepSummary(model.tableFeatureProfile),
      dataTableListExpectedEffects('Routed data table list', dataTableDomainExpectedEffectOptions(model)),
    ),
    verifyAppPlanStep(topology, routedSearchableDataTableExpectedEffects(model)),
  ];
}

function routedSearchableDataTableListPlanStepSummary(
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  const parts = [
    'repeat.for list rendering',
    'keyed rows',
    ...(featureProfile.hasTableStyleBindings ? ['class/style channels'] : []),
    'source-backed getter reads',
    'detail navigation links',
  ];
  return parts.join(', ');
}

function routedSearchableDataTableTopology(model: RoutedSearchableDataTableRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const table = addRoutedSearchableTableComponent(builder, model);
  const list = addRoutedSearchableTableListRoute(builder, model, table);
  const detail = addRoutedSearchableTableDetailRoute(builder, model);
  const root = addRoutedSearchableTableRoot(builder, model, list, detail);
  addRoutedSearchableTableState(builder, model);
  addRoutedSearchableTableService(builder, model);
  addRoutedSearchableTableListRouteConfig(builder, model, list);
  addRoutedSearchableTableDetailRouteConfig(builder, model, detail);
  addRoutedSearchableTableEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addRoutedSearchableTableRoot(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
  list: ApplicationComponentTopologyResult,
  detail: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.rootComponentClassName,
    referenceFromPath: model.entrypointPath,
    sourcePath: model.rootComponentPath,
    elementName: model.rootElementName,
    templatePath: model.rootTemplatePath,
    styles: searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)
      ? [{
        path: model.rootStylePath,
        assetKind: 'component-stylesheet',
        sourceKind: 'css-import',
      }]
      : [],
    dependencies: [list.reference, detail.reference],
  });
}

function addRoutedSearchableTableListRoute(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
  table: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.tableRouteComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.tableRouteComponentPath,
    elementName: model.tableRouteElementName,
    templatePath: model.tableRouteTemplatePath,
    dependencies: [table.reference],
  });
}

function addRoutedSearchableTableDetailRoute(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.detailRouteComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.detailRouteComponentPath,
    elementName: model.detailRouteElementName,
    templatePath: model.detailRouteTemplatePath,
  });
}

function addRoutedSearchableTableComponent(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.tableClassName,
    referenceFromPath: model.tableRouteComponentPath,
    sourcePath: model.tableComponentPath,
    elementName: model.tableElementName,
    templatePath: model.tableTemplatePath,
  });
}

function addRoutedSearchableTableState(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addRoutedSearchableTableService(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
): void {
  builder.service({
    className: model.serviceClassName,
    sourcePath: model.servicePath,
    role: 'service-source',
  });
}

function addRoutedSearchableTableListRouteConfig(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
  route: ApplicationComponentTopologyResult,
): void {
  builder.route({
    path: model.listRoutePath,
    component: route.reference,
    title: model.listRouteTitle,
  });
}

function addRoutedSearchableTableDetailRouteConfig(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
  route: ApplicationComponentTopologyResult,
): void {
  builder.route({
    path: model.detailRoutePath,
    component: route.reference,
    title: `${model.tableDomain.entityTitle} detail`,
  });
}

function addRoutedSearchableTableEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: RoutedSearchableDataTableRecipeModel,
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

function routedDataTableRouteExpectedEffects(
  model: RoutedSearchableDataTableRecipeModel,
): readonly ExpectedSemanticEffect[] {
  return [
    routeConfigObjectLiteralEffect('Routed data-table route config should close as an authored decorator object.', 'route-decorator'),
    routeConfigObjectLiteralEffect('Routed data-table nested route config should close as child route objects.', 'child-routes-property'),
    routePatternParameterEffect(`Routed data-table detail route pattern should expose ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeEndpointParameterEffect(`Routed data-table detail endpoint should carry ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeContextParameterReadEffect(`Routed data-table detail route-context read should align to ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeRecognizedParameterValueEffect(`Routed data-table static detail link should recognize the concrete ${model.detailRouteParameterName}.`, model.detailRouteParameterName, model.detailRouteParameterValue),
    routeRecognizedDynamicParameterEffect(`Routed data-table row links should recognize data-driven ${model.detailRouteParameterName} values.`, model.detailRouteParameterName),
    viewportInstructionTreeQueryParamEffect('Routed data-table viewport instruction tree should carry the source query value.', model.detailRouteQueryRefName, model.detailRouteQueryRefValue),
    viewportInstructionTreeFragmentEffect('Routed data-table viewport instruction tree should carry the route fragment.', model.detailRouteFragment),
    routeConfigViewportEffect('Routed data-table detail route should target the main viewport.', model.routeViewportName),
    routerViewportNameEffect('Routed data-table root template should expose the main viewport.', model.routeViewportName),
    ...navigationOwnershipTasteEffects('Authoring orientation'),
  ];
}

function routedSearchableDataTableExpectedEffects(
  model: RoutedSearchableDataTableRecipeModel,
): readonly ExpectedSemanticEffect[] {
  return [
    ...dataTableAppExpectedEffects({
      summaryPrefix: 'Routed searchable data table',
      componentCount: 4,
      componentCountSummary: 'root, list route, detail route, and data-table custom elements',
      externalTemplateCount: 4,
      compiledTemplateCount: 4,
      ...dataTableDomainExpectedEffectOptions(model),
    }),
    ExpectedSemanticEffect.discriminatorFact('Routed searchable data table has route/router topology facts.', 'route', 'route', 'route'),
    routeProductDiscriminatorEffect('Routed searchable data table has source-backed RouteConfig products.', 'route-config'),
    routeProductSignatureEffect('Routed searchable data table has router options.', 'router-options'),
    routeProductSignatureEffect('Routed searchable data table has route-context topology products.', 'route-context'),
    routeProductSignatureEffect('Routed searchable data table has au-viewport products.', 'router-viewport'),
    routeProductSignatureEffect('Routed searchable data table has ViewportAgent products.', 'viewport-agent'),
    routeProductSignatureEffect('Routed searchable data table has route-recognizer pattern products.', 'route-pattern'),
    routePatternParameterEffect(`Routed searchable data table has a route pattern with ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeProductSignatureEffect('Routed searchable data table has route-recognizer endpoint products.', 'route-endpoint'),
    routeEndpointParameterEffect(`Routed searchable data table has a route endpoint with ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeContextParameterReadEffect(`Routed searchable data table has a route-context parameter read with ${model.detailRouteParameterName}.`, model.detailRouteParameterName),
    routeProductSignatureEffect('Routed searchable data table has route-recognizer state products.', 'route-recognizer-state'),
    routeProductSignatureEffect('Routed searchable data table has TypedNavigationInstruction products.', 'typed-navigation-instruction'),
    routeProductSignatureEffect('Routed searchable data table has ViewportInstruction products.', 'viewport-instruction'),
    routeProductSignatureEffect('Routed searchable data table has ViewportInstructionTree products.', 'viewport-instruction-tree'),
    routeProductSignatureEffect('Routed searchable data table has RecognizedRoute products.', 'recognized-route'),
    routeRecognizedParameterValueEffect(`Routed searchable data table recognizes the concrete ${model.detailRouteParameterName}.`, model.detailRouteParameterName, model.detailRouteParameterValue),
    routeRecognizedDynamicParameterEffect(`Routed searchable data table recognizes data-driven row link ${model.detailRouteParameterName} values.`, model.detailRouteParameterName),
    viewportInstructionTreeQueryParamEffect('Routed searchable data table viewport instruction tree carries the source query value.', model.detailRouteQueryRefName, model.detailRouteQueryRefValue),
    viewportInstructionTreeFragmentEffect('Routed searchable data table viewport instruction tree carries the route fragment.', model.detailRouteFragment),
    routeProductSignatureEffect('Routed searchable data table has RouteTree products.', 'route-tree'),
    routeProductSignatureEffect('Routed searchable data table has RouteNode products.', 'route-node'),
    routeProductSignatureEffect('Routed searchable data table has ComponentAgent handoff products.', 'component-agent'),
    routeConfigViewportEffect('Routed searchable data table list route targets the named viewport.', model.routeViewportName),
    routeConfigViewportEffect('Routed searchable data table detail route targets the named viewport.', model.routeViewportName),
    routerViewportNameEffect('Routed searchable data table has the named router viewport.', model.routeViewportName),
    routeConfigObjectLiteralEffect('Routed searchable data table has a decorator object route config.', 'route-decorator'),
    routeConfigObjectLiteralEffect('Routed searchable data table has child route object config.', 'child-routes-property'),
    ExpectedSemanticEffect.discriminatorFact('Routed searchable data table has routed-component roles.', 'component-role', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'routed-component'),
    ]),
    ExpectedSemanticEffect.discriminatorCapability('Routed searchable data table exposes verifiable router authoring for the modeled list/detail topology.', 'router', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste('Routed searchable data table reports route parameter selected state.', 'state-ownership', 'route-parameter-selected-state', 'route'),
    ...navigationOwnershipTasteEffects('Routed searchable data table'),
  ];
}
