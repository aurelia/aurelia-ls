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
} from './expected-effect.js';
import { AuthoringPreference } from './ontology.js';
import {
  catalogAppExpectedEffects,
  catalogAvailabilityTemplateExpectedEffects,
  catalogListTemplateExpectedEffects,
  catalogServicePlanStepExpectedEffects,
  catalogStatePlanStepExpectedEffects,
  catalogStatusTemplateExpectedEffects,
} from './catalog-storefront-expected-effects.js';
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
import {
  catalogStorefrontDomainNamesFromParameters,
  catalogStorefrontSourcePlan,
  defaultCatalogStorefrontDomainNames,
  type CatalogStorefrontDomainNames,
} from './catalog-storefront-source-plan.js';
import {
  defaultCatalogStorefrontFieldSchema,
  minimalCatalogStorefrontFieldSchema,
  catalogStorefrontFieldFeatureProfile,
  catalogStorefrontFieldSchemaFromParameter,
  catalogStorefrontUsesReferencePresentation,
  type CatalogStorefrontFieldSchema,
} from './catalog-storefront-field-schema.js';

export interface CatalogStorefrontRecipeRequest {
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
  readonly catalogEntityName?: string;
  readonly catalogCollectionName?: string;
  readonly catalogFields?: string;
  readonly catalogOptions?: string;
}

interface CatalogStorefrontRecipeModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly catalogDomain: CatalogStorefrontDomainNames;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly modelPath: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly collectionStateClassName: string;
  readonly selectionStateClassName: string;
  readonly servicePath: string;
  readonly serviceClassName: string;
  readonly listComponentPath: string;
  readonly listTemplatePath: string;
  readonly listClassName: string;
  readonly listElementName: string;
  readonly cardComponentPath: string;
  readonly cardTemplatePath: string;
  readonly cardClassName: string;
  readonly cardElementName: string;
  readonly catalogFieldSchema: CatalogStorefrontFieldSchema;
}

export function buildCatalogStorefrontPlan(request: CatalogStorefrontRecipeRequest): AuthoringPlan {
  const model = normalizeCatalogStorefrontRecipe(request);
  const topology = catalogStorefrontTopology(model);
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);

  return new AuthoringPlan(
    new AuthoringIntent(
      useReferencePresentation
        ? `Create ${model.appName} as an Aurelia catalog app with DI-owned composed state, a service boundary, and local object component boundaries.`
        : `Create ${model.appName} as an Aurelia catalog app with DI-owned composed state, a service boundary, and a direct searchable list.`,
      topology,
      null,
      catalogStorefrontPreferences(useReferencePresentation),
    ),
    catalogStorefrontPreconditions(),
    catalogStorefrontPlanSteps(model, topology),
    topology,
    catalogStorefrontSourcePlan(model),
  );
}

export function catalogStorefrontPreferences(useReferencePresentation: boolean): readonly AuthoringPreference[] {
  return [
    new AuthoringPreference('state-ownership', 'di-owned-state-class'),
    new AuthoringPreference('state-ownership', 'di-owned-service-layer'),
    new AuthoringPreference('template-model-access', 'direct-state-domain-template-binding'),
    new AuthoringPreference('template-model-access', 'source-backed-getter-observation'),
    new AuthoringPreference('template-source-ownership', 'external-template-file'),
    new AuthoringPreference('template-rendering-boundary', 'template-controller-composition'),
    ...(useReferencePresentation
      ? [
        new AuthoringPreference('component-interface', 'object-inputs'),
        new AuthoringPreference('template-model-access', 'meaningful-viewmodel-adaptation'),
        new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
        new AuthoringPreference('style-binding-model', 'class-token-binding'),
      ]
      : []),
    new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
  ];
}

function normalizeCatalogStorefrontRecipe(request: CatalogStorefrontRecipeRequest): CatalogStorefrontRecipeModel {
  const hasCatalogDomainOverride = request.catalogEntityName != null || request.catalogCollectionName != null;
  const catalogDomain = hasCatalogDomainOverride
    ? catalogStorefrontDomainNamesFromParameters(request.catalogEntityName ?? 'Item', request.catalogCollectionName)
    : defaultCatalogStorefrontDomainNames();
  const entityStem = catalogDomain.entityKebabName;
  const entityClassStem = catalogDomain.entityClassName;
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    catalogDomain,
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
    listComponentPath: request.listComponentPath ?? `src/components/${entityStem}-list.ts`,
    listTemplatePath: request.listTemplatePath ?? `src/components/${entityStem}-list.html`,
    listClassName: request.listClassName ?? `${entityClassStem}List`,
    listElementName: request.listElementName ?? `${entityStem}-list`,
    cardComponentPath: request.cardComponentPath ?? `src/components/${entityStem}-card.ts`,
    cardTemplatePath: request.cardTemplatePath ?? `src/components/${entityStem}-card.html`,
    cardClassName: request.cardClassName ?? `${entityClassStem}Card`,
    cardElementName: request.cardElementName ?? `${entityStem}-card`,
    catalogFieldSchema: catalogStorefrontFieldSchemaFromParameter(request.catalogFields, request.catalogOptions)
      ?? (hasCatalogDomainOverride ? minimalCatalogStorefrontFieldSchema() : defaultCatalogStorefrontFieldSchema()),
  };
}

function catalogStorefrontPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
  ];
}

function catalogStorefrontPlanSteps(
  model: CatalogStorefrontRecipeModel,
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
      ...(useReferencePresentation ? [model.cardComponentPath, model.cardTemplatePath] : []),
    ]),
    domainModelPlanStep(model.modelPath, model.catalogDomain.entityClassName),
    stateModelPlanStep(
      model.statePath,
      model.stateClassName,
      catalogStatePlanStepExpectedEffects({
        summaryPrefix: 'Catalog',
        stateClassName: model.stateClassName,
        domain: model.catalogDomain,
        composedStateCount: useReferencePresentation ? 2 : 1,
      }),
    ),
    servicePlanStep(
      model.servicePath,
      model.serviceClassName,
      catalogServicePlanStepExpectedEffects({
        summaryPrefix: 'Catalog',
        serviceClassName: model.serviceClassName,
      }),
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    ...(useReferencePresentation ? [componentStyleAssetPlanStep(model.rootStylePath)] : []),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    ...(useReferencePresentation
      ? [templateBindingPlanStep(
        model.rootTemplatePath,
        'promise controller with pending, fulfilled, and rejected branches',
        catalogStorefrontPromiseExpectedEffects(),
      )]
      : []),
    componentPlanStep(model.listComponentPath, model.listClassName, model.listElementName, `${model.catalogDomain.entityTitle} list`),
    externalTemplatePlanStep(model.listTemplatePath, model.listClassName, `${model.catalogDomain.entityTitle} list component`),
    ...(useReferencePresentation
      ? [
        componentPlanStep(
          model.cardComponentPath,
          model.cardClassName,
          model.cardElementName,
          `${model.catalogDomain.entityTitle} card`,
          'component',
          [
            ExpectedSemanticEffect.signatureTaste(`${model.catalogDomain.entityTitle} card should expose object-shaped input for local typed handoff.`, 'component-interface', 'object-inputs', 'component'),
          ],
        ),
        externalTemplatePlanStep(model.cardTemplatePath, model.cardClassName, `${model.catalogDomain.entityTitle} card component`),
      ]
      : []),
    templateBindingPlanStep(
      model.listTemplatePath,
      useReferencePresentation
        ? `repeat.for list rendering and local ${model.catalogDomain.entityClassName} object handoff into ${model.cardElementName}`
        : `repeat.for list rendering over direct ${model.catalogDomain.entityClassName} template locals`,
      catalogStorefrontTemplateBindingExpectedEffects(model),
    ),
    ...(featureProfile.hasAvailabilitySwitch
      ? [templateBindingPlanStep(
        model.cardTemplatePath,
        'switch controller for stock availability states',
        catalogStorefrontSwitchExpectedEffects(model),
      )]
      : []),
    verifyAppPlanStep(topology, catalogStorefrontExpectedEffects(model)),
  ];
}

function catalogStorefrontTopology(model: CatalogStorefrontRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const card = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema)
    ? addCatalogCard(builder, model)
    : null;
  const list = addCatalogList(builder, model, card);
  const root = addCatalogRoot(builder, model, list);
  addCatalogState(builder, model);
  addCatalogService(builder, model);
  addCatalogEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addCatalogCard(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.cardClassName,
    referenceFromPath: model.listComponentPath,
    sourcePath: model.cardComponentPath,
    elementName: model.cardElementName,
    templatePath: model.cardTemplatePath,
  });
}

function addCatalogList(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
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

function addCatalogRoot(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
  list: ApplicationComponentTopologyResult,
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
    dependencies: [list.reference],
  });
}

function addCatalogState(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addCatalogService(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
): void {
  builder.service({
    className: model.serviceClassName,
    sourcePath: model.servicePath,
    role: 'service-source',
  });
}

function addCatalogEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
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

function catalogStorefrontTemplateBindingExpectedEffects(model?: CatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  const useReferencePresentation = model == null
    || catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return catalogListTemplateExpectedEffects({
    summaryPrefix: 'Catalog list',
    domain: model?.catalogDomain,
    fieldSchema: model?.catalogFieldSchema,
    includeLocalObjectBinding: useReferencePresentation,
    includeReferencePresentation: useReferencePresentation,
  });
}

function catalogStorefrontPromiseExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return catalogStatusTemplateExpectedEffects('Catalog');
}

function catalogStorefrontSwitchExpectedEffects(model: CatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  return catalogAvailabilityTemplateExpectedEffects('Catalog', model.catalogFieldSchema);
}

function catalogStorefrontExpectedEffects(model: CatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  const useReferencePresentation = catalogStorefrontUsesReferencePresentation(model.catalogFieldSchema);
  return catalogAppExpectedEffects({
    summaryPrefix: 'Catalog storefront',
    componentCount: useReferencePresentation ? 3 : 2,
    componentCountSummary: useReferencePresentation ? 'root, list, and card custom elements' : 'root and list custom elements',
    externalTemplateCount: useReferencePresentation ? 3 : 2,
    compiledTemplateCount: useReferencePresentation ? 3 : 2,
    stateClassName: model.stateClassName,
    serviceClassName: model.serviceClassName,
    cardClassName: model.cardClassName,
    cardElementName: model.cardElementName,
    domain: model.catalogDomain,
    fieldSchema: model.catalogFieldSchema,
    includeListRendererRole: true,
    includeEventSurfaceRole: true,
    includeCollectionKeyDependency: true,
    includeSelectionCountGetter: useReferencePresentation,
    includeComponentStylesheet: useReferencePresentation,
    includeLocalObjectBinding: useReferencePresentation,
    includeReferencePresentation: useReferencePresentation,
    includeStatusPromise: useReferencePresentation,
    composedStateCount: useReferencePresentation ? 2 : 1,
  });
}
