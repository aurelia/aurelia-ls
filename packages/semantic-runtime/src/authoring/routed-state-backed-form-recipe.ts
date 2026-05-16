import {
  type ApplicationComponentTopologyResult,
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  AddRouteOperation,
  ConfigurePluginOperation,
  CreateComponentOperation,
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
import {
  routeProductDiscriminatorEffect,
  routeProductSignatureEffect,
} from './route-expected-effects.js';
import { AuthoringPreference } from './ontology.js';
import {
  standardFormAppExpectedEffects,
  standardFormTemplateBindingExpectedEffects,
} from './form-recipe-expected-effects.js';
import {
  componentStyleAssetPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  formComponentPlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './form-recipe-plan-steps.js';
import { routedStateBackedFormSourcePlan } from './routed-state-backed-form-source-plan.js';

export interface RoutedStateBackedFormRecipeRequest {
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
  readonly statePath?: string;
  readonly stateClassName?: string;
  readonly routeComponentPath?: string;
  readonly routeTemplatePath?: string;
  readonly routeComponentClassName?: string;
  readonly routeElementName?: string;
  readonly routePath?: string;
  readonly routeTitle?: string;
  readonly formComponentPath?: string;
  readonly formTemplatePath?: string;
  readonly formComponentClassName?: string;
  readonly formElementName?: string;
}

interface RoutedStateBackedFormRecipeModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly routeComponentPath: string;
  readonly routeTemplatePath: string;
  readonly routeComponentClassName: string;
  readonly routeElementName: string;
  readonly routePath: string;
  readonly routeTitle: string;
  readonly formComponentPath: string;
  readonly formTemplatePath: string;
  readonly formComponentClassName: string;
  readonly formElementName: string;
}

export function buildRoutedStateBackedFormPlan(request: RoutedStateBackedFormRecipeRequest): AuthoringPlan {
  const model = normalizeRoutedStateBackedFormRecipe(request);
  const topology = routedStateBackedFormTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as a routed Aurelia form app backed by DI-owned state.`,
      topology,
      null,
      [
        new AuthoringPreference('state-ownership', 'di-owned-state-class'),
        new AuthoringPreference('component-interface', 'scalar-id-inputs'),
        new AuthoringPreference('navigation-ownership', 'static-route-config'),
        new AuthoringPreference('navigation-ownership', 'decorator-route-config'),
        new AuthoringPreference('navigation-ownership', 'child-routes-property-route-config'),
        new AuthoringPreference('navigation-ownership', 'viewport-layout-navigation'),
        new AuthoringPreference('template-source-ownership', 'external-template-file'),
        new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
        new AuthoringPreference('style-binding-model', 'class-token-binding'),
        new AuthoringPreference('form-value-channel', 'native-control-value-binding'),
        new AuthoringPreference('form-value-channel', 'checked-model-binding'),
        new AuthoringPreference('form-value-channel', 'select-model-binding'),
        new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
      ],
    ),
    routedStateBackedFormPreconditions(),
    routedStateBackedFormPlanSteps(model, topology),
    topology,
    routedStateBackedFormSourcePlan(model),
  );
}

function normalizeRoutedStateBackedFormRecipe(request: RoutedStateBackedFormRecipeRequest): RoutedStateBackedFormRecipeModel {
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootStylePath: request.rootStylePath ?? 'src/app.css',
    rootComponentClassName: request.rootComponentClassName ?? 'App',
    rootElementName: request.rootElementName ?? 'app-root',
    statePath: request.statePath ?? 'src/state/app-state.ts',
    stateClassName: request.stateClassName ?? 'AppState',
    routeComponentPath: request.routeComponentPath ?? 'src/routes/form-route.ts',
    routeTemplatePath: request.routeTemplatePath ?? 'src/routes/form-route.html',
    routeComponentClassName: request.routeComponentClassName ?? 'FormRoute',
    routeElementName: request.routeElementName ?? 'form-route',
    routePath: request.routePath ?? 'form',
    routeTitle: request.routeTitle ?? 'Service Request',
    formComponentPath: request.formComponentPath ?? 'src/components/state-backed-form.ts',
    formTemplatePath: request.formTemplatePath ?? 'src/components/state-backed-form.html',
    formComponentClassName: request.formComponentClassName ?? 'StateBackedForm',
    formElementName: request.formElementName ?? 'state-backed-form',
  };
}

function routedStateBackedFormPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia runtime-html, router, and TypeScript module resolution are available.'),
  ];
}

function routedStateBackedFormPlanSteps(
  model: RoutedStateBackedFormRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.rootStylePath,
      model.statePath,
      model.routeComponentPath,
      model.routeTemplatePath,
      model.formComponentPath,
      model.formTemplatePath,
    ]),
    new AuthoringPlanStep(
      new ConfigurePluginOperation('RouterConfiguration', '@aurelia/router'),
      [
        ExpectedSemanticEffect.discriminatorFact('Router should expose route facts after reopen.', 'route', 'route', 'router'),
        routeProductSignatureEffect('Router options should be visible after RouterConfiguration is registered.', 'router-options'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateStateModelOperation(model.statePath, model.stateClassName),
      [
        ExpectedSemanticEffect.fact('State source should be visible in app topology.', 'dependency-injection', 'di', 'state-model'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
      ],
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    componentStyleAssetPlanStep(model.rootStylePath),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    new AuthoringPlanStep(
      new AddRouteOperation(model.routePath, model.routeComponentClassName),
      [
        ExpectedSemanticEffect.discriminatorFact('Route config should be visible.', 'route', 'route', 'route'),
        routeProductDiscriminatorEffect('Route config should be visible as a source-backed router product.', 'route-config'),
        ExpectedSemanticEffect.signatureFact('Route config should close as an authored decorator object.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('originKind', 'route-decorator'),
          new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
        ]),
        ExpectedSemanticEffect.signatureFact('Nested route config should close as a child routes property object.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('originKind', 'child-routes-property'),
          new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
        ]),
        ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize static route config.', 'navigation-ownership', 'static-route-config', 'route'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize decorator route config.', 'navigation-ownership', 'decorator-route-config', 'route'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize child routes property config.', 'navigation-ownership', 'child-routes-property-route-config', 'route'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize viewport layout navigation.', 'navigation-ownership', 'viewport-layout-navigation', 'route'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateComponentOperation(model.routeComponentPath, model.routeComponentClassName, model.routeElementName),
      [
        ExpectedSemanticEffect.fact('Route component should be a custom element.', 'component', 'resource', 'route'),
      ],
    ),
    externalTemplatePlanStep(model.routeTemplatePath, model.routeComponentClassName, 'Route component'),
    formComponentPlanStep(model.formComponentPath, model.formComponentClassName, model.formElementName),
    externalTemplatePlanStep(model.formTemplatePath, model.formComponentClassName, 'Form component'),
    templateBindingPlanStep(
      model.formTemplatePath,
      'route-owned form composition, native value binding, checked/model binding, select model binding, and submit trigger',
      standardFormTemplateBindingExpectedEffects(),
    ),
    verifyAppPlanStep(topology, routedStateBackedFormExpectedEffects()),
  ];
}

function routedStateBackedFormTopology(model: RoutedStateBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const form = addRoutedFormComponent(builder, model);
  const route = addRoutedFormRouteComponent(builder, model, form);
  const root = addRoutedFormRoot(builder, model, route);
  addRoutedFormState(builder, model);
  addRoutedFormRoute(builder, model, route);
  addRoutedFormEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addRoutedFormRoot(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
  route: ApplicationComponentTopologyResult,
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
    dependencies: [route.reference],
  });
}

function addRoutedFormRouteComponent(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
  form: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.routeComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.routeComponentPath,
    elementName: model.routeElementName,
    templatePath: model.routeTemplatePath,
    dependencies: [form.reference],
  });
}

function addRoutedFormComponent(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.formComponentClassName,
    referenceFromPath: model.routeComponentPath,
    sourcePath: model.formComponentPath,
    elementName: model.formElementName,
    templatePath: model.formTemplatePath,
  });
}

function addRoutedFormState(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addRoutedFormRoute(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
  route: ApplicationComponentTopologyResult,
): void {
  builder.route({
    path: model.routePath,
    component: route.reference,
    title: model.routeTitle,
  });
}

function addRoutedFormEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
  root: ApplicationComponentTopologyResult,
): void {
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'new Aurelia().register(StandardConfiguration, RouterConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('@aurelia/runtime-html', ['Aurelia', 'StandardConfiguration']),
      new ApplicationImport('@aurelia/router', ['RouterConfiguration']),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
}

function routedStateBackedFormExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ...standardFormAppExpectedEffects({
      summaryPrefix: 'Routed form app',
      componentCount: 3,
      componentCountSummary: 'root, route, and form custom elements',
      externalTemplateCount: 3,
      compiledTemplateCount: 3,
    }),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has a routed-component role.', 'component-role', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'routed-component'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has route/router topology facts.', 'route', 'route', 'route'),
    routeProductDiscriminatorEffect('Routed form app has source-backed RouteConfig products.', 'route-config'),
    routeProductSignatureEffect('Routed form app has RouteContext topology products.', 'route-context'),
    routeProductSignatureEffect('Routed form app has au-viewport products.', 'router-viewport'),
    routeProductSignatureEffect('Routed form app has ViewportAgent products.', 'viewport-agent'),
    routeProductSignatureEffect('Routed form app has route-recognizer pattern products.', 'route-pattern'),
    routeProductSignatureEffect('Routed form app has route-recognizer endpoint products.', 'route-endpoint'),
    routeProductSignatureEffect('Routed form app has route-recognizer state products.', 'route-recognizer-state'),
    routeProductSignatureEffect('Routed form app has TypedNavigationInstruction products.', 'typed-navigation-instruction'),
    routeProductSignatureEffect('Routed form app has ViewportInstruction products.', 'viewport-instruction'),
    routeProductSignatureEffect('Routed form app has ViewportInstructionTree products.', 'viewport-instruction-tree'),
    routeProductSignatureEffect('Routed form app has RecognizedRoute products.', 'recognized-route'),
    routeProductSignatureEffect('Routed form app has RouteTree products.', 'route-tree'),
    routeProductSignatureEffect('Routed form app has RouteNode products.', 'route-node'),
    routeProductSignatureEffect('Routed form app has ComponentAgent handoff products.', 'component-agent'),
    ExpectedSemanticEffect.signatureFact('Routed form app has a decorator object route config.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('originKind', 'route-decorator'),
      new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app has a child route object config.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('originKind', 'child-routes-property'),
      new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
    ]),
    ExpectedSemanticEffect.discriminatorCapability('Routed form app exposes at least partial router authoring.', 'router', 'partial'),
    ExpectedSemanticEffect.discriminatorTaste('Routed form app reports static route config.', 'navigation-ownership', 'static-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports decorator route config.', 'navigation-ownership', 'decorator-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports child routes property config.', 'navigation-ownership', 'child-routes-property-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports viewport layout navigation.', 'navigation-ownership', 'viewport-layout-navigation', 'route'),
  ];
}
