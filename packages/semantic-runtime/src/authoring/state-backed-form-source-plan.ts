import {
  AuthoringSourceEditPlan,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';

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
  /** Include validation-html configuration, validation services, and validate binding behavior usage. */
  readonly validationEnabled?: boolean;
  /** Optional static validation trigger argument for generated `& validate` applications. */
  readonly validationTrigger?: StateBackedFormValidationTriggerName | null;
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
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    [
      recipeSourceFile(
        model.entrypointPath,
        'entrypoint',
        'typescript',
        'create-entrypoint',
        fillSourceTemplate(ENTRYPOINT_SOURCE, {
          ROOT_COMPONENT_CLASS: model.rootComponentClassName,
          ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
          VALIDATION_CONFIGURATION_IMPORT: validation.entrypointImport,
          VALIDATION_REGISTRATION: validation.registrationArgument,
        }),
      ),
      recipeSourceFile(
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
      ),
      recipeSourceFile(
        model.rootTemplatePath,
        'template',
        'html',
        'create-external-template',
        fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
          FORM_ELEMENT_NAME: model.formElementName,
        }),
      ),
      recipeSourceFile(
        model.rootStylePath,
        'component-style',
        'css',
        'create-style-asset',
        ROOT_STYLE_SOURCE,
      ),
      recipeSourceFile(
        model.statePath,
        'state-model',
        'typescript',
        'create-state-model',
        fillSourceTemplate(STATE_SOURCE, {
          STATE_CLASS: model.stateClassName,
        }),
      ),
      recipeSourceFile(
        model.formComponentPath,
        'component',
        'typescript',
        'create-form-component',
        fillSourceTemplate(FORM_COMPONENT_SOURCE, {
          FORM_COMPONENT_CLASS: model.formComponentClassName,
          FORM_ELEMENT_NAME: model.formElementName,
          FORM_TEMPLATE_MODULE: moduleSpecifier(model.formComponentPath, model.formTemplatePath, true),
          STATE_CLASS: model.stateClassName,
          STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
          SUBMIT_BODY: validation.submitBody,
          SUBMIT_RETURN_TYPE: validation.submitReturnType,
          VALIDATION_CONSTRUCTOR: validation.constructorBody,
          VALIDATION_FORM_IMPORT: validation.formImport,
          VALIDATION_FIELDS: validation.formFields,
        }),
      ),
      recipeSourceFile(
        model.formTemplatePath,
        'template',
        'html',
        'create-external-template',
        fillSourceTemplate(FORM_TEMPLATE_SOURCE, {
          CUSTOMER_NAME_BINDING: validation.customerNameBinding,
          EMAIL_BINDING: validation.emailBinding,
        }),
      ),
    ],
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: model.validationEnabled === true
        ? ['@aurelia/kernel', '@aurelia/validation-html']
        : ['@aurelia/kernel'],
    }),
  );
}

interface StateBackedFormValidationTokens {
  readonly entrypointImport: string;
  readonly registrationArgument: string;
  readonly formImport: string;
  readonly formFields: string;
  readonly constructorBody: string;
  readonly submitReturnType: string;
  readonly submitBody: string;
  readonly customerNameBinding: string;
  readonly emailBinding: string;
}

function stateBackedFormValidationTokens(
  validationEnabled: boolean,
  validationTrigger: StateBackedFormValidationTriggerName | null,
): StateBackedFormValidationTokens {
  return validationEnabled
    ? {
      entrypointImport: "import { ValidationHtmlConfiguration } from '@aurelia/validation-html';\n",
      registrationArgument: ', ValidationHtmlConfiguration',
      formImport: "import { IValidationController, IValidationRules } from '@aurelia/validation-html';\n",
      formFields: `  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);
`,
      constructorBody: `
  constructor() {
    this.validationRules
      .on(this)
      .ensure('customerName')
      .required()
      .ensure('email')
      .required()
      .email();
  }
`,
      submitReturnType: 'async submit(): Promise<void>',
      submitBody: `    const result = await this.validationController.validate();
    if (result.valid) {
      this.state.submitRequest(this.requestId);
    }`,
      customerNameBinding: validateValueBinding('customerName', validationTrigger),
      emailBinding: validateValueBinding('email', validationTrigger),
    }
    : {
      entrypointImport: '',
      registrationArgument: '',
      formImport: '',
      formFields: '',
      constructorBody: '',
      submitReturnType: 'submit(): void',
      submitBody: '    this.state.submitRequest(this.requestId);',
      customerNameBinding: 'value.bind="customerName"',
      emailBinding: 'value.bind="email"',
    };
}

function validateValueBinding(
  propertyName: string,
  validationTrigger: StateBackedFormValidationTriggerName | null,
): string {
  const triggerArgument = validationTrigger == null ? '' : `:'${validationTrigger}'`;
  return `value.two-way="${propertyName} & validate${triggerArgument}"`;
}

const ENTRYPOINT_SOURCE = sourceText(`import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
__VALIDATION_CONFIGURATION_IMPORT__\
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

new Aurelia()
  .register(StandardConfiguration__VALIDATION_REGISTRATION__)
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
  private readonly state = resolve(__STATE_CLASS__);

  get selectedRequestId(): string {
    return this.state.selectedRequestId;
  }

  set selectedRequestId(value: string) {
    this.state.selectedRequestId = value;
  }

  get requestIds(): readonly string[] {
    return this.state.requestIds;
  }

  get submittedCount(): number {
    return this.state.submittedCount;
  }
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  <h1>Service request</h1>
  <label for="request-selector">Request</label>
  <select id="request-selector" value.bind="selectedRequestId">
    <option repeat.for="requestId of requestIds" model.bind="requestId">\${requestId}</option>
  </select>

  <__FORM_ELEMENT_NAME__ request-id.bind="selectedRequestId"></__FORM_ELEMENT_NAME__>

  <p>\${submittedCount} submitted request(s)</p>
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

const STATE_SOURCE = sourceText(`export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface ServiceRequest {
  id: string;
  customerName: string;
  email: string;
  urgent: boolean;
  contactPreference: ContactPreference;
  topics: RequestTopic[];
  notes: string;
  submitCount: number;
}

export class __STATE_CLASS__ {
  readonly requestIds = ['request-1', 'request-2'];
  selectedRequestId = 'request-1';

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';

  private readonly requests = new Map<string, ServiceRequest>([
    ['request-1', createRequest('request-1', 'Ada Lovelace')],
    ['request-2', createRequest('request-2', 'Grace Hopper')],
  ]);

  get selectedRequest(): ServiceRequest | null {
    return this.readRequest(this.selectedRequestId);
  }

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
}

function createRequest(id: string, customerName: string): ServiceRequest {
  return {
    id,
    customerName,
    email: \`\${customerName.toLowerCase().replace(' ', '.')}@example.test\`,
    urgent: false,
    contactPreference: 'email',
    topics: ['support'],
    notes: '',
    submitCount: 0,
  };
}
`);

const FORM_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
__VALIDATION_FORM_IMPORT__\
import { __STATE_CLASS__, type ContactPreference, type RequestTopic } from '__STATE_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
})
export class __FORM_COMPONENT_CLASS__ {
  private readonly state = resolve(__STATE_CLASS__);
__VALIDATION_FIELDS__

  @bindable requestId = '';
__VALIDATION_CONSTRUCTOR__

  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    const request = this.request;
    if (request != null) {
      request.customerName = value;
    }
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    const request = this.request;
    if (request != null) {
      request.email = value;
    }
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    const request = this.request;
    if (request != null) {
      request.urgent = value;
    }
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    const request = this.request;
    if (request != null) {
      request.contactPreference = value;
    }
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    const request = this.request;
    if (request != null) {
      request.notes = value;
    }
  }

  get emailPreference(): ContactPreference {
    return this.state.emailPreference;
  }

  get phonePreference(): ContactPreference {
    return this.state.phonePreference;
  }

  get hardwareTopic(): RequestTopic {
    return this.state.hardwareTopic;
  }

  get billingTopic(): RequestTopic {
    return this.state.billingTopic;
  }

  get supportTopic(): RequestTopic {
    return this.state.supportTopic;
  }

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  __SUBMIT_RETURN_TYPE__ {
__SUBMIT_BODY__
  }

  private get request() {
    return this.state.readRequest(this.requestId);
  }
}
`);

const FORM_TEMPLATE_SOURCE = sourceText(`<form class.bind="canSubmit ? 'form-ready' : 'form-pending'" submit.trigger="submit()">
  <label for="customer-name">Name</label>
  <input id="customer-name" __CUSTOMER_NAME_BINDING__>

  <label for="email">Email</label>
  <input id="email" type="email" __EMAIL_BINDING__>

  <label>
    <input type="checkbox" checked.bind="urgent">
    Urgent
  </label>

  <fieldset>
    <legend>Contact preference</legend>
    <label>
      <input type="radio" model.bind="emailPreference" checked.bind="contactPreference">
      Email
    </label>
    <label>
      <input type="radio" model.bind="phonePreference" checked.bind="contactPreference">
      Phone
    </label>
  </fieldset>

  <label for="topics">Topics</label>
  <select id="topics" multiple value.bind="topics">
    <option model.bind="hardwareTopic">Hardware</option>
    <option model.bind="billingTopic">Billing</option>
    <option model.bind="supportTopic">Support</option>
  </select>

  <label for="notes">Notes</label>
  <textarea id="notes" value.bind="notes"></textarea>

  <button type="submit" disabled.bind="!canSubmit">Submit request</button>
</form>
`);
