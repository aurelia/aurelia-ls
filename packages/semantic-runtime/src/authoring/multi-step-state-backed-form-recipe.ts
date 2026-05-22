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
import { AuthoringPreference } from './ontology.js';
import {
  ExpectedSemanticEffect,
  expectedSemanticEffectFilters,
} from './expected-effect.js';
import {
  multiStepStateBackedFormSourcePlan,
  multiStepWizardDomainNamesFromParameter,
  multiStepWizardMergedFieldSchema,
  multiStepWizardStepsFromParameters,
  type MultiStepStateBackedFormSourcePlanModel,
} from './multi-step-state-backed-form-source-plan.js';
import {
  standardRequestFormFieldTargetProperty,
  standardRequestFormFieldUsesCheckedBinding,
  standardRequestFormFieldUsesNativeValue,
  standardRequestFormFieldUsesSelectBinding,
  standardRequestFormFieldValueChannelKind,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';
import {
  checkedDataFlowEffect,
  checkedTargetAccessEffect,
  checkedValueChannelEffect,
  classTokenInterpolationDataFlowEffect,
  classTokenStyleTasteEffect,
  classTokenTargetAccessEffect,
  classTokenValueChannelEffect,
  classToggleDataFlowEffect,
  classToggleStyleTasteEffect,
  classToggleTargetAccessEffect,
  classToggleValueChannelEffect,
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
  directStateDomainTemplateBindingTasteEffect,
  eventHandlerValueChannelEffect,
  formValueChannelTasteEffects,
  nativeValueChannelEffect,
  nativeValueDataFlowEffect,
  nativeValueTargetAccessEffect,
  primitiveValueChannelEffect,
  sourceBackedGetterObservationTasteEffect,
  styleRuleInterpolationDataFlowEffect,
  styleRuleStyleTasteEffect,
  styleRuleTargetAccessEffect,
  styleRuleValueChannelEffect,
  validateBindingBehaviorExpectedFilters,
  validationErrorClassDataFlowEffect,
  validationErrorsDataFlowEffect,
  validationErrorsTargetAccessEffect,
  validationErrorsValueChannelEffect,
} from './form-expected-effects.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  componentStyleAssetPlanStep,
  entrypointPlanStep,
  externalTemplatePlanStep,
  formComponentPlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  stateModelPlanStep,
  templateBindingPlanStep,
  validationHtmlConfigurationPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';
import {
  syntheticViewRuntimeEffect,
  templateControllerRuntimeEffect,
} from './template-controller-expected-effects.js';

export interface MultiStepStateBackedFormRecipeRequest {
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
  /** Wizard component source path. */
  readonly wizardComponentPath?: string;
  /** Wizard component template path. */
  readonly wizardTemplatePath?: string;
  /** Wizard component class name. */
  readonly wizardComponentClassName?: string;
  /** Wizard custom element name. */
  readonly wizardElementName?: string;
  /** Caller-facing domain aggregate used by the wizard state, template bindings, and validation rules. */
  readonly wizardEntityName?: string;
  /** Comma-separated wizard step labels used for step ids, progress labels, and conditional section wrappers. */
  readonly wizardSteps?: string;
  /** Semicolon-separated named field schemas such as `Shipping: address; Payment: payment method select`. */
  readonly wizardSectionFields?: string;
  /** Semicolon-separated option groups for select or checked collection wizard fields. */
  readonly wizardOptions?: string;
}

type MultiStepStateBackedFormRecipeModel = MultiStepStateBackedFormSourcePlanModel;

export function buildMultiStepStateBackedFormPlan(
  request: MultiStepStateBackedFormRecipeRequest,
): AuthoringPlan {
  const model = normalizeMultiStepStateBackedFormRecipe(request);
  const topology = multiStepStateBackedFormTopology(model);
  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as a DI state-backed Aurelia multi-step form with validation and class/style progress presentation.`,
      topology,
      null,
      multiStepStateBackedFormPreferences(),
    ),
    multiStepStateBackedFormPreconditions(),
    multiStepStateBackedFormPlanSteps(model, topology),
    topology,
    multiStepStateBackedFormSourcePlan(model),
  );
}

function normalizeMultiStepStateBackedFormRecipe(
  request: MultiStepStateBackedFormRecipeRequest,
): MultiStepStateBackedFormRecipeModel {
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
    wizardComponentPath: request.wizardComponentPath ?? 'src/components/onboarding-wizard.ts',
    wizardTemplatePath: request.wizardTemplatePath ?? 'src/components/onboarding-wizard.html',
    wizardComponentClassName: request.wizardComponentClassName ?? 'OnboardingWizard',
    wizardElementName: request.wizardElementName ?? 'onboarding-wizard',
    wizardDomain: multiStepWizardDomainNamesFromParameter(request.wizardEntityName),
    wizardSteps: multiStepWizardStepsFromParameters(request.wizardSteps, request.wizardSectionFields, request.wizardOptions),
    wizardSectionFieldsParameterValue: request.wizardSectionFields?.trim() || null,
  };
}

function multiStepStateBackedFormPreferences(): readonly AuthoringPreference[] {
  return [
    new AuthoringPreference('state-ownership', 'di-owned-state-class'),
    new AuthoringPreference('template-model-access', 'direct-state-domain-template-binding'),
    new AuthoringPreference('template-model-access', 'source-backed-getter-observation'),
    new AuthoringPreference('template-model-access', 'meaningful-viewmodel-adaptation'),
    new AuthoringPreference('template-source-ownership', 'external-template-file'),
    new AuthoringPreference('style-resource-ownership', 'component-stylesheet'),
    new AuthoringPreference('style-binding-model', 'class-token-binding'),
    new AuthoringPreference('style-binding-model', 'class-toggle-binding'),
    new AuthoringPreference('style-binding-model', 'style-rule-binding'),
    new AuthoringPreference('form-value-channel', 'native-control-value-binding'),
    new AuthoringPreference('form-value-channel', 'checked-model-binding'),
    new AuthoringPreference('form-value-channel', 'select-model-binding'),
    new AuthoringPreference('validation-ownership', 'validation-controller-usage'),
    new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
  ];
}

function multiStepStateBackedFormPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
  ];
}

function multiStepStateBackedFormPlanSteps(
  model: MultiStepStateBackedFormRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
      model.rootStylePath,
      model.statePath,
      model.wizardComponentPath,
      model.wizardTemplatePath,
    ]),
    validationHtmlConfigurationPlanStep(),
    stateModelPlanStep(
      model.statePath,
      model.stateClassName,
      [
        ExpectedSemanticEffect.fact('Wizard state source should be visible in app topology.', 'dependency-injection', 'di', 'state-model'),
        ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize DI-owned wizard state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
        ExpectedSemanticEffect.signatureFact('Wizard state should own a composed domain object.', 'state-composition', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
          ['ownerClassName', model.stateClassName],
        )),
      ],
    ),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(model.rootComponentPath, model.rootComponentClassName, model.rootElementName),
    componentStyleAssetPlanStep(model.rootStylePath),
    externalTemplatePlanStep(model.rootTemplatePath, model.rootComponentClassName, 'Root component'),
    formComponentPlanStep(model.wizardComponentPath, model.wizardComponentClassName, model.wizardElementName),
    externalTemplatePlanStep(model.wizardTemplatePath, model.wizardComponentClassName, 'Wizard form component'),
    templateBindingPlanStep(
      model.wizardTemplatePath,
      'multi-step form controls, validation behavior, repeat/if step rendering, and class/style progress presentation',
      multiStepStateBackedFormTemplateExpectedEffects(model),
    ),
    verifyAppPlanStep(topology, multiStepStateBackedFormExpectedEffects(model)),
  ];
}

function multiStepStateBackedFormTopology(model: MultiStepStateBackedFormRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const wizard = addWizardComponent(builder, model);
  const root = addWizardRoot(builder, model, wizard);
  addWizardState(builder, model);
  addWizardEntrypoint(builder, model, root);
  return builder.toTopology();
}

function addWizardComponent(
  builder: ApplicationTopologyBuilder,
  model: MultiStepStateBackedFormRecipeModel,
): ApplicationComponentTopologyResult {
  return builder.component({
    className: model.wizardComponentClassName,
    referenceFromPath: model.rootComponentPath,
    sourcePath: model.wizardComponentPath,
    elementName: model.wizardElementName,
    templatePath: model.wizardTemplatePath,
  });
}

function addWizardRoot(
  builder: ApplicationTopologyBuilder,
  model: MultiStepStateBackedFormRecipeModel,
  wizard: ApplicationComponentTopologyResult,
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
    dependencies: [wizard.reference],
  });
}

function addWizardState(
  builder: ApplicationTopologyBuilder,
  model: MultiStepStateBackedFormRecipeModel,
): void {
  builder.service({
    className: model.stateClassName,
    sourcePath: model.statePath,
    role: 'state-source',
  });
}

function addWizardEntrypoint(
  builder: ApplicationTopologyBuilder,
  model: MultiStepStateBackedFormRecipeModel,
  root: ApplicationComponentTopologyResult,
): void {
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'Aurelia.register(ValidationHtmlConfiguration).app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
      new ApplicationImport('@aurelia/validation-html', ['ValidationHtmlConfiguration']),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
}

function multiStepStateBackedFormTemplateExpectedEffects(
  model: MultiStepStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  const fieldSchema = multiStepWizardMergedFieldSchema(model);
  if (fieldSchema != null) {
    return [
      ...multiStepWizardFieldSchemaTemplateExpectedEffects(fieldSchema),
      classTokenStyleTasteEffect('Authoring orientation should recognize wizard class-token style binding.'),
      classToggleStyleTasteEffect('Authoring orientation should recognize wizard class-toggle style binding.'),
      styleRuleStyleTasteEffect('Authoring orientation should recognize wizard style-rule binding.'),
      templateControllerRuntimeEffect('Wizard form should materialize repeat template-controller hydration.', 'iteration', 'many'),
      syntheticViewRuntimeEffect('Wizard form should materialize repeat synthetic-view hydration.', 'iteration', 'many'),
      templateControllerRuntimeEffect('Wizard form should materialize conditional step template controllers.', 'conditional', 'optional'),
      ExpectedSemanticEffect.discriminatorFact(
        'Wizard form should materialize blur validate binding behavior applications.',
        'binding-behavior-application',
        'template',
        'binding-behavior',
        'present',
        null,
        validateBindingBehaviorExpectedFilters('blur'),
      ),
      validationErrorsTargetAccessEffect('Wizard validation error presentation should expose validation-errors target access.'),
      validationErrorsValueChannelEffect('Wizard validation error presentation should expose validation-errors value channels.'),
      validationErrorsDataFlowEffect('Wizard validation error presentation should expose validation-errors from-view data flow.'),
    ];
  }
  return [
    nativeValueTargetAccessEffect('Wizard form should expose target access for native value bindings.'),
    nativeValueChannelEffect('Wizard form should expose observer-backed value channels for native value bindings.'),
    nativeValueDataFlowEffect('Wizard form should expose TypeChecker-backed data flow for native value bindings.'),
    checkedTargetAccessEffect('Wizard form should expose target access for checked bindings.'),
    checkedValueChannelEffect('Wizard form should expose checked observer value channels.'),
    checkedDataFlowEffect('Wizard form should expose TypeChecker-backed data flow for checked bindings.'),
    primitiveValueChannelEffect('Wizard form should expose primitive model value domains for nullable plan selection.', 'null'),
    classTokenStyleTasteEffect('Authoring orientation should recognize wizard class-token style binding.'),
    classToggleStyleTasteEffect('Authoring orientation should recognize wizard class-toggle style binding.'),
    styleRuleStyleTasteEffect('Authoring orientation should recognize wizard style-rule binding.'),
    templateControllerRuntimeEffect('Wizard form should materialize repeat template-controller hydration.', 'iteration', 'many'),
    syntheticViewRuntimeEffect('Wizard form should materialize repeat synthetic-view hydration.', 'iteration', 'many'),
    templateControllerRuntimeEffect('Wizard form should materialize conditional step template controllers.', 'conditional', 'optional'),
    ExpectedSemanticEffect.discriminatorFact(
      'Wizard form should materialize blur validate binding behavior applications.',
      'binding-behavior-application',
      'template',
      'binding-behavior',
      'present',
      null,
      validateBindingBehaviorExpectedFilters('blur'),
    ),
    validationErrorsTargetAccessEffect('Wizard validation error presentation should expose validation-errors target access.'),
    validationErrorsValueChannelEffect('Wizard validation error presentation should expose validation-errors value channels.'),
    validationErrorsDataFlowEffect('Wizard validation error presentation should expose validation-errors from-view data flow.'),
    ...formValueChannelTasteEffects(
      'Authoring orientation should recognize wizard native form value binding.',
      'Authoring orientation should recognize wizard checked/model binding.',
      'Authoring orientation should recognize wizard select model binding.',
    ),
  ];
}

function multiStepWizardFieldSchemaTemplateExpectedEffects(
  fieldSchema: StandardRequestFormFieldSchema,
  prefix = 'Wizard form',
): readonly ExpectedSemanticEffect[] {
  const effects: ExpectedSemanticEffect[] = [];
  if (fieldSchema.fields.some(standardRequestFormFieldUsesNativeValue)) {
    effects.push(
      nativeValueTargetAccessEffect(`${prefix} should expose target access for native value bindings.`),
      nativeValueChannelEffect(`${prefix} should expose observer-backed value channels for native value bindings.`),
      nativeValueDataFlowEffect(`${prefix} should expose TypeChecker-backed data flow for native value bindings.`),
      ExpectedSemanticEffect.signatureTaste(`${prefix} should report native form value binding taste.`, 'form-value-channel', 'native-control-value-binding', 'template-binding'),
    );
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesCheckedBinding)) {
    effects.push(
      checkedTargetAccessEffect(`${prefix} should expose target access for checked bindings.`),
      checkedValueChannelEffect(`${prefix} should expose checked observer value channels.`),
      checkedDataFlowEffect(`${prefix} should expose TypeChecker-backed data flow for checked bindings.`),
      ExpectedSemanticEffect.signatureTaste(`${prefix} should report checked/model binding taste.`, 'form-value-channel', 'checked-model-binding', 'template-binding'),
    );
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesSelectBinding)) {
    effects.push(
      primitiveValueChannelEffect(`${prefix} should expose nullable select primitive value domains.`, 'null'),
      ExpectedSemanticEffect.signatureTaste(`${prefix} should report select model binding taste.`, 'form-value-channel', 'select-model-binding', 'template-binding'),
    );
  }
  return effects;
}

function multiStepStateBackedFormExpectedEffects(
  model: MultiStepStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  const prefix = 'Multi-step form app';
  return [
    ExpectedSemanticEffect.fact(`${prefix} reopens as an Aurelia project.`, 'project-shape'),
    ...projectToolingExpectedEffects(prefix),
    ...multiStepAppStructureExpectedEffects(prefix),
    ...multiStepFormBindingExpectedEffects(prefix, model),
    ...multiStepStateHandoffExpectedEffects(prefix, model),
    ...multiStepGetterObservationExpectedEffects(prefix, model),
    ...multiStepAuthoringOutcomeExpectedEffects(prefix, model),
  ];
}

function multiStepAppStructureExpectedEffects(prefix: string): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact(`${prefix} has an app root.`, 'app-root'),
    ExpectedSemanticEffect.atLeast(`${prefix} has root and wizard custom elements.`, 'component', 'resource', 2, 'component'),
    ExpectedSemanticEffect.fact(`${prefix} has an app-root component role.`, 'component-role', 'resource', 'app-root', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'app-root'],
    )),
    ExpectedSemanticEffect.signatureFact(`${prefix} has a data-entry component role.`, 'component-role', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'data-entry-surface'],
    )),
    ExpectedSemanticEffect.atLeast(`${prefix} has external templates.`, 'external-template', 'template', 2, 'template'),
    componentStylesheetEffect(`${prefix} has a component stylesheet.`),
    componentStylesheetCapabilityEffect(`${prefix} exposes verifiable style asset authoring.`),
    ExpectedSemanticEffect.atLeast(`${prefix} has compiled template facts.`, 'template-compilation', 'template', 2, 'template'),
    ExpectedSemanticEffect.fact(`${prefix} has runtime controller facts.`, 'runtime-controller', 'template', 'component'),
  ];
}

function multiStepFormBindingExpectedEffects(
  prefix: string,
  model: MultiStepStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  const fieldSchema = multiStepWizardMergedFieldSchema(model);
  if (fieldSchema != null) {
    return [
      ...multiStepWizardFieldSchemaTemplateExpectedEffects(fieldSchema, prefix),
      classTokenTargetAccessEffect(`${prefix} has class token target access.`),
      classTokenValueChannelEffect(`${prefix} has class-token value channels.`),
      classTokenInterpolationDataFlowEffect(`${prefix} has class interpolation data flow.`),
      classToggleTargetAccessEffect(`${prefix} has class-toggle target access.`),
      classToggleValueChannelEffect(`${prefix} has class-toggle value channels.`),
      classToggleDataFlowEffect(`${prefix} has class-toggle data flow.`),
      styleRuleTargetAccessEffect(`${prefix} has style interpolation target access.`),
      styleRuleValueChannelEffect(`${prefix} has style-rule value channels.`),
      styleRuleInterpolationDataFlowEffect(`${prefix} has style interpolation data flow.`),
      eventHandlerValueChannelEffect(`${prefix} has submit listener value channels.`),
      eventHandlerValueChannelEffect(`${prefix} has click listener value channels for wizard navigation.`, 'click'),
      templateControllerRuntimeEffect(`${prefix} has repeat template-controller rows.`, 'iteration', 'many'),
      syntheticViewRuntimeEffect(`${prefix} has repeat synthetic-view rows.`, 'iteration', 'many'),
      templateControllerRuntimeEffect(`${prefix} has conditional template-controller rows.`, 'conditional', 'optional'),
      ExpectedSemanticEffect.discriminatorFact(`${prefix} materializes validate binding behavior applications.`, 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, validateBindingBehaviorExpectedFilters('blur')),
      validationErrorsTargetAccessEffect(`${prefix} materializes validation-errors target access.`),
      validationErrorsValueChannelEffect(`${prefix} materializes validation-errors value channels.`),
      validationErrorsDataFlowEffect(`${prefix} materializes validation-errors from-view data flow.`),
      ...fieldSchema.fields
        .filter((field) => field.requiredForSubmit)
        .map((field) => validationErrorClassDataFlowEffect(
          `${prefix} binds ${field.label} validation errors directly to field presentation classes.`,
          `${field.propertyName}Errors.length > 0 ? "field-stack field-invalid" : "field-stack"`,
        )),
    ];
  }
  return [
    nativeValueTargetAccessEffect(`${prefix} has native value binding target access.`),
    nativeValueChannelEffect(`${prefix} has native value binding channels.`),
    nativeValueDataFlowEffect(`${prefix} has native value binding data flows.`),
    checkedTargetAccessEffect(`${prefix} has checked binding target access.`),
    checkedValueChannelEffect(`${prefix} has checked observer value channels.`),
    checkedDataFlowEffect(`${prefix} has checked binding data flows.`),
    primitiveValueChannelEffect(`${prefix} has nullable select primitive value domains.`, 'null'),
    classTokenTargetAccessEffect(`${prefix} has class token target access.`),
    classTokenValueChannelEffect(`${prefix} has class-token value channels.`),
    classTokenInterpolationDataFlowEffect(`${prefix} has class interpolation data flow.`),
    classToggleTargetAccessEffect(`${prefix} has class-toggle target access.`),
    classToggleValueChannelEffect(`${prefix} has class-toggle value channels.`),
    classToggleDataFlowEffect(`${prefix} has class-toggle data flow.`),
    styleRuleTargetAccessEffect(`${prefix} has style interpolation target access.`),
    styleRuleValueChannelEffect(`${prefix} has style-rule value channels.`),
    styleRuleInterpolationDataFlowEffect(`${prefix} has style interpolation data flow.`),
    eventHandlerValueChannelEffect(`${prefix} has submit listener value channels.`),
    eventHandlerValueChannelEffect(`${prefix} has click listener value channels for wizard navigation.`, 'click'),
    templateControllerRuntimeEffect(`${prefix} has repeat template-controller rows.`, 'iteration', 'many'),
    syntheticViewRuntimeEffect(`${prefix} has repeat synthetic-view rows.`, 'iteration', 'many'),
    templateControllerRuntimeEffect(`${prefix} has conditional template-controller rows.`, 'conditional', 'optional'),
    ExpectedSemanticEffect.discriminatorFact(`${prefix} materializes validate binding behavior applications.`, 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, validateBindingBehaviorExpectedFilters('blur')),
    validationErrorsTargetAccessEffect(`${prefix} materializes validation-errors target access.`),
    validationErrorsValueChannelEffect(`${prefix} materializes validation-errors value channels.`),
    validationErrorsDataFlowEffect(`${prefix} materializes validation-errors from-view data flow.`),
    validationErrorClassDataFlowEffect(
      `${prefix} binds name validation errors directly to field presentation classes.`,
      'nameErrors.length > 0 ? "field-stack field-invalid" : "field-stack"',
    ),
    validationErrorClassDataFlowEffect(
      `${prefix} binds email validation errors directly to field presentation classes.`,
      'emailErrors.length > 0 ? "field-stack field-invalid" : "field-stack"',
    ),
  ];
}

function multiStepStateHandoffExpectedEffects(
  prefix: string,
  model: MultiStepStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  const commonEffects = [
    ExpectedSemanticEffect.signatureFact(`${prefix} has a state service-class row.`, 'service-class', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
      ['role', 'state-source'],
      ['className', model.stateClassName],
    )),
    ExpectedSemanticEffect.signatureFact(`${prefix} has composed state rows for the wizard domain object.`, 'state-composition', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
      ['ownerClassName', model.stateClassName],
    )),
    ExpectedSemanticEffect.signatureFact('Wizard component calls the DI-owned state layer.', 'service-interaction', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
      ['consumerRole', 'component-source'],
      ['targetRole', 'state-source'],
      ['operationKind', 'call'],
      ['isSelfInteraction', false],
    )),
    ExpectedSemanticEffect.signatureFact('Wizard progress binds DI-owned state directly.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
      ['bindingSourceName', 'state.progressPercent'],
      ['bindingSourceRootName', 'state'],
      ['bindingTargetProperty', 'style'],
      ['interactionTargetRole', 'state-source'],
      ['interactionTargetClassName', model.stateClassName],
      ['interactionMemberName', 'progressPercent'],
      ['interactionOperationKind', 'read'],
      ['interactionIsSelfInteraction', false],
    )),
    ExpectedSemanticEffect.signatureFact('Wizard back button calls the DI-owned state layer directly.', 'service-interaction-binding', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
      ['bindingSourceName', 'state.previousStep()'],
      ['bindingSourceRootName', 'state'],
      ['bindingTargetProperty', 'click'],
      ['interactionTargetRole', 'state-source'],
      ['interactionTargetClassName', model.stateClassName],
      ['interactionMemberName', 'previousStep'],
      ['interactionOperationKind', 'call'],
      ['interactionIsSelfInteraction', false],
    )),
  ];
  const fieldSchema = multiStepWizardMergedFieldSchema(model);
  if (fieldSchema != null) {
    return [
      ...commonEffects,
      ...fieldSchema.fields.map((field) => wizardProfileBindingDataFlowEffect(
        `Wizard ${field.label} field writes into the state-owned domain object directly.`,
        `state.${model.wizardDomain.entityVariableName}.${field.propertyName}`,
        standardRequestFormFieldTargetProperty(field),
        standardRequestFormFieldValueChannelKind(field),
        field.controlKind !== 'checkbox-collection',
        standardRequestFormFieldUsesNativeValue(field),
      )),
    ];
  }
  return [
    ...commonEffects,
    wizardProfileBindingDataFlowEffect('Wizard name input writes into the state-owned domain object directly.', `state.${model.wizardDomain.entityVariableName}.name`, 'value', 'raw-property', true, true),
    wizardProfileBindingDataFlowEffect('Wizard contact radios write into the state-owned domain object directly.', `state.${model.wizardDomain.entityVariableName}.contactMethod`, 'checked', 'checked-radio-value', true),
    wizardProfileBindingDataFlowEffect('Wizard plan select writes into the state-owned domain object directly.', `state.${model.wizardDomain.entityVariableName}.planTier`, 'value', 'select-single-option-value', true),
    wizardProfileBindingDataFlowEffect('Wizard feature checkboxes mutate the domain feature id collection.', `state.${model.wizardDomain.entityVariableName}.featureIds`, 'checked', 'checked-collection-membership', false),
  ];
}

function wizardProfileBindingDataFlowEffect(
  summary: string,
  sourceName: string,
  targetProperty: string,
  valueChannelKind: string,
  targetToSourceAssignable: boolean,
  includeNodeTargetKind = false,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-data-flow', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', sourceName],
    ['sourceRootName', 'state'],
    ...(includeNodeTargetKind ? [['targetKind', 'node'] as const] : []),
    ['targetProperty', targetProperty],
    ['valueChannelKind', valueChannelKind],
    ['sourceToTargetAssignable', true],
    ...(targetToSourceAssignable ? [['targetToSourceAssignable', true] as const] : []),
  ));
}

function multiStepGetterObservationExpectedEffects(
  prefix: string,
  model: MultiStepStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  return [
    computedObserverSourceEffect(`${prefix} exposes wizard domain canSubmit as a computed observer source.`, model.wizardDomain.entityClassName, 'canSubmit'),
    computedObserverSourceEffect(`${prefix} observes state progress as a computed observer source.`, model.stateClassName, 'progressPercent'),
  ];
}

function computedObserverSourceEffect(
  summary: string,
  className: string,
  memberName: string,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'computed-observer-source', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
    ['className', className],
    ['memberName', memberName],
    ['observerKind', 'computed-observer'],
    ['triggerKind', 'accessor-descriptor'],
    ['dependencyMode', 'proxy-auto-track'],
  ));
}

function multiStepAuthoringOutcomeExpectedEffects(
  prefix: string,
  model: MultiStepStateBackedFormRecipeModel,
): readonly ExpectedSemanticEffect[] {
  const fieldSchema = multiStepWizardMergedFieldSchema(model);
  return [
    ExpectedSemanticEffect.absent(`${prefix} has no open semantic seams.`, 'open-seam-closure'),
    ExpectedSemanticEffect.capability(`${prefix} exposes verifiable template composition.`, 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports DI-owned state.`, 'state-ownership', 'di-owned-state-class', 'state-model'),
    directStateDomainTemplateBindingTasteEffect(`${prefix} reports direct state/domain template binding taste.`),
    sourceBackedGetterObservationTasteEffect(`${prefix} reports plain getter observation taste.`),
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports template-controller composition.`, 'template-rendering-boundary', 'template-controller-composition', 'template-controller'),
    componentStylesheetTasteEffect(`${prefix} reports component stylesheet taste.`),
    classTokenStyleTasteEffect(`${prefix} reports class-token style binding taste.`),
    classToggleStyleTasteEffect(`${prefix} reports class-toggle style binding taste.`),
    styleRuleStyleTasteEffect(`${prefix} reports style-rule binding taste.`),
    ExpectedSemanticEffect.discriminatorTaste(`${prefix} reports validation controller/plugin usage.`, 'validation-ownership', 'validation-controller-usage', 'template-binding'),
    ...(fieldSchema == null
      ? formValueChannelTasteEffects(
        `${prefix} reports native form value binding taste.`,
        `${prefix} reports checked/model binding taste.`,
        `${prefix} reports select model binding taste.`,
      )
      : multiStepWizardFieldSchemaTemplateExpectedEffects(fieldSchema, prefix)
        .filter((effect) => effect.effectKind === 'authoring-taste')),
  ];
}
