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
  readonly routeId?: string;
  readonly routePath?: string;
  readonly routeNavigationPath?: string;
  readonly routeParameterName?: string;
  readonly routeParameterValue?: string;
  readonly routeQueryModeName?: string;
  readonly routeQueryModeValue?: string;
  readonly routeQueryTagName?: string;
  readonly routeQueryTagValues?: readonly string[];
  readonly routeFragment?: string;
  readonly routeViewportName?: string;
  readonly routeTitle?: string;
  readonly routeRedirectPath?: string;
  readonly summaryRouteId?: string;
  readonly summaryRoutePath?: string;
  readonly summaryRouteComponentPath?: string;
  readonly summaryRouteTemplatePath?: string;
  readonly summaryRouteComponentClassName?: string;
  readonly summaryRouteElementName?: string;
  readonly summaryRouteViewportName?: string;
  readonly summaryRouteTitle?: string;
  readonly formComponentPath?: string;
  readonly formTemplatePath?: string;
  readonly formComponentClassName?: string;
  readonly formElementName?: string;
  readonly fieldShellComponentPath?: string;
  readonly fieldShellTemplatePath?: string;
  readonly fieldShellClassName?: string;
  readonly fieldShellElementName?: string;
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
  readonly routeId: string;
  readonly routePath: string;
  readonly routeNavigationPath: string;
  readonly routeParameterName: string;
  readonly routeParameterValue: string;
  readonly routeQueryModeName: string;
  readonly routeQueryModeValue: string;
  readonly routeQueryTagName: string;
  readonly routeQueryTagValues: readonly string[];
  readonly routeFragment: string;
  readonly routeViewportName: string;
  readonly routeTitle: string;
  readonly routeRedirectPath: string;
  readonly summaryRouteId: string;
  readonly summaryRoutePath: string;
  readonly summaryRouteComponentPath: string;
  readonly summaryRouteTemplatePath: string;
  readonly summaryRouteComponentClassName: string;
  readonly summaryRouteElementName: string;
  readonly summaryRouteViewportName: string;
  readonly summaryRouteTitle: string;
  readonly formComponentPath: string;
  readonly formTemplatePath: string;
  readonly formComponentClassName: string;
  readonly formElementName: string;
  readonly fieldShellComponentPath: string;
  readonly fieldShellTemplatePath: string;
  readonly fieldShellClassName: string;
  readonly fieldShellElementName: string;
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
        new AuthoringPreference('state-ownership', 'route-parameter-selected-state'),
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
  const routeParameterValue = request.routeParameterValue ?? 'request-1';
  const routeQueryModeName = request.routeQueryModeName ?? 'mode';
  const routeQueryModeValue = request.routeQueryModeValue ?? 'edit';
  const routeQueryTagName = request.routeQueryTagName ?? 'tag';
  const routeQueryTagValues = request.routeQueryTagValues ?? ['primary', 'priority'];
  const routeFragment = request.routeFragment ?? 'details';
  const routeQuery = [
    `${routeQueryModeName}=${routeQueryModeValue}`,
    ...routeQueryTagValues.map((value) => `${routeQueryTagName}=${value}`),
  ].join('&');
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
    routeId: request.routeId ?? 'form',
    routePath: request.routePath ?? 'form/:requestId',
    routeNavigationPath: request.routeNavigationPath ?? `form/${routeParameterValue}+summary?${routeQuery}#${routeFragment}`,
    routeParameterName: request.routeParameterName ?? 'requestId',
    routeParameterValue,
    routeQueryModeName,
    routeQueryModeValue,
    routeQueryTagName,
    routeQueryTagValues,
    routeFragment,
    routeViewportName: request.routeViewportName ?? 'main',
    routeTitle: request.routeTitle ?? 'Service Request',
    routeRedirectPath: request.routeRedirectPath ?? `form/${routeParameterValue}`,
    summaryRouteId: request.summaryRouteId ?? 'summary',
    summaryRoutePath: request.summaryRoutePath ?? 'summary',
    summaryRouteComponentPath: request.summaryRouteComponentPath ?? 'src/routes/summary-route.ts',
    summaryRouteTemplatePath: request.summaryRouteTemplatePath ?? 'src/routes/summary-route.html',
    summaryRouteComponentClassName: request.summaryRouteComponentClassName ?? 'SummaryRoute',
    summaryRouteElementName: request.summaryRouteElementName ?? 'summary-route',
    summaryRouteViewportName: request.summaryRouteViewportName ?? 'sidebar',
    summaryRouteTitle: request.summaryRouteTitle ?? 'Activity',
    formComponentPath: request.formComponentPath ?? 'src/components/state-backed-form.ts',
    formTemplatePath: request.formTemplatePath ?? 'src/components/state-backed-form.html',
    formComponentClassName: request.formComponentClassName ?? 'StateBackedForm',
    formElementName: request.formElementName ?? 'state-backed-form',
    fieldShellComponentPath: request.fieldShellComponentPath ?? 'src/components/field-shell.ts',
    fieldShellTemplatePath: request.fieldShellTemplatePath ?? 'src/components/field-shell.html',
    fieldShellClassName: request.fieldShellClassName ?? 'FieldShell',
    fieldShellElementName: request.fieldShellElementName ?? 'field-shell',
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
      model.summaryRouteComponentPath,
      model.summaryRouteTemplatePath,
      model.formComponentPath,
      model.formTemplatePath,
      model.fieldShellComponentPath,
      model.fieldShellTemplatePath,
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
        ExpectedSemanticEffect.signatureFact('Route pattern should expose the authored request route parameter.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'route-pattern'),
          new ExpectedSemanticEffectFilter('parameterNames', model.routeParameterName),
        ]),
        ExpectedSemanticEffect.signatureFact('Route endpoint should carry the authored request route parameter.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'route-endpoint'),
          new ExpectedSemanticEffectFilter('parameterNames', model.routeParameterName),
        ]),
        ExpectedSemanticEffect.signatureFact('Recognized route should carry the concrete authored request route parameter value.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'recognized-route'),
          new ExpectedSemanticEffectFilter('parameterValuePairs', `${model.routeParameterName}=${model.routeParameterValue}`),
        ]),
        ExpectedSemanticEffect.signatureFact('Viewport instruction tree should carry the authored route query mode.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'viewport-instruction-tree'),
          new ExpectedSemanticEffectFilter('queryParamPairs', `${model.routeQueryModeName}=${model.routeQueryModeValue}`),
        ]),
        ExpectedSemanticEffect.signatureFact('Viewport instruction tree should carry repeated route query tags.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'viewport-instruction-tree'),
          new ExpectedSemanticEffectFilter('queryParamPairs', `${model.routeQueryTagName}=${model.routeQueryTagValues[0] ?? ''}`),
        ]),
        ExpectedSemanticEffect.signatureFact('Viewport instruction tree should carry the route fragment.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'viewport-instruction-tree'),
          new ExpectedSemanticEffectFilter('fragment', model.routeFragment),
        ]),
        ExpectedSemanticEffect.signatureFact('Route config should target the authored named viewport.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'route-config'),
          new ExpectedSemanticEffectFilter('viewport', model.routeViewportName),
        ]),
        ExpectedSemanticEffect.signatureFact('Root template should expose the authored named viewport.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'router-viewport'),
          new ExpectedSemanticEffectFilter('name', model.routeViewportName),
        ]),
        ExpectedSemanticEffect.signatureFact('Root template should expose the authored sidebar viewport.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'router-viewport'),
          new ExpectedSemanticEffectFilter('name', model.summaryRouteViewportName),
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
    new AuthoringPlanStep(
      new AddRouteOperation(model.summaryRoutePath, model.summaryRouteComponentClassName),
      [
        ExpectedSemanticEffect.signatureFact('Summary route config should target the authored sidebar viewport.', 'route', 'route', 'route', 'present', null, [
          new ExpectedSemanticEffectFilter('routeProductKind', 'route-config'),
          new ExpectedSemanticEffectFilter('viewport', model.summaryRouteViewportName),
        ]),
      ],
    ),
    new AuthoringPlanStep(
      new CreateComponentOperation(model.summaryRouteComponentPath, model.summaryRouteComponentClassName, model.summaryRouteElementName),
      [
        ExpectedSemanticEffect.fact('Summary route component should be a custom element.', 'component', 'resource', 'route'),
      ],
    ),
    externalTemplatePlanStep(model.summaryRouteTemplatePath, model.summaryRouteComponentClassName, 'Summary route component'),
    new AuthoringPlanStep(
      new CreateComponentOperation(model.fieldShellComponentPath, model.fieldShellClassName, model.fieldShellElementName),
      [
        ExpectedSemanticEffect.fact('Field shell should be a custom element.', 'component', 'resource', 'component'),
      ],
    ),
    externalTemplatePlanStep(model.fieldShellTemplatePath, model.fieldShellClassName, 'Field shell component'),
    formComponentPlanStep(model.formComponentPath, model.formComponentClassName, model.formElementName),
    externalTemplatePlanStep(model.formTemplatePath, model.formComponentClassName, 'Form component'),
    templateBindingPlanStep(
      model.formTemplatePath,
      'route-owned form composition, native value binding, checked/model binding, select model binding, and submit trigger',
      standardFormTemplateBindingExpectedEffects(),
    ),
    verifyAppPlanStep(topology, routedStateBackedFormExpectedEffects(model)),
  ];
}

function routedStateBackedFormTopology(model: RoutedStateBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const fieldShell = addRoutedFieldShellComponent(builder, model);
  const form = addRoutedFormComponent(builder, model, fieldShell);
  const route = addRoutedFormRouteComponent(builder, model, form);
  const summaryRoute = addRoutedSummaryRouteComponent(builder, model);
  const root = addRoutedFormRoot(builder, model, route, summaryRoute);
  addRoutedFormState(builder, model);
  addRoutedFormRoute(builder, model, route);
  addRoutedSummaryRoute(builder, model, summaryRoute);
  addRoutedFormEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addRoutedFormRoot(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
  route: ApplicationComponentTopologyResult,
  summaryRoute: ApplicationComponentTopologyResult,
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
    dependencies: [route.reference, summaryRoute.reference],
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
  fieldShell: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.formComponentClassName,
    referenceFromPath: model.routeComponentPath,
    sourcePath: model.formComponentPath,
    elementName: model.formElementName,
    templatePath: model.formTemplatePath,
    dependencies: [fieldShell.reference],
  });
}

function addRoutedSummaryRouteComponent(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.summaryRouteComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.summaryRouteComponentPath,
    elementName: model.summaryRouteElementName,
    templatePath: model.summaryRouteTemplatePath,
  });
}

function addRoutedFieldShellComponent(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.fieldShellClassName,
    referenceFromPath: model.formComponentPath,
    sourcePath: model.fieldShellComponentPath,
    elementName: model.fieldShellElementName,
    templatePath: model.fieldShellTemplatePath,
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

function addRoutedSummaryRoute(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
  route: ApplicationComponentTopologyResult,
): void {
  builder.route({
    path: model.summaryRoutePath,
    component: route.reference,
    title: model.summaryRouteTitle,
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

function routedStateBackedFormExpectedEffects(
  model: RoutedStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  return [
    ...standardFormAppExpectedEffects({
      summaryPrefix: 'Routed form app',
      componentCount: 5,
      componentCountSummary: 'root, form route, summary route, form, and field shell custom elements',
      externalTemplateCount: 5,
      compiledTemplateCount: 5,
    }),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has a routed-component role.', 'component-role', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'routed-component'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has route/router topology facts.', 'route', 'route', 'route'),
    routeProductDiscriminatorEffect('Routed form app has source-backed RouteConfig products.', 'route-config'),
    ExpectedSemanticEffect.signatureFact('Routed form app route config targets the named viewport.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-config'),
      new ExpectedSemanticEffectFilter('viewport', model.routeViewportName),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app summary route config targets the sidebar viewport.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-config'),
      new ExpectedSemanticEffectFilter('viewport', model.summaryRouteViewportName),
    ]),
    routeProductSignatureEffect('Routed form app has RouteContext topology products.', 'route-context'),
    routeProductSignatureEffect('Routed form app has au-viewport products.', 'router-viewport'),
    ExpectedSemanticEffect.signatureFact('Routed form app has the named router viewport.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'router-viewport'),
      new ExpectedSemanticEffectFilter('name', model.routeViewportName),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app has the sidebar router viewport.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'router-viewport'),
      new ExpectedSemanticEffectFilter('name', model.summaryRouteViewportName),
    ]),
    routeProductSignatureEffect('Routed form app has ViewportAgent products.', 'viewport-agent'),
    routeProductSignatureEffect('Routed form app has route-recognizer pattern products.', 'route-pattern'),
    ExpectedSemanticEffect.signatureFact('Routed form app has a route pattern with the request route parameter.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-pattern'),
      new ExpectedSemanticEffectFilter('parameterNames', model.routeParameterName),
    ]),
    routeProductSignatureEffect('Routed form app has route-recognizer endpoint products.', 'route-endpoint'),
    ExpectedSemanticEffect.signatureFact('Routed form app has a route endpoint with the request route parameter.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-endpoint'),
      new ExpectedSemanticEffectFilter('parameterNames', model.routeParameterName),
    ]),
    routeProductSignatureEffect('Routed form app has route-recognizer state products.', 'route-recognizer-state'),
    routeProductSignatureEffect('Routed form app has TypedNavigationInstruction products.', 'typed-navigation-instruction'),
    routeProductSignatureEffect('Routed form app has ViewportInstruction products.', 'viewport-instruction'),
    routeProductSignatureEffect('Routed form app has ViewportInstructionTree products.', 'viewport-instruction-tree'),
    routeProductSignatureEffect('Routed form app has RecognizedRoute products.', 'recognized-route'),
    ExpectedSemanticEffect.signatureFact('Routed form app recognizes the request route parameter from static navigation.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'recognized-route'),
      new ExpectedSemanticEffectFilter('parameterNames', model.routeParameterName),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app recognizes the concrete request route parameter value.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'recognized-route'),
      new ExpectedSemanticEffectFilter('parameterValuePairs', `${model.routeParameterName}=${model.routeParameterValue}`),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app viewport instruction tree carries the route query mode.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'viewport-instruction-tree'),
      new ExpectedSemanticEffectFilter('queryParamPairs', `${model.routeQueryModeName}=${model.routeQueryModeValue}`),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app viewport instruction tree carries the route fragment.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'viewport-instruction-tree'),
      new ExpectedSemanticEffectFilter('fragment', model.routeFragment),
    ]),
    routeProductSignatureEffect('Routed form app has RouteTree products.', 'route-tree'),
    routeProductSignatureEffect('Routed form app has RouteNode products.', 'route-node'),
    ExpectedSemanticEffect.signatureFact('Routed form app route node carries the concrete request route parameter value.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-node'),
      new ExpectedSemanticEffectFilter('parameterValuePairs', `${model.routeParameterName}=${model.routeParameterValue}`),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app route node exposes child-first getRouteParameters values.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-node'),
      new ExpectedSemanticEffectFilter('childFirstParameterValuePairs', `${model.routeParameterName}=${model.routeParameterValue}`),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app route node exposes include-query route parameter mode.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-node'),
      new ExpectedSemanticEffectFilter('childFirstParameterAndQueryValuePairs', `${model.routeQueryModeName}=${model.routeQueryModeValue}`),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app route node preserves repeated query values in include-query route parameters.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-node'),
      new ExpectedSemanticEffectFilter('childFirstParameterAndQueryValuePairs', `${model.routeQueryTagName}=[${model.routeQueryTagValues.join(',')}]`),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app route node carries the named viewport.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-node'),
      new ExpectedSemanticEffectFilter('viewport', model.routeViewportName),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app route node carries the sidebar viewport.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-node'),
      new ExpectedSemanticEffectFilter('viewport', model.summaryRouteViewportName),
    ]),
    routeProductSignatureEffect('Routed form app has ComponentAgent handoff products.', 'component-agent'),
    ExpectedSemanticEffect.signatureFact('Routed form app has a decorator object route config.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('originKind', 'route-decorator'),
      new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app has a child route object config.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('originKind', 'child-routes-property'),
      new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
    ]),
    ExpectedSemanticEffect.discriminatorCapability('Routed form app exposes verifiable router authoring for the modeled route topology.', 'router', 'verifiable'),
    ExpectedSemanticEffect.discriminatorTaste('Routed form app reports static route config.', 'navigation-ownership', 'static-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports decorator route config.', 'navigation-ownership', 'decorator-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports child routes property config.', 'navigation-ownership', 'child-routes-property-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports viewport layout navigation.', 'navigation-ownership', 'viewport-layout-navigation', 'route'),
  ];
}
