import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import {
  formFieldShellComponentFile,
  formFieldShellTemplateFile,
} from './form-field-shell-source-plan.js';

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
  );
  const i18n = stateBackedFormI18nTokens(model.i18nEnabled === true);
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    stateBackedFormSourceFiles(model, validation, i18n),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: stateBackedFormDependencySpecifiers(model),
    }),
  );
}

function stateBackedFormSourceFiles(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): readonly AuthoringSourceFileEdit[] {
  return [
    stateBackedFormEntrypointFile(model, validation, i18n),
    stateBackedFormRootComponentFile(model),
    stateBackedFormRootTemplateFile(model, i18n),
    stateBackedFormRootStyleFile(model),
    stateBackedFormStateFile(model),
    formFieldShellComponentFile(model),
    formFieldShellTemplateFile(model),
    stateBackedFormComponentFile(model, validation),
    stateBackedFormTemplateFile(model, validation, i18n),
  ];
}

function stateBackedFormEntrypointFile(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.entrypointPath,
    'entrypoint',
    'typescript',
    'create-entrypoint',
    fillSourceTemplate(ENTRYPOINT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
      CONFIGURATION_IMPORTS: `${validation.entrypointImport}${i18n.entrypointImport}`,
      CONFIGURATION_REGISTRATIONS: `${validation.registrationArgument}${i18n.registrationArgument}`,
    }),
  );
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
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
      FORM_ELEMENT_NAME: model.formElementName,
      ROOT_TITLE: i18n.rootTitle,
      REQUEST_LABEL: i18n.requestLabel,
      SUBMITTED_COUNT: i18n.submittedCount,
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
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    fillSourceTemplate(STATE_SOURCE, {
      STATE_CLASS: model.stateClassName,
    }),
  );
}

function stateBackedFormComponentFile(
  model: StateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.formComponentPath,
    'component',
    'typescript',
    'create-form-component',
    fillSourceTemplate(FORM_COMPONENT_SOURCE, {
      FORM_COMPONENT_CLASS: model.formComponentClassName,
      FORM_ELEMENT_NAME: model.formElementName,
      FIELD_SHELL_CLASS: model.fieldShellClassName,
      FIELD_SHELL_MODULE: moduleSpecifier(model.formComponentPath, model.fieldShellComponentPath, false),
      FORM_TEMPLATE_MODULE: moduleSpecifier(model.formComponentPath, model.formTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_IMPORTS: `${model.stateClassName}${validation.stateImport}`,
      STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
      SUBMIT_BODY: validation.submitBody,
      SUBMIT_RETURN_TYPE: validation.submitReturnType,
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
  return recipeSourceFile(
    model.formTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(FORM_TEMPLATE_SOURCE, {
      CUSTOMER_NAME_FIELD: stateBackedFormFieldTemplate({
        fieldShellElementName: model.fieldShellElementName,
        inputId: 'customer-name',
        label: 'Name',
        type: 'text',
        valueBinding: validation.customerNameBinding,
        errorCollectionName: validation.customerNameErrorCollectionName,
      }),
      EMAIL_FIELD: stateBackedFormFieldTemplate({
        fieldShellElementName: model.fieldShellElementName,
        inputId: 'email',
        label: 'Email',
        type: 'email',
        valueBinding: validation.emailBinding,
        errorCollectionName: validation.emailErrorCollectionName,
      }),
      FORM_SUMMARY: i18n.formSummary,
      CONTACT_PREFERENCE_LEGEND: i18n.contactPreferenceLegend,
      SUBMIT_LABEL: i18n.submitLabel,
    }),
  );
}

function stateBackedFormDependencySpecifiers(model: StateBackedFormSourcePlanModel): readonly string[] {
  const specifiers = new Set<string>(['@aurelia/kernel']);
  if (model.validationEnabled === true) {
    specifiers.add('@aurelia/validation');
    specifiers.add('@aurelia/validation-html');
  }
  if (model.i18nEnabled === true) {
    specifiers.add('@aurelia/i18n');
  }
  return [...specifiers];
}

interface StateBackedFormValidationTokens {
  readonly entrypointImport: string;
  readonly registrationArgument: string;
  readonly formImport: string;
  readonly stateImport: string;
  readonly formFields: string;
  readonly constructorBody: string;
  readonly submitReturnType: string;
  readonly submitBody: string;
  readonly customerNameBinding: string;
  readonly emailBinding: string;
  readonly customerNameErrorCollectionName: string | null;
  readonly emailErrorCollectionName: string | null;
}

interface StateBackedFormI18nTokens {
  readonly entrypointImport: string;
  readonly registrationArgument: string;
  readonly rootTitle: string;
  readonly requestLabel: string;
  readonly submittedCount: string;
  readonly formSummary: string;
  readonly contactPreferenceLegend: string;
  readonly submitLabel: string;
}

function stateBackedFormValidationTokens(
  validationEnabled: boolean,
  validationTrigger: StateBackedFormValidationTriggerName | null,
): StateBackedFormValidationTokens {
  return validationEnabled
    ? {
      entrypointImport: "import { ValidationHtmlConfiguration } from '@aurelia/validation-html';\n",
      registrationArgument: ', ValidationHtmlConfiguration',
      formImport: "import { IValidationRules } from '@aurelia/validation';\nimport { IValidationController, type ValidationResultTarget } from '@aurelia/validation-html';\n",
      stateImport: ', ServiceRequest',
      formFields: `  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);

  customerNameErrors: ValidationResultTarget[] = [];
  emailErrors: ValidationResultTarget[] = [];
`,
      constructorBody: `
  constructor() {
    this.validationRules
      .on(ServiceRequest)
      .ensure((request) => request.customerName)
      .required()
      .ensure((request) => request.email)
      .required()
      .email();
  }
`,
      submitReturnType: 'async submit(): Promise<void>',
      submitBody: `    const result = await this.validationController.validate();
    if (result.valid) {
      this.state.submitRequest(this.requestId);
    }`,
      customerNameBinding: validateValueBinding('request.customerName', validationTrigger),
      emailBinding: validateValueBinding('request.email', validationTrigger),
      customerNameErrorCollectionName: 'customerNameErrors',
      emailErrorCollectionName: 'emailErrors',
    }
    : {
      entrypointImport: '',
      registrationArgument: '',
      formImport: '',
      stateImport: '',
      formFields: '',
      constructorBody: '',
      submitReturnType: 'submit(): void',
      submitBody: '    this.state.submitRequest(this.requestId);',
      customerNameBinding: 'value.bind="request.customerName"',
      emailBinding: 'value.bind="request.email"',
      customerNameErrorCollectionName: null,
      emailErrorCollectionName: null,
    };
}

interface StateBackedFormFieldTemplateInput {
  readonly fieldShellElementName: string;
  readonly inputId: string;
  readonly label: string;
  readonly type: string;
  readonly valueBinding: string;
  readonly errorCollectionName: string | null;
}

function stateBackedFormFieldTemplate(input: StateBackedFormFieldTemplateInput): string {
  const fieldShell = `  <${input.fieldShellElementName}
    input-id="${input.inputId}"
    label="${input.label}"
    type="${input.type}"
    ${input.valueBinding}>
  </${input.fieldShellElementName}>`;
  if (input.errorCollectionName == null) {
    return fieldShell;
  }
  return `  <div class="field-stack" validation-errors.from-view="${input.errorCollectionName}">
${indentLines(fieldShell, '  ')}
    <p class="error" repeat.for="error of ${input.errorCollectionName}">\${error.result.message}</p>
  </div>`;
}

function indentLines(text: string, indent: string): string {
  return text.split('\n').map((line) => `${indent}${line}`).join('\n');
}

function validateValueBinding(
  propertyName: string,
  validationTrigger: StateBackedFormValidationTriggerName | null,
): string {
  const triggerArgument = validationTrigger == null ? '' : `:'${validationTrigger}'`;
  return `value.two-way="${propertyName} & validate${triggerArgument}"`;
}

function stateBackedFormI18nTokens(i18nEnabled: boolean): StateBackedFormI18nTokens {
  return i18nEnabled
    ? {
      entrypointImport: "import { I18nConfiguration } from '@aurelia/i18n';\n",
      registrationArgument: `,
    I18nConfiguration.customize((options) => {
      options.initOptions = {
        resources: {
          en: {
            translation: {
              app: {
                title: 'Service request',
                request: 'Request',
                submitted: '{{count}} submitted request(s)',
              },
              form: {
                summary: 'Editing request {{requestId}}',
                contactPreference: 'Contact preference',
                submit: 'Submit request',
              },
            },
          },
        },
      };
    })`,
      rootTitle: '<h1 t="app.title"></h1>',
      requestLabel: '<label for="request-selector" t="app.request"></label>',
      submittedCount: '<p t="app.submitted" t-params.bind="{ count: state.submittedCount }"></p>',
      formSummary: '\n  <p t="form.summary" t-params.bind="{ requestId }"></p>\n',
      contactPreferenceLegend: '<legend t="form.contactPreference"></legend>',
      submitLabel: '<button type="submit" disabled.bind="!request.canSubmit" t="[title]form.submit;form.submit"></button>',
    }
    : {
      entrypointImport: '',
      registrationArgument: '',
      rootTitle: '<h1>Service request</h1>',
      requestLabel: '<label for="request-selector">Request</label>',
      submittedCount: '<p>${state.submittedCount} submitted request(s)</p>',
      formSummary: '',
      contactPreferenceLegend: '<legend>Contact preference</legend>',
      submitLabel: '<button type="submit" disabled.bind="!request.canSubmit">Submit request</button>',
    };
}

const ENTRYPOINT_SOURCE = sourceText(`import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
__CONFIGURATION_IMPORTS__\
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

new Aurelia()
  .register(StandardConfiguration__CONFIGURATION_REGISTRATIONS__)
  .app({
    host: document.body,
    component: __ROOT_COMPONENT_CLASS__,
  })
  .start();
`);

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
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
  <select id="request-selector" value.bind="state.selectedRequestId">
    <option repeat.for="requestId of state.requestIds" model.bind="requestId">\${requestId}</option>
  </select>

  <__FORM_ELEMENT_NAME__ request-id.bind="state.selectedRequestId"></__FORM_ELEMENT_NAME__>

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

.error {
  color: #9e3a2d;
  margin: 0;
}
`);

const STATE_SOURCE = sourceText(`export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface SupportAgent {
  readonly id: string;
  readonly name: string;
}

export class ServiceRequest {
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
  readonly requestIds = ['request-1', 'request-2'];
  selectedRequestId = 'request-1';

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportAgents: readonly SupportAgent[] = [
    { id: 'agent-ada', name: 'Ada' },
    { id: 'agent-grace', name: 'Grace' },
  ];

  private readonly requests = new Map<string, ServiceRequest>([
    ['request-1', createRequest('request-1', 'Ada Lovelace')],
    ['request-2', createRequest('request-2', 'Grace Hopper')],
  ]);

  get submittedCount(): number {
    let count = 0;
    for (const request of this.requests.values()) {
      count += request.submitCount;
    }
    return count;
  }

  readRequest(requestId: string): ServiceRequest | null {
    return this.requests.get(requestId) ?? null;
  }

  submitRequest(requestId: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.submitCount += 1;
    }
  }

  sameSupportAgent(left: SupportAgent | null, right: SupportAgent | null): boolean {
    return left?.id === right?.id;
  }
}

function createRequest(id: string, customerName: string): ServiceRequest {
  return new ServiceRequest(
    id,
    customerName,
    \`\${customerName.toLowerCase().replace(' ', '.')}@example.test\`,
    false,
    'email',
    null,
    null,
    ['support'],
    '',
    0,
  );
}
`);

const FORM_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
__VALIDATION_FORM_IMPORT__\
import { __STATE_IMPORTS__ } from '__STATE_MODULE__';
import { __FIELD_SHELL_CLASS__ } from '__FIELD_SHELL_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
  dependencies: [__FIELD_SHELL_CLASS__],
})
export class __FORM_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
__VALIDATION_FIELDS__
  @bindable requestId = '';
__VALIDATION_CONSTRUCTOR__
  __SUBMIT_RETURN_TYPE__ {
__SUBMIT_BODY__
  }
}
`);

const FORM_TEMPLATE_SOURCE = sourceText(`<let request.bind="state.readRequest(requestId)"></let>
<template if.bind="request != null">
  <form class.bind="request.canSubmit ? 'form-ready' : 'form-pending'" submit.trigger="submit()">__FORM_SUMMARY__
__CUSTOMER_NAME_FIELD__

__EMAIL_FIELD__

  <label>
    <input type="checkbox" checked.bind="request.urgent">
    Urgent
  </label>

  <fieldset>
    __CONTACT_PREFERENCE_LEGEND__
    <label>
      <input type="radio" model.bind="state.emailPreference" checked.bind="request.contactPreference">
      Email
    </label>
    <label>
      <input type="radio" model.bind="state.phonePreference" checked.bind="request.contactPreference">
      Phone
    </label>
  </fieldset>

  <label for="primary-topic">Primary topic</label>
  <select id="primary-topic" value.bind="request.primaryTopic">
    <option model.bind="null">Choose...</option>
    <option model.bind="state.hardwareTopic">Hardware</option>
    <option model.bind="state.billingTopic">Billing</option>
    <option model.bind="state.supportTopic">Support</option>
  </select>

  <label for="assignee">Assignee</label>
  <select id="assignee" value.bind="request.assignee" matcher.bind="state.sameSupportAgent">
    <option model.bind="null">Unassigned</option>
    <option repeat.for="agent of state.supportAgents" model.bind="agent">\${agent.name}</option>
  </select>

  <label for="topics">Additional topics</label>
  <select id="topics" multiple value.bind="request.topics">
    <option model.bind="state.hardwareTopic">Hardware</option>
    <option model.bind="state.billingTopic">Billing</option>
    <option model.bind="state.supportTopic">Support</option>
  </select>

  <label for="notes">Notes</label>
  <textarea id="notes" value.bind="request.notes"></textarea>

  __SUBMIT_LABEL__
  </form>
</template>
<p else>Loading request...</p>
`);
