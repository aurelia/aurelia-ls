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
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  syntheticViewRuntimeEffect,
  templateControllerRuntimeEffect,
} from './template-controller-expected-effects.js';
import {
  componentPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  stateModelPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import { composedDashboardSourcePlan } from './composed-dashboard-source-plan.js';

export interface ComposedDashboardRecipeRequest {
  /** Project root that the authored app should occupy. */
  readonly rootDir: string;
  /** User-facing app name for plan summaries. */
  readonly appName: string;
  readonly entrypointPath?: string;
  readonly rootComponentPath?: string;
  readonly rootTemplatePath?: string;
  readonly rootComponentClassName?: string;
  readonly rootElementName?: string;
  readonly statePath?: string;
  readonly stateClassName?: string;
  readonly widgetModelName?: string;
  readonly chartWidgetPath?: string;
  readonly chartWidgetTemplatePath?: string;
  readonly chartWidgetClassName?: string;
  readonly chartWidgetElementName?: string;
  readonly inventoryWidgetPath?: string;
  readonly inventoryWidgetTemplatePath?: string;
  readonly inventoryWidgetClassName?: string;
  readonly inventoryWidgetElementName?: string;
}

interface ComposedDashboardRecipeModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly widgetModelName: string;
  readonly chartWidgetPath: string;
  readonly chartWidgetTemplatePath: string;
  readonly chartWidgetClassName: string;
  readonly chartWidgetElementName: string;
  readonly inventoryWidgetPath: string;
  readonly inventoryWidgetTemplatePath: string;
  readonly inventoryWidgetClassName: string;
  readonly inventoryWidgetElementName: string;
}

export function buildComposedDashboardPlan(request: ComposedDashboardRecipeRequest): AuthoringPlan {
  const model = normalizeComposedDashboardRecipe(request);
  const topology = composedDashboardTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as an Aurelia dashboard with DI-owned widget state and dynamic AuCompose widgets.`,
      topology,
      null,
      [
        new AuthoringPreference('state-ownership', 'di-owned-state-class'),
        new AuthoringPreference('template-model-access', 'direct-state-domain-template-binding'),
        new AuthoringPreference('template-model-access', 'source-backed-getter-observation'),
        new AuthoringPreference('template-model-access', 'meaningful-viewmodel-adaptation'),
        new AuthoringPreference('template-source-ownership', 'external-template-file'),
        new AuthoringPreference('template-rendering-boundary', 'dynamic-component-composition'),
        new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
      ],
    ),
    composedDashboardPreconditions(),
    composedDashboardPlanSteps(model, topology),
    topology,
    composedDashboardSourcePlan(model),
  );
}

function normalizeComposedDashboardRecipe(
  request: ComposedDashboardRecipeRequest,
): ComposedDashboardRecipeModel {
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootComponentClassName: request.rootComponentClassName ?? 'DashboardApp',
    rootElementName: request.rootElementName ?? 'dashboard-app',
    statePath: request.statePath ?? 'src/state/dashboard-state.ts',
    stateClassName: request.stateClassName ?? 'DashboardState',
    widgetModelName: request.widgetModelName ?? 'DashboardWidgetModel',
    chartWidgetPath: request.chartWidgetPath ?? 'src/widgets/chart-widget.ts',
    chartWidgetTemplatePath: request.chartWidgetTemplatePath ?? 'src/widgets/chart-widget.html',
    chartWidgetClassName: request.chartWidgetClassName ?? 'ChartWidget',
    chartWidgetElementName: request.chartWidgetElementName ?? 'chart-widget',
    inventoryWidgetPath: request.inventoryWidgetPath ?? 'src/widgets/inventory-widget.ts',
    inventoryWidgetTemplatePath: request.inventoryWidgetTemplatePath ?? 'src/widgets/inventory-widget.html',
    inventoryWidgetClassName: request.inventoryWidgetClassName ?? 'InventoryWidget',
    inventoryWidgetElementName: request.inventoryWidgetElementName ?? 'inventory-widget',
  };
}

function composedDashboardPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
  ];
}

function composedDashboardPlanSteps(
  model: ComposedDashboardRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.statePath,
      model.chartWidgetPath,
      model.chartWidgetTemplatePath,
      model.inventoryWidgetPath,
      model.inventoryWidgetTemplatePath,
    ]),
    stateModelPlanStep(
      model.statePath,
      model.stateClassName,
      [
        ExpectedSemanticEffect.signatureFact('Dashboard state source should be visible in app topology.', 'service-class', 'di', 'state-model', 'present', null, [
          new ExpectedSemanticEffectFilter('role', 'state-source'),
          new ExpectedSemanticEffectFilter('className', model.stateClassName),
        ]),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned dashboard state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
      ],
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Dashboard root component'),
    componentPlanStep(model.chartWidgetPath, model.chartWidgetClassName, model.chartWidgetElementName, 'Chart widget'),
    externalTemplatePlanStep(model.chartWidgetTemplatePath, model.chartWidgetClassName, 'Chart widget component'),
    componentPlanStep(model.inventoryWidgetPath, model.inventoryWidgetClassName, model.inventoryWidgetElementName, 'Inventory widget'),
    externalTemplatePlanStep(model.inventoryWidgetTemplatePath, model.inventoryWidgetClassName, 'Inventory widget component'),
    templateBindingPlanStep(
      model.rootTemplatePath,
      'repeat.for dashboard cards and AuCompose dynamic component handoff',
      composedDashboardTemplateBindingExpectedEffects(),
    ),
    verifyAppPlanStep(topology, composedDashboardExpectedEffects(model)),
  ];
}

function composedDashboardTopology(model: ComposedDashboardRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const chart = addDashboardWidget(builder, model, model.chartWidgetPath, model.chartWidgetTemplatePath, model.chartWidgetClassName, model.chartWidgetElementName);
  const inventory = addDashboardWidget(builder, model, model.inventoryWidgetPath, model.inventoryWidgetTemplatePath, model.inventoryWidgetClassName, model.inventoryWidgetElementName);
  const root = builder.component({
    className: model.rootComponentClassName,
    referenceFromPath: model.entrypointPath,
    sourcePath: model.rootComponentPath,
    elementName: model.rootElementName,
    templatePath: model.rootTemplatePath,
    dependencies: [chart.reference, inventory.reference],
  });
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'Aurelia.app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
  return builder.toTopology();
}

function addDashboardWidget(
  builder: ApplicationTopologyBuilder,
  model: ComposedDashboardRecipeModel,
  sourcePath: string,
  templatePath: string,
  className: string,
  elementName: string,
): ApplicationComponentTopologyResult {
  return builder.component({
    className,
    referenceFromPath: model.rootComponentPath,
    sourcePath,
    elementName,
    templatePath,
  });
}

function composedDashboardTemplateBindingExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureFact('Dashboard root should expose list-renderer component role.', 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'list-renderer'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Dashboard root should materialize dynamic AuCompose candidates.', 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('flushMode', 'async'),
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'type-candidate'),
      new ExpectedSemanticEffectFilter('resolvedComponentCount', 2),
      new ExpectedSemanticEffectFilter('compiledTemplateCount', 2),
      new ExpectedSemanticEffectFilter('candidateResourceAnalysisState', 'complete'),
      new ExpectedSemanticEffectFilter('candidateResourceAnalysisCount', 2),
      new ExpectedSemanticEffectFilter('activationHandoffKinds', 'model-assignable'),
    ]),
    ExpectedSemanticEffect.signatureFact('Dashboard root should materialize a closed static AuCompose child controller.', 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'static-value'),
      new ExpectedSemanticEffectFilter('staticComponentName', 'inventory-widget'),
      new ExpectedSemanticEffectFilter('composedChildControllerCount', 1),
      new ExpectedSemanticEffectFilter('composedChildControllerCreationKinds', 'custom-element'),
      new ExpectedSemanticEffectFilter('activationHandoffKinds', 'model-assignable'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Dashboard root should materialize scoped template-only AuCompose context.', 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'template-only'),
      new ExpectedSemanticEffectFilter('modelResolutionKind', 'absent'),
      new ExpectedSemanticEffectFilter('hasTemplateBinding', true),
      new ExpectedSemanticEffectFilter('scopeBehavior', 'scoped'),
      new ExpectedSemanticEffectFilter('flushMode', 'async'),
      new ExpectedSemanticEffectFilter('tag', 'aside'),
      new ExpectedSemanticEffectFilter('hasCompositionBinding', true),
      new ExpectedSemanticEffectFilter('hasComposingBinding', true),
    ]),
    ...composedDashboardPromiseInputExpectedEffects('Dashboard root'),
    templateControllerRuntimeEffect('Dashboard root should materialize repeat template-controller hydration.', 'iteration', 'many'),
    syntheticViewRuntimeEffect('Dashboard root should materialize repeat synthetic-view hydration.', 'iteration', 'many'),
    ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize dynamic component composition.', 'template-rendering-boundary', 'dynamic-component-composition', 'template-binding'),
    ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize direct dashboard state/domain template reads.', 'template-model-access', 'direct-state-domain-template-binding', 'template-binding'),
    ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize real source-backed getter observation.', 'template-model-access', 'source-backed-getter-observation', 'component'),
    ExpectedSemanticEffect.signatureFact('Chart widget should repeat points directly from its activated model.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('definitionName', 'chart-widget'),
      new ExpectedSemanticEffectFilter('sourceName', 'model.points'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'model'),
      new ExpectedSemanticEffectFilter('targetProperty', 'items'),
    ]),
    ExpectedSemanticEffect.signatureFact('Inventory widget should repeat items directly from its activated model.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('definitionName', 'inventory-widget'),
      new ExpectedSemanticEffectFilter('sourceName', 'model.items'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'model'),
      new ExpectedSemanticEffectFilter('targetProperty', 'items'),
    ]),
  ];
}

function composedDashboardExpectedEffects(model: ComposedDashboardRecipeModel): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact('Composed dashboard reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Composed dashboard'),
    ExpectedSemanticEffect.fact('Composed dashboard has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Composed dashboard has root and widget custom elements.', 'component', 'resource', 3, 'component'),
    ExpectedSemanticEffect.atLeast('Composed dashboard has external templates.', 'external-template', 'template', 3, 'template'),
    ExpectedSemanticEffect.atLeast('Composed dashboard has compiled template facts.', 'template-compilation', 'template', 3, 'template'),
    ExpectedSemanticEffect.fact('Composed dashboard has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    templateControllerRuntimeEffect('Composed dashboard has repeat template-controller rows.', 'iteration', 'many'),
    syntheticViewRuntimeEffect('Composed dashboard has repeat synthetic-view rows.', 'iteration', 'many'),
    ExpectedSemanticEffect.discriminatorFact('Composed dashboard resolves dynamic AuCompose widget candidates.', 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('flushMode', 'async'),
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'type-candidate'),
      new ExpectedSemanticEffectFilter('resolvedComponentCount', 2),
      new ExpectedSemanticEffectFilter('compiledTemplateCount', 2),
      new ExpectedSemanticEffectFilter('candidateResourceAnalysisState', 'complete'),
      new ExpectedSemanticEffectFilter('candidateResourceAnalysisCount', 2),
      new ExpectedSemanticEffectFilter('activationHandoffKinds', 'model-assignable'),
    ]),
    ExpectedSemanticEffect.signatureFact('Composed dashboard has a closed static AuCompose child controller.', 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'static-value'),
      new ExpectedSemanticEffectFilter('staticComponentName', 'inventory-widget'),
      new ExpectedSemanticEffectFilter('composedChildControllerCount', 1),
      new ExpectedSemanticEffectFilter('composedChildControllerCreationKinds', 'custom-element'),
      new ExpectedSemanticEffectFilter('activationHandoffKinds', 'model-assignable'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Composed dashboard has scoped template-only AuCompose context.', 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'template-only'),
      new ExpectedSemanticEffectFilter('modelResolutionKind', 'absent'),
      new ExpectedSemanticEffectFilter('hasTemplateBinding', true),
      new ExpectedSemanticEffectFilter('scopeBehavior', 'scoped'),
      new ExpectedSemanticEffectFilter('flushMode', 'async'),
      new ExpectedSemanticEffectFilter('tag', 'aside'),
      new ExpectedSemanticEffectFilter('hasCompositionBinding', true),
      new ExpectedSemanticEffectFilter('hasComposingBinding', true),
    ]),
    ...composedDashboardPromiseInputExpectedEffects('Composed dashboard'),
    ExpectedSemanticEffect.signatureFact('Composed dashboard has a state service-class row.', 'service-class', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'state-source'),
      new ExpectedSemanticEffectFilter('className', model.stateClassName),
    ]),
    ExpectedSemanticEffect.absent('Composed dashboard has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.capability('Composed dashboard exposes verifiable template composition.', 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste('Composed dashboard reports DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
    ExpectedSemanticEffect.discriminatorTaste('Composed dashboard reports dynamic component composition.', 'template-rendering-boundary', 'dynamic-component-composition', 'template-binding'),
    ExpectedSemanticEffect.signatureTaste('Composed dashboard reports direct state/domain template access.', 'template-model-access', 'direct-state-domain-template-binding', 'template-binding'),
    ExpectedSemanticEffect.signatureTaste('Composed dashboard reports source-backed getter observation.', 'template-model-access', 'source-backed-getter-observation', 'component'),
    ExpectedSemanticEffect.signatureFact('Composed dashboard chart widget uses the activated model as the repeat source.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('definitionName', 'chart-widget'),
      new ExpectedSemanticEffectFilter('sourceName', 'model.points'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'model'),
      new ExpectedSemanticEffectFilter('targetProperty', 'items'),
    ]),
    ExpectedSemanticEffect.signatureFact('Composed dashboard inventory widget uses the activated model as the repeat source.', 'binding-data-flow', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('definitionName', 'inventory-widget'),
      new ExpectedSemanticEffectFilter('sourceName', 'model.items'),
      new ExpectedSemanticEffectFilter('sourceRootName', 'model'),
      new ExpectedSemanticEffectFilter('targetProperty', 'items'),
    ]),
  ];
}

function composedDashboardPromiseInputExpectedEffects(subject: string): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureFact(`${subject} resolves a promise-valued AuCompose component input.`, 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('componentInputFulfillmentKind', 'promise'),
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'static-value'),
      new ExpectedSemanticEffectFilter('resolvedComponentNames', 'inventory-widget'),
      new ExpectedSemanticEffectFilter('composedChildControllerCount', 1),
      new ExpectedSemanticEffectFilter('activationHandoffKinds', 'model-assignable'),
    ]),
    ExpectedSemanticEffect.signatureFact(`${subject} resolves a promise-valued AuCompose template input.`, 'runtime-composition', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('templateInputFulfillmentKind', 'promise'),
      new ExpectedSemanticEffectFilter('componentResolutionKind', 'template-only'),
      new ExpectedSemanticEffectFilter('hasTemplateBinding', true),
      new ExpectedSemanticEffectFilter('scopeBehavior', 'scoped'),
      new ExpectedSemanticEffectFilter('flushMode', 'async'),
    ]),
  ];
}
