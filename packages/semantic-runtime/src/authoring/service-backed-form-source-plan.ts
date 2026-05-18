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
}

export function serviceBackedFormSourcePlan(model: ServiceBackedFormSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    serviceBackedFormSourceFiles(model),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/kernel'],
    }),
  );
}

function serviceBackedFormSourceFiles(
  model: ServiceBackedFormSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    serviceBackedFormEntrypointFile(model),
    serviceBackedFormRootComponentFile(model),
    serviceBackedFormRootTemplateFile(model),
    serviceBackedFormRootStyleFile(model),
    serviceBackedFormStateFile(model),
    serviceBackedFormServiceFile(model),
    formFieldShellComponentFile(model),
    formFieldShellTemplateFile(model),
    serviceBackedFormComponentFile(model),
    serviceBackedFormTemplateFile(model),
  ];
}

function serviceBackedFormEntrypointFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.entrypointPath,
    'entrypoint',
    'typescript',
    'create-entrypoint',
    fillSourceTemplate(ENTRYPOINT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
    }),
  );
}

function serviceBackedFormRootComponentFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
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

function serviceBackedFormRootTemplateFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
      FORM_ELEMENT_NAME: model.formElementName,
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
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    fillSourceTemplate(STATE_SOURCE, {
      SERVICE_CLASS: model.serviceClassName,
      SERVICE_MODULE: moduleSpecifier(model.statePath, model.servicePath, false),
      STATE_CLASS: model.stateClassName,
    }),
  );
}

function serviceBackedFormServiceFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.servicePath,
    'service',
    'typescript',
    'create-service',
    fillSourceTemplate(SERVICE_SOURCE, {
      SERVICE_CLASS: model.serviceClassName,
      STATE_MODULE: moduleSpecifier(model.servicePath, model.statePath, false),
    }),
  );
}

function serviceBackedFormComponentFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
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
      STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
    }),
  );
}

function serviceBackedFormTemplateFile(model: ServiceBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.formTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(FORM_TEMPLATE_SOURCE, {
      FIELD_SHELL_ELEMENT_NAME: model.fieldShellElementName,
    }),
  );
}

const ENTRYPOINT_SOURCE = sourceText(`import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

new Aurelia()
  .register(StandardConfiguration)
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

  binding(): void {
    void this.state.loadRequests();
  }
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  <h1>Service request</h1>
  <label for="request-selector">Request</label>
  <select id="request-selector" value.bind="state.selectedRequestId">
    <option repeat.for="requestId of state.requestIds" model.bind="requestId">\${requestId}</option>
  </select>

  <__FORM_ELEMENT_NAME__ request-id.bind="state.selectedRequestId"></__FORM_ELEMENT_NAME__>

  <p>\${state.submittedCount} submitted request(s)</p>
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

const STATE_SOURCE = sourceText(`import { resolve } from '@aurelia/kernel';
import { __SERVICE_CLASS__ } from '__SERVICE_MODULE__';

export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface RequestTopicSummary {
  id: RequestTopic;
  label: string;
}

export interface ServiceRequest {
  id: string;
  customerName: string;
  email: string;
  urgent: boolean;
  contactPreference: ContactPreference;
  primaryTopic: RequestTopic | null;
  topics: RequestTopic[];
  notes: string;
  submitCount: number;
}

export class __STATE_CLASS__ {
  private readonly requestService = resolve(__SERVICE_CLASS__);
  private readonly requests = new Map<string, ServiceRequest>();

  selectedRequestId = '';
  isLoadingRequests = false;

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportTopicSummary: RequestTopicSummary = { id: 'support', label: 'Support' };

  get requestIds(): readonly string[] {
    return [...this.requests.keys()];
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

  async loadRequests(): Promise<void> {
    if (this.requests.size > 0 || this.isLoadingRequests) {
      return;
    }

    this.isLoadingRequests = true;
    try {
      this.replaceRequests(await this.requestService.loadRequests());
      this.selectedRequestId = this.requestIds[0] ?? '';
    } finally {
      this.isLoadingRequests = false;
    }
  }

  updateCustomerName(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.customerName = value;
    }
  }

  updateEmail(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.email = value;
    }
  }

  updateUrgency(requestId: string, value: boolean): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.urgent = value;
    }
  }

  updateContactPreference(requestId: string, value: ContactPreference): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.contactPreference = value;
    }
  }

  updatePrimaryTopic(requestId: string, value: RequestTopic | null): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.primaryTopic = value;
    }
  }

  updateNotes(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.notes = value;
    }
  }

  async submitRequest(requestId: string): Promise<void> {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.submitCount += 1;
      await this.requestService.submitRequest(request);
    }
  }

  private replaceRequests(requests: readonly ServiceRequest[]): void {
    this.requests.clear();
    for (const request of requests) {
      this.requests.set(request.id, request);
    }
  }
}
`);

const SERVICE_SOURCE = sourceText(`import type { ServiceRequest } from '__STATE_MODULE__';

export class __SERVICE_CLASS__ {
  async loadRequests(): Promise<readonly ServiceRequest[]> {
    return [
      createRequest('request-1', 'Ada Lovelace'),
      createRequest('request-2', 'Grace Hopper'),
    ];
  }

  async submitRequest(_request: ServiceRequest): Promise<void> {
    return;
  }
}

function createRequest(id: string, customerName: string): ServiceRequest {
  return {
    id,
    customerName,
    email: \`\${customerName.toLowerCase().replace(' ', '.')}@example.test\`,
    urgent: false,
    contactPreference: 'email',
    primaryTopic: null,
    topics: ['support'],
    notes: '',
    submitCount: 0,
  };
}
`);

const FORM_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __STATE_CLASS__, type ContactPreference, type RequestTopic } from '__STATE_MODULE__';
import { __FIELD_SHELL_CLASS__ } from '__FIELD_SHELL_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
  dependencies: [__FIELD_SHELL_CLASS__],
})
export class __FORM_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);

  @bindable requestId = '';

  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    this.state.updateCustomerName(this.requestId, value);
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    this.state.updateEmail(this.requestId, value);
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    this.state.updateUrgency(this.requestId, value);
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.state.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    this.state.updateContactPreference(this.requestId, value);
  }

  get primaryTopic(): RequestTopic | null {
    return this.request?.primaryTopic ?? null;
  }

  set primaryTopic(value: RequestTopic | null) {
    this.state.updatePrimaryTopic(this.requestId, value);
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    this.state.updateNotes(this.requestId, value);
  }

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  submit(): void {
    void this.state.submitRequest(this.requestId);
  }

  private get request() {
    return this.state.readRequest(this.requestId);
  }
}
`);

const FORM_TEMPLATE_SOURCE = sourceText(`<form class.bind="canSubmit ? 'form-ready' : 'form-pending'" submit.trigger="submit()">
  <__FIELD_SHELL_ELEMENT_NAME__
    input-id="customer-name"
    label="Name"
    type="text"
    value.bind="customerName">
  </__FIELD_SHELL_ELEMENT_NAME__>

  <__FIELD_SHELL_ELEMENT_NAME__
    input-id="email"
    label="Email"
    type="email"
    value.bind="email">
  </__FIELD_SHELL_ELEMENT_NAME__>

  <label>
    <input type="checkbox" checked.bind="urgent">
    Urgent
  </label>

  <fieldset>
    <legend>Contact preference</legend>
    <label>
      <input type="radio" model.bind="state.emailPreference" checked.bind="contactPreference">
      Email
    </label>
    <label>
      <input type="radio" model.bind="state.phonePreference" checked.bind="contactPreference">
      Phone
    </label>
  </fieldset>

  <label for="primary-topic">Primary topic</label>
  <p>Default topic: \${state.supportTopicSummary.label}</p>
  <select id="primary-topic" value.bind="primaryTopic">
    <option model.bind="null">Choose...</option>
    <option model.bind="state.hardwareTopic">Hardware</option>
    <option model.bind="state.billingTopic">Billing</option>
    <option model.bind="state.supportTopic">Support</option>
  </select>

  <label for="topics">Additional topics</label>
  <select id="topics" multiple value.bind="topics">
    <option model.bind="state.hardwareTopic">Hardware</option>
    <option model.bind="state.billingTopic">Billing</option>
    <option model.bind="state.supportTopic">Support</option>
  </select>

  <label for="notes">Notes</label>
  <textarea id="notes" value.bind="notes"></textarea>

  <button type="submit" disabled.bind="!canSubmit">Submit request</button>
</form>
`);
