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
  componentPlanStep,
  componentStyleAssetPlanStep,
  domainModelPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  servicePlanStep,
  stateModelPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import { searchableDataTableSourcePlan } from './searchable-data-table-source-plan.js';
import {
  defaultSearchableDataTableDomainNames,
  searchableDataTableDomainNamesFromParameters,
  type SearchableDataTableDomainNames,
} from './searchable-data-table-source-plan.js';
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

export interface SearchableDataTableRecipeRequest {
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
}

interface SearchableDataTableRecipeModel {
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

export function buildSearchableDataTablePlan(request: SearchableDataTableRecipeRequest): AuthoringPlan {
  const model = normalizeSearchableDataTableRecipe(request);
  const topology = searchableDataTableTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as an Aurelia data table with DI-owned state, service-backed loading, and direct state/domain template bindings.`,
      topology,
      null,
      searchableDataTablePreferences(model.tableFeatureProfile),
    ),
    searchableDataTablePreconditions(),
    searchableDataTablePlanSteps(model, topology),
    topology,
    searchableDataTableSourcePlan(model),
  );
}

function normalizeSearchableDataTableRecipe(
  request: SearchableDataTableRecipeRequest,
): SearchableDataTableRecipeModel {
  const hasTableDomainOverride = request.tableEntityName != null || request.tableCollectionName != null;
  const tableDomain = hasTableDomainOverride
    ? searchableDataTableDomainNamesFromParameters(request.tableEntityName ?? 'Item', request.tableCollectionName)
    : defaultSearchableDataTableDomainNames();
  const tableFieldSchema = searchableDataTableFieldSchemaFromParameter(request.tableFields, request.tableOptions)
    ?? (hasTableDomainOverride ? minimalSearchableDataTableFieldSchema() : defaultSearchableDataTableFieldSchema());
  const domainModelStem = tableDomain.entityKebabName;
  const tableEntityStem = tableDomain.entityKebabName;
  const tableClassStem = tableDomain.entityClassName;
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
  };
}

function searchableDataTablePreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
  ];
}

export function searchableDataTablePreferences(
  featureProfile: SearchableDataTableFeatureProfile,
): readonly AuthoringPreference[] {
  return [
    new AuthoringPreference('state-ownership', 'di-owned-state-class'),
    new AuthoringPreference('state-ownership', 'di-owned-service-layer'),
    new AuthoringPreference('component-interface', 'no-public-component-interface'),
    new AuthoringPreference('template-model-access', 'direct-state-domain-template-binding'),
    new AuthoringPreference('template-model-access', 'source-backed-getter-observation'),
    new AuthoringPreference('template-source-ownership', 'external-template-file'),
    new AuthoringPreference('template-rendering-boundary', 'template-controller-composition'),
    new AuthoringPreference('form-value-channel', 'native-control-value-binding'),
    ...(featureProfile.hasCheckedSelectionChannel
      ? [new AuthoringPreference('form-value-channel', 'checked-model-binding')]
      : []),
    ...(featureProfile.hasFacetFilters
      ? [new AuthoringPreference('form-value-channel', 'select-model-binding')]
      : []),
    ...(searchableDataTableUsesReferencePresentation(featureProfile)
      ? [new AuthoringPreference('style-resource-ownership', 'component-stylesheet')]
      : []),
    ...(featureProfile.hasTableStyleBindings
      ? [
        new AuthoringPreference('style-binding-model', 'class-token-binding'),
        new AuthoringPreference('style-binding-model', 'class-toggle-binding'),
      ]
      : []),
    new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
  ];
}

function searchableDataTablePlanSteps(
  model: SearchableDataTableRecipeModel,
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
      model.tableComponentPath,
      model.tableTemplatePath,
    ]),
    domainModelPlanStep(model.modelPath, model.tableDomain.entityClassName),
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
    componentPlanStep(
      model.tableComponentPath,
      model.tableClassName,
      model.tableElementName,
      'Searchable data table',
      'component',
    ),
    externalTemplatePlanStep(model.tableTemplatePath, model.tableClassName, 'Searchable data table component'),
    templateBindingPlanStep(
      model.tableTemplatePath,
      dataTableControlsPlanStepSummary(model.tableFeatureProfile),
      dataTableControlsExpectedEffects('Data table controls', model.tableFeatureProfile),
    ),
    templateBindingPlanStep(
      model.tableTemplatePath,
      searchableDataTableListPlanStepSummary(model.tableFeatureProfile),
      dataTableListExpectedEffects('Data table list', dataTableDomainExpectedEffectOptions(model)),
    ),
    verifyAppPlanStep(topology, searchableDataTableExpectedEffects(model)),
  ];
}

function searchableDataTableListPlanStepSummary(
  featureProfile: SearchableDataTableFeatureProfile,
): string {
  const parts = [
    'repeat.for list rendering',
    'keyed rows',
    ...(featureProfile.hasTableStyleBindings ? ['class/style channels'] : []),
    'source-backed getter reads',
  ];
  return parts.length < 3
    ? parts.join(' and ')
    : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function searchableDataTableTopology(model: SearchableDataTableRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const table = addSearchableDataTableComponent(builder, model);
  const root = addSearchableDataTableRoot(builder, model, table);
  addSearchableDataTableState(builder, model);
  addSearchableDataTableService(builder, model);
  addSearchableDataTableEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addSearchableDataTableComponent(
  builder: ApplicationTopologyBuilder,
  model: SearchableDataTableRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.tableClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.tableComponentPath,
    elementName: model.tableElementName,
    templatePath: model.tableTemplatePath,
  });
}

function addSearchableDataTableRoot(
  builder: ApplicationTopologyBuilder,
  model: SearchableDataTableRecipeModel,
  table: ApplicationComponentTopologyResult,
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
    dependencies: [table.reference],
  });
}

function addSearchableDataTableState(
  builder: ApplicationTopologyBuilder,
  model: SearchableDataTableRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addSearchableDataTableService(
  builder: ApplicationTopologyBuilder,
  model: SearchableDataTableRecipeModel,
): void {
  builder.service({
    className: model.serviceClassName,
    sourcePath: model.servicePath,
    role: 'service-source',
  });
}

function addSearchableDataTableEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: SearchableDataTableRecipeModel,
  root: ApplicationComponentTopologyResult,
): void {
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'Aurelia.app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
}

function searchableDataTableExpectedEffects(
  model: SearchableDataTableRecipeModel,
): readonly import('./expected-effect.js').ExpectedSemanticEffect[] {
  return dataTableAppExpectedEffects({
    summaryPrefix: 'Searchable data table',
    componentCount: 2,
    externalTemplateCount: 2,
    compiledTemplateCount: 2,
    ...dataTableDomainExpectedEffectOptions(model),
  });
}
