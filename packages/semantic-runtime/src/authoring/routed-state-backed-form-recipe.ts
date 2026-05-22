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
import { AuthoringPreference } from './ontology.js';
import {
  standardFormAppExpectedEffects,
  standardLocalizedFormAppExpectedEffects,
  standardStateBackedRequestExpectedEffects,
  standardFormTemplateBindingExpectedEffects,
  standardValidatedFormAppExpectedEffects,
} from './form-recipe-expected-effects.js';
import {
  validateBindingBehaviorExpectedFilters,
} from './form-expected-effects.js';
import {
  standardFormTemplateBindingSummary,
  standardFormValueChannelPreferences,
} from './form-recipe-preferences.js';
import {
  standardRequestFormDomainNamesFromParameters,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import {
  standardRequestFormFieldSchemaFromRecipeRequest,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';
import {
  componentPlanStep,
  componentStyleAssetPlanStep,
  configurePluginPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  formComponentPlanStep,
  i18nConfigurationPlanStep,
  projectFilesPlanStep,
  routePlanStep,
  rootComponentPlanStep,
  servicePlanStep,
  stateModelPlanStep,
  templateBindingPlanStep,
  validationHtmlConfigurationPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import { routedStateBackedFormSourcePlan } from './routed-state-backed-form-source-plan.js';
import type { StateBackedFormValidationTriggerName } from './state-backed-form-source-plan.js';

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
  readonly servicePath?: string;
  readonly serviceClassName?: string;
  readonly serviceEnabled?: boolean;
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
  readonly requestEntityName?: string;
  readonly requestSelectionIdName?: string;
  readonly requestFields?: string;
  readonly requestOptions?: string;
  /** Include validation-html configuration, rules, controller usage, and validate binding behavior. */
  readonly validationEnabled?: boolean;
  /** Optional static trigger argument for generated validation binding behavior applications. */
  readonly validationTrigger?: StateBackedFormValidationTriggerName | null;
  /** Include i18n configuration, static translation resources, and translated template text. */
  readonly i18nEnabled?: boolean;
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
  readonly servicePath: string;
  readonly serviceClassName: string;
  readonly serviceEnabled: boolean;
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
  readonly requestDomain: StandardRequestFormDomainNames;
  readonly requestFieldSchema: StandardRequestFormFieldSchema | null;
  readonly validationEnabled: boolean;
  readonly validationTrigger: StateBackedFormValidationTriggerName | null;
  readonly i18nEnabled: boolean;
}

export function buildRoutedStateBackedFormPlan(request: RoutedStateBackedFormRecipeRequest): AuthoringPlan {
  const model = normalizeRoutedStateBackedFormRecipe(request);
  return buildRoutedStateBackedFormPlanFromModel(model);
}

export function buildRoutedServiceBackedFormPlan(
  request: Omit<RoutedStateBackedFormRecipeRequest, 'serviceEnabled'>,
): AuthoringPlan {
  const model = normalizeRoutedStateBackedFormRecipe({
    ...request,
    serviceEnabled: true,
  });
  return buildRoutedStateBackedFormPlanFromModel(model);
}

export function buildRoutedServiceValidatedStateBackedFormPlan(
  request: Omit<RoutedStateBackedFormRecipeRequest, 'serviceEnabled' | 'validationEnabled'>,
): AuthoringPlan {
  const model = normalizeRoutedStateBackedFormRecipe({
    ...request,
    serviceEnabled: true,
    validationEnabled: true,
    validationTrigger: request.validationTrigger === undefined ? 'blur' : request.validationTrigger,
  });
  return buildRoutedStateBackedFormPlanFromModel(model);
}

export function buildRoutedValidatedStateBackedFormPlan(
  request: Omit<RoutedStateBackedFormRecipeRequest, 'validationEnabled'>,
): AuthoringPlan {
  const model = normalizeRoutedStateBackedFormRecipe({
    ...request,
    validationEnabled: true,
    validationTrigger: request.validationTrigger === undefined ? 'blur' : request.validationTrigger,
  });
  return buildRoutedStateBackedFormPlanFromModel(model);
}

export function buildRoutedLocalizedValidatedStateBackedFormPlan(
  request: Omit<RoutedStateBackedFormRecipeRequest, 'i18nEnabled' | 'validationEnabled'>,
): AuthoringPlan {
  const model = normalizeRoutedStateBackedFormRecipe({
    ...request,
    i18nEnabled: true,
    validationEnabled: true,
    validationTrigger: request.validationTrigger === undefined ? 'blur' : request.validationTrigger,
  });
  return buildRoutedStateBackedFormPlanFromModel(model);
}

function buildRoutedStateBackedFormPlanFromModel(model: RoutedStateBackedFormRecipeModel): AuthoringPlan {
  const topology = routedStateBackedFormTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      routedStateBackedFormIntentSummary(model),
      topology,
      null,
      routedStateBackedFormPreferences(model),
    ),
    routedStateBackedFormPreconditions(),
    routedStateBackedFormPlanSteps(model, topology),
    topology,
    routedStateBackedFormSourcePlan(model),
  );
}

function normalizeRoutedStateBackedFormRecipe(request: RoutedStateBackedFormRecipeRequest): RoutedStateBackedFormRecipeModel {
  const requestDomain = standardRequestFormDomainNamesFromParameters(
    request.requestEntityName,
    request.requestSelectionIdName ?? request.routeParameterName,
  );
  const routeParameterName = request.routeParameterName
    ?? request.requestSelectionIdName
    ?? requestDomain.selectionIdName;
  const routeParameterValue = request.routeParameterValue ?? `${requestDomain.sampleIdPrefix}-1`;
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
    servicePath: request.servicePath ?? `src/services/${requestDomain.sampleIdPrefix}-service.ts`,
    serviceClassName: request.serviceClassName ?? requestDomain.serviceClassName,
    serviceEnabled: request.serviceEnabled === true,
    routeComponentPath: request.routeComponentPath ?? 'src/routes/form-route.ts',
    routeTemplatePath: request.routeTemplatePath ?? 'src/routes/form-route.html',
    routeComponentClassName: request.routeComponentClassName ?? 'FormRoute',
    routeElementName: request.routeElementName ?? 'form-route',
    routeId: request.routeId ?? 'form',
    routePath: request.routePath ?? `form/:${routeParameterName}`,
    routeNavigationPath: request.routeNavigationPath ?? `form/${routeParameterValue}+summary?${routeQuery}#${routeFragment}`,
    routeParameterName,
    routeParameterValue,
    routeQueryModeName,
    routeQueryModeValue,
    routeQueryTagName,
    routeQueryTagValues,
    routeFragment,
    routeViewportName: request.routeViewportName ?? 'main',
    routeTitle: request.routeTitle ?? requestDomain.entityTitle,
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
    requestDomain,
    requestFieldSchema: standardRequestFormFieldSchemaFromRecipeRequest(request.requestFields, request.requestOptions, request.requestEntityName),
    validationEnabled: request.validationEnabled === true,
    validationTrigger: request.validationTrigger ?? null,
    i18nEnabled: request.i18nEnabled === true,
  };
}

function routedStateBackedFormIntentSummary(model: RoutedStateBackedFormRecipeModel): string {
  if (model.serviceEnabled && model.validationEnabled) {
    return `Create ${model.appName} as a routed Aurelia form app backed by DI-owned state, a service boundary, and validation-html validation.`;
  }
  if (model.serviceEnabled) {
    return `Create ${model.appName} as a routed Aurelia form app backed by DI-owned state and a service boundary.`;
  }
  if (model.i18nEnabled && model.validationEnabled) {
    return `Create ${model.appName} as a routed Aurelia form app backed by DI-owned state, static i18n resources, and validation-html validation.`;
  }
  if (model.validationEnabled) {
    return `Create ${model.appName} as a routed Aurelia form app backed by DI-owned state and validation-html validation.`;
  }
  return `Create ${model.appName} as a routed Aurelia form app backed by DI-owned state.`;
}

function routedStateBackedFormPreferences(model: RoutedStateBackedFormRecipeModel): readonly AuthoringPreference[] {
  return [
    new AuthoringPreference('state-ownership', 'di-owned-state-class'),
    ...(model.serviceEnabled
      ? [new AuthoringPreference('state-ownership', 'di-owned-service-layer')]
      : []),
    new AuthoringPreference('component-interface', 'scalar-id-inputs'),
    new AuthoringPreference('template-model-access', 'direct-state-domain-template-binding'),
    new AuthoringPreference('template-model-access', 'template-local-domain-adaptation'),
    new AuthoringPreference('template-model-access', 'meaningful-viewmodel-adaptation'),
    new AuthoringPreference('navigation-ownership', 'static-route-config'),
    new AuthoringPreference('navigation-ownership', 'decorator-route-config'),
    new AuthoringPreference('navigation-ownership', 'child-routes-property-route-config'),
    new AuthoringPreference('navigation-ownership', 'viewport-layout-navigation'),
    new AuthoringPreference('state-ownership', 'route-parameter-selected-state'),
    new AuthoringPreference('template-source-ownership', 'external-template-file'),
    new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
    new AuthoringPreference('style-binding-model', 'class-token-binding'),
    ...standardFormValueChannelPreferences(model.requestFieldSchema),
    new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
    ...(model.validationEnabled
      ? [new AuthoringPreference('validation-ownership', 'validation-controller-usage')]
      : []),
    ...(model.i18nEnabled
      ? [new AuthoringPreference('resource-admission-mode', 'plugin-registration-admission')]
      : []),
  ];
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
    routedFormProjectFilesPlanStep(model),
    routerConfigurationPlanStep(),
    ...(model.i18nEnabled ? [i18nConfigurationPlanStep()] : []),
    ...(model.validationEnabled ? [validationHtmlConfigurationPlanStep()] : []),
    routedFormStateModelPlanStep(model),
    ...routedFormServicePlanSteps(model),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    componentStyleAssetPlanStep(model.rootStylePath),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    routedPrimaryRoutePlanStep(model),
    componentPlanStep(model.routeComponentPath, model.routeComponentClassName, model.routeElementName, 'Route component', 'route'),
    externalTemplatePlanStep(model.routeTemplatePath, model.routeComponentClassName, 'Route component'),
    routedSummaryRoutePlanStep(model),
    componentPlanStep(model.summaryRouteComponentPath, model.summaryRouteComponentClassName, model.summaryRouteElementName, 'Summary route component', 'route'),
    externalTemplatePlanStep(model.summaryRouteTemplatePath, model.summaryRouteComponentClassName, 'Summary route component'),
    componentPlanStep(model.fieldShellComponentPath, model.fieldShellClassName, model.fieldShellElementName, 'Field shell'),
    externalTemplatePlanStep(model.fieldShellTemplatePath, model.fieldShellClassName, 'Field shell component'),
    formComponentPlanStep(model.formComponentPath, model.formComponentClassName, model.formElementName),
    externalTemplatePlanStep(model.formTemplatePath, model.formComponentClassName, 'Form component'),
    routedFormTemplateBindingPlanStep(model),
    verifyAppPlanStep(topology, routedStateBackedFormExpectedEffects(model)),
  ];
}

function routedFormProjectFilesPlanStep(model: RoutedStateBackedFormRecipeModel): AuthoringPlanStep {
  return projectFilesPlanStep([
    model.entrypointPath,
    model.rootComponentPath,
    model.rootTemplatePath,
    model.rootStylePath,
    model.statePath,
    ...(model.serviceEnabled ? [model.servicePath] : []),
    model.routeComponentPath,
    model.routeTemplatePath,
    model.summaryRouteComponentPath,
    model.summaryRouteTemplatePath,
    model.formComponentPath,
    model.formTemplatePath,
    model.fieldShellComponentPath,
    model.fieldShellTemplatePath,
  ]);
}

function routerConfigurationPlanStep(): AuthoringPlanStep {
  return configurePluginPlanStep(
    'RouterConfiguration',
    '@aurelia/router',
    [
      ExpectedSemanticEffect.discriminatorFact('Router should expose route facts after reopen.', 'route', 'route', 'router'),
      routeProductSignatureEffect('Router options should be visible after RouterConfiguration is registered.', 'router-options'),
    ],
  );
}

function routedFormStateModelPlanStep(model: RoutedStateBackedFormRecipeModel): AuthoringPlanStep {
  return stateModelPlanStep(
    model.statePath,
    model.stateClassName,
    [
      ExpectedSemanticEffect.fact('State source should be visible in app topology.', 'dependency-injection', 'di', 'state-model'),
      ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
    ],
  );
}

function routedFormServicePlanSteps(model: RoutedStateBackedFormRecipeModel): readonly AuthoringPlanStep[] {
  if (!model.serviceEnabled) {
    return [];
  }
  return [
    servicePlanStep(
      model.servicePath,
      model.serviceClassName,
      [
        ExpectedSemanticEffect.discriminatorFact('Service source should be visible in app topology.', 'service-class', 'di', 'service', 'present', null, [
          new ExpectedSemanticEffectFilter('role', 'service-source'),
        ]),
        ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
      ],
    ),
  ];
}

function routedPrimaryRoutePlanStep(model: RoutedStateBackedFormRecipeModel): AuthoringPlanStep {
  return routePlanStep(
    model.routePath,
    model.routeComponentClassName,
    [
      ExpectedSemanticEffect.discriminatorFact('Route config should be visible.', 'route', 'route', 'route'),
      routeProductDiscriminatorEffect('Route config should be visible as a source-backed router product.', 'route-config'),
      routeConfigObjectLiteralEffect('Route config should close as an authored decorator object.', 'route-decorator'),
      routeConfigObjectLiteralEffect('Nested route config should close as a child routes property object.', 'child-routes-property'),
      routePatternParameterEffect('Route pattern should expose the authored request route parameter.', model.routeParameterName),
      routeEndpointParameterEffect('Route endpoint should carry the authored request route parameter.', model.routeParameterName),
      routeRecognizedParameterValueEffect('Recognized route should carry the concrete authored request route parameter value.', model.routeParameterName, model.routeParameterValue),
      viewportInstructionTreeQueryParamEffect('Viewport instruction tree should carry the authored route query mode.', model.routeQueryModeName, model.routeQueryModeValue),
      viewportInstructionTreeQueryParamEffect('Viewport instruction tree should carry repeated route query tags.', model.routeQueryTagName, model.routeQueryTagValues[0] ?? ''),
      viewportInstructionTreeFragmentEffect('Viewport instruction tree should carry the route fragment.', model.routeFragment),
      routeConfigViewportEffect('Route config should target the authored named viewport.', model.routeViewportName),
      routerViewportNameEffect('Root template should expose the authored named viewport.', model.routeViewportName),
      routerViewportNameEffect('Root template should expose the authored sidebar viewport.', model.summaryRouteViewportName),
      ...navigationOwnershipTasteEffects('Authoring orientation'),
    ],
  );
}

function routedSummaryRoutePlanStep(model: RoutedStateBackedFormRecipeModel): AuthoringPlanStep {
  return routePlanStep(
    model.summaryRoutePath,
    model.summaryRouteComponentClassName,
    [
      routeConfigViewportEffect('Summary route config should target the authored sidebar viewport.', model.summaryRouteViewportName),
    ],
  );
}

function routedFormTemplateBindingPlanStep(model: RoutedStateBackedFormRecipeModel): AuthoringPlanStep {
  return templateBindingPlanStep(
    model.formTemplatePath,
    `route-owned form composition, ${standardFormTemplateBindingSummary(model.requestFieldSchema, model.validationEnabled, ['submit trigger'])}`,
    standardFormTemplateBindingExpectedEffects({
      fieldSchema: model.requestFieldSchema,
      validation: model.validationEnabled
        ? {
          filters: validateBindingBehaviorExpectedFilters(model.validationTrigger),
          bindingBehaviorSummary: 'Validate binding behavior should materialize as a runtime application.',
          tasteSummary: 'Authoring orientation should recognize validation controller usage.',
        }
        : null,
    }),
  );
}

function routedStateBackedFormTopology(model: RoutedStateBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const fieldShell = addRoutedFieldShellComponent(builder, model);
  const form = addRoutedFormComponent(builder, model, fieldShell);
  const route = addRoutedFormRouteComponent(builder, model, form);
  const summaryRoute = addRoutedSummaryRouteComponent(builder, model);
  const root = addRoutedFormRoot(builder, model, route, summaryRoute);
  addRoutedFormState(builder, model);
  addRoutedFormService(builder, model);
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

function addRoutedFormService(
  builder: ApplicationTopologyBuilder,
  model: RoutedStateBackedFormRecipeModel,
): void {
  if (!model.serviceEnabled) {
    return;
  }
  builder.service({
    className: model.serviceClassName,
    sourcePath: model.servicePath,
    role: 'service-source',
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
    startupLane: 'Aurelia.register(RouterConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
      new ApplicationImport('@aurelia/router', ['RouterConfiguration']),
      ...(model.validationEnabled
        ? [new ApplicationImport('@aurelia/validation-html', ['ValidationHtmlConfiguration'])]
        : []),
      ...(model.i18nEnabled
        ? [new ApplicationImport('@aurelia/i18n', ['I18nConfiguration'])]
        : []),
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
      fieldSchema: model.requestFieldSchema,
    }),
    ...(model.validationEnabled
      ? standardValidatedFormAppExpectedEffects('Routed validated form app', model.validationTrigger, model.requestDomain, model.requestFieldSchema)
      : []),
    ...(model.i18nEnabled
      ? standardLocalizedFormAppExpectedEffects({
        summaryPrefix: 'Routed localized form app',
        submittedCountParameterSummary: 'Routed localized form app reads route state for translated submitted-count parameters.',
        requestSummaryParameterSummary: 'Routed localized form app observes route requestId translation parameters.',
        requestSummaryParameterSourceName: model.requestDomain.selectionIdName,
      })
      : []),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has a routed-component role.', 'component-role', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'routed-component'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Routed form app has route/router topology facts.', 'route', 'route', 'route'),
    ...(model.serviceEnabled
      ? routedServiceBackedFormExpectedEffects(model)
      : []),
    routeProductDiscriminatorEffect('Routed form app has source-backed RouteConfig products.', 'route-config'),
    routeConfigViewportEffect('Routed form app route config targets the named viewport.', model.routeViewportName),
    routeConfigViewportEffect('Routed form app summary route config targets the sidebar viewport.', model.summaryRouteViewportName),
    routeProductSignatureEffect('Routed form app has RouteContext topology products.', 'route-context'),
    routeProductSignatureEffect('Routed form app has au-viewport products.', 'router-viewport'),
    routerViewportNameEffect('Routed form app has the named router viewport.', model.routeViewportName),
    routerViewportNameEffect('Routed form app has the sidebar router viewport.', model.summaryRouteViewportName),
    routeProductSignatureEffect('Routed form app has ViewportAgent products.', 'viewport-agent'),
    routeProductSignatureEffect('Routed form app has route-recognizer pattern products.', 'route-pattern'),
    routePatternParameterEffect('Routed form app has a route pattern with the request route parameter.', model.routeParameterName),
    routeProductSignatureEffect('Routed form app has route-recognizer endpoint products.', 'route-endpoint'),
    routeEndpointParameterEffect('Routed form app has a route endpoint with the request route parameter.', model.routeParameterName),
    routeProductSignatureEffect('Routed form app has route-recognizer state products.', 'route-recognizer-state'),
    routeProductSignatureEffect('Routed form app has TypedNavigationInstruction products.', 'typed-navigation-instruction'),
    routeProductSignatureEffect('Routed form app has ViewportInstruction products.', 'viewport-instruction'),
    routeProductSignatureEffect('Routed form app has ViewportInstructionTree products.', 'viewport-instruction-tree'),
    routeProductSignatureEffect('Routed form app has RecognizedRoute products.', 'recognized-route'),
    routeRecognizedParameterEffect('Routed form app recognizes the request route parameter from static navigation.', model.routeParameterName),
    routeRecognizedParameterValueEffect('Routed form app recognizes the concrete request route parameter value.', model.routeParameterName, model.routeParameterValue),
    viewportInstructionTreeQueryParamEffect('Routed form app viewport instruction tree carries the route query mode.', model.routeQueryModeName, model.routeQueryModeValue),
    viewportInstructionTreeFragmentEffect('Routed form app viewport instruction tree carries the route fragment.', model.routeFragment),
    routeProductSignatureEffect('Routed form app has RouteTree products.', 'route-tree'),
    routeProductSignatureEffect('Routed form app has RouteNode products.', 'route-node'),
    routeNodeParameterValueEffect('Routed form app route node carries the concrete request route parameter value.', model.routeParameterName, model.routeParameterValue),
    routeNodeChildFirstParameterValueEffect('Routed form app route node exposes child-first getRouteParameters values.', model.routeParameterName, model.routeParameterValue),
    routeNodeChildFirstQueryValueEffect('Routed form app route node exposes include-query route parameter mode.', model.routeQueryModeName, model.routeQueryModeValue),
    ExpectedSemanticEffect.signatureFact('Routed form app route node preserves repeated query values in include-query route parameters.', 'route', 'route', 'route', 'present', null, [
      new ExpectedSemanticEffectFilter('routeProductKind', 'route-node'),
      new ExpectedSemanticEffectFilter('childFirstParameterAndQueryValuePairs', `${model.routeQueryTagName}=[${model.routeQueryTagValues.join(',')}]`),
    ]),
    routeNodeViewportEffect('Routed form app route node carries the named viewport.', model.routeViewportName),
    routeNodeViewportEffect('Routed form app route node carries the sidebar viewport.', model.summaryRouteViewportName),
    routeProductSignatureEffect('Routed form app has ComponentAgent handoff products.', 'component-agent'),
    routeConfigObjectLiteralEffect('Routed form app has a decorator object route config.', 'route-decorator'),
    routeConfigObjectLiteralEffect('Routed form app has a child route object config.', 'child-routes-property'),
    ...standardStateBackedRequestExpectedEffects('Routed form app', model.requestDomain, model.requestFieldSchema),
    ExpectedSemanticEffect.discriminatorCapability('Routed form app exposes verifiable router authoring for the modeled route topology.', 'router', 'verifiable'),
    ...navigationOwnershipTasteEffects('Routed form app'),
  ];
}

function routedServiceBackedFormExpectedEffects(
  model: RoutedStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureFact('Routed service-backed form app has a state service-class row.', 'service-class', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'state-source'),
      new ExpectedSemanticEffectFilter('className', model.stateClassName),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Routed service-backed form app has a service-layer service-class row.', 'service-class', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'service-source'),
      new ExpectedSemanticEffectFilter('className', model.serviceClassName),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Routed service-backed state calls the injected service boundary.', 'service-interaction', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'state-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed service-backed form submit listener calls the DI-owned state layer directly.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingTargetProperty', 'submit'),
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'call'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Routed service-backed form template bindings read DI state-backed request context.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'read'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.discriminatorTaste('Routed service-backed form app reports a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
  ];
}
