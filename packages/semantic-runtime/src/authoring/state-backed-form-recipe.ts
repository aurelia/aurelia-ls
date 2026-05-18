import {
  type ApplicationComponentTopologyResult,
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  CreateStateModelOperation,
  ConfigurePluginOperation,
  CreateComponentOperation,
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
  stateBackedFormSourcePlan,
  type StateBackedFormValidationTriggerName,
} from './state-backed-form-source-plan.js';
import {
  standardFormAppExpectedEffects,
  standardFormTemplateBindingExpectedEffects,
} from './form-recipe-expected-effects.js';
import {
  validationErrorsDataFlowEffect,
  validationErrorsTargetAccessEffect,
  validationErrorsValueChannelEffect,
} from './form-expected-effects.js';
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
    validationEnabled: request.validationEnabled === true,
    validationTrigger: request.validationTrigger ?? null,
    i18nEnabled: request.i18nEnabled === true,
  };
}

function stateBackedFormIntentSummary(model: StateBackedFormRecipeModel): string {
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
    new AuthoringPreference('component-interface', 'scalar-id-inputs'),
    new AuthoringPreference('template-source-ownership', 'external-template-file'),
    new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
    new AuthoringPreference('style-binding-model', 'class-token-binding'),
    new AuthoringPreference('form-value-channel', 'native-control-value-binding'),
    new AuthoringPreference('form-value-channel', 'checked-model-binding'),
    new AuthoringPreference('form-value-channel', 'select-model-binding'),
    new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
    ...(model.validationEnabled
      ? [new AuthoringPreference('validation-ownership', 'validation-controller-usage')]
      : []),
    ...(model.i18nEnabled
      ? [new AuthoringPreference('resource-admission-mode', 'plugin-registration-admission')]
      : []),
  ];
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
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.rootStylePath,
      model.statePath,
      model.formComponentPath,
      model.formTemplatePath,
      model.fieldShellComponentPath,
      model.fieldShellTemplatePath,
    ]),
    ...(model.i18nEnabled
      ? [new AuthoringPlanStep(
        new ConfigurePluginOperation('I18nConfiguration', '@aurelia/i18n'),
        [
          ExpectedSemanticEffect.discriminatorFact('I18n plugin configuration should admit static translation resources.', 'dependency-injection', 'di', 'plugin'),
          ExpectedSemanticEffect.discriminatorFact('Static i18n resources should expose the app title translation key.', 'i18n-translation-key', 'template', 'plugin', 'present', null, [
            new ExpectedSemanticEffectFilter('key', 'app.title'),
            new ExpectedSemanticEffectFilter('locale', 'en'),
            new ExpectedSemanticEffectFilter('namespace', 'translation'),
          ]),
          ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize plugin registration admission.', 'resource-admission-mode', 'plugin-registration-admission', 'plugin'),
        ],
      )]
      : []),
    ...(model.validationEnabled
      ? [new AuthoringPlanStep(
        new ConfigurePluginOperation('ValidationHtmlConfiguration', '@aurelia/validation-html'),
        [
          ExpectedSemanticEffect.discriminatorFact('Validation plugin configuration should admit DI and validation-html resources.', 'dependency-injection', 'di', 'plugin'),
          ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize validation controller usage.', 'validation-ownership', 'validation-controller-usage', 'template-binding'),
        ],
      )]
      : []),
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
      model.validationEnabled
        ? 'native value binding, validation behavior, checked/model binding, submit trigger, and form diagnostics surface'
        : 'native value binding, checked/model binding, submit trigger, and form diagnostics surface',
      standardFormTemplateBindingExpectedEffects({
        validation: model.validationEnabled
          ? {
            filters: validateBindingBehaviorExpectedFilters(model),
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
  const fieldShell = addStateBackedFieldShellComponent(builder, model);
  const form = addStateBackedFormComponent(builder, model, fieldShell);
  const root = addStateBackedFormRoot(builder, model, form);
  addStateBackedFormState(builder, model);
  addStateBackedFormEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addStateBackedFormComponent(
  builder: ApplicationTopologyBuilder,
  model: StateBackedFormRecipeModel,
  fieldShell: ApplicationComponentTopologyResult,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.formComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.formComponentPath,
    elementName: model.formElementName,
    templatePath: model.formTemplatePath,
    dependencies: [fieldShell.reference],
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
    startupLane: 'new Aurelia().register(StandardConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('@aurelia/runtime-html', ['Aurelia', 'StandardConfiguration']),
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
  return [
    ...standardFormAppExpectedEffects({
      summaryPrefix: 'Generated form app',
      componentCount: 3,
      componentCountSummary: 'root, form, and field shell custom elements',
      externalTemplateCount: 3,
      compiledTemplateCount: 3,
    }),
    ...(model.validationEnabled
      ? [
        ExpectedSemanticEffect.discriminatorFact('Validated form app materializes validate binding behavior applications.', 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, [
          ...validateBindingBehaviorExpectedFilters(model),
        ]),
        validationErrorsTargetAccessEffect('Validated form app materializes validation-errors errors target access.'),
        validationErrorsValueChannelEffect('Validated form app materializes validation-errors errors value channels.'),
        validationErrorsDataFlowEffect('Validated form app materializes validation-errors errors from-view data flow.'),
        ExpectedSemanticEffect.discriminatorTaste('Validated form app reports validation controller/plugin usage.', 'validation-ownership', 'validation-controller-usage', 'template-binding'),
      ]
      : []),
    ...(model.i18nEnabled
      ? [
        ExpectedSemanticEffect.discriminatorAtLeast('Localized form app exposes static i18n translation keys.', 'i18n-translation-key', 'template', 6, 'plugin'),
        ExpectedSemanticEffect.discriminatorAtLeast('Localized form app renders i18n translation binding groups.', 'i18n-translation-binding', 'template', 6, 'template-binding', [
          new ExpectedSemanticEffectFilter('issueCount', 0),
        ]),
        ExpectedSemanticEffect.signatureFact('Localized form app exposes the translated submit label key.', 'i18n-translation-key', 'template', 'plugin', 'present', null, [
          new ExpectedSemanticEffectFilter('key', 'form.submit'),
          new ExpectedSemanticEffectFilter('locale', 'en'),
          new ExpectedSemanticEffectFilter('namespace', 'translation'),
        ]),
        ExpectedSemanticEffect.signatureFact('Localized form app renders parameterized translation bindings.', 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
          new ExpectedSemanticEffectFilter('hasParameterBinding', true),
          new ExpectedSemanticEffectFilter('issueCount', 0),
        ]),
        ExpectedSemanticEffect.signatureFact('Localized form app renders the translated submit label binding.', 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
          new ExpectedSemanticEffectFilter('staticKey', 'form.submit'),
          new ExpectedSemanticEffectFilter('issueCount', 0),
        ]),
        ExpectedSemanticEffect.signatureFact('Localized form app renders a translated submit title target.', 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
          new ExpectedSemanticEffectFilter('staticKeys', 'form.submit'),
          new ExpectedSemanticEffectFilter('targetProperties', 'title'),
          new ExpectedSemanticEffectFilter('targetKinds', 'attribute-or-property'),
          new ExpectedSemanticEffectFilter('issueCount', 0),
        ]),
        ExpectedSemanticEffect.signatureTaste('Localized form app reports plugin registration admission.', 'resource-admission-mode', 'plugin-registration-admission', 'plugin'),
      ]
      : []),
  ];
}

function validateBindingBehaviorExpectedFilters(model: StateBackedFormRecipeModel): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('behaviorName', 'validate'),
    ...(model.validationTrigger == null
      ? []
      : [new ExpectedSemanticEffectFilter('staticArgumentValues', model.validationTrigger)]),
  ];
}
