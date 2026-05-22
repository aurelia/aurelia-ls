import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import { configuredAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import {
  formFieldShellComponentFile,
  formFieldShellTemplateFile,
} from './form-field-shell-source-plan.js';
import {
  STANDARD_REQUEST_DRAFT_FORM_COMPONENT_SOURCE,
  STANDARD_REQUEST_FORM_TEMPLATE_SOURCE,
  STANDARD_REQUEST_FORM_COMPONENT_SOURCE,
  STANDARD_REQUEST_INLINE_DRAFT_FORM_COMPONENT_SOURCE,
  STANDARD_REQUEST_STATE_SOURCE,
  starterRequestFormSourcePatternPolicy,
  standardRequestFormSourcePattern,
  standardRequestFormFieldTemplate,
  standardRequestFormDomainTemplateTokensFor,
  type StandardRequestFormBindingMode,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import {
  standardRequestFormCustomDraftStateSource,
  standardRequestFormCustomDraftTemplateSource,
  standardRequestFormCustomStateSource,
  standardRequestFormCustomTemplateSource,
  standardRequestFormCustomValidationTokens,
  standardRequestFormFieldSchemaHasOptionDomains,
  standardRequestFormFieldSchemaModules,
  standardRequestFormFieldSchemaOptionParameterValue,
  standardRequestFormFieldSchemaOptionSummary,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';
import { SourcePatternModules } from './source-pattern-modules.js';

export interface StateBackedFormSourcePlanModel {
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
  readonly requestBindingMode?: StandardRequestFormBindingMode;
  /** Include validation-html configuration, validation services, and validate binding behavior usage. */
  readonly validationEnabled?: boolean;
  /** Optional static validation trigger argument for generated `& validate` applications. */
  readonly validationTrigger?: StateBackedFormValidationTriggerName | null;
  /** Include i18n configuration, static translation resources, and translated template text. */
  readonly i18nEnabled?: boolean;
}

export type StateBackedFormValidationTriggerName =
  | 'manual'
  | 'blur'
  | 'focusout'
  | 'change'
  | 'changeOrBlur'
  | 'changeOrFocusout';

export function stateBackedFormSourcePlan(model: StateBackedFormSourcePlanModel): AuthoringSourceEditPlan {
  const validation = stateBackedFormValidationTokens(
    model.validationEnabled === true,
    model.validationTrigger ?? null,
    model.requestDomain,
    model.requestFieldSchema,
    stateBackedFormRequestBindingMode(model),
  );
  const i18n = stateBackedFormI18nTokens(
    model.i18nEnabled === true,
    model.requestDomain,
    stateBackedFormRequestBindingMode(model),
  );
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    stateBackedFormSourceFilesWithAuthority(model, validation, i18n),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: stateBackedFormDependencySpecifiers(model),
    }),
    stateBackedFormSourcePattern(model),
  );
}

function stateBackedFormSourcePattern(
  model: StateBackedFormSourcePlanModel,
) {
  const capabilityPrefix = stateBackedFormPatternPrefix(model);
  const requestBindingMode = stateBackedFormRequestBindingMode(model);
  const usesFieldShell = stateBackedFormUsesFieldShell(model);
  const domainAccessSummary = requestBindingMode === 'single-draft-object'
    ? 'DI-owned draft form state'
    : 'DI-owned form state, template-local domain lookup';
  const presentationSummary = usesFieldShell
    ? 'field-shell component, native form value channels'
    : 'inline native form controls';
  const policy = stateBackedFormUsesReferenceSourceAuthority(model)
    ? undefined
    : starterRequestFormSourcePatternPolicy();
  return standardRequestFormSourcePattern(
    `${capabilityPrefix}.${policy == null ? 'reference-instantiation' : 'starter'}`,
    `${stateBackedFormPatternTitle(model)} request form pattern`,
    policy == null
      ? `A complete reference instantiation of a ${domainAccessSummary}, ${presentationSummary}${stateBackedFormPatternCapabilitySummary(model)}.`
      : `A caller-shaped starting scaffold for a ${domainAccessSummary}, ${presentationSummary}${stateBackedFormPatternCapabilitySummary(model)}.`,
    [
      'Treat validation/i18n source as capability pattern material to merge only when the caller actually needs those plugins.',
      ...(policy == null
        ? ['Treat form CSS as reference presentation and replace it with host design-system styling when available.']
        : []),
    ],
    [],
    [
      ...(model.i18nEnabled === true ? [SourcePatternModules.I18nPlugin] : []),
      ...(model.validationEnabled === true ? [SourcePatternModules.ValidationPlugin] : []),
    ],
    [],
    model.requestDomain,
    model.requestFieldSchema?.sourceParameterValue,
    standardRequestFormFieldSchemaOptionParameterValue(model.requestFieldSchema)
      ?? standardRequestFormFieldSchemaOptionSummary(model.requestFieldSchema),
    standardRequestFormFieldSchemaHasOptionDomains(model.requestFieldSchema)
      ? 'source-text-input'
      : 'advisory-only',
    standardRequestFormFieldSchemaModules(model.requestFieldSchema, { includeFieldShell: usesFieldShell }),
    undefined,
    requestBindingMode === 'selected-existing-object',
    policy,
  );
}

function stateBackedFormPatternPrefix(
  model: StateBackedFormSourcePlanModel,
): string {
  if (model.i18nEnabled === true && model.validationEnabled === true) {
    return 'localized-validated-state-backed-form';
  }
  if (model.i18nEnabled === true) {
    return 'localized-state-backed-form';
  }
  if (model.validationEnabled === true) {
    return 'validated-state-backed-form';
  }
  return 'state-backed-form';
}

function stateBackedFormPatternTitle(
  model: StateBackedFormSourcePlanModel,
): string {
  if (model.i18nEnabled === true && model.validationEnabled === true) {
    return 'Localized validated state-backed';
  }
  if (model.i18nEnabled === true) {
    return 'Localized state-backed';
  }
  if (model.validationEnabled === true) {
    return 'Validated state-backed';
  }
  return 'State-backed';
}

function stateBackedFormPatternCapabilitySummary(
  model: StateBackedFormSourcePlanModel,
): string {
  if (model.i18nEnabled === true && model.validationEnabled === true) {
    return ', validation-html bindings, and static i18n resources';
  }
  if (model.i18nEnabled === true) {
    return ', and static i18n resources';
  }
  if (model.validationEnabled === true) {
    return ', and validation-html bindings';
  }
  return '';
}

function stateBackedFormRequestBindingMode(
  model: StateBackedFormSourcePlanModel,
): StandardRequestFormBindingMode {
  return model.requestBindingMode ?? 'selected-existing-object';
}

export function stateBackedFormUsesFieldShell(
  model: Pick<StateBackedFormSourcePlanModel, 'requestFieldSchema' | 'requestBindingMode'>,
): boolean {
  return (model.requestBindingMode ?? 'selected-existing-object') === 'selected-existing-object'
    || model.requestFieldSchema == null;
}

function stateBackedFormSourceFiles(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): readonly AuthoringSourceFileEdit[] {
  const fieldShellFiles = stateBackedFormUsesFieldShell(model)
    ? [
      formFieldShellComponentFile(model),
      formFieldShellTemplateFile(model),
    ]
    : [];
  return [
    stateBackedFormEntrypointFile(model, validation, i18n),
    stateBackedFormRootComponentFile(model),
    stateBackedFormRootTemplateFile(model, i18n),
    stateBackedFormRootStyleFile(model),
    stateBackedFormStateFile(model),
    ...fieldShellFiles,
    stateBackedFormComponentFile(model, validation),
    stateBackedFormTemplateFile(model, validation, i18n),
  ];
}

function stateBackedFormSourceFilesWithAuthority(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): readonly AuthoringSourceFileEdit[] {
  const files = stateBackedFormSourceFiles(model, validation, i18n);
  return stateBackedFormUsesReferenceSourceAuthority(model)
    ? referenceInstantiationSourceFiles(files)
    : files;
}

function stateBackedFormUsesReferenceSourceAuthority(
  model: StateBackedFormSourcePlanModel,
): boolean {
  return model.requestFieldSchema == null;
}

function stateBackedFormEntrypointFile(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): AuthoringSourceFileEdit {
  return configuredAureliaEntrypointFile({
    entrypointPath: model.entrypointPath,
    rootComponentPath: model.rootComponentPath,
    rootComponentClassName: model.rootComponentClassName,
    configurationImports: `${validation.entrypointImport}${i18n.entrypointImport}`,
    registrationExpressions: [
      ...validation.registrationExpressions,
      ...i18n.registrationExpressions,
    ],
  });
}

function stateBackedFormRootComponentFile(model: StateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      FORM_COMPONENT_CLASS: model.formComponentClassName,
      FORM_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.formComponentPath, false),
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
    }),
  );
}

function stateBackedFormRootTemplateFile(
  model: StateBackedFormSourcePlanModel,
  i18n: StateBackedFormI18nTokens,
): AuthoringSourceFileEdit {
  const rootTemplateSource = stateBackedFormRequestBindingMode(model) === 'single-draft-object'
    ? ROOT_DRAFT_TEMPLATE_SOURCE
    : ROOT_TEMPLATE_SOURCE;
  const selectionTokens: Record<string, string> = stateBackedFormRequestBindingMode(model) === 'single-draft-object'
    ? {}
    : standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
      'REQUEST_ID_ATTRIBUTE',
      'REQUEST_IDS_PROPERTY',
      'REQUEST_SELECTED_ID_PROPERTY',
      'REQUEST_SELECTION_ID',
    ]);
  const requestLabelToken: Record<string, string> = stateBackedFormRequestBindingMode(model) === 'single-draft-object'
    ? {}
    : { REQUEST_LABEL: i18n.requestLabel };
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(rootTemplateSource, {
      FORM_ELEMENT_NAME: model.formElementName,
      ROOT_TITLE: i18n.rootTitle,
      SUBMITTED_COUNT: i18n.submittedCount,
      ...requestLabelToken,
      ...selectionTokens,
    }),
  );
}

function stateBackedFormRootStyleFile(model: StateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    ROOT_STYLE_SOURCE,
  );
}

function stateBackedFormStateFile(model: StateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  const bindingMode = stateBackedFormRequestBindingMode(model);
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    model.requestFieldSchema == null
      ? fillSourceTemplate(STANDARD_REQUEST_STATE_SOURCE, {
        STATE_CLASS: model.stateClassName,
        ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
          'REQUEST_COLLECTION_PROPERTY',
          'REQUEST_CREATE_FUNCTION',
          'REQUEST_ENTITY_CLASS',
          'REQUEST_IDS_PROPERTY',
          'REQUEST_READ_METHOD',
          'REQUEST_SAMPLE_ID_PREFIX',
          'REQUEST_SELECTED_ID_PROPERTY',
          'REQUEST_SELECTION_ID',
          'REQUEST_SUBMIT_METHOD',
          'REQUEST_VARIABLE',
        ]),
      })
      : bindingMode === 'single-draft-object'
        ? standardRequestFormCustomDraftStateSource(
          model.stateClassName,
          model.requestDomain,
          model.requestFieldSchema,
        )
      : standardRequestFormCustomStateSource(
        model.stateClassName,
        model.requestDomain,
        model.requestFieldSchema,
      ),
  );
}

function stateBackedFormComponentFile(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
): AuthoringSourceFileEdit {
  const bindingMode = stateBackedFormRequestBindingMode(model);
  const usesFieldShell = stateBackedFormUsesFieldShell(model);
  const componentSource = bindingMode === 'single-draft-object'
    ? usesFieldShell
      ? STANDARD_REQUEST_DRAFT_FORM_COMPONENT_SOURCE
      : STANDARD_REQUEST_INLINE_DRAFT_FORM_COMPONENT_SOURCE
    : STANDARD_REQUEST_FORM_COMPONENT_SOURCE;
  const selectionTokens: Record<string, string> = bindingMode === 'single-draft-object'
    ? {}
    : standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
      'REQUEST_SELECTION_ID',
    ]);
  const fieldShellTokens: Record<string, string> = usesFieldShell
    ? {
      FIELD_SHELL_CLASS: model.fieldShellClassName,
      FIELD_SHELL_MODULE: moduleSpecifier(model.formComponentPath, model.fieldShellComponentPath, false),
    }
    : {};
  return recipeSourceFile(
    model.formComponentPath,
    'component',
    'typescript',
    'create-form-component',
    fillSourceTemplate(componentSource, {
      FORM_COMPONENT_CLASS: model.formComponentClassName,
      FORM_ELEMENT_NAME: model.formElementName,
      FORM_TEMPLATE_MODULE: moduleSpecifier(model.formComponentPath, model.formTemplatePath, true),
      ...selectionTokens,
      ...fieldShellTokens,
      STATE_CLASS: model.stateClassName,
      STATE_IMPORTS: `${model.stateClassName}${validation.stateImport}`,
      STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
      SUBMIT_METHOD: validation.submitMethod,
      VALIDATION_CONSTRUCTOR: validation.constructorBody,
      VALIDATION_FORM_IMPORT: validation.formImport,
      VALIDATION_FIELDS: validation.formFields,
    }),
  );
}

function stateBackedFormTemplateFile(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): AuthoringSourceFileEdit {
  if (model.requestFieldSchema != null) {
    const customTemplateSource = stateBackedFormRequestBindingMode(model) === 'single-draft-object'
      ? standardRequestFormCustomDraftTemplateSource
      : standardRequestFormCustomTemplateSource;
    return recipeSourceFile(
      model.formTemplatePath,
      'template',
      'html',
      'create-external-template',
      customTemplateSource({
        domain: model.requestDomain,
        fieldSchema: model.requestFieldSchema,
        fieldShellElementName: stateBackedFormUsesFieldShell(model) ? model.fieldShellElementName : null,
        formSummary: i18n.formSummary,
        submitTrigger: validation.submitTrigger,
        submitLabel: i18n.submitLabel,
        validationEnabled: model.validationEnabled === true,
        validationTrigger: model.validationTrigger ?? null,
      }),
    );
  }
  return recipeSourceFile(
    model.formTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(STANDARD_REQUEST_FORM_TEMPLATE_SOURCE, {
      CUSTOMER_NAME_FIELD: standardRequestFormFieldTemplate({
        fieldShellElementName: model.fieldShellElementName,
        inputId: 'customer-name',
        label: 'Name',
        type: 'text',
        valueBinding: validation.customerNameBinding,
        errorCollectionName: validation.customerNameErrorCollectionName,
      }),
      EMAIL_FIELD: standardRequestFormFieldTemplate({
        fieldShellElementName: model.fieldShellElementName,
        inputId: 'email',
        label: 'Email',
        type: 'email',
        valueBinding: validation.emailBinding,
        errorCollectionName: validation.emailErrorCollectionName,
      }),
      FORM_SUMMARY: i18n.formSummary,
      CONTACT_PREFERENCE_LEGEND: i18n.contactPreferenceLegend,
      PRIMARY_TOPIC_LEAD: '',
      SUBMIT_TRIGGER: validation.submitTrigger,
      SUBMIT_LABEL: i18n.submitLabel,
      ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
        'REQUEST_ENTITY_LABEL_LOWER',
        'REQUEST_READ_METHOD',
        'REQUEST_SELECTION_ID',
        'REQUEST_VARIABLE',
      ]),
    }),
  );
}

function stateBackedFormDependencySpecifiers(model: StateBackedFormSourcePlanModel): readonly string[] {
  const specifiers = new Set<string>();
  if (model.validationEnabled === true) {
    specifiers.add('@aurelia/validation');
    specifiers.add('@aurelia/validation-html');
  }
  if (model.i18nEnabled === true) {
    specifiers.add('@aurelia/i18n');
  }
  return [...specifiers];
}

export interface StateBackedFormValidationTokens {
  readonly entrypointImport: string;
  readonly registrationExpressions: readonly string[];
  readonly formImport: string;
  readonly stateImport: string;
  readonly formFields: string;
  readonly constructorBody: string;
  readonly submitTrigger: string;
  readonly submitMethod: string;
  readonly customerNameBinding: string;
  readonly emailBinding: string;
  readonly customerNameErrorCollectionName: string | null;
  readonly emailErrorCollectionName: string | null;
}

export interface StateBackedFormI18nTokens {
  readonly entrypointImport: string;
  readonly registrationExpressions: readonly string[];
  readonly rootTitle: string;
  readonly requestLabel: string;
  readonly submittedCount: string;
  readonly formSummary: string;
  readonly contactPreferenceLegend: string;
  readonly submitLabel: string;
}

export function stateBackedFormValidationTokens(
  validationEnabled: boolean,
  validationTrigger: StateBackedFormValidationTriggerName | null,
  domain: StandardRequestFormDomainNames,
  fieldSchema: StandardRequestFormFieldSchema | null = null,
  requestBindingMode: StandardRequestFormBindingMode = 'selected-existing-object',
): StateBackedFormValidationTokens {
  const submitCall = requestBindingMode === 'single-draft-object'
    ? `this.state.${domain.submitEntityMethodName}();`
    : `this.state.${domain.submitEntityMethodName}(this.${domain.selectionIdName});`;
  const submitTrigger = requestBindingMode === 'single-draft-object'
    ? `state.${domain.submitEntityMethodName}()`
    : `state.${domain.submitEntityMethodName}(${domain.selectionIdName})`;
  if (validationEnabled && fieldSchema != null) {
    const fieldTokens = standardRequestFormCustomValidationTokens(domain, fieldSchema);
    return {
      entrypointImport: "import { ValidationHtmlConfiguration } from '@aurelia/validation-html';\n",
      registrationExpressions: ['ValidationHtmlConfiguration'],
      formImport: fieldTokens.formImport,
      stateImport: fieldTokens.stateImport,
      formFields: fieldTokens.formFields,
      constructorBody: fieldTokens.constructorBody,
      submitTrigger: 'submit()',
      submitMethod: `
  async submit(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid) {
      ${submitCall}
    }
  }`,
      customerNameBinding: '',
      emailBinding: '',
      customerNameErrorCollectionName: null,
      emailErrorCollectionName: null,
    };
  }
  return validationEnabled
    ? {
      entrypointImport: "import { ValidationHtmlConfiguration } from '@aurelia/validation-html';\n",
      registrationExpressions: ['ValidationHtmlConfiguration'],
      formImport: "import { IValidationRules } from '@aurelia/validation';\nimport { IValidationController, type ValidationResultTarget } from '@aurelia/validation-html';\n",
      stateImport: `, ${domain.entityClassName}`,
      formFields: `  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);

  customerNameErrors: ValidationResultTarget[] = [];
  emailErrors: ValidationResultTarget[] = [];
`,
      constructorBody: `

  constructor() {
    this.validationRules
      .on(${domain.entityClassName})
      .ensure((${domain.entityVariableName}) => ${domain.entityVariableName}.customerName)
      .required()
      .ensure((${domain.entityVariableName}) => ${domain.entityVariableName}.email)
      .required()
      .email();
  }
`,
      submitTrigger: 'submit()',
      submitMethod: `
  async submit(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid) {
      ${submitCall}
    }
  }`,
      customerNameBinding: validateValueBinding(`${domain.entityVariableName}.customerName`, validationTrigger),
      emailBinding: validateValueBinding(`${domain.entityVariableName}.email`, validationTrigger),
      customerNameErrorCollectionName: 'customerNameErrors',
      emailErrorCollectionName: 'emailErrors',
    }
    : {
      entrypointImport: '',
      registrationExpressions: [],
      formImport: '',
      stateImport: '',
      formFields: '',
      constructorBody: '',
      submitTrigger,
      submitMethod: '',
      customerNameBinding: `value.bind="${domain.entityVariableName}.customerName"`,
      emailBinding: `value.bind="${domain.entityVariableName}.email"`,
      customerNameErrorCollectionName: null,
      emailErrorCollectionName: null,
    };
}

function validateValueBinding(
  propertyName: string,
  validationTrigger: StateBackedFormValidationTriggerName | null,
): string {
  const triggerArgument = validationTrigger == null ? '' : `:'${validationTrigger}'`;
  return `value.two-way="${propertyName} & validate${triggerArgument}"`;
}

export function stateBackedFormI18nTokens(
  i18nEnabled: boolean,
  domain: StandardRequestFormDomainNames,
  requestBindingMode: StandardRequestFormBindingMode = 'selected-existing-object',
): StateBackedFormI18nTokens {
  const usesSelectionIdentity = requestBindingMode === 'selected-existing-object';
  return i18nEnabled
    ? {
      entrypointImport: "import { I18nConfiguration } from '@aurelia/i18n';\n",
      registrationExpressions: [
        `I18nConfiguration.customize((options) => {
  options.initOptions = {
    resources: {
      en: {
        translation: {
          app: {
            title: '${domain.entityTitle}',
            request: '${domain.entityTitle}',
            submitted: 'Submissions: {{count}}',
          },
          form: {
            summary: '${usesSelectionIdentity ? `Editing ${domain.entityLabelLower} {{${domain.selectionIdName}}}` : `New ${domain.entityLabelLower}`}',
            contactPreference: 'Contact preference',
            submit: 'Submit ${domain.entityLabelLower}',
          },
        },
      },
    },
  };
})`,
      ],
      rootTitle: '<h1 t="app.title"></h1>',
      requestLabel: '<label for="request-selector" t="app.request"></label>',
      submittedCount: '<p t="app.submitted" t-params.bind="{ count: state.submittedCount }"></p>',
      formSummary: usesSelectionIdentity
        ? `\n  <p t="form.summary" t-params.bind="{ ${domain.selectionIdName} }"></p>\n`
        : '\n  <p t="form.summary"></p>\n',
      contactPreferenceLegend: '<legend t="form.contactPreference"></legend>',
      submitLabel: `<button type="submit" disabled.bind="!${domain.entityVariableName}.canSubmit" t="[title]form.submit;form.submit"></button>`,
    }
    : {
      entrypointImport: '',
      registrationExpressions: [],
      rootTitle: `<h1>${domain.entityTitle}</h1>`,
      requestLabel: `<label for="request-selector">${domain.entityTitle}</label>`,
      submittedCount: '<p>Submissions: ${state.submittedCount}</p>',
      formSummary: '',
      contactPreferenceLegend: '<legend>Contact preference</legend>',
      submitLabel: `<button type="submit" disabled.bind="!${domain.entityVariableName}.canSubmit">Submit ${domain.entityLabelLower}</button>`,
    };
}

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __FORM_COMPONENT_CLASS__ } from '__FORM_COMPONENT_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__FORM_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  __ROOT_TITLE__
  __REQUEST_LABEL__
  <select id="request-selector" value.bind="state.__REQUEST_SELECTED_ID_PROPERTY__">
    <option repeat.for="__REQUEST_SELECTION_ID__ of state.__REQUEST_IDS_PROPERTY__" model.bind="__REQUEST_SELECTION_ID__">\${__REQUEST_SELECTION_ID__}</option>
  </select>

  <__FORM_ELEMENT_NAME__ __REQUEST_ID_ATTRIBUTE__.bind="state.__REQUEST_SELECTED_ID_PROPERTY__"></__FORM_ELEMENT_NAME__>

  __SUBMITTED_COUNT__
</main>
`);

const ROOT_DRAFT_TEMPLATE_SOURCE = sourceText(`<main>
  __ROOT_TITLE__
  <__FORM_ELEMENT_NAME__></__FORM_ELEMENT_NAME__>

  __SUBMITTED_COUNT__
</main>
`);

const ROOT_STYLE_SOURCE = sourceText(`main {
  display: grid;
  gap: 1rem;
  max-width: 46rem;
  margin: 0 auto;
  padding: 2rem;
}

.form-ready {
  border-color: #2f7d32;
}

.form-pending {
  border-color: #9e3a2d;
}

.field-stack {
  display: grid;
  gap: 0.25rem;
}

.field-invalid {
  border-left: 0.25rem solid #9e3a2d;
  padding-left: 0.75rem;
}

.error {
  color: #9e3a2d;
  margin: 0;
}
`);
