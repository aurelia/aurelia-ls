import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import { standardAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import {
  formFieldShellComponentFile,
  formFieldShellTemplateFile,
} from './form-field-shell-source-plan.js';
import {
  STANDARD_REQUEST_DRAFT_FORM_COMPONENT_SOURCE,
  STANDARD_REQUEST_FORM_COMPONENT_SOURCE,
  STANDARD_REQUEST_FORM_TEMPLATE_SOURCE,
  STANDARD_REQUEST_INLINE_DRAFT_FORM_COMPONENT_SOURCE,
  STANDARD_REQUEST_SERVICE_SOURCE,
  starterRequestFormSourcePatternPolicy,
  standardRequestFormSourcePattern,
  standardRequestFormFieldTemplate,
  standardRequestFormDomainTemplateTokensFor,
  type StandardRequestFormBindingMode,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import {
  standardRequestFormCustomDraftTemplateSource,
  standardRequestFormCustomServiceBackedDraftStateSource,
  standardRequestFormCustomServiceBackedStateSource,
  standardRequestFormCustomServiceSubmissionSource,
  standardRequestFormCustomServiceSource,
  standardRequestFormCustomTemplateSource,
  standardRequestFormFieldSchemaHasOptionDomains,
  standardRequestFormFieldSchemaModules,
  standardRequestFormFieldSchemaOptionParameterValue,
  standardRequestFormFieldSchemaOptionSummary,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';
import { SourcePatternModules } from './source-pattern-modules.js';

export interface ServiceBackedFormSourcePlanModel {
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
  readonly requestBindingMode?: StandardRequestFormBindingMode;
}

export function serviceBackedFormSourcePlan(model: ServiceBackedFormSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    serviceBackedFormSourceFilesWithAuthority(model),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
    }),
    serviceBackedFormSourcePattern(model),
  );
}

function serviceBackedFormSourcePattern(
  model: ServiceBackedFormSourcePlanModel,
) {
  const requestBindingMode = serviceBackedFormRequestBindingMode(model);
  const usesFieldShell = serviceBackedFormUsesFieldShell(model);
  const domainAccessSummary = requestBindingMode === 'single-draft-object'
    ? 'DI-owned draft form state with a service submission boundary'
    : 'DI-owned form state with service-backed loading/submission and template-local domain lookup';
  const presentationSummary = usesFieldShell
    ? 'field-shell component and native form value channels'
    : 'inline native form controls';
  const policy = serviceBackedFormUsesReferenceSourceAuthority(model)
    ? undefined
    : starterRequestFormSourcePatternPolicy();
  return standardRequestFormSourcePattern(
    `service-backed-form.${policy == null ? 'reference-instantiation' : 'starter'}`,
    'Service-backed request form pattern',
    policy == null
      ? `A complete reference instantiation of a ${domainAccessSummary}, ${presentationSummary}, and direct request-domain template bindings.`
      : `A caller-shaped starting scaffold for a ${domainAccessSummary}, ${presentationSummary}, and direct request-domain template bindings.`,
    [
      'Keep the service behind the state/domain boundary; avoid exposing service calls directly to templates when adapting.',
    ],
    [],
    [
      SourcePatternModules.StateOwnedServiceBoundary,
      ...(requestBindingMode === 'selected-existing-object'
        ? [SourcePatternModules.ServiceBackedLoading]
        : []),
      SourcePatternModules.ServiceBackedSubmission,
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

function serviceBackedFormRequestBindingMode(
  model: ServiceBackedFormSourcePlanModel,
): StandardRequestFormBindingMode {
  return model.requestBindingMode ?? 'selected-existing-object';
}

export function serviceBackedFormUsesFieldShell(
  model: Pick<ServiceBackedFormSourcePlanModel, 'requestFieldSchema' | 'requestBindingMode'>,
): boolean {
  return (model.requestBindingMode ?? 'selected-existing-object') === 'selected-existing-object'
    || model.requestFieldSchema == null;
}

function serviceBackedFormSourceFiles(
  model: ServiceBackedFormSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  const fieldShellFiles = serviceBackedFormUsesFieldShell(model)
    ? [
      formFieldShellComponentFile(model),
      formFieldShellTemplateFile(model),
    ]
    : [];
  return [
    serviceBackedFormEntrypointFile(model),
    serviceBackedFormRootComponentFile(model),
    serviceBackedFormRootTemplateFile(model),
    serviceBackedFormRootStyleFile(model),
    serviceBackedFormStateFile(model),
    serviceBackedFormServiceFile(model),
    ...fieldShellFiles,
    serviceBackedFormComponentFile(model),
    serviceBackedFormTemplateFile(model),
  ];
}

function serviceBackedFormSourceFilesWithAuthority(
  model: ServiceBackedFormSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  const files = serviceBackedFormSourceFiles(model);
  return serviceBackedFormUsesReferenceSourceAuthority(model)
    ? referenceInstantiationSourceFiles(files)
    : files;
}

function serviceBackedFormUsesReferenceSourceAuthority(
  model: ServiceBackedFormSourcePlanModel,
): boolean {
  return model.requestFieldSchema == null;
}

function serviceBackedFormEntrypointFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return standardAureliaEntrypointFile(model);
}

function serviceBackedFormRootComponentFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  const rootComponentSource = serviceBackedFormRequestBindingMode(model) === 'single-draft-object'
    ? ROOT_DRAFT_COMPONENT_SOURCE
    : ROOT_COMPONENT_SOURCE;
  const loadingTokens: Record<string, string> = serviceBackedFormRequestBindingMode(model) === 'single-draft-object'
    ? {}
    : standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
      'REQUEST_LOAD_METHOD',
    ]);
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(rootComponentSource, {
      FORM_COMPONENT_CLASS: model.formComponentClassName,
      FORM_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.formComponentPath, false),
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
      ...loadingTokens,
    }),
  );
}

function serviceBackedFormRootTemplateFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  const rootTemplateSource = serviceBackedFormRequestBindingMode(model) === 'single-draft-object'
    ? ROOT_DRAFT_TEMPLATE_SOURCE
    : ROOT_TEMPLATE_SOURCE;
  const selectionTokens: Record<string, string> = serviceBackedFormRequestBindingMode(model) === 'single-draft-object'
    ? {}
    : standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
      'REQUEST_ID_ATTRIBUTE',
      'REQUEST_IDS_PROPERTY',
      'REQUEST_SELECTED_ID_PROPERTY',
      'REQUEST_SELECTION_ID',
    ]);
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(rootTemplateSource, {
      FORM_ELEMENT_NAME: model.formElementName,
      ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
        'REQUEST_ENTITY_TITLE',
      ]),
      ...selectionTokens,
    }),
  );
}

function serviceBackedFormRootStyleFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    ROOT_STYLE_SOURCE,
  );
}

function serviceBackedFormStateFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  const bindingMode = serviceBackedFormRequestBindingMode(model);
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    model.requestFieldSchema == null
      ? fillSourceTemplate(STATE_SOURCE, {
        SERVICE_CLASS: model.serviceClassName,
        SERVICE_MODULE: moduleSpecifier(model.statePath, model.servicePath, false),
        STATE_CLASS: model.stateClassName,
        ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
          'REQUEST_COLLECTION_PROPERTY',
          'REQUEST_ENTITY_CLASS',
          'REQUEST_IDS_PROPERTY',
          'REQUEST_LOAD_METHOD',
          'REQUEST_LOADING_PROPERTY',
          'REQUEST_READ_METHOD',
          'REQUEST_REPLACE_METHOD',
          'REQUEST_SELECTED_ID_PROPERTY',
          'REQUEST_SELECTION_ID',
          'REQUEST_SERVICE_PROPERTY',
          'REQUEST_SUBMIT_METHOD',
          'REQUEST_VARIABLE',
        ]),
      })
      : bindingMode === 'single-draft-object'
        ? standardRequestFormCustomServiceBackedDraftStateSource(
          model.stateClassName,
          model.serviceClassName,
          moduleSpecifier(model.statePath, model.servicePath, false),
          model.requestDomain,
          model.requestFieldSchema,
        )
        : standardRequestFormCustomServiceBackedStateSource(
          model.stateClassName,
          model.serviceClassName,
          moduleSpecifier(model.statePath, model.servicePath, false),
          model.requestDomain,
          model.requestFieldSchema,
        ),
  );
}

function serviceBackedFormServiceFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  const bindingMode = serviceBackedFormRequestBindingMode(model);
  return recipeSourceFile(
    model.servicePath,
    'service',
    'typescript',
    'create-service',
    model.requestFieldSchema == null
      ? fillSourceTemplate(STANDARD_REQUEST_SERVICE_SOURCE, {
        SERVICE_CLASS: model.serviceClassName,
        STATE_MODULE: moduleSpecifier(model.servicePath, model.statePath, false),
        ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
          'REQUEST_CREATE_FUNCTION',
          'REQUEST_ENTITY_CLASS',
          'REQUEST_LOAD_METHOD',
          'REQUEST_SAMPLE_ID_PREFIX',
          'REQUEST_SUBMIT_METHOD',
          'REQUEST_VARIABLE_PARAMETER',
        ]),
      })
      : bindingMode === 'single-draft-object'
        ? standardRequestFormCustomServiceSubmissionSource(
          model.serviceClassName,
          moduleSpecifier(model.servicePath, model.statePath, false),
          model.requestDomain,
        )
        : standardRequestFormCustomServiceSource(
          model.serviceClassName,
          moduleSpecifier(model.servicePath, model.statePath, false),
          model.requestDomain,
          model.requestFieldSchema,
        ),
  );
}

function serviceBackedFormComponentFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  const bindingMode = serviceBackedFormRequestBindingMode(model);
  const usesFieldShell = serviceBackedFormUsesFieldShell(model);
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
      STATE_IMPORTS: model.stateClassName,
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
      SUBMIT_METHOD: '',
      VALIDATION_CONSTRUCTOR: '',
      VALIDATION_FIELDS: '',
      VALIDATION_FORM_IMPORT: '',
    }),
  );
}

function serviceBackedFormTemplateFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  if (model.requestFieldSchema != null) {
    const bindingMode = serviceBackedFormRequestBindingMode(model);
    const customTemplateSource = bindingMode === 'single-draft-object'
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
        fieldShellElementName: serviceBackedFormUsesFieldShell(model) ? model.fieldShellElementName : null,
        formSummary: '',
        submitTrigger: bindingMode === 'single-draft-object'
          ? `state.${model.requestDomain.submitEntityMethodName}()`
          : `state.${model.requestDomain.submitEntityMethodName}(${model.requestDomain.selectionIdName})`,
        submitLabel: bindingMode === 'single-draft-object'
          ? `<button type="submit" disabled.bind="!${model.requestDomain.entityVariableName}.canSubmit || state.isSubmitting">Submit ${model.requestDomain.entityLabelLower}</button>`
          : `<button type="submit" disabled.bind="!${model.requestDomain.entityVariableName}.canSubmit">Submit ${model.requestDomain.entityLabelLower}</button>`,
        validationEnabled: false,
        validationTrigger: null,
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
        valueBinding: `value.bind="${model.requestDomain.entityVariableName}.customerName"`,
        errorCollectionName: null,
      }),
      EMAIL_FIELD: standardRequestFormFieldTemplate({
        fieldShellElementName: model.fieldShellElementName,
        inputId: 'email',
        label: 'Email',
        type: 'email',
        valueBinding: `value.bind="${model.requestDomain.entityVariableName}.email"`,
        errorCollectionName: null,
      }),
      CONTACT_PREFERENCE_LEGEND: '<legend>Contact preference</legend>',
      FORM_SUMMARY: '',
      PRIMARY_TOPIC_LEAD: '    <p>Default topic: ${state.supportTopicSummary.label}</p>\n',
      SUBMIT_LABEL: `<button type="submit" disabled.bind="!${model.requestDomain.entityVariableName}.canSubmit">Submit ${model.requestDomain.entityLabelLower}</button>`,
      SUBMIT_TRIGGER: `state.${model.requestDomain.submitEntityMethodName}(${model.requestDomain.selectionIdName})`,
      ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
        'REQUEST_ENTITY_LABEL_LOWER',
        'REQUEST_READ_METHOD',
        'REQUEST_SELECTION_ID',
        'REQUEST_VARIABLE',
      ]),
    }),
  );
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

  binding(): void {
    void this.state.__REQUEST_LOAD_METHOD__();
  }
}
`);

const ROOT_DRAFT_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
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
  <h1>__REQUEST_ENTITY_TITLE__</h1>
  <label for="request-selector">__REQUEST_ENTITY_TITLE__</label>
  <select id="request-selector" value.bind="state.__REQUEST_SELECTED_ID_PROPERTY__">
    <option repeat.for="__REQUEST_SELECTION_ID__ of state.__REQUEST_IDS_PROPERTY__" model.bind="__REQUEST_SELECTION_ID__">\${__REQUEST_SELECTION_ID__}</option>
  </select>

  <__FORM_ELEMENT_NAME__ __REQUEST_ID_ATTRIBUTE__.bind="state.__REQUEST_SELECTED_ID_PROPERTY__"></__FORM_ELEMENT_NAME__>

  <p>Submissions: \${state.submittedCount}</p>
</main>
`);

const ROOT_DRAFT_TEMPLATE_SOURCE = sourceText(`<main>
  <h1>__REQUEST_ENTITY_TITLE__</h1>
  <__FORM_ELEMENT_NAME__></__FORM_ELEMENT_NAME__>

  <p>Submissions: \${state.submittedCount}</p>
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
`);

const STATE_SOURCE = sourceText(`import { resolve } from 'aurelia';
import { __SERVICE_CLASS__ } from '__SERVICE_MODULE__';

export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface RequestTopicSummary {
  id: RequestTopic;
  label: string;
}

export interface SupportAgent {
  readonly id: string;
  readonly name: string;
}

export class __REQUEST_ENTITY_CLASS__ {
  constructor(
    readonly id: string,
    public customerName: string,
    public email: string,
    public urgent: boolean,
    public contactPreference: ContactPreference,
    public primaryTopic: RequestTopic | null,
    public assignee: SupportAgent | null,
    public topics: RequestTopic[],
    public notes: string,
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }
}

export class __STATE_CLASS__ {
  private readonly __REQUEST_SERVICE_PROPERTY__ = resolve(__SERVICE_CLASS__);
  private readonly __REQUEST_COLLECTION_PROPERTY__ = new Map<string, __REQUEST_ENTITY_CLASS__>();

  __REQUEST_SELECTED_ID_PROPERTY__ = '';
  __REQUEST_LOADING_PROPERTY__ = false;

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportTopicSummary: RequestTopicSummary = { id: 'support', label: 'Support' };
  readonly supportAgents: readonly SupportAgent[] = [
    { id: 'agent-ada', name: 'Ada' },
    { id: 'agent-grace', name: 'Grace' },
  ];

  get __REQUEST_IDS_PROPERTY__(): readonly string[] {
    return [...this.__REQUEST_COLLECTION_PROPERTY__.keys()];
  }

  get submittedCount(): number {
    let count = 0;
    for (const __REQUEST_VARIABLE__ of this.__REQUEST_COLLECTION_PROPERTY__.values()) {
      count += __REQUEST_VARIABLE__.submitCount;
    }
    return count;
  }

  __REQUEST_READ_METHOD__(__REQUEST_SELECTION_ID__: string): __REQUEST_ENTITY_CLASS__ | null {
    return this.__REQUEST_COLLECTION_PROPERTY__.get(__REQUEST_SELECTION_ID__) ?? null;
  }

  async __REQUEST_LOAD_METHOD__(): Promise<void> {
    if (this.__REQUEST_COLLECTION_PROPERTY__.size > 0 || this.__REQUEST_LOADING_PROPERTY__) {
      return;
    }

    this.__REQUEST_LOADING_PROPERTY__ = true;
    try {
      this.__REQUEST_REPLACE_METHOD__(await this.__REQUEST_SERVICE_PROPERTY__.__REQUEST_LOAD_METHOD__());
      this.__REQUEST_SELECTED_ID_PROPERTY__ = this.__REQUEST_IDS_PROPERTY__[0] ?? '';
    } finally {
      this.__REQUEST_LOADING_PROPERTY__ = false;
    }
  }

  async __REQUEST_SUBMIT_METHOD__(__REQUEST_SELECTION_ID__: string): Promise<void> {
    const __REQUEST_VARIABLE__ = this.__REQUEST_READ_METHOD__(__REQUEST_SELECTION_ID__);
    if (__REQUEST_VARIABLE__ != null) {
      __REQUEST_VARIABLE__.submitCount += 1;
      await this.__REQUEST_SERVICE_PROPERTY__.__REQUEST_SUBMIT_METHOD__(__REQUEST_VARIABLE__);
    }
  }

  sameSupportAgent(left: SupportAgent | null, right: SupportAgent | null): boolean {
    return left?.id === right?.id;
  }

  private __REQUEST_REPLACE_METHOD__(__REQUEST_COLLECTION_PROPERTY__: readonly __REQUEST_ENTITY_CLASS__[]): void {
    this.__REQUEST_COLLECTION_PROPERTY__.clear();
    for (const __REQUEST_VARIABLE__ of __REQUEST_COLLECTION_PROPERTY__) {
      this.__REQUEST_COLLECTION_PROPERTY__.set(__REQUEST_VARIABLE__.id, __REQUEST_VARIABLE__);
    }
  }
}
`);
