import {
  type ApplicationComponentTopologyResult,
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  AddRouteOperation,
  AddTemplateBindingOperation,
  ConfigurePluginOperation,
  CreateComponentOperation,
  CreateEntrypointOperation,
  CreateExternalTemplateOperation,
  CreateFormComponentOperation,
  CreateProjectFilesOperation,
  CreateRootComponentOperation,
  CreateStyleAssetOperation,
  CreateStateModelOperation,
  VerifyAppOperation,
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
  classTokenStyleTasteEffect,
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
  nativeFormValueTasteEffects,
  nativeValueChannelEffect,
  nativeValueDataFlowEffect,
  nativeValueTargetAccessEffect,
} from './form-expected-effects.js';
import { routedStateBackedFormSourcePlan } from './routed-state-backed-form-source-plan.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';

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
    new AuthoringPlanStep(
      new CreateProjectFilesOperation([
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
      [
        ExpectedSemanticEffect.fact('Project should reopen as an Aurelia app.', 'project-shape'),
      ],
    ),
    new AuthoringPlanStep(
      new ConfigurePluginOperation('RouterConfiguration', '@aurelia/router'),
      [
        ExpectedSemanticEffect.discriminatorFact('Router should expose route facts after reopen.', 'route', 'route', 'router'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateStateModelOperation(model.statePath, model.stateClassName),
      [
        ExpectedSemanticEffect.fact('State source should be visible in app topology.', 'dependency-injection', 'di', 'state-model'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateEntrypointOperation(model.entrypointPath, model.rootComponentClassName),
      [
        ExpectedSemanticEffect.fact('App root should be visible after reopen.', 'app-root', 'app', 'entrypoint'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateRootComponentOperation(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
      [
        ExpectedSemanticEffect.fact('Root component should be a custom element.', 'component', 'resource', 'app-root'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateStyleAssetOperation(model.rootStylePath, 'component'),
      [
        componentStylesheetEffect('Root component stylesheet should be visible as a style resource.'),
        componentStylesheetCapabilityEffect('Authoring orientation should expose style asset authoring.'),
        componentStylesheetTasteEffect('Authoring orientation should recognize component stylesheet ownership.'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateExternalTemplateOperation(model.rootTemplatePath, model.rootComponentClassName),
      [
        ExpectedSemanticEffect.fact('Root component should use an external template.', 'external-template', 'template', 'template'),
      ],
    ),
    new AuthoringPlanStep(
      new AddRouteOperation(model.routePath, model.routeComponentClassName),
      [
        ExpectedSemanticEffect.discriminatorFact('Route config should be visible.', 'route', 'route', 'route'),
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
    new AuthoringPlanStep(
      new CreateExternalTemplateOperation(model.routeTemplatePath, model.routeComponentClassName),
      [
        ExpectedSemanticEffect.fact('Route component should use an external template.', 'external-template', 'template', 'template'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateFormComponentOperation(model.formComponentPath, model.formComponentClassName, model.formElementName),
      [
        ExpectedSemanticEffect.fact('Form component should be a custom element.', 'component', 'resource', 'component'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateExternalTemplateOperation(model.formTemplatePath, model.formComponentClassName),
      [
        ExpectedSemanticEffect.fact('Form component should use an external template.', 'external-template', 'template', 'template'),
      ],
    ),
    new AuthoringPlanStep(
      new AddTemplateBindingOperation(
        model.formTemplatePath,
        'route-owned form composition, native value binding, checked/model binding, and submit trigger',
      ),
      [
        nativeValueTargetAccessEffect('Form should expose target access for native value bindings.'),
        nativeValueChannelEffect('Form should expose observer-backed value channels for native value bindings.'),
        nativeValueDataFlowEffect('Form should expose TypeChecker-backed data flow for native value bindings.'),
        classTokenStyleTasteEffect('Authoring orientation should recognize class-token style binding.'),
      ],
    ),
    new AuthoringPlanStep(
      new VerifyAppOperation(topology),
      routedStateBackedFormExpectedEffects(),
    ),
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
    ExpectedSemanticEffect.fact('Routed form app reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Routed form app'),
    ExpectedSemanticEffect.fact('Routed form app has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Routed form app has root, route, and form custom elements.', 'component', 'resource', 3, 'component'),
    ExpectedSemanticEffect.fact('Routed form app has an app-root component role.', 'component-role', 'resource', 'app-root', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'app-root'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has a routed-component role.', 'component-role', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'routed-component'),
    ]),
    ExpectedSemanticEffect.fact('Routed form app has a component-composition host role.', 'component-role', 'resource', 'component', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'component-composition-host'),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app has a data-entry component role.', 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'data-entry-surface'),
    ]),
    ExpectedSemanticEffect.atLeast('Routed form app has external templates.', 'external-template', 'template', 3, 'template'),
    componentStylesheetEffect('Routed form app has a component stylesheet.'),
    componentStylesheetCapabilityEffect('Routed form app exposes verifiable style asset authoring.'),
    ExpectedSemanticEffect.atLeast('Routed form app has compiled template facts.', 'template-compilation', 'template', 3, 'template'),
    ExpectedSemanticEffect.fact('Routed form app has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has route/router topology facts.', 'route', 'route', 'route'),
    ExpectedSemanticEffect.signatureFact('Routed form app has a decorator object route config.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('originKind', 'route-decorator'),
      new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed form app has a child route object config.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('originKind', 'child-routes-property'),
      new ExpectedSemanticEffectFilter('valueKind', 'object-literal'),
    ]),
    nativeValueTargetAccessEffect('Routed form app has native value binding target access.'),
    nativeValueChannelEffect('Routed form app has native value binding channels.'),
    nativeValueDataFlowEffect('Routed form app has native value binding data flows.'),
    ExpectedSemanticEffect.absent('Routed form app has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.discriminatorCapability('Routed form app exposes at least partial router authoring.', 'router', 'partial'),
    ExpectedSemanticEffect.capability('Routed form app exposes verifiable template composition.', 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.discriminatorTaste('Routed form app reports static route config.', 'navigation-ownership', 'static-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports decorator route config.', 'navigation-ownership', 'decorator-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports child routes property config.', 'navigation-ownership', 'child-routes-property-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports viewport layout navigation.', 'navigation-ownership', 'viewport-layout-navigation', 'route'),
    ExpectedSemanticEffect.signatureTaste('Routed form app reports DI-owned state taste.', 'state-ownership', 'di-owned-state-class', 'state-model'),
    componentStylesheetTasteEffect('Routed form app reports component stylesheet taste.'),
    classTokenStyleTasteEffect('Routed form app reports class-token style binding taste.'),
    ...nativeFormValueTasteEffects(
      'Routed form app reports native form value binding taste.',
      'Routed form app reports select model binding taste.',
    ),
  ];
}
