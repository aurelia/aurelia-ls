import {
  type ApplicationComponentTopologyResult,
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  CreateComponentOperation,
  CreateServiceOperation,
  CreateStateModelOperation,
} from './operation.js';
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
  classToggleDataFlowEffect,
  classToggleStyleTasteEffect,
  classToggleTargetAccessEffect,
  classToggleValueChannelEffect,
  classTokenStyleTasteEffect,
  classTokenInterpolationDataFlowEffect,
  classTokenTargetAccessEffect,
  classTokenValueChannelEffect,
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
  stylePropertyDataFlowEffect,
  stylePropertyStyleTasteEffect,
  stylePropertyTargetAccessEffect,
  stylePropertyValueChannelEffect,
  styleRuleInterpolationDataFlowEffect,
  styleRuleStyleTasteEffect,
  styleRuleTargetAccessEffect,
  styleRuleValueChannelEffect,
} from './form-expected-effects.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  promiseTemplateControllerRuntimeEffects,
  switchTemplateControllerRuntimeEffects,
  syntheticViewRuntimeEffect,
  templateControllerRuntimeEffect,
} from './template-controller-expected-effects.js';
import {
  componentStyleAssetPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './form-recipe-plan-steps.js';
import { catalogStorefrontSourcePlan } from './catalog-storefront-source-plan.js';

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
  readonly productModelPath?: string;
  readonly statePath?: string;
  readonly stateClassName?: string;
  readonly productCollectionStateClassName?: string;
  readonly cartStateClassName?: string;
  readonly servicePath?: string;
  readonly serviceClassName?: string;
  readonly productListComponentPath?: string;
  readonly productListTemplatePath?: string;
  readonly productListClassName?: string;
  readonly productListElementName?: string;
  readonly productCardComponentPath?: string;
  readonly productCardTemplatePath?: string;
  readonly productCardClassName?: string;
  readonly productCardElementName?: string;
}

interface CatalogStorefrontRecipeModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly productModelPath: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly productCollectionStateClassName: string;
  readonly cartStateClassName: string;
  readonly servicePath: string;
  readonly serviceClassName: string;
  readonly productListComponentPath: string;
  readonly productListTemplatePath: string;
  readonly productListClassName: string;
  readonly productListElementName: string;
  readonly productCardComponentPath: string;
  readonly productCardTemplatePath: string;
  readonly productCardClassName: string;
  readonly productCardElementName: string;
}

export function buildCatalogStorefrontPlan(request: CatalogStorefrontRecipeRequest): AuthoringPlan {
  const model = normalizeCatalogStorefrontRecipe(request);
  const topology = catalogStorefrontTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as an Aurelia catalog app with DI-owned composed state, a service boundary, and ID-based components.`,
      topology,
      null,
      [
        new AuthoringPreference('state-ownership', 'di-owned-state-class'),
        new AuthoringPreference('state-ownership', 'di-owned-service-layer'),
        new AuthoringPreference('component-interface', 'scalar-id-inputs'),
        new AuthoringPreference('template-source-ownership', 'external-template-file'),
        new AuthoringPreference('template-rendering-boundary', 'template-controller-composition'),
        new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
        new AuthoringPreference('style-binding-model', 'class-token-binding'),
        new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
      ],
    ),
    catalogStorefrontPreconditions(),
    catalogStorefrontPlanSteps(model, topology),
    topology,
    catalogStorefrontSourcePlan(model),
  );
}

function normalizeCatalogStorefrontRecipe(request: CatalogStorefrontRecipeRequest): CatalogStorefrontRecipeModel {
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootStylePath: request.rootStylePath ?? 'src/app.css',
    rootComponentClassName: request.rootComponentClassName ?? 'App',
    rootElementName: request.rootElementName ?? 'app-root',
    productModelPath: request.productModelPath ?? 'src/models/product.ts',
    statePath: request.statePath ?? 'src/state/catalog-state.ts',
    stateClassName: request.stateClassName ?? 'CatalogState',
    productCollectionStateClassName: request.productCollectionStateClassName ?? 'ProductCollectionState',
    cartStateClassName: request.cartStateClassName ?? 'CartState',
    servicePath: request.servicePath ?? 'src/services/product-catalog-service.ts',
    serviceClassName: request.serviceClassName ?? 'ProductCatalogService',
    productListComponentPath: request.productListComponentPath ?? 'src/components/product-list.ts',
    productListTemplatePath: request.productListTemplatePath ?? 'src/components/product-list.html',
    productListClassName: request.productListClassName ?? 'ProductList',
    productListElementName: request.productListElementName ?? 'product-list',
    productCardComponentPath: request.productCardComponentPath ?? 'src/components/product-card.ts',
    productCardTemplatePath: request.productCardTemplatePath ?? 'src/components/product-card.html',
    productCardClassName: request.productCardClassName ?? 'ProductCard',
    productCardElementName: request.productCardElementName ?? 'product-card',
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
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.rootStylePath,
      model.productModelPath,
      model.statePath,
      model.servicePath,
      model.productListComponentPath,
      model.productListTemplatePath,
      model.productCardComponentPath,
      model.productCardTemplatePath,
    ]),
    new AuthoringPlanStep(
      new CreateStateModelOperation(model.statePath, model.stateClassName),
      [
        ExpectedSemanticEffect.signatureFact('Catalog state source should be visible in app topology.', 'service-class', 'di', 'state-model', 'present', null, [
          new ExpectedSemanticEffectFilter('role', 'state-source'),
          new ExpectedSemanticEffectFilter('className', model.stateClassName),
        ]),
        ExpectedSemanticEffect.signatureAtLeast('Catalog state should expose composed state objects.', 'state-composition', 'di', 2, 'state-model', [
          new ExpectedSemanticEffectFilter('ownerClassName', model.stateClassName),
        ]),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateServiceOperation(model.servicePath, model.serviceClassName),
      [
        ExpectedSemanticEffect.discriminatorFact('Catalog service source should be visible in app topology.', 'service-class', 'di', 'service', 'present', null, [
          new ExpectedSemanticEffectFilter('role', 'service-source'),
          new ExpectedSemanticEffectFilter('className', model.serviceClassName),
        ]),
        ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
      ],
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    componentStyleAssetPlanStep(model.rootStylePath),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    templateBindingPlanStep(
      model.rootTemplatePath,
      'promise controller with pending, fulfilled, and rejected branches',
      catalogStorefrontPromiseExpectedEffects(),
    ),
    new AuthoringPlanStep(
      new CreateComponentOperation(model.productListComponentPath, model.productListClassName, model.productListElementName),
      [
        ExpectedSemanticEffect.fact('Product list should be a custom element.', 'component', 'resource', 'component'),
      ],
    ),
    externalTemplatePlanStep(model.productListTemplatePath, model.productListClassName, 'Product list component'),
    new AuthoringPlanStep(
      new CreateComponentOperation(model.productCardComponentPath, model.productCardClassName, model.productCardElementName),
      [
        ExpectedSemanticEffect.fact('Product card should be a custom element.', 'component', 'resource', 'component'),
        ExpectedSemanticEffect.signatureTaste('Product card should expose scalar ID-shaped input.', 'component-interface', 'scalar-id-inputs', 'component'),
      ],
    ),
    externalTemplatePlanStep(model.productCardTemplatePath, model.productCardClassName, 'Product card component'),
    templateBindingPlanStep(
      model.productListTemplatePath,
      'repeat.for list rendering and scalar ID handoff into product-card',
      catalogStorefrontTemplateBindingExpectedEffects(),
    ),
    templateBindingPlanStep(
      model.productCardTemplatePath,
      'switch controller for stock availability states',
      catalogStorefrontSwitchExpectedEffects(),
    ),
    verifyAppPlanStep(topology, catalogStorefrontExpectedEffects(model)),
  ];
}

function catalogStorefrontTopology(model: CatalogStorefrontRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const card = addCatalogProductCard(builder, model);
  const list = addCatalogProductList(builder, model, card);
  const root = addCatalogRoot(builder, model, list);
  addCatalogState(builder, model);
  addCatalogService(builder, model);
  addCatalogEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addCatalogProductCard(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.productCardClassName,
    referenceFromPath: model.productListComponentPath,
    sourcePath: model.productCardComponentPath,
    elementName: model.productCardElementName,
    templatePath: model.productCardTemplatePath,
  });
}

function addCatalogProductList(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
  card: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.productListClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.productListComponentPath,
    elementName: model.productListElementName,
    templatePath: model.productListTemplatePath,
    dependencies: [card.reference],
  });
}

function addCatalogRoot(
  builder: ApplicationTopologyBuilder,
  model: CatalogStorefrontRecipeModel,
  list: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.rootComponentClassName,
    referenceFromPath: model.entrypointPath,
    sourcePath: model.rootComponentPath,
    elementName: model.rootElementName,
    templatePath: model.rootTemplatePath,
    styles: [{
      path: model.rootStylePath,
      assetKind: 'component-stylesheet',
      sourceKind: 'css-import',
    }],
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
    startupLane: 'new Aurelia().register(StandardConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('@aurelia/runtime-html', ['Aurelia', 'StandardConfiguration']),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
}

function catalogStorefrontTemplateBindingExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureFact('Catalog list should expose list-renderer component role.', 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'list-renderer'),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog list should bind scalar product IDs into product-card.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('sourceName', 'productId'),
      new ExpectedSemanticEffectFilter('targetKind', 'controller-view-model'),
      new ExpectedSemanticEffectFilter('targetProperty', 'productId'),
      new ExpectedSemanticEffectFilter('targetValueType', 'string'),
    ]),
    ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize scalar ID-shaped component inputs.', 'component-interface', 'scalar-id-inputs', 'component'),
    ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize template-controller composition.', 'template-rendering-boundary', 'template-controller-composition', 'template-controller'),
    templateControllerRuntimeEffect('Catalog list should materialize repeat template-controller hydration.', 'iteration', 'many'),
    syntheticViewRuntimeEffect('Catalog list should materialize repeat synthetic-view hydration.', 'iteration', 'many'),
    classTokenStyleTasteEffect('Authoring orientation should recognize class-token style binding.'),
    classToggleStyleTasteEffect('Authoring orientation should recognize class-toggle style binding.'),
    styleRuleStyleTasteEffect('Authoring orientation should recognize style-rule binding.'),
    stylePropertyStyleTasteEffect('Authoring orientation should recognize style-property binding.'),
  ];
}

function catalogStorefrontPromiseExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return promiseTemplateControllerRuntimeEffects('Catalog status');
}

function catalogStorefrontSwitchExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return switchTemplateControllerRuntimeEffects('Catalog availability');
}

function catalogStorefrontExpectedEffects(model: CatalogStorefrontRecipeModel): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact('Catalog storefront reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Catalog storefront'),
    ExpectedSemanticEffect.fact('Catalog storefront has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Catalog storefront has root, list, and card custom elements.', 'component', 'resource', 3, 'component'),
    ExpectedSemanticEffect.fact('Catalog storefront has an app-root component role.', 'component-role', 'resource', 'app-root', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'app-root'),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog storefront has a component-composition host role.', 'component-role', 'resource', 'component', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'component-composition-host'),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog storefront has a list-renderer component role.', 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'list-renderer'),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog storefront has an event-surface component role.', 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'event-surface'),
    ]),
    ExpectedSemanticEffect.atLeast('Catalog storefront has external templates.', 'external-template', 'template', 3, 'template'),
    componentStylesheetEffect('Catalog storefront has a component stylesheet.'),
    componentStylesheetCapabilityEffect('Catalog storefront exposes verifiable style asset authoring.'),
    ExpectedSemanticEffect.atLeast('Catalog storefront has compiled template facts.', 'template-compilation', 'template', 3, 'template'),
    ExpectedSemanticEffect.fact('Catalog storefront has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    classTokenTargetAccessEffect('Catalog storefront has class interpolation target access.'),
    classTokenValueChannelEffect('Catalog storefront has class-token value channels.'),
    classTokenInterpolationDataFlowEffect('Catalog storefront has class interpolation data flow.'),
    classToggleTargetAccessEffect('Catalog storefront has class-toggle target access.'),
    classToggleValueChannelEffect('Catalog storefront has class-toggle value channels.'),
    classToggleDataFlowEffect('Catalog storefront has class-toggle data flow.'),
    styleRuleTargetAccessEffect('Catalog storefront has style interpolation target access.'),
    styleRuleValueChannelEffect('Catalog storefront has style-rule value channels.'),
    styleRuleInterpolationDataFlowEffect('Catalog storefront has style interpolation data flow.'),
    stylePropertyTargetAccessEffect('Catalog storefront has style-property target access.'),
    stylePropertyValueChannelEffect('Catalog storefront has style-property value channels.'),
    stylePropertyDataFlowEffect('Catalog storefront has style-property data flow.'),
    templateControllerRuntimeEffect('Catalog storefront has conditional template-controller rows.', 'conditional', 'optional'),
    templateControllerRuntimeEffect('Catalog storefront has else template-controller rows.', 'conditional-else', 'optional'),
    templateControllerRuntimeEffect('Catalog storefront has repeat template-controller rows.', 'iteration', 'many'),
    syntheticViewRuntimeEffect('Catalog storefront has repeat synthetic-view rows.', 'iteration', 'many'),
    ...promiseTemplateControllerRuntimeEffects('Catalog storefront has catalog-status'),
    ...switchTemplateControllerRuntimeEffects('Catalog storefront has availability'),
    ExpectedSemanticEffect.signatureFact('Catalog storefront has product-id binding data flow.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('sourceName', 'productId'),
      new ExpectedSemanticEffectFilter('targetKind', 'controller-view-model'),
      new ExpectedSemanticEffectFilter('targetProperty', 'productId'),
      new ExpectedSemanticEffectFilter('targetValueType', 'string'),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog storefront has a state service-class row.', 'service-class', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'state-source'),
      new ExpectedSemanticEffectFilter('className', model.stateClassName),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Catalog storefront has a service-layer service-class row.', 'service-class', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'service-source'),
      new ExpectedSemanticEffectFilter('className', model.serviceClassName),
    ]),
    ExpectedSemanticEffect.signatureAtLeast('Catalog storefront has composed state rows.', 'state-composition', 'di', 2, 'state-model', [
      new ExpectedSemanticEffectFilter('ownerClassName', model.stateClassName),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog components call the DI-owned state layer.', 'service-interaction', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'component-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog components read DI-owned state projections.', 'service-interaction', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'component-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'read'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Catalog state calls the injected service boundary.', 'service-interaction', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'state-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Catalog card disabled binding joins to state interaction.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingSourceRootName', 'canAdd'),
      new ExpectedSemanticEffectFilter('bindingTargetProperty', 'disabled'),
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'read'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.absent('Catalog storefront has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.capability('Catalog storefront exposes verifiable template composition.', 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste('Catalog storefront reports DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
    ExpectedSemanticEffect.discriminatorTaste('Catalog storefront reports a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
    ExpectedSemanticEffect.signatureTaste('Catalog storefront reports scalar ID component inputs.', 'component-interface', 'scalar-id-inputs', 'component'),
    ExpectedSemanticEffect.signatureTaste('Catalog storefront reports template-controller composition.', 'template-rendering-boundary', 'template-controller-composition', 'template-controller'),
    componentStylesheetTasteEffect('Catalog storefront reports component stylesheet taste.'),
    classTokenStyleTasteEffect('Catalog storefront reports class-token style binding taste.'),
    classToggleStyleTasteEffect('Catalog storefront reports class-toggle style binding taste.'),
    styleRuleStyleTasteEffect('Catalog storefront reports style-rule binding taste.'),
    stylePropertyStyleTasteEffect('Catalog storefront reports style-property binding taste.'),
  ];
}
