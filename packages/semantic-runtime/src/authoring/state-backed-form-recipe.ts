import {
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
  CreateStyleAssetOperation,
  CreateStateModelOperation,
  ConfigurePluginOperation,
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
  stateBackedFormSourcePlan,
  type StateBackedFormValidationTriggerName,
} from './state-backed-form-source-plan.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
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
  /** Include validation-html configuration, rules, controller usage, and validate binding behavior. */
  readonly validationEnabled?: boolean;
  /** Optional static trigger argument for generated validation binding behavior applications. */
  readonly validationTrigger?: StateBackedFormValidationTriggerName | null;
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
  readonly validationEnabled: boolean;
  readonly validationTrigger: StateBackedFormValidationTriggerName | null;
}

export function buildStateBackedFormPlan(request: StateBackedFormRecipeRequest): AuthoringPlan {
  const model = normalizeStateBackedFormRecipe(request);
  return buildStateBackedFormPlanFromModel(model);
}

export function buildValidatedStateBackedFormPlan(request: Omit<StateBackedFormRecipeRequest, 'validationEnabled'>): AuthoringPlan {
  const model = normalizeStateBackedFormRecipe({
    ...request,
    validationEnabled: true,
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
    validationEnabled: request.validationEnabled === true,
    validationTrigger: request.validationTrigger ?? null,
  };
}

function stateBackedFormIntentSummary(model: StateBackedFormRecipeModel): string {
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
    new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
    ...(model.validationEnabled
      ? [new AuthoringPreference('validation-ownership', 'validation-controller-usage')]
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
    new AuthoringPlanStep(
      new CreateProjectFilesOperation([
        model.entrypointPath,
        model.rootComponentPath,
        model.rootTemplatePath,
        model.rootStylePath,
        model.statePath,
        model.formComponentPath,
        model.formTemplatePath,
      ]),
      [
        ExpectedSemanticEffect.fact('Project should reopen as an Aurelia app.', 'project-shape'),
      ],
    ),
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
        model.validationEnabled
          ? 'native value binding, validation behavior, checked/model binding, submit trigger, and form diagnostics surface'
          : 'native value binding, checked/model binding, submit trigger, and form diagnostics surface',
      ),
      [
        nativeValueTargetAccessEffect('Form should expose target access for native value bindings.'),
        nativeValueChannelEffect('Form should expose observer-backed value channels for native value bindings.'),
        nativeValueDataFlowEffect('Form should expose TypeChecker-backed data flow for native value bindings.'),
        ...nativeFormValueTasteEffects(
          'Authoring orientation should recognize native form value binding.',
          'Authoring orientation should recognize select model binding.',
        ),
        classTokenStyleTasteEffect('Authoring orientation should recognize class-token style binding.'),
        ...(model.validationEnabled
          ? [
            ExpectedSemanticEffect.discriminatorFact('Validate binding behavior should materialize as a runtime application.', 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, [
              ...validateBindingBehaviorExpectedFilters(model),
            ]),
            ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize validation controller usage.', 'validation-ownership', 'validation-controller-usage', 'template-binding'),
          ]
          : []),
      ],
    ),
    new AuthoringPlanStep(
      new VerifyAppOperation(topology),
      stateBackedFormExpectedEffects(model),
    ),
  ];
}

function stateBackedFormTopology(model: StateBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const form = builder.component({
    className: model.formComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.formComponentPath,
    elementName: model.formElementName,
    templatePath: model.formTemplatePath,
  });
  const root = builder.component({
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
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'new Aurelia().register(StandardConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('@aurelia/runtime-html', ['Aurelia', 'StandardConfiguration']),
      ...(model.validationEnabled
        ? [new ApplicationImport('@aurelia/validation-html', ['ValidationHtmlConfiguration'])]
        : []),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
  return builder.toTopology();
}

function stateBackedFormExpectedEffects(model: StateBackedFormRecipeModel): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact('Generated form app reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Generated form app'),
    ExpectedSemanticEffect.fact('Generated form app has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Generated form app has root and form custom elements.', 'component', 'resource', 2, 'component'),
    ExpectedSemanticEffect.fact('Generated form app has an app-root component role.', 'component-role', 'resource', 'app-root', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'app-root'),
    ]),
    ExpectedSemanticEffect.fact('Generated form app has a component-composition host role.', 'component-role', 'resource', 'component', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'component-composition-host'),
    ]),
    ExpectedSemanticEffect.signatureFact('Generated form app has a data-entry component role.', 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'data-entry-surface'),
    ]),
    ExpectedSemanticEffect.atLeast('Generated form app has external templates.', 'external-template', 'template', 2, 'template'),
    componentStylesheetEffect('Generated form app has a component stylesheet.'),
    componentStylesheetCapabilityEffect('Generated form app exposes verifiable style asset authoring.'),
    ExpectedSemanticEffect.atLeast('Generated form app has compiled template facts.', 'template-compilation', 'template', 2, 'template'),
    ExpectedSemanticEffect.fact('Generated form app has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    nativeValueTargetAccessEffect('Generated form app has native value binding target access.'),
    nativeValueChannelEffect('Generated form app has native value binding channels.'),
    nativeValueDataFlowEffect('Generated form app has native value binding data flows.'),
    ExpectedSemanticEffect.absent('Generated form app has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.capability('Generated form app exposes verifiable template composition.', 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste('Generated form app reports DI-owned state taste.', 'state-ownership', 'di-owned-state-class', 'state-model'),
    componentStylesheetTasteEffect('Generated form app reports component stylesheet taste.'),
    classTokenStyleTasteEffect('Generated form app reports class-token style binding taste.'),
    ...nativeFormValueTasteEffects(
      'Generated form app reports native form value binding taste.',
      'Generated form app reports select model binding taste.',
    ),
    ...(model.validationEnabled
      ? [
        ExpectedSemanticEffect.discriminatorFact('Validated form app materializes validate binding behavior applications.', 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, [
          ...validateBindingBehaviorExpectedFilters(model),
        ]),
        ExpectedSemanticEffect.discriminatorTaste('Validated form app reports validation controller/plugin usage.', 'validation-ownership', 'validation-controller-usage', 'template-binding'),
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
