import {
  type ApplicationComponentTopologyResult,
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  AddTemplateBindingOperation,
  CreateEntrypointOperation,
  CreateExternalTemplateOperation,
  CreateFormComponentOperation,
  CreateProjectFilesOperation,
  CreateRootComponentOperation,
  CreateServiceOperation,
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
import { serviceBackedFormSourcePlan } from './service-backed-form-source-plan.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';

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
      `Create ${model.appName} as a DI service-backed Aurelia form app.`,
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
    new AuthoringPlanStep(
      new CreateProjectFilesOperation([
        model.entrypointPath,
        model.rootComponentPath,
        model.rootTemplatePath,
        model.rootStylePath,
        model.statePath,
        model.servicePath,
        model.formComponentPath,
        model.formTemplatePath,
      ]),
      [ExpectedSemanticEffect.fact('Project should reopen as an Aurelia app.', 'project-shape')],
    ),
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
    new AuthoringPlanStep(
      new CreateEntrypointOperation(model.entrypointPath, model.rootComponentClassName),
      [ExpectedSemanticEffect.fact('App root should be visible after reopen.', 'app-root', 'app', 'entrypoint')],
    ),
    new AuthoringPlanStep(
      new CreateRootComponentOperation(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
      [ExpectedSemanticEffect.fact('Root component should be a custom element.', 'component', 'resource', 'app-root')],
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
      [ExpectedSemanticEffect.fact('Root component should use an external template.', 'external-template', 'template', 'template')],
    ),
    new AuthoringPlanStep(
      new CreateFormComponentOperation(model.formComponentPath, model.formComponentClassName, model.formElementName),
      [ExpectedSemanticEffect.fact('Form component should be a custom element.', 'component', 'resource', 'component')],
    ),
    new AuthoringPlanStep(
      new CreateExternalTemplateOperation(model.formTemplatePath, model.formComponentClassName),
      [ExpectedSemanticEffect.fact('Form component should use an external template.', 'external-template', 'template', 'template')],
    ),
    new AuthoringPlanStep(
      new AddTemplateBindingOperation(
        model.formTemplatePath,
        'native value binding routed through an injected service layer',
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
      serviceBackedFormExpectedEffects(),
    ),
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
    ExpectedSemanticEffect.fact('Service-backed form app reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Service-backed form app'),
    ExpectedSemanticEffect.fact('Service-backed form app has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Service-backed form app has root and form custom elements.', 'component', 'resource', 2, 'component'),
    ExpectedSemanticEffect.signatureFact('Service-backed form app has a state service-class row.', 'service-class', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'state-source'),
    ]),
    ExpectedSemanticEffect.discriminatorFact('Service-backed form app has a service-layer service-class row.', 'service-class', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('role', 'service-source'),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form component calls the injected service layer.', 'service-interaction', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'component-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed service calls the DI-owned state layer.', 'service-interaction', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'service-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'call'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form component reads service-layer projection properties.', 'service-interaction', 'di', 'service', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'component-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'read'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed service reads DI-owned state projection properties.', 'service-interaction', 'di', 'state-model', 'present', null, [
      new ExpectedSemanticEffectFilter('consumerRole', 'service-source'),
      new ExpectedSemanticEffectFilter('targetRole', 'state-source'),
      new ExpectedSemanticEffectFilter('operationKind', 'read'),
      new ExpectedSemanticEffectFilter('isSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form input bindings hand off setter writes to the service layer.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingDirection', 'two-way'),
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'call'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form template bindings read service projection properties.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'read'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form interpolated member bindings hand off through the projection getter root.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('bindingSourceKind', 'other'),
      new ExpectedSemanticEffectFilter('bindingTargetProperty', 'textContent'),
      new ExpectedSemanticEffectFilter('interactionTargetRole', 'service-source'),
      new ExpectedSemanticEffectFilter('interactionOperationKind', 'read'),
      new ExpectedSemanticEffectFilter('interactionIsSelfInteraction', false),
    ]),
    ExpectedSemanticEffect.fact('Service-backed form app has an app-root component role.', 'component-role', 'resource', 'app-root', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'app-root'),
    ]),
    ExpectedSemanticEffect.fact('Service-backed form app has a component-composition host role.', 'component-role', 'resource', 'component', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'component-composition-host'),
    ]),
    ExpectedSemanticEffect.signatureFact('Service-backed form app has a data-entry component role.', 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'data-entry-surface'),
    ]),
    ExpectedSemanticEffect.atLeast('Service-backed form app has external templates.', 'external-template', 'template', 2, 'template'),
    componentStylesheetEffect('Service-backed form app has a component stylesheet.'),
    componentStylesheetCapabilityEffect('Service-backed form app exposes verifiable style asset authoring.'),
    ExpectedSemanticEffect.atLeast('Service-backed form app has compiled template facts.', 'template-compilation', 'template', 2, 'template'),
    ExpectedSemanticEffect.fact('Service-backed form app has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    nativeValueTargetAccessEffect('Service-backed form app has native value binding target access.'),
    nativeValueChannelEffect('Service-backed form app has native value binding channels.'),
    nativeValueDataFlowEffect('Service-backed form app has native value binding data flows.'),
    ExpectedSemanticEffect.absent('Service-backed form app has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.capability('Service-backed form app exposes verifiable template composition.', 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste('Service-backed form app reports DI-owned state taste.', 'state-ownership', 'di-owned-state-class', 'state-model'),
    ExpectedSemanticEffect.discriminatorTaste('Service-backed form app reports a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
    componentStylesheetTasteEffect('Service-backed form app reports component stylesheet taste.'),
    classTokenStyleTasteEffect('Service-backed form app reports class-token style binding taste.'),
    ...nativeFormValueTasteEffects(
      'Service-backed form app reports native form value binding taste.',
      'Service-backed form app reports select model binding taste.',
    ),
  ];
}
