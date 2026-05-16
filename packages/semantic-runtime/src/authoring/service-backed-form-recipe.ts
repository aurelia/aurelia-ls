import {
  type ApplicationComponentTopologyResult,
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
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
import { serviceBackedFormSourcePlan } from './service-backed-form-source-plan.js';

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
        new AuthoringPreference('component-interface', 'scalar-id-inputs'),
        new AuthoringPreference('template-source-ownership', 'external-template-file'),
        new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
        new AuthoringPreference('style-binding-model', 'class-token-binding'),
        new AuthoringPreference('form-value-channel', 'native-control-value-binding'),
        new AuthoringPreference('form-value-channel', 'checked-model-binding'),
        new AuthoringPreference('form-value-channel', 'select-model-binding'),
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
    servicePath: request.servicePath ?? 'src/services/request-service.ts',
    serviceClassName: request.serviceClassName ?? 'RequestService',
    formComponentPath: request.formComponentPath ?? 'src/components/service-backed-form.ts',
    formTemplatePath: request.formTemplatePath ?? 'src/components/service-backed-form.html',
    formComponentClassName: request.formComponentClassName ?? 'ServiceBackedForm',
    formElementName: request.formElementName ?? 'service-backed-form',
  };
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
    ]),
    new AuthoringPlanStep(
      new CreateStateModelOperation(model.statePath, model.stateClassName),
      [
        ExpectedSemanticEffect.signatureFact('State source should be visible in app topology.', 'service-class', 'di', 'state-model', 'present', null, [
          new ExpectedSemanticEffectFilter('role', 'state-source'),
        ]),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
      ],
    ),
    new AuthoringPlanStep(
      new CreateServiceOperation(model.servicePath, model.serviceClassName),
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
    formComponentPlanStep(model.formComponentPath, model.formComponentClassName, model.formElementName),
    externalTemplatePlanStep(model.formTemplatePath, model.formComponentClassName, 'Form component'),
    templateBindingPlanStep(
      model.formTemplatePath,
      'native value binding, checked/model binding, select model binding, and DI state/service handoff',
      standardFormTemplateBindingExpectedEffects(),
    ),
    verifyAppPlanStep(topology, serviceBackedFormExpectedEffects()),
  ];
}

function serviceBackedFormTopology(model: ServiceBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const form = addServiceBackedFormComponent(builder, model);
  const root = addServiceBackedFormRoot(builder, model, form);
  addServiceBackedFormState(builder, model);
  addServiceBackedFormService(builder, model);
  addServiceBackedFormEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addServiceBackedFormComponent(
  builder: ApplicationTopologyBuilder,
  model: ServiceBackedFormRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.formComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.formComponentPath,
    elementName: model.formElementName,
    templatePath: model.formTemplatePath,
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
    startupLane: 'new Aurelia().register(StandardConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('@aurelia/runtime-html', ['Aurelia', 'StandardConfiguration']),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
}

function serviceBackedFormExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ...standardFormAppExpectedEffects({
      summaryPrefix: 'Service-backed form app',
      componentCount: 2,
      componentCountSummary: 'root and form custom elements',
      externalTemplateCount: 2,
      compiledTemplateCount: 2,
    }),
    ExpectedSemanticEffect.signatureFact('Service-backed form app has a state service-class row.', 'service-class', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'state-source'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Service-backed form app has a service-layer service-class row.', 'service-class', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'service-source'),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form component calls the DI-owned state layer.', 'service-interaction', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'component-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.discriminatorFact('DI-owned state calls the injected service boundary.', 'service-interaction', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'state-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form component reads state projection properties.', 'service-interaction', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'component-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'read'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form input bindings hand off setter writes to DI state.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingDirection', 'two-way'),
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'call'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form template bindings read DI state projection properties.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
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
    ExpectedSemanticEffect.discriminatorTaste('Service-backed form app reports a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
  ];
}
