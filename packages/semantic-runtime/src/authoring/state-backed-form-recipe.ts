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
import { ExpectedSemanticEffect } from './expected-effect.js';
import { AuthoringPreference } from './ontology.js';
import {
  stateBackedFormSourcePlan,
  stateBackedFormUsesFieldShell,
  type StateBackedFormValidationTriggerName,
} from './state-backed-form-source-plan.js';
import {
  standardRequestFormDomainNamesFromParameters,
  type StandardRequestFormBindingMode,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import {
  standardRequestFormFieldSchemaFromRecipeRequest,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';
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
  componentPlanStep,
  componentStyleAssetPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  formComponentPlanStep,
  i18nConfigurationPlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  stateModelPlanStep,
  templateBindingPlanStep,
  validationHtmlConfigurationPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';

export interface StateBackedFormRecipeRequest {
  /** Project root that the authored app should occupy. */
  readonly rootDir: string;
  /** User-facing app name for plan summaries. */
  readonly appName: string;
  /** Entrypoint source path, usually `src/main.ts`. */
  readonly entrypointPath?: string;
  /** Root component source path, usually `src/app.ts`. */
  readonly rootComponentPath?: string;
  /** Root component template path, usually `src/app.html`. */
  readonly rootTemplatePath?: string;
  /** Root component stylesheet path, usually `src/app.css`. */
  readonly rootStylePath?: string;
  /** Root component class name. */
  readonly rootComponentClassName?: string;
  /** Root custom element name. */
  readonly rootElementName?: string;
  /** State source path. */
  readonly statePath?: string;
  /** State class name. */
  readonly stateClassName?: string;
  /** Form component source path. */
  readonly formComponentPath?: string;
  /** Form template path. */
  readonly formTemplatePath?: string;
  /** Form component class name. */
  readonly formComponentClassName?: string;
  /** Form custom element name. */
  readonly formElementName?: string;
  /** Capture-based field shell source path. */
  readonly fieldShellComponentPath?: string;
  /** Capture-based field shell template path. */
  readonly fieldShellTemplatePath?: string;
  /** Capture-based field shell class name. */
  readonly fieldShellClassName?: string;
  /** Capture-based field shell custom element name. */
  readonly fieldShellElementName?: string;
  /** Caller-domain editable entity name for source-parameterized request-form identity. */
  readonly requestEntityName?: string;
  /** Scalar identity property used by component/template-local request selection. */
  readonly requestSelectionIdName?: string;
  /** Caller-domain editable field/control schema for source-parameterized request forms. */
  readonly requestFields?: string;
  /** Caller-domain option groups for select and checked-collection fields. */
  readonly requestOptions?: string;
  /** Include validation-html configuration, rules, controller usage, and validate binding behavior. */
  readonly validationEnabled?: boolean;
  /** Optional static trigger argument for generated validation binding behavior applications. */
  readonly validationTrigger?: StateBackedFormValidationTriggerName | null;
  /** Include i18n configuration, static translation resources, and translated template text. */
  readonly i18nEnabled?: boolean;
}

interface StateBackedFormRecipeModel {
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
  readonly validationEnabled: boolean;
  readonly validationTrigger: StateBackedFormValidationTriggerName | null;
  readonly i18nEnabled: boolean;
}

export function buildStateBackedFormPlan(request: StateBackedFormRecipeRequest): AuthoringPlan {
  const model = normalizeStateBackedFormRecipe(request);
  return buildStateBackedFormPlanFromModel(model);
}

export function buildValidatedStateBackedFormPlan(request: Omit<StateBackedFormRecipeRequest, 'validationEnabled'>): AuthoringPlan {
  const model = normalizeStateBackedFormRecipe({
    ...request,
    validationEnabled: true,
    validationTrigger: request.validationTrigger === undefined ? 'blur' : request.validationTrigger,
  });
  return buildStateBackedFormPlanFromModel(model);
}

export function buildLocalizedStateBackedFormPlan(request: Omit<StateBackedFormRecipeRequest, 'i18nEnabled'>): AuthoringPlan {
  const model = normalizeStateBackedFormRecipe({
    ...request,
    i18nEnabled: true,
  });
  return buildStateBackedFormPlanFromModel(model);
}

export function buildLocalizedValidatedStateBackedFormPlan(
  request: Omit<StateBackedFormRecipeRequest, 'i18nEnabled' | 'validationEnabled'>,
): AuthoringPlan {
  const model = normalizeStateBackedFormRecipe({
    ...request,
    i18nEnabled: true,
    validationEnabled: true,
    validationTrigger: request.validationTrigger === undefined ? 'blur' : request.validationTrigger,
  });
  return buildStateBackedFormPlanFromModel(model);
}

function buildStateBackedFormPlanFromModel(model: StateBackedFormRecipeModel): AuthoringPlan {
  const topology = stateBackedFormTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      stateBackedFormIntentSummary(model),
      topology,
      null,
      stateBackedFormPreferences(model),
    ),
    stateBackedFormPreconditions(),
    stateBackedFormPlanSteps(model, topology),
    topology,
    stateBackedFormSourcePlan(model),
  );
}

function normalizeStateBackedFormRecipe(request: StateBackedFormRecipeRequest): StateBackedFormRecipeModel {
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
    formComponentPath: request.formComponentPath ?? 'src/components/state-backed-form.ts',
    formTemplatePath: request.formTemplatePath ?? 'src/components/state-backed-form.html',
    formComponentClassName: request.formComponentClassName ?? 'StateBackedForm',
    formElementName: request.formElementName ?? 'state-backed-form',
    fieldShellComponentPath: request.fieldShellComponentPath ?? 'src/components/field-shell.ts',
    fieldShellTemplatePath: request.fieldShellTemplatePath ?? 'src/components/field-shell.html',
    fieldShellClassName: request.fieldShellClassName ?? 'FieldShell',
    fieldShellElementName: request.fieldShellElementName ?? 'field-shell',
    requestDomain: standardRequestFormDomainNamesFromParameters(request.requestEntityName, request.requestSelectionIdName),
    requestFieldSchema: standardRequestFormFieldSchemaFromRecipeRequest(request.requestFields, request.requestOptions, request.requestEntityName),
    requestBindingMode: stateBackedFormRequestBindingMode(request),
    validationEnabled: request.validationEnabled === true,
    validationTrigger: request.validationTrigger ?? null,
    i18nEnabled: request.i18nEnabled === true,
  };
}

function stateBackedFormIntentSummary(model: StateBackedFormRecipeModel): string {
  if (model.i18nEnabled && model.validationEnabled) {
    return `Create ${model.appName} as a DI state-backed Aurelia form app with static i18n resources and validation-html validation.`;
  }
  if (model.i18nEnabled) {
    return `Create ${model.appName} as a DI state-backed Aurelia form app with static i18n resources.`;
  }
  return model.validationEnabled
    ? `Create ${model.appName} as a DI state-backed Aurelia form app with validation-html validation.`
    : `Create ${model.appName} as a DI state-backed Aurelia form app.`;
}

function stateBackedFormPreferences(model: StateBackedFormRecipeModel): readonly AuthoringPreference[] {
  return [
    new AuthoringPreference('state-ownership', 'di-owned-state-class'),
    new AuthoringPreference('component-interface', model.requestBindingMode === 'single-draft-object' ? 'no-public-component-interface' : 'scalar-id-inputs'),
    new AuthoringPreference('template-model-access', 'direct-state-domain-template-binding'),
    new AuthoringPreference('template-model-access', 'template-local-domain-adaptation'),
    new AuthoringPreference('template-model-access', 'meaningful-viewmodel-adaptation'),
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

function stateBackedFormRequestBindingMode(
  request: StateBackedFormRecipeRequest,
): StandardRequestFormBindingMode {
  return request.requestEntityName != null
    && request.requestFields != null
    && request.requestSelectionIdName == null
      ? 'single-draft-object'
      : 'selected-existing-object';
}

function stateBackedFormPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
  ];
}

function stateBackedFormPlanSteps(
  model: StateBackedFormRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  const usesFieldShell = stateBackedFormUsesFieldShell(model);
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.rootStylePath,
      model.statePath,
      model.formComponentPath,
      model.formTemplatePath,
      ...(usesFieldShell
        ? [
          model.fieldShellComponentPath,
          model.fieldShellTemplatePath,
        ]
        : []),
    ]),
    ...(model.i18nEnabled ? [i18nConfigurationPlanStep()] : []),
    ...(model.validationEnabled ? [validationHtmlConfigurationPlanStep()] : []),
    stateModelPlanStep(
      model.statePath,
      model.stateClassName,
      [
        ExpectedSemanticEffect.fact('State source should be visible in app topology.', 'dependency-injection', 'di', 'state-model'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
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
      standardFormTemplateBindingSummary(model.requestFieldSchema, model.validationEnabled, ['submit trigger', 'form diagnostics surface']),
      standardFormTemplateBindingExpectedEffects({
        fieldSchema: model.requestFieldSchema,
        usesFieldShell,
        validation: model.validationEnabled
          ? {
            filters: validateBindingBehaviorExpectedFilters(model.validationTrigger),
            bindingBehaviorSummary: 'Validate binding behavior should materialize as a runtime application.',
            tasteSummary: 'Authoring orientation should recognize validation controller usage.',
          }
          : null,
      }),
    ),
    verifyAppPlanStep(topology, stateBackedFormExpectedEffects(model)),
  ];
}

function stateBackedFormTopology(model: StateBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const fieldShell = stateBackedFormUsesFieldShell(model)
    ? addStateBackedFieldShellComponent(builder, model)
    : null;
  const form = addStateBackedFormComponent(builder, model, fieldShell);
  const root = addStateBackedFormRoot(builder, model, form);
  addStateBackedFormState(builder, model);
  addStateBackedFormEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addStateBackedFormComponent(
  builder: ApplicationTopologyBuilder,
  model: StateBackedFormRecipeModel,
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

function addStateBackedFieldShellComponent(
  builder: ApplicationTopologyBuilder,
  model: StateBackedFormRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.fieldShellClassName,
    referenceFromPath: model.formComponentPath,
    sourcePath: model.fieldShellComponentPath,
    elementName: model.fieldShellElementName,
    templatePath: model.fieldShellTemplatePath,
  });
}

function addStateBackedFormRoot(
  builder: ApplicationTopologyBuilder,
  model: StateBackedFormRecipeModel,
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

function addStateBackedFormState(
  builder: ApplicationTopologyBuilder,
  model: StateBackedFormRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addStateBackedFormEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: StateBackedFormRecipeModel,
  root: ApplicationComponentTopologyResult,
): void {
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: model.validationEnabled || model.i18nEnabled
      ? 'Aurelia.register(...).app(...).start()'
      : 'Aurelia.app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
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

function stateBackedFormExpectedEffects(model: StateBackedFormRecipeModel): readonly ExpectedSemanticEffect[] {
  const usesFieldShell = stateBackedFormUsesFieldShell(model);
  return [
    ...standardFormAppExpectedEffects({
      summaryPrefix: 'Generated form app',
      componentCount: usesFieldShell ? 3 : 2,
      componentCountSummary: usesFieldShell ? 'root, form, and field shell custom elements' : 'root and form custom elements',
      externalTemplateCount: usesFieldShell ? 3 : 2,
      compiledTemplateCount: usesFieldShell ? 3 : 2,
      fieldSchema: model.requestFieldSchema,
      usesFieldShell,
    }),
    ...standardStateBackedRequestExpectedEffects('Generated form app', model.requestDomain, model.requestFieldSchema, model.requestBindingMode),
    ...(model.validationEnabled
      ? standardValidatedFormAppExpectedEffects('Validated form app', model.validationTrigger, model.requestDomain, model.requestFieldSchema)
      : []),
    ...(model.i18nEnabled
      ? standardLocalizedFormAppExpectedEffects({
        summaryPrefix: 'Localized form app',
        submittedCountParameterSummary: 'Localized form app reads DI state directly for translated submitted-count parameters.',
        requestSummaryParameterSummary: model.requestBindingMode === 'single-draft-object'
          ? 'Localized form app renders draft summary translation without reintroducing scalar selection parameters.'
          : 'Localized form app observes shorthand object-literal translation parameters.',
        requestSummaryParameterSourceName: model.requestBindingMode === 'single-draft-object'
          ? null
          : model.requestDomain.selectionIdName,
      })
      : []),
  ];
}
