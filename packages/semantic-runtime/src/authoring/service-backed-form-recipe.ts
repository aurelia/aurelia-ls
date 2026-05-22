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
  standardFormAppExpectedEffects,
  standardStateBackedRequestExpectedEffects,
  standardFormTemplateBindingExpectedEffects,
} from './form-recipe-expected-effects.js';
import {
  standardFormTemplateBindingSummary,
  standardFormValueChannelPreferences,
} from './form-recipe-preferences.js';
import {
  componentPlanStep,
  componentStyleAssetPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  formComponentPlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  servicePlanStep,
  stateModelPlanStep,
  templateBindingPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import {
  serviceBackedFormSourcePlan,
  serviceBackedFormUsesFieldShell,
} from './service-backed-form-source-plan.js';
import {
  standardRequestFormDomainNamesFromParameters,
  type StandardRequestFormBindingMode,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import {
  standardRequestFormFieldSchemaFromRecipeRequest,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';

export interface ServiceBackedFormRecipeRequest {
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
}

interface ServiceBackedFormRecipeModel {
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
  readonly requestBindingMode: StandardRequestFormBindingMode;
}

export function buildServiceBackedFormPlan(request: ServiceBackedFormRecipeRequest): AuthoringPlan {
  const model = normalizeServiceBackedFormRecipe(request);
  const topology = serviceBackedFormTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as a DI state-owned Aurelia form app with a service-backed data boundary.`,
      topology,
      null,
      [
        new AuthoringPreference('state-ownership', 'di-owned-state-class'),
        new AuthoringPreference('state-ownership', 'di-owned-service-layer'),
        new AuthoringPreference('component-interface', model.requestBindingMode === 'single-draft-object' ? 'no-public-component-interface' : 'scalar-id-inputs'),
        new AuthoringPreference('template-model-access', 'direct-state-domain-template-binding'),
        new AuthoringPreference('template-model-access', 'template-local-domain-adaptation'),
        new AuthoringPreference('template-model-access', 'meaningful-viewmodel-adaptation'),
        new AuthoringPreference('template-source-ownership', 'external-template-file'),
        new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
        new AuthoringPreference('style-binding-model', 'class-token-binding'),
        ...standardFormValueChannelPreferences(model.requestFieldSchema),
        new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
      ],
    ),
    serviceBackedFormPreconditions(),
    serviceBackedFormPlanSteps(model, topology),
    topology,
    serviceBackedFormSourcePlan(model),
  );
}

function normalizeServiceBackedFormRecipe(request: ServiceBackedFormRecipeRequest): ServiceBackedFormRecipeModel {
  const requestDomain = standardRequestFormDomainNamesFromParameters(request.requestEntityName, request.requestSelectionIdName);
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
    formComponentPath: request.formComponentPath ?? 'src/components/service-backed-form.ts',
    formTemplatePath: request.formTemplatePath ?? 'src/components/service-backed-form.html',
    formComponentClassName: request.formComponentClassName ?? 'ServiceBackedForm',
    formElementName: request.formElementName ?? 'service-backed-form',
    fieldShellComponentPath: request.fieldShellComponentPath ?? 'src/components/field-shell.ts',
    fieldShellTemplatePath: request.fieldShellTemplatePath ?? 'src/components/field-shell.html',
    fieldShellClassName: request.fieldShellClassName ?? 'FieldShell',
    fieldShellElementName: request.fieldShellElementName ?? 'field-shell',
    requestDomain,
    requestFieldSchema: standardRequestFormFieldSchemaFromRecipeRequest(request.requestFields, request.requestOptions, request.requestEntityName),
    requestBindingMode: serviceBackedFormRequestBindingMode(request),
  };
}

function serviceBackedFormRequestBindingMode(
  request: ServiceBackedFormRecipeRequest,
): StandardRequestFormBindingMode {
  return request.requestEntityName != null
    && request.requestFields != null
    && request.requestSelectionIdName == null
      ? 'single-draft-object'
      : 'selected-existing-object';
}

function serviceBackedFormPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
  ];
}

function serviceBackedFormPlanSteps(
  model: ServiceBackedFormRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  const usesFieldShell = serviceBackedFormUsesFieldShell(model);
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.rootStylePath,
      model.statePath,
      model.servicePath,
      model.formComponentPath,
      model.formTemplatePath,
      ...(usesFieldShell
        ? [
          model.fieldShellComponentPath,
          model.fieldShellTemplatePath,
        ]
        : []),
    ]),
    stateModelPlanStep(
      model.statePath,
      model.stateClassName,
      [
        ExpectedSemanticEffect.signatureFact('State source should be visible in app topology.', 'service-class', 'di', 'state-model', 'present', null, [
          new ExpectedSemanticEffectFilter('role', 'state-source'),
        ]),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
      ],
    ),
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
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    componentStyleAssetPlanStep(model.rootStylePath),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    ...(usesFieldShell
      ? [
        componentPlanStep(model.fieldShellComponentPath, model.fieldShellClassName, model.fieldShellElementName, 'Field shell'),
        externalTemplatePlanStep(model.fieldShellTemplatePath, model.fieldShellClassName, 'Field shell component'),
      ]
      : []),
    formComponentPlanStep(model.formComponentPath, model.formComponentClassName, model.formElementName),
    externalTemplatePlanStep(model.formTemplatePath, model.formComponentClassName, 'Form component'),
    templateBindingPlanStep(
      model.formTemplatePath,
      standardFormTemplateBindingSummary(model.requestFieldSchema, false, ['submit trigger', 'DI state/service handoff']),
      standardFormTemplateBindingExpectedEffects({ fieldSchema: model.requestFieldSchema, usesFieldShell }),
    ),
    verifyAppPlanStep(topology, serviceBackedFormExpectedEffects(model)),
  ];
}

function serviceBackedFormTopology(model: ServiceBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const fieldShell = serviceBackedFormUsesFieldShell(model)
    ? addServiceBackedFieldShellComponent(builder, model)
    : null;
  const form = addServiceBackedFormComponent(builder, model, fieldShell);
  const root = addServiceBackedFormRoot(builder, model, form);
  addServiceBackedFormState(builder, model);
  addServiceBackedFormService(builder, model);
  addServiceBackedFormEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addServiceBackedFormComponent(
  builder: ApplicationTopologyBuilder,
  model: ServiceBackedFormRecipeModel,
  fieldShell: ApplicationComponentTopologyResult | null,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.formComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.formComponentPath,
    elementName: model.formElementName,
    templatePath: model.formTemplatePath,
    dependencies: fieldShell == null ? [] : [fieldShell.reference],
  });
}

function addServiceBackedFieldShellComponent(
  builder: ApplicationTopologyBuilder,
  model: ServiceBackedFormRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.fieldShellClassName,
    referenceFromPath: model.formComponentPath,
    sourcePath: model.fieldShellComponentPath,
    elementName: model.fieldShellElementName,
    templatePath: model.fieldShellTemplatePath,
  });
}

function addServiceBackedFormRoot(
  builder: ApplicationTopologyBuilder,
  model: ServiceBackedFormRecipeModel,
  form: ApplicationComponentTopologyResult,
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
    dependencies: [form.reference],
  });
}

function addServiceBackedFormState(
  builder: ApplicationTopologyBuilder,
  model: ServiceBackedFormRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addServiceBackedFormService(
  builder: ApplicationTopologyBuilder,
  model: ServiceBackedFormRecipeModel,
): void {
  builder.service({
    className: model.serviceClassName,
    sourcePath: model.servicePath,
    role: 'service-source',
  });
}

function addServiceBackedFormEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: ServiceBackedFormRecipeModel,
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

function serviceBackedFormExpectedEffects(model: ServiceBackedFormRecipeModel): readonly ExpectedSemanticEffect[] {
  const usesFieldShell = serviceBackedFormUsesFieldShell(model);
  return [
    ...standardFormAppExpectedEffects({
      summaryPrefix: 'Service-backed form app',
      componentCount: usesFieldShell ? 3 : 2,
      componentCountSummary: usesFieldShell ? 'root, form, and field shell custom elements' : 'root and form custom elements',
      externalTemplateCount: usesFieldShell ? 3 : 2,
      compiledTemplateCount: usesFieldShell ? 3 : 2,
      fieldSchema: model.requestFieldSchema,
      usesFieldShell,
    }),
    ExpectedSemanticEffect.signatureFact('Service-backed form app has a state service-class row.', 'service-class', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'state-source'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Service-backed form app has a service-layer service-class row.', 'service-class', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'service-source'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('DI-owned state calls the injected service boundary.', 'service-interaction', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'state-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form submit listener calls the DI-owned state layer directly.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingTargetProperty', 'submit'),
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'call'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form template bindings read DI state-backed request context.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'read'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form interpolated member bindings hand off through the state getter root.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingSourceKind', 'other'),
      new ExpectedSemanticEffectFilter('bindingTargetProperty', 'textContent'),
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'read'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ...standardStateBackedRequestExpectedEffects('Service-backed form', model.requestDomain, model.requestFieldSchema, model.requestBindingMode),
    ExpectedSemanticEffect.discriminatorTaste('Service-backed form app reports a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
  ];
}
