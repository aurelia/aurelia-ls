import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';
import {
  checkedDataFlowEffect,
  checkedTargetAccessEffect,
  checkedValueChannelEffect,
  classTokenStyleTasteEffect,
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
  capturedFieldShellInputTypeEffect,
  capturedFieldShellValueDataFlowEffect,
  customMatcherComparisonTasteEffect,
  customMatcherValueChannelEffect,
  directStateDomainTemplateBindingTasteEffect,
  eventHandlerValueChannelEffect,
  formValueChannelTasteEffects,
  nativeValueChannelEffect,
  nativeValueDataFlowEffect,
  nativeValueTargetAccessEffect,
  observerCouplingValueChannelEffect,
  primitiveValueChannelEffect,
  requestCanSubmitComputedObserverDependencyEffect,
  requestCanSubmitComputedObserverSourceEffect,
  requestCanSubmitTemplateObservedDependencyEffect,
  sourceBackedGetterObservationTasteEffect,
  stateRequestFieldDataFlowEffect,
  stateRequestFieldObservedDependencyEffect,
  stateRequestLetBindingDataFlowEffect,
  validateBindingBehaviorExpectedFilters,
  validationErrorClassDataFlowEffect,
  validationErrorsDataFlowEffect,
  validationErrorsTargetAccessEffect,
  validationErrorsValueChannelEffect,
} from './form-expected-effects.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  defaultStandardRequestFormDomainNames,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import {
  standardRequestFormFieldUsesCheckedBinding,
  standardRequestFormFieldUsesFieldShell,
  standardRequestFormFieldUsesNativeValue,
  standardRequestFormFieldUsesSelectBinding,
  standardRequestFormFieldTargetProperty,
  standardRequestFormFieldValueChannelKind,
  standardRequestFormFieldValueChannelSummary,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';

export interface ComponentStyleAssetExpectedEffectsOptions {
  readonly componentSummary?: string;
}

/** Step-level effects for a recipe-authored component stylesheet. */
export function componentStyleAssetExpectedEffects(
  options: ComponentStyleAssetExpectedEffectsOptions = {},
): readonly ExpectedSemanticEffect[] {
  const componentSummary = options.componentSummary ?? 'Root component';
  return [
    componentStylesheetEffect(`${componentSummary} stylesheet should be visible as a style resource.`),
    componentStylesheetCapabilityEffect('Authoring orientation should expose style asset authoring.'),
    componentStylesheetTasteEffect('Authoring orientation should recognize component stylesheet ownership.'),
  ];
}

export interface FormTemplateBindingExpectedEffectsOptions {
  readonly fieldSchema?: StandardRequestFormFieldSchema | null;
  readonly usesFieldShell?: boolean;
  readonly validation?: {
    readonly filters: readonly ExpectedSemanticEffectFilter[];
    readonly bindingBehaviorSummary: string;
    readonly tasteSummary: string;
  } | null;
}

/** Step-level effects shared by recommendable generated form templates. */
export function standardFormTemplateBindingExpectedEffects(
  options: FormTemplateBindingExpectedEffectsOptions = {},
): readonly ExpectedSemanticEffect[] {
  if (options.fieldSchema != null) {
    return [
      ...formFieldSchemaTemplateCapabilityEffects('Form', options.fieldSchema, options.usesFieldShell ?? true),
      eventHandlerValueChannelEffect('Form should expose listener value channels for submit handlers.'),
      classTokenStyleTasteEffect('Authoring orientation should recognize class-token style binding.'),
      ...(options.validation == null
        ? []
        : [
          ExpectedSemanticEffect.discriminatorFact(
            options.validation.bindingBehaviorSummary,
            'binding-behavior-application',
            'template',
            'binding-behavior',
            'present',
            null,
            options.validation.filters,
          ),
          ExpectedSemanticEffect.discriminatorTaste(
            options.validation.tasteSummary,
            'validation-ownership',
            'validation-controller-usage',
            'template-binding',
          ),
          validationErrorsTargetAccessEffect('Validation error presentation should expose target access for validation-errors errors.'),
          validationErrorsValueChannelEffect('Validation error presentation should expose a raw-property channel for validation-errors errors.'),
          validationErrorsDataFlowEffect('Validation error presentation should expose from-view data flow for validation-errors errors.'),
        ]),
    ];
  }
  return [
    nativeValueTargetAccessEffect('Form should expose target access for native value bindings.'),
    nativeValueChannelEffect('Form should expose observer-backed value channels for native value bindings.'),
    nativeValueDataFlowEffect('Form should expose TypeChecker-backed data flow for native value bindings.'),
    checkedTargetAccessEffect('Form should expose target access for checked bindings.'),
    checkedValueChannelEffect('Form should expose checked observer value channels.'),
    checkedDataFlowEffect('Form should expose TypeChecker-backed data flow for checked bindings.'),
    eventHandlerValueChannelEffect('Form should expose listener value channels for submit handlers.'),
    primitiveValueChannelEffect('Form should expose primitive model value domains for nullable select options.', 'null'),
    customMatcherValueChannelEffect('Form should expose app-authored matcher comparison for object-valued select options.'),
    observerCouplingValueChannelEffect('Form should expose select option-list mutation observer coupling.', 'select-option-list-mutation-observer'),
    observerCouplingValueChannelEffect('Form should expose checked element value observer coupling.', 'checked-element-value-observer'),
    capturedFieldShellInputTypeEffect('Form should materialize captured field-shell input type attributes.'),
    capturedFieldShellValueDataFlowEffect('Form should data-flow field-shell captured value bindings.'),
    ...formValueChannelTasteEffects(
      'Authoring orientation should recognize native form value binding.',
      'Authoring orientation should recognize checked/model binding.',
      'Authoring orientation should recognize select model binding.',
    ),
    classTokenStyleTasteEffect('Authoring orientation should recognize class-token style binding.'),
    customMatcherComparisonTasteEffect('Authoring orientation should recognize custom matcher comparison.'),
    ...(options.validation == null
      ? []
      : [
        ExpectedSemanticEffect.discriminatorFact(
          options.validation.bindingBehaviorSummary,
          'binding-behavior-application',
          'template',
          'binding-behavior',
          'present',
          null,
          options.validation.filters,
        ),
        ExpectedSemanticEffect.discriminatorTaste(
          options.validation.tasteSummary,
          'validation-ownership',
          'validation-controller-usage',
          'template-binding',
        ),
        validationErrorsTargetAccessEffect('Validation error presentation should expose target access for validation-errors errors.'),
        validationErrorsValueChannelEffect('Validation error presentation should expose a raw-property channel for validation-errors errors.'),
        validationErrorsDataFlowEffect('Validation error presentation should expose from-view data flow for validation-errors errors.'),
      ]),
  ];
}

export interface StandardFormAppExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly componentCount: number;
  readonly componentCountSummary: string;
  readonly externalTemplateCount: number;
  readonly compiledTemplateCount: number;
  readonly fieldSchema?: StandardRequestFormFieldSchema | null;
  readonly usesFieldShell?: boolean;
}

/** Verification-level effects shared by recommendable generated form apps. */
export function standardFormAppExpectedEffects(
  options: StandardFormAppExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const prefix = options.summaryPrefix;
  return [
    ExpectedSemanticEffect.fact(`${prefix} reopens as an Aurelia project.`, 'project-shape'),
    ...projectToolingExpectedEffects(prefix),
    ExpectedSemanticEffect.fact(`${prefix} has an app root.`, 'app-root'),
    ExpectedSemanticEffect.atLeast(
      `${prefix} has ${options.componentCountSummary}.`,
      'component',
      'resource',
      options.componentCount,
      'component',
    ),
    ExpectedSemanticEffect.fact(`${prefix} has an app-root component role.`, 'component-role', 'resource', 'app-root', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'app-root'),
    ]),
    ExpectedSemanticEffect.fact(`${prefix} has a component-composition host role.`, 'component-role', 'resource', 'component', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'component-composition-host'),
    ]),
    ExpectedSemanticEffect.signatureFact(`${prefix} has a data-entry component role.`, 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'data-entry-surface'),
    ]),
    ExpectedSemanticEffect.atLeast(`${prefix} has external templates.`, 'external-template', 'template', options.externalTemplateCount, 'template'),
    componentStylesheetEffect(`${prefix} has a component stylesheet.`),
    componentStylesheetCapabilityEffect(`${prefix} exposes verifiable style asset authoring.`),
    ExpectedSemanticEffect.atLeast(`${prefix} has compiled template facts.`, 'template-compilation', 'template', options.compiledTemplateCount, 'template'),
    ExpectedSemanticEffect.fact(`${prefix} has runtime controller facts.`, 'runtime-controller', 'template', 'component'),
    ...(options.fieldSchema == null
      ? [
        nativeValueTargetAccessEffect(`${prefix} has native value binding target access.`),
        nativeValueChannelEffect(`${prefix} has native value binding channels.`),
        nativeValueDataFlowEffect(`${prefix} has native value binding data flows.`),
        checkedTargetAccessEffect(`${prefix} has checked binding target access.`),
        checkedValueChannelEffect(`${prefix} has checked observer value channels.`),
        checkedDataFlowEffect(`${prefix} has checked binding data flows.`),
      ]
      : formFieldSchemaTemplateCapabilityEffects(prefix, options.fieldSchema, options.usesFieldShell ?? true)),
    eventHandlerValueChannelEffect(`${prefix} has submit listener value channels.`),
    ...(options.fieldSchema == null
      ? [
        primitiveValueChannelEffect(`${prefix} has nullable select primitive value domains.`, 'null'),
        customMatcherValueChannelEffect(`${prefix} has object-valued select matcher value channels.`),
        observerCouplingValueChannelEffect(`${prefix} has select option-list mutation observer coupling.`, 'select-option-list-mutation-observer'),
        observerCouplingValueChannelEffect(`${prefix} has checked element value observer coupling.`, 'checked-element-value-observer'),
        capturedFieldShellInputTypeEffect(`${prefix} materializes captured field-shell input attributes.`),
        capturedFieldShellValueDataFlowEffect(`${prefix} data-flows captured field-shell value bindings.`),
      ]
      : formFieldSchemaAuxiliaryEffects(prefix, options.fieldSchema, options.usesFieldShell ?? true)),
    ExpectedSemanticEffect.absent(`${prefix} has no open semantic seams.`, 'open-seam-closure'),
    ExpectedSemanticEffect.capability(`${prefix} exposes verifiable template composition.`, 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports DI-owned state taste.`, 'state-ownership', 'di-owned-state-class', 'state-model'),
    directStateDomainTemplateBindingTasteEffect(`${prefix} reports direct state/domain template binding taste.`),
    sourceBackedGetterObservationTasteEffect(`${prefix} reports plain getter observation taste.`),
    componentStylesheetTasteEffect(`${prefix} reports component stylesheet taste.`),
    classTokenStyleTasteEffect(`${prefix} reports class-token style binding taste.`),
    ...(options.fieldSchema == null
      ? [customMatcherComparisonTasteEffect(`${prefix} reports custom matcher comparison taste.`)]
      : []),
    ...formFieldSchemaTasteEffects(prefix, options.fieldSchema),
  ];
}

/** Verification-level effects for validation-html form recipes. */
export function standardValidatedFormAppExpectedEffects(
  summaryPrefix: string,
  validationTrigger: string | null,
  domain: StandardRequestFormDomainNames = defaultStandardRequestFormDomainNames(),
  fieldSchema: StandardRequestFormFieldSchema | null = null,
): readonly ExpectedSemanticEffect[] {
  const validationErrorClassEffects = fieldSchema == null
    ? [
      validationErrorClassDataFlowEffect(
        `${summaryPrefix} binds customer-name validation errors directly to field presentation classes.`,
        'customerNameErrors.length > 0 ? "field-stack field-invalid" : "field-stack"',
      ),
      validationErrorClassDataFlowEffect(
        `${summaryPrefix} binds email validation errors directly to field presentation classes.`,
        'emailErrors.length > 0 ? "field-stack field-invalid" : "field-stack"',
      ),
    ]
    : fieldSchema.fields
      .filter((field) => field.requiredForSubmit && standardRequestFormFieldUsesFieldShell(field))
      .map((field) => validationErrorClassDataFlowEffect(
        `${summaryPrefix} binds ${field.label} validation errors directly to field presentation classes.`,
        `${field.propertyName}Errors.length > 0 ? "field-stack field-invalid" : "field-stack"`,
      ));
  return [
    ExpectedSemanticEffect.discriminatorFact(`${summaryPrefix} materializes validate binding behavior applications.`, 'binding-behavior-application', 'template', 'binding-behavior', 'present', null, [
      ...validateBindingBehaviorExpectedFilters(validationTrigger),
    ]),
    validationErrorsTargetAccessEffect(`${summaryPrefix} materializes validation-errors errors target access.`),
    validationErrorsValueChannelEffect(`${summaryPrefix} materializes validation-errors errors value channels.`),
    validationErrorsDataFlowEffect(`${summaryPrefix} materializes validation-errors errors from-view data flow.`),
    ...validationErrorClassEffects,
    ExpectedSemanticEffect.discriminatorTaste(`${summaryPrefix} reports validation controller/plugin usage.`, 'validation-ownership', 'validation-controller-usage', 'template-binding'),
  ];
}

function formFieldSchemaTemplateCapabilityEffects(
  prefix: string,
  fieldSchema: StandardRequestFormFieldSchema,
  usesFieldShell: boolean,
): readonly ExpectedSemanticEffect[] {
  const effects: ExpectedSemanticEffect[] = [];
  if (fieldSchema.fields.some(standardRequestFormFieldUsesNativeValue)) {
    effects.push(
      nativeValueTargetAccessEffect(`${prefix} should expose target access for native value bindings.`),
      nativeValueChannelEffect(`${prefix} should expose observer-backed value channels for native value bindings.`),
      nativeValueDataFlowEffect(`${prefix} should expose TypeChecker-backed data flow for native value bindings.`),
    );
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesCheckedBinding)) {
    effects.push(
      checkedTargetAccessEffect(`${prefix} should expose target access for checked bindings.`),
      checkedValueChannelEffect(`${prefix} should expose checked observer value channels.`),
      checkedDataFlowEffect(`${prefix} should expose TypeChecker-backed data flow for checked bindings.`),
    );
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesSelectBinding)) {
    effects.push(primitiveValueChannelEffect(`${prefix} should expose nullable select primitive value domains.`, 'null'));
  }
  if (usesFieldShell && fieldSchema.fields.some(standardRequestFormFieldUsesFieldShell)) {
    effects.push(capturedFieldShellValueDataFlowEffect(`${prefix} should data-flow captured field-shell value bindings.`));
  }
  return effects;
}

function formFieldSchemaAuxiliaryEffects(
  prefix: string,
  fieldSchema: StandardRequestFormFieldSchema,
  usesFieldShell: boolean,
): readonly ExpectedSemanticEffect[] {
  return [
    ...(usesFieldShell && fieldSchema.fields.some(standardRequestFormFieldUsesFieldShell)
    ? [capturedFieldShellValueDataFlowEffect(`${prefix} data-flows captured field-shell value bindings.`)]
      : []),
    ...(fieldSchema.fields.some((field) => field.controlKind === 'checkbox-collection')
      ? [
        observerCouplingValueChannelEffect(`${prefix} exposes checked collection observation for checkbox groups.`, 'checked-collection-observer'),
        observerCouplingValueChannelEffect(`${prefix} exposes checked collection membership mutation for checkbox groups.`, 'checked-collection-membership-mutation'),
      ]
      : []),
  ];
}

function formFieldSchemaTasteEffects(
  prefix: string,
  fieldSchema: StandardRequestFormFieldSchema | null | undefined,
): readonly ExpectedSemanticEffect[] {
  if (fieldSchema == null) {
    return formValueChannelTasteEffects(
      `${prefix} reports native form value binding taste.`,
      `${prefix} reports checked/model binding taste.`,
      `${prefix} reports select model binding taste.`,
    );
  }
  const effects: ExpectedSemanticEffect[] = [];
  if (fieldSchema.fields.some(standardRequestFormFieldUsesNativeValue)) {
    effects.push(ExpectedSemanticEffect.signatureTaste(
      `${prefix} reports native form value binding taste.`,
      'form-value-channel',
      'native-control-value-binding',
      'template-binding',
    ));
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesCheckedBinding)) {
    effects.push(ExpectedSemanticEffect.signatureTaste(
      `${prefix} reports checked/model binding taste.`,
      'form-value-channel',
      'checked-model-binding',
      'template-binding',
    ));
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesSelectBinding)) {
    effects.push(ExpectedSemanticEffect.signatureTaste(
      `${prefix} reports select model binding taste.`,
      'form-value-channel',
      'select-model-binding',
      'template-binding',
    ));
  }
  return effects;
}

export interface StandardLocalizedFormAppExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly submittedCountParameterSummary: string;
  readonly requestSummaryParameterSummary: string;
  readonly requestSummaryParameterSourceName?: string | null;
}

/** Verification-level effects for static i18n resources and rendered translation bindings in form recipes. */
export function standardLocalizedFormAppExpectedEffects(
  options: StandardLocalizedFormAppExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const requestSummaryParameterSourceName = options.requestSummaryParameterSourceName ?? 'requestId';
  const requestSummaryEffect = options.requestSummaryParameterSourceName === null
    ? ExpectedSemanticEffect.signatureFact(options.requestSummaryParameterSummary, 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('staticKey', 'form.summary'),
      new ExpectedSemanticEffectFilter('hasParameterBinding', false),
      new ExpectedSemanticEffectFilter('issueCount', 0),
    ])
    : ExpectedSemanticEffect.signatureFact(options.requestSummaryParameterSummary, 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('staticKey', 'form.summary'),
      new ExpectedSemanticEffectFilter('parameterSourceNames', requestSummaryParameterSourceName),
      new ExpectedSemanticEffectFilter('parameterSourceRootNames', requestSummaryParameterSourceName),
      new ExpectedSemanticEffectFilter('issueCount', 0),
    ]);
  return [
    ExpectedSemanticEffect.discriminatorAtLeast(`${options.summaryPrefix} exposes static i18n translation keys.`, 'i18n-translation-key', 'template', 6, 'plugin'),
    ExpectedSemanticEffect.discriminatorAtLeast(`${options.summaryPrefix} renders i18n translation binding groups.`, 'i18n-translation-binding', 'template', 6, 'template-binding', [
      new ExpectedSemanticEffectFilter('issueCount', 0),
    ]),
    ExpectedSemanticEffect.signatureFact(`${options.summaryPrefix} exposes the translated submit label key.`, 'i18n-translation-key', 'template', 'plugin', 'present', null, [
      new ExpectedSemanticEffectFilter('key', 'form.submit'),
      new ExpectedSemanticEffectFilter('locale', 'en'),
      new ExpectedSemanticEffectFilter('namespace', 'translation'),
    ]),
    ExpectedSemanticEffect.signatureFact(`${options.summaryPrefix} renders parameterized translation bindings.`, 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('hasParameterBinding', true),
      new ExpectedSemanticEffectFilter('issueCount', 0),
    ]),
    ExpectedSemanticEffect.signatureFact(options.submittedCountParameterSummary, 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('staticKey', 'app.submitted'),
      new ExpectedSemanticEffectFilter('parameterSourceNames', 'state.submittedCount'),
      new ExpectedSemanticEffectFilter('parameterSourceRootNames', 'state'),
      new ExpectedSemanticEffectFilter('issueCount', 0),
    ]),
    requestSummaryEffect,
    ExpectedSemanticEffect.signatureFact(`${options.summaryPrefix} renders the translated submit label binding.`, 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('staticKey', 'form.submit'),
      new ExpectedSemanticEffectFilter('issueCount', 0),
    ]),
    ExpectedSemanticEffect.signatureFact(`${options.summaryPrefix} renders a translated submit title target.`, 'i18n-translation-binding', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('staticKeys', 'form.submit'),
      new ExpectedSemanticEffectFilter('targetProperties', 'title'),
      new ExpectedSemanticEffectFilter('targetKinds', 'attribute-or-property'),
      new ExpectedSemanticEffectFilter('issueCount', 0),
    ]),
    ExpectedSemanticEffect.signatureTaste(`${options.summaryPrefix} reports plugin registration admission.`, 'resource-admission-mode', 'plugin-registration-admission', 'plugin'),
  ];
}

export function standardStateBackedRequestExpectedEffects(
  prefix: string,
  domain: StandardRequestFormDomainNames = defaultStandardRequestFormDomainNames(),
  fieldSchema: StandardRequestFormFieldSchema | null = null,
  bindingMode: 'selected-existing-object' | 'single-draft-object' = 'selected-existing-object',
): readonly ExpectedSemanticEffect[] {
  const requestFields = fieldSchema == null
    ? defaultStateBackedRequestFieldEffects()
    : stateBackedRequestFieldEffectsForSchema(fieldSchema);
  const letBindingSourceName = bindingMode === 'single-draft-object'
    ? `state.${domain.entityVariableName}`
    : `state.${domain.readEntityMethodName}(${domain.selectionIdName})`;
  const letBindingSourceType = bindingMode === 'single-draft-object'
    ? domain.entityClassName
    : `${domain.entityClassName} | null`;
  return [
    stateRequestLetBindingDataFlowEffect(
      bindingMode === 'single-draft-object'
        ? `${prefix} adapts a DI-owned draft ${domain.entityLabelLower} into template-local scope through LetBinding data flow.`
        : `${prefix} adapts DI state lookups into a template-local ${domain.entityVariableName} through LetBinding scope-slot data flow.`,
      domain,
      letBindingSourceName,
      letBindingSourceType,
    ),
    ...stateBackedRequestFieldBindingEffects(prefix, domain, requestFields),
    requestCanSubmitComputedObserverSourceEffect(
      `${prefix} models ${domain.entityLabelLower} submit readiness as a plain domain getter observer.`,
      domain,
    ),
    ...requestFields
      .filter((field) => field.requiredForSubmit)
      .map((field) => requestCanSubmitComputedObserverDependencyEffect(
        `${prefix} plain ${domain.entityLabelLower} submit-readiness getter observes ${field.propertyName}.`,
        `this.${field.propertyName}`,
        domain,
      )),
    requestCanSubmitTemplateObservedDependencyEffect(
      `${prefix} observes ${domain.entityVariableName}.canSubmit directly from the template without a view-model forwarding getter.`,
      `${domain.entityVariableName}.canSubmit`,
      domain.entityVariableName,
      'canSubmit',
    ),
    ...(fieldSchema == null ? defaultStateBackedRequestAuxiliaryEffects(prefix) : []),
  ];
}

interface StateBackedRequestFieldEffect {
  readonly propertyName: string;
  readonly targetProperty: string;
  readonly valueChannelKind: string;
  readonly valueChannelSummary: string;
  readonly requiredForSubmit: boolean;
}

function stateBackedRequestFieldEffectsForSchema(
  fieldSchema: StandardRequestFormFieldSchema,
): readonly StateBackedRequestFieldEffect[] {
  return fieldSchema.fields.map((field) => ({
    propertyName: field.propertyName,
    targetProperty: standardRequestFormFieldTargetProperty(field),
    valueChannelKind: standardRequestFormFieldValueChannelKind(field),
    valueChannelSummary: standardRequestFormFieldValueChannelSummary(field),
    requiredForSubmit: field.requiredForSubmit,
  }));
}

function defaultStateBackedRequestFieldEffects(): readonly StateBackedRequestFieldEffect[] {
  return [
    {
      propertyName: 'urgent',
      targetProperty: 'checked',
      valueChannelKind: 'checked-boolean',
      valueChannelSummary: 'the checked boolean value channel',
      requiredForSubmit: false,
    },
    {
      propertyName: 'contactPreference',
      targetProperty: 'checked',
      valueChannelKind: 'checked-radio-value',
      valueChannelSummary: 'radio model value channels',
      requiredForSubmit: false,
    },
    {
      propertyName: 'primaryTopic',
      targetProperty: 'value',
      valueChannelKind: 'select-single-option-value',
      valueChannelSummary: 'a single-select option value channel',
      requiredForSubmit: false,
    },
    {
      propertyName: 'assignee',
      targetProperty: 'value',
      valueChannelKind: 'select-single-option-value',
      valueChannelSummary: 'an object-valued single-select option channel',
      requiredForSubmit: false,
    },
    {
      propertyName: 'topics',
      targetProperty: 'value',
      valueChannelKind: 'select-multiple-option-values',
      valueChannelSummary: 'a multiple-select option values channel',
      requiredForSubmit: false,
    },
    {
      propertyName: 'customerName',
      targetProperty: 'value',
      valueChannelKind: 'raw-property',
      valueChannelSummary: 'the native value channel',
      requiredForSubmit: true,
    },
    {
      propertyName: 'email',
      targetProperty: 'value',
      valueChannelKind: 'raw-property',
      valueChannelSummary: 'the native value channel',
      requiredForSubmit: true,
    },
  ];
}

function stateBackedRequestFieldBindingEffects(
  prefix: string,
  domain: StandardRequestFormDomainNames,
  fields: readonly StateBackedRequestFieldEffect[],
): readonly ExpectedSemanticEffect[] {
  return fields.flatMap((field) => [
    stateRequestFieldDataFlowEffect(
      `${prefix} binds ${domain.entityVariableName}.${field.propertyName} through ${field.valueChannelSummary}.`,
      `${domain.entityVariableName}.${field.propertyName}`,
      field.targetProperty,
      field.valueChannelKind,
      domain,
    ),
    stateRequestFieldObservedDependencyEffect(
      `${prefix} observes ${domain.entityVariableName}.${field.propertyName} directly from the template without a forwarding getter.`,
      `${domain.entityVariableName}.${field.propertyName}`,
      field.propertyName,
      domain,
    ),
  ]);
}

function defaultStateBackedRequestAuxiliaryEffects(prefix: string): readonly ExpectedSemanticEffect[] {
  return [
    customMatcherValueChannelEffect(
      `${prefix} marks assignee select equality as an app-authored matcher value channel.`,
    ),
    observerCouplingValueChannelEffect(
      `${prefix} exposes select option-list mutation observation for request select controls.`,
      'select-option-list-mutation-observer',
    ),
    observerCouplingValueChannelEffect(
      `${prefix} exposes select array observation for request topic membership.`,
      'select-array-observer',
    ),
    customMatcherComparisonTasteEffect(
      `${prefix} reports custom matcher comparison as an intentional form value-channel taste.`,
    ),
  ];
}
